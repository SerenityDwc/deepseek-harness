# Agent Note: Docker Web 访问令牌代理

Status: implemented

[English](2026-08-26-docker-web-access-token.md) | 中文

## 问题

发布出去的 Web 镜像端口，谁知道主机和端口谁就能访问。VoltClaw 为每名员工起一个容器，需要工作台只在已登录用户从 VoltClaw 点进去之后打开，而不能靠粘贴 `http://<主机>:<端口>/`。`/api` 的 Host/Origin 栅栏是 DNS-rebinding 防御，不是认证；把 `Host` 改成回环会破坏浏览器同源调用。

## 决策

当 `DSH_ACCESS_TOKEN` 非空时，`deploy/docker/entrypoint.sh` 在 `PORT+1` 上启动只听回环的 `dsh web`（不应用 `bind-all.patch.yml`），并应用 `deploy/docker/privileged-ip.patch.yml`（`privilegedIpLiterals: true`），由 `deploy/docker/access-proxy.mjs` 监听 `0.0.0.0:PORT`。非回环 HTTP 与 WebSocket 升级必须用请求头 `x-dsh-access-token` 出示该令牌。查询参数 `access_token` 与 cookie 一律忽略。回环客户端不校验，镜像 HEALTHCHECK 与容器内探测仍可用。代理转发原始 `Host` 和 `Origin`。未设置 `DSH_ACCESS_TOKEN` 时保持原来的 bind-all、无认证发布端口。

VoltClaw 把每名员工的 `gatewayToken` 注入为 `DSH_ACCESS_TOKEN`，在登录且校验所属关系之后，于 `server.workbench-port` 上反向代理工作台，并由 Spring 发送该请求头。浏览器源是这条 VoltClaw 连接器，不是容器发布端口。

## 曾考虑的替代方案

- **浏览器查询令牌加 `dsh_access_<端口>` cookie。** 放弃：cookie 不能按端口隔离到足以覆盖 VoltClaw 退出登录，留下的 cookie 会让 `http://<主机>:<端口>/` 继续可用。
- **只把发布端口绑到 Docker 宿主机的 `127.0.0.1`。** 单独不够：VoltClaw 经 TCP 连远程 Docker 时到不了那台机器上的宿主机回环映射。与 Docker 同机的生产环境使用 `use-internal-address`，不发布该端口。
- **在 dsh 产品层做完整 Web 认证。** 推迟：令牌签发、会话存储和特权 Settings 访问面比雇佣容器这条路径所需要的更大。
- **在 VoltClaw API 端口上做路径前缀反代。** 放弃：Harness SPA 从 `location.origin` 解析 `/api`，会与 VoltClaw 自己的 `/api` 冲突。

## 后果

- 令牌门控的发布端口，非回环且未带 `x-dsh-access-token` 的直接访问返回 401。
- 浏览器里留下的 cookie 或收藏的 `?access_token=` URL 打不开工作台。
- 仍运行旧版（接受 cookie/查询参数）access-proxy 的容器，在替换镜像或代理文件之前仍按旧规则放行。
- 令牌模式还会设置 connection 的 `privilegedIpLiterals`，因此 Settings 与凭据 RPC 获得与普通方法相同的 IP 字面量与 `trustedHosts` 授权。浏览器设置镜像在规范 IP 字面量页面 Host 上会调用这些 RPC（`settingsOnHost`）。未设置 `DSH_ACCESS_TOKEN` 时这些方法仍只限回环。

## 测试

运维路径：构建镜像，分别带和不带 `DSH_ACCESS_TOKEN` 运行，确认设置后未认证 GET `/` 为 401、未设置时为 200，确认 `/?access_token=` 仍为 401，确认带 `x-dsh-access-token` 返回 200。`dsh-client-connection` 的包测试固定 `privilegedIpLiterals`。`deploy/docker/access-proxy-auth.test.mjs` 固定只读请求头令牌。镜像构建不属于 `pnpm run test`。
