# deepseek-harness:v1.0.1 镜像

Web profile 运行时镜像：发布版 `dsh` CLI（内置 `@deepseek-ai/dsh-base` + `@deepseek-ai/dsh-web-app`）+ 下列插件。

## 已打入镜像的插件

| 来源 | 包 |
|---|---|
| web profile 内置 | `@deepseek-ai/dsh-base`、`@deepseek-ai/dsh-web-app` |
| npm | `dshmarket`、`@liustack/modlens`、`dsh-at-file`、`@changfenhuang/dsh-genui`（原 `@omdsh-dev/dsh-genui`）、`dsh-visualize`（原 `@dsh-external/dsh-visualize` 未发布）、`dsh-better-sidebar`、`@huanlin/dsh-plugin-better-sidebar-plugin-office`、`@wxg-prc-cpg/browser-skill-dsh-plugin`、`@wxg-prc-cpg/dsh-weknora` |
| 本地构建 | `@voltmind/dsh-skills`、`@voltmind/dsh-theme`、`bda-api-pass` |

`dsh-files` 当前 npm `latest` 为 `0.0.1` 且未声明 `dsh.bundle`，因此已安装为依赖但未进入 profile 层。需要时在容器内执行 `dsh plugin --profile web add dsh-files@0.2.0`。

`@wxg-prc-cpg/browser-skill-dsh-plugin` 需要宿主上的 `bsk` CLI 与 Chrome/Edge 扩展；容器内仅安装插件本身。

## 构建

在本机启动 Docker Desktop 后：

```powershell
powershell -File D:\AIWorkspace\deepseek-harness\deploy\docker\build.ps1
```

默认标签 `deepseek-harness:v1.0.1`。可覆盖：

- `DSH_VERSION`（默认 `latest`）
- `NPM_REGISTRY`（默认 `https://registry.npmmirror.com`；第三方插件安装改走官方 `registry.npmjs.org`）
- `BASE_IMAGE`（默认 `docker.m.daocloud.io/library/node:22-bookworm-slim`）

构建脚本会从下列路径暂存自研插件：

- `D:\AIWorkspace\aiworkspace\packages\voltmind-skills`
- `D:\AIWorkspace\aiworkspace\packages\voltmind-theme`
- `D:\AIWorkspace\bda-api-pass-0.4.0\package`

## 运行

```powershell
cd D:\AIWorkspace\deepseek-harness\deploy\docker
copy .env.example .env
# 编辑 .env：至少填一个模型密钥，以及 TRUSTED_HOSTS=<访问主机>:3080
docker compose --env-file .env up -d
```

浏览器打开 `http://<host>:3080`。公网或非 loopback 访问必须设置 `TRUSTED_HOSTS`，否则页面能开但 `/api` 返回 403。

数据在命名卷 `deepseek-harness_dsh-home`（容器内 `/srv/dsh/user`）。重建镜像后若要重新灌入插件清单：`docker compose down -v`（会清空会话）。

## 环境变量

| 变量 | 用途 |
|---|---|
| `TRUSTED_HOSTS` | 浏览器 Host 放行列表 |
| `SHENSUANYUN_API_KEY` / `ZAI_CODING_CN_API_KEY` / `DEEPSEEK_API_KEY` | 模型网关 |
| `BDA_AUTH_USER` / `AUTH_ADMIN_KEY` / `BDA_AUTH_BASE_URL` / `BDA_API_BASE_URL` | bda-api-pass |
| `WEKNORA_BASE_URL` / `WEKNORA_API_KEY` | WeKnora 插件 |

## 构建

在本机启动 Docker Desktop 后：

```powershell
powershell -File D:\AIWorkspace\deepseek-harness\deploy\docker\build.ps1
```

默认标签 `deepseek-harness:v1.0.1`。可覆盖：

- `DSH_VERSION`（默认 `latest`）
- `NPM_REGISTRY`（默认 `https://registry.npmmirror.com`）
- `BASE_IMAGE`（默认 `node:22-bookworm-slim`）

构建脚本会从下列路径暂存自研插件：

- `D:\AIWorkspace\aiworkspace\packages\voltmind-skills`
- `D:\AIWorkspace\aiworkspace\packages\voltmind-theme`
- `D:\AIWorkspace\bda-api-pass-0.4.0\package`

## 运行

```powershell
cd D:\AIWorkspace\deepseek-harness\deploy\docker
copy .env.example .env
# 编辑 .env：至少填一个模型密钥，以及 TRUSTED_HOSTS=<访问主机>:3080
docker compose --env-file .env up -d
```

浏览器打开 `http://<host>:3080`。公网或非 loopback 访问必须设置 `TRUSTED_HOSTS`，否则页面能开但 `/api` 返回 403。

数据在命名卷 `deepseek-harness_dsh-home`（容器内 `/srv/dsh/user`）。重建镜像后若要重新灌入插件清单：`docker compose down -v`（会清空会话）。

## 环境变量

| 变量 | 用途 |
|---|---|
| `TRUSTED_HOSTS` | 浏览器 Host 放行列表 |
| `SHENSUANYUN_API_KEY` / `ZAI_CODING_CN_API_KEY` / `DEEPSEEK_API_KEY` | 模型网关 |
| `BDA_AUTH_USER` / `AUTH_ADMIN_KEY` / `BDA_AUTH_BASE_URL` / `BDA_API_BASE_URL` | bda-api-pass |
| `WEKNORA_BASE_URL` / `WEKNORA_API_KEY` | WeKnora 插件 |
