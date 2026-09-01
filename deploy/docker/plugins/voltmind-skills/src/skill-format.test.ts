import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const SKILLS_ROOT = join(here, '..', 'skills')

function frontmatter(text: string): Record<string, string> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text.replace(/^\uFEFF/, ''))
  if (match === null) return {}
  const out: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx > 0) out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^"|"$/g, '')
  }
  return out
}

describe('voltmind skill pack', () => {
  it('每个技能目录含 SKILL.md 且 frontmatter 含 name/description', () => {
    const dirs = readdirSync(SKILLS_ROOT, { withFileTypes: true }).filter(d => d.isDirectory())
    expect(dirs.length).toBeGreaterThanOrEqual(6)
    for (const dir of dirs) {
      const text = readFileSync(join(SKILLS_ROOT, dir.name, 'SKILL.md'), 'utf8')
      const fm = frontmatter(text)
      expect(fm.name, `${dir.name} 缺 name`).toBeTruthy()
      expect(fm.description, `${dir.name} 缺 description`).toBeTruthy()
    }
  })

  it('每个技能的 version 存在且为语义化 x.y.z（版本提升契约）', () => {
    // 语义化：主号.次号.修订（如 "2.1.0"；可带可选预发布如 "1.0.0-rc.1"）
    const semver = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/
    const dirs = readdirSync(SKILLS_ROOT, { withFileTypes: true }).filter(d => d.isDirectory())
    for (const dir of dirs) {
      const text = readFileSync(join(SKILLS_ROOT, dir.name, 'SKILL.md'), 'utf8')
      const fm = frontmatter(text)
      expect(fm.version, `${dir.name} 缺 version`).toMatch(semver)
    }
  })

  it('技能 id 为 kebab-case（与目录名一致）', () => {
    const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    const dirs = readdirSync(SKILLS_ROOT, { withFileTypes: true }).filter(d => d.isDirectory())
    for (const dir of dirs) {
      expect(dir.name, `目录名 ${dir.name} 应为 kebab-case`).toMatch(kebab)
      const fm = frontmatter(readFileSync(join(SKILLS_ROOT, dir.name, 'SKILL.md'), 'utf8'))
      expect(fm.name).toBe(dir.name)
    }
  })

  it('技能目录的 script.py 与 tool.json 成对存在（脚本工具契约）', () => {
    const dirs = readdirSync(SKILLS_ROOT, { withFileTypes: true }).filter(d => d.isDirectory())
    for (const dir of dirs) {
      const hasScript = existsSync(join(SKILLS_ROOT, dir.name, 'script.py'))
      const hasTool = existsSync(join(SKILLS_ROOT, dir.name, 'tool.json'))
      expect(hasScript, `${dir.name}: script.py 应与 tool.json 成对`).toBe(hasTool)
      if (hasScript) {
        const meta = JSON.parse(readFileSync(join(SKILLS_ROOT, dir.name, 'tool.json'), 'utf8'))
        expect(meta.name, `${dir.name}: tool.json 需 name`).toBeTruthy()
        expect(meta.description, `${dir.name}: tool.json 需 description`).toBeTruthy()
      }
    }
  })

  it('voltcell 预设含 preset.yml 与 agent.cordis.yml', () => {
    const presetDir = join(here, '..', 'presets', 'voltcell')
    expect(existsSync(join(presetDir, 'preset.yml'))).toBe(true)
    expect(existsSync(join(presetDir, 'agent.cordis.yml'))).toBe(true)
  })

  it('voltcell 预设的 shell 行与 standard 对齐（无非法 config，Windows 禁用 bash 启用 pwsh）', () => {
    // 回归：dsh-tool-bash 的 Config 仅接受 enableRunInBackground；
    // 曾误挂 timeoutMs（persistent-bash 的键）导致 schemastery 拒绝该行 → 会话创建失败。
    const text = readFileSync(join(here, '..', 'presets', 'voltcell', 'agent.cordis.yml'), 'utf8')
    expect(text).not.toContain('timeoutMs')
    expect(text).toContain("- id: tool-bash")
    expect(text).toContain("disabled: !!js process.platform === 'win32'")
    expect(text).toContain('- id: tool-pwsh')
    expect(text).toContain("disabled: !!js process.platform !== 'win32'")
  })

  it('voltcell 预设含必需 config（fs-search/todo 与 standard 一致）', () => {
    // 回归：tool-fs-search 必需 sampleOverCapGlobResults、tool-todo 必需 allowParallelInProgress
    // （schemastery required）；裸行导致装载失败 → 新建会话无反应。
    const text = readFileSync(join(here, '..', 'presets', 'voltcell', 'agent.cordis.yml'), 'utf8')
    expect(text).toContain('- id: tool-fs-search')
    expect(text).toContain('sampleOverCapGlobResults: false')
    expect(text).toContain('- id: tool-todo')
    expect(text).toContain('allowParallelInProgress: true')
  })

  it('共享约定层 voltmind-conventions 存在且含 DSH/非 DSH 双实现', () => {
    const path = join(SKILLS_ROOT, 'voltmind-conventions', 'SKILL.md')
    expect(existsSync(path)).toBe(true)
    const text = readFileSync(path, 'utf8')
    // 触发词 description
    expect(frontmatter(text).description).toContain('产物')
    // 每项约定有 DSH 实现 + 非 DSH 替代
    expect(text).toContain('DSH 实现')
    expect(text).toContain('非 DSH 替代')
  })

  it('领域技能引用 voltmind-conventions（共享约定层接线）', () => {
    // 引用约定层的领域技能（voltcell/data-analysis 已瘦身）
    for (const dir of ['voltcell', 'data-analysis']) {
      const text = readFileSync(join(SKILLS_ROOT, dir, 'SKILL.md'), 'utf8')
      expect(text, `${dir} 应引用 voltmind-conventions`).toContain('voltmind-conventions')
      // 瘦身检查：不应再内联 DSH 工具名（工具细节移到约定层）
      expect(text, `${dir} 不应残留 voltmind_emit 工具细节`).not.toContain('voltmind_emit(files:')
    }
  })
})
