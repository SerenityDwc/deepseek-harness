# 构建 deepseek-harness:v1.0.1
#
# 用法（在任意目录）：
#   powershell -File D:\AIWorkspace\deepseek-harness\deploy\docker\build.ps1
#
# 可选环境变量：
#   DSH_VERSION     发布版 dsh 版本，默认 latest
#   NPM_REGISTRY    npm 源，默认 https://registry.npmmirror.com
#   BASE_IMAGE      基础镜像，默认 node:22-bookworm-slim

$ErrorActionPreference = 'Stop'

$Here = $PSScriptRoot
$Image = 'deepseek-harness:v1.0.1'
$Harness = (Resolve-Path (Join-Path $Here '..\..')).Path
$Workbench = 'D:\AIWorkspace\aiworkspace'
$BdaPackage = 'D:\AIWorkspace\bda-api-pass-0.4.0\package'
$Plugins = Join-Path $Here 'plugins'

$DshVersion = if ($env:DSH_VERSION) { $env:DSH_VERSION } else { 'latest' }
$NpmRegistry = if ($env:NPM_REGISTRY) { $env:NPM_REGISTRY } else { 'https://registry.npmmirror.com' }
# Docker Hub is often unreachable here; default to a CN mirror of the same tag.
$BaseImage = if ($env:BASE_IMAGE) { $env:BASE_IMAGE } else { 'docker.m.daocloud.io/library/node:22-bookworm-slim' }

function Copy-Tree {
  param(
    [Parameter(Mandatory = $true)][string]$Src,
    [Parameter(Mandatory = $true)][string]$Dst,
    [string[]]$ExcludeDirs = @('node_modules', 'coverage', '.git')
  )
  if (-not (Test-Path $Src)) {
    throw "missing plugin source: $Src"
  }
  if (Test-Path $Dst) {
    Remove-Item -Recurse -Force $Dst
  }
  New-Item -ItemType Directory -Force -Path $Dst | Out-Null
  $xd = @()
  foreach ($d in $ExcludeDirs) { $xd += $d }
  # robocopy 0-7 = success
  & robocopy $Src $Dst /E /XD @xd /XF *.tsbuildinfo /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
  $code = $LASTEXITCODE
  if ($code -ge 8) {
    throw "robocopy failed ($code): $Src -> $Dst"
  }
}

Write-Host "==> staging plugins into $Plugins"
if (Test-Path $Plugins) {
  Remove-Item -Recurse -Force $Plugins
}
New-Item -ItemType Directory -Force -Path $Plugins | Out-Null

Copy-Item (Join-Path $Workbench 'tsconfig.base.json') (Join-Path $Here 'tsconfig.base.json') -Force

Copy-Tree -Src (Join-Path $Workbench 'packages\voltmind-skills') -Dst (Join-Path $Plugins 'voltmind-skills') -ExcludeDirs @('node_modules', 'coverage', '.git', 'lib')
Copy-Tree -Src (Join-Path $Workbench 'packages\voltmind-theme') -Dst (Join-Path $Plugins 'voltmind-theme') -ExcludeDirs @('node_modules', 'coverage', '.git', 'lib')
Copy-Tree -Src $BdaPackage -Dst (Join-Path $Plugins 'bda-api-pass') -ExcludeDirs @('node_modules', 'coverage', '.git')

foreach ($pkg in @('voltmind-skills', 'voltmind-theme')) {
  $tsbuild = Join-Path $Plugins "$pkg\tsconfig.build.json"
  $json = Get-Content $tsbuild -Raw | ConvertFrom-Json
  $json | Add-Member -NotePropertyName exclude -NotePropertyValue @('src/**/*.test.ts') -Force
  $json | ConvertTo-Json -Depth 8 | Set-Content $tsbuild -Encoding utf8
}

$skillsTsdown = Join-Path $Plugins 'voltmind-skills\tsdown.config.ts'
if (-not (Test-Path $skillsTsdown)) {
  Copy-Item (Join-Path $Here 'voltmind-skills.tsdown.config.ts') $skillsTsdown -Force
  Write-Host "    injected tsdown.config.ts for voltmind-skills"
}

# Theme only type-imports @deepseek-ai/*; skip those npm packages (prerelease ranges
# do not match published dist-tags) and bundle with tsdown alone.
$themePkgPath = Join-Path $Plugins 'voltmind-theme\package.json'
$env:THEME_PKG = $themePkgPath
node --input-type=commonjs -e "const fs=require('fs'); const p=process.env.THEME_PKG; const j=JSON.parse(fs.readFileSync(p,'utf8')); j.scripts.build='node scripts/build-assets.mjs && tsdown'; j.dependencies={}; j.devDependencies={tsdown:'0.22.2',typescript:'~5.7.2',react:'^18.3.1','react-dom':'^18.3.1','@types/node':'^22.20.0'}; fs.writeFileSync(p, JSON.stringify(j,null,2)+'\n');"
if ($LASTEXITCODE -ne 0) { throw "failed to slim voltmind-theme package.json" }
Write-Host "    slimmed voltmind-theme package.json for tsdown-only build"

function Build-StagedPlugin {
  param([Parameter(Mandatory = $true)][string]$Dir)
  Write-Host "==> pnpm install + build  $Dir"
  Push-Location $Dir
  try {
    $ws = Join-Path $Dir 'pnpm-workspace.yaml'
    @"
packages:
  - '.'
minimumReleaseAge: 0
allowBuilds:
  esbuild: true
overrides:
  '@deepseek-ai/dsh-settings': '0.1.1-rc.2'
"@ | Set-Content -Path $ws -Encoding utf8
    & pnpm install --ignore-workspace --config.strict-dep-builds=false --config.minimumReleaseAge=0 --registry $NpmRegistry --no-frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw "pnpm install failed in $Dir" }
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw "pnpm run build failed in $Dir" }
  } finally {
    Pop-Location
  }
  $nm = Join-Path $Dir 'node_modules'
  if (Test-Path $nm) {
    Remove-Item -Recurse -Force $nm
  }
}

Build-StagedPlugin (Join-Path $Plugins 'voltmind-skills')
Build-StagedPlugin (Join-Path $Plugins 'voltmind-theme')

$skillsLib = Join-Path $Plugins 'voltmind-skills\lib\index.js'
$themeLib = Join-Path $Plugins 'voltmind-theme\lib\index.js'
$themeClient = Join-Path $Plugins 'voltmind-theme\lib\client.js'
foreach ($f in @($skillsLib, $themeLib, $themeClient)) {
  if (-not (Test-Path $f)) { throw "plugin build did not emit $f" }
}

Write-Host "==> waiting for Docker engine"
$deadline = (Get-Date).AddMinutes(3)
$ready = $false
while ((Get-Date) -lt $deadline) {
  docker info 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    $ready = $true
    break
  }
  Start-Sleep -Seconds 3
}
if (-not $ready) {
  throw "Docker engine is not running. Start Docker Desktop and re-run build.ps1."
}

Write-Host "==> docker build $Image (dsh@$DshVersion)"
Push-Location $Here
try {
  docker build `
    --build-arg "DSH_VERSION=$DshVersion" `
    --build-arg "NPM_REGISTRY=$NpmRegistry" `
    --build-arg "BASE_IMAGE=$BaseImage" `
    -t $Image `
    .
  if ($LASTEXITCODE -ne 0) {
    throw "docker build failed with exit $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

Write-Host "==> done: $Image"
docker images $Image --format "{{.Repository}}:{{.Tag}}  {{.ID}}  {{.Size}}"
