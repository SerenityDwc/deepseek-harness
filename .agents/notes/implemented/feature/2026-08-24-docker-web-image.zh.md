# Agent Note: Web UI 的 Docker 镜像

Status: implemented

[English](2026-08-24-docker-web-image.md) | 中文

## 问题

运维方希望把 DeepSeek Harness 打成容器，在 `docker run` 时选择宿主机端口，并用 `http://<主机IP>:<端口>` 打开 Web UI。产品 CLI 默认绑定 `127.0.0.1` 并拒绝 `--host 0.0.0.0`，因此 Docker 发布的端口到不了 Node 进程。容器的网卡地址也与浏览器 `Host` 头里的宿主机 IP 不同，只列出进程自身 LAN IP 的 `/api` DNS-rebinding 栅栏会把合法的 IP 访问变成 403。

## 决策

仓库提供根目录 `Dockerfile`：安装 workspace、执行 `pnpm run build`，再通过 `deploy/docker/entrypoint.sh` 启动已构建的 `dsh` bin。入口脚本应用 `deploy/docker/bind-all.patch.yml`（webserver `host: '0.0.0.0'`，端口来自 `webStartup` / `PORT`），并且从不传入 `--host 0.0.0.0`，因此 CLI 的安全拒绝仍然有效。宿主机端口由 Docker 的 `-p 宿主机:容器` 映射选择；若运维方发布同一端口，可用 `PORT` 改容器内监听端口。

普通 `/api` 路由授予规范 IP 字面量 Host（`isTrustedApiRequest(..., { ipLiterals: true })`），因为被重绑的页面携带的是 DNS 名称而不是 IP 字面量。特权方法仍以空信任表且不授予 IP 字面量过栅栏，除非 connection 的 `privilegedIpLiterals` 为 true。因此无认证的容器部署里 Settings 与凭据 RPC 仍只限回环，并通过进程环境提供 `DEEPSEEK_API_KEY`。DNS 名称仍需要 `DSH_TRUSTED_HOST` / `--trusted-host`。

镜像没有认证层，除非设置了 `DSH_ACCESS_TOKEN`。未设置时，发布端口的可达性由运维方的网络策略负责，与 [API 浏览器信任栅栏](../architecture/2026-07-28-api-browser-trust-boundary.zh.md) 中已记录的无认证 `0.0.0.0` 姿态一致。设置后，入口脚本在发布端口上运行 [Docker 访问令牌代理](2026-08-26-docker-web-access-token.zh.md)，`dsh web` 只听回环，并打开 `privilegedIpLiterals`，使通过令牌认证的局域网浏览器可以调用 Settings。

## 曾考虑的替代方案

- **重新启用 `dsh web --host 0.0.0.0`。** 不为镜像采用：CLI 拒绝是为了避免本地 `dsh web` 无意暴露远程代码执行；overlay 才是容器的显式选择。
- **默认 `docker run --network host`。** 否决：Windows 与 macOS 上的 Docker Desktop 不提供 Linux 的 host 网络，而这正是运维方的目标环境。
- **用反向代理边车把 `Host` 改写成 `127.0.0.1`。** 否决：Origin 栅栏要求 Origin 与 Host 权威一致，改写 Host 会使浏览器同源调用失败。
- **IP 访问必须设置 `DSH_TRUSTED_HOST=<局域网IP>`。** 不作为唯一路径：桥接容器在启动时无法得知宿主机 IP，且 IP 字面量 Host 对 DNS rebinding 已经安全。

## 后果

- 在仓库根目录 `docker build` 得到 `deepseek-harness:local`；`docker run -p 8080:3080` 在该宿主机端口提供 UI。
- 远程浏览器可以通过 IP URL 使用普通会话 RPC。Settings 与凭据 RPC 仍只限回环，除非 `DSH_ACCESS_TOKEN` 打开 `privilegedIpLiterals`。
- 在不信任的网络上发布端口会暴露无认证的 coding agent，除非设置了 `DSH_ACCESS_TOKEN`。运维文档把该限制写在运行命令旁边。

## 测试

`dsh-client-connection` 的包测试固定非特权前缀上的 IP 字面量授权、默认下特权方法仍只限回环，以及 `privilegedIpLiterals`。构建并发布镜像是运维路径，不属于 `pnpm run test`。
