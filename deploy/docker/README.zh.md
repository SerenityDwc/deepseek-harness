# 用 Docker 运行 Web UI

[English](README.md) | 中文

该镜像启动 `dsh web`，并用一层 overlay 把监听地址绑到 `0.0.0.0`，这样 Docker 发布的端口才能到达进程。产品 CLI 仍会拒绝 `--host 0.0.0.0`；这层 overlay 是容器对网络暴露的显式选择。发布端口默认没有认证；设置 `DSH_ACCESS_TOKEN` 后除外。未设置该令牌时，只应放在你信任的网络上：agent（智能体）可以在挂载的工作区里执行命令。

未设置 `DSH_ACCESS_TOKEN` 时，Settings 与凭据 RPC 仍只限回环。不要指望从远程浏览器保存密钥，而是把 `DEEPSEEK_API_KEY`（以及可选的 `DEEPSEEK_BASE_URL`）传入容器。设置令牌后，访问令牌 overlay 会打开 `privilegedIpLiterals`，已通过令牌认证的局域网浏览器可以加载 Settings → Models。

镜像会预置 `web` profile，包含：

- 旁路 **aiworkspace** 检出中的 `@voltmind/dsh-skills`、`@voltmind/dsh-theme`（构建时 `--build-context voltmind=…`）
- `@wxg-prc-cpg/dsh-weknora`（可用 `--build-arg DSH_PRESET_WEKNORA=0` 关闭）
- `@wxg-prc-cpg/browser-skill-dsh-plugin`（[BrowserSkill](https://github.com/Tencent/BrowserSkill)；可用 `--build-arg DSH_PRESET_BROWSERSKILL=0` 关闭）

`WEKNORA_API_KEY` 默认来自 Dockerfile 的 `ENV`。`WEKNORA_BASE_URL` 必须是发布页上的 API 根路径（当前为 `http://8.149.246.29/api/v1`，不要带 `:8000`）。运行时可覆盖。

BrowserSkill 插件只负责向 dsh 注入 `browser_*` 工具；真正操控浏览器仍需宿主机上的 `bsk` CLI 与浏览器扩展（见上游文档）。

镜像还把 Python 科学计算套件装进 `/opt/scientific-python`（`pandas` / `numpy` / `matplotlib` / `scipy` / `openpyxl` / `seaborn` / `xlrd` / `requests` / `beautifulsoup4`），并安装 `fonts-noto-cjk`，供数据分析类技能画中文图表。pip 依次尝试阿里云、腾讯云、中科大、清华索引。

## 构建

在 **deepseek-harness** 仓库根目录执行（同级需有 `../aiworkspace`）：

```sh
docker build -t deepseek-harness:local \
  --build-context voltmind=../aiworkspace .
```

或在 `deploy/docker` 下：

```sh
docker compose -f deploy/docker/docker-compose.yml build
```

compose 已把 `additional_contexts.voltmind` 指到 `../../../aiworkspace`。首次构建会编译 dsh、构建两个 VoltMind 包，并把它们与 WeKnora 装进 `/root/.dsh/profiles/web`。

## 运行并指定宿主机端口

把宿主机端口映射到容器端口 `3080`（默认监听端口）。把 `8080` 换成任意空闲宿主机端口：

```sh
docker run --rm -p 8080:3080 \
  -e DEEPSEEK_API_KEY \
  -v "${PWD}:/workspace" \
  deepseek-harness:local
```

本机打开 `http://127.0.0.1:8080`，或在受信任网络上用 `http://<主机IP>:8080` 访问。规范的 IP 字面量 Host 可通过普通 `/api` 路由。DNS 名称需要设置 `DSH_TRUSTED_HOST`（逗号分隔的 `host` 或 `host:port`，会转成 `--trusted-host`）。

设置 `DSH_ACCESS_TOKEN` 后，发布端口上是访问代理，后面才是回环上的 `dsh web`。未带请求头 `x-dsh-access-token` 的直接访问返回 401。查询参数与 cookie 一律忽略，因此浏览器里留下的旧 cookie 不能在退出登录后重新打开该端口。回环请求（包括镜像 HEALTHCHECK）不校验令牌。代理不改写 `Host` 或 `Origin`。令牌 overlay 会设置 connection 的 `privilegedIpLiterals`，使 Settings 与凭据 RPC 接受与普通方法相同的 IP 字面量 Host。

若要在容器内改监听端口，设置 `PORT` 并发布同一端口：

```sh
docker run --rm -p 9000:9000 -e PORT=9000 \
  -e DEEPSEEK_API_KEY \
  -v "${PWD}:/workspace" \
  deepseek-harness:local
```

在本目录使用 `docker compose` 时，宿主机端口为 `${DSH_PORT:-3080}`：

```sh
export DEEPSEEK_API_KEY
export DSH_PORT=8080
export DSH_WORKSPACE=/path/to/project
docker compose -f deploy/docker/docker-compose.yml up --build
```

## 工作区与主目录

进程 cwd 是 `/workspace`。把希望 agent 编辑的项目挂到该路径，然后在**选择工作区**里添加该目录。会话数据和其他 harness 文件写在 `/root/.dsh`；compose 文件用 named volume 保存该目录。空 volume 会在首次启动时从 `/opt/dsh-home-seed` 灌入。若旧 volume 里已有不含这些插件的 `web` profile，需要重建该 volume。

## 相关

- [Web UI 指南](../../docs/user/guide/index.zh.md)
- [API 浏览器信任栅栏](../../.agents/notes/implemented/architecture/2026-07-28-api-browser-trust-boundary.zh.md)
- [Docker Web 镜像 Agent Note](../../.agents/notes/implemented/feature/2026-08-24-docker-web-image.zh.md)
