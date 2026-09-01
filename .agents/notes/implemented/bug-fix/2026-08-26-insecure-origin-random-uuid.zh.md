# Agent Note: 在非安全上下文中签发浏览器 RPC id，不依赖 randomUUID

Status: implemented

[English](2026-08-26-insecure-origin-random-uuid.md) | 中文

## 问题

VoltClaw 用 `http://<局域网IP>:<端口>/` 打开 Web UI。该源不是安全上下文，浏览器不会提供 `crypto.randomUUID`。`AbstractApiClient.mintRpcId` 在每次一元 RPC 上都调用它，因此提供方目录和 Agent 预设加载失败，报 `crypto.randomUUID is not a function`。打开 `http://127.0.0.1:<端口>/` 正常，因为回环是安全上下文。Docker 访问令牌代理不是原因。

## 决策

`AbstractApiClient.mintRpcId` 在存在 `crypto.randomUUID` 时使用它，否则用 `crypto.getRandomValues` 生成 RFC 4122 v4 UUID；非安全 HTTP 源仍提供 `getRandomValues`。会话草稿附件 id 使用同一回退。通用 connection RPC 已经通过 `dsh-client-connection` 的 `randomUuid()` 签发。

## 曾考虑的替代方案

- **工作台只允许 localhost 或 HTTPS。** 不作为唯一路径：VoltClaw 在远程 Docker 主机上雇佣容器，并从另一台机器打开局域网 IP URL。
- **只在 `index.html` 上给 `window.crypto.randomUUID` 打补丁。** 不作为唯一路径：签发点不应依赖页面全局副作用，且测试已经在没有 `randomUUID` 的 `crypto` 桩上运行。

## 后果

- 来自 `http://<IP>:<端口>` 的一元 RPC 在非安全上下文中可以成功。
- 附件草稿也能在这些源上签发 id。
- 运维方仍需在此更改后重建 Web 镜像；已在跑的容器会继续用旧客户端包，直到被重建。

## 测试

`packages/host/apiproxy/tests/fetch-carrier.spec.ts` 把 `crypto` 桩成只有 `getRandomValues`，并断言签发的 rpcId。`packages/client/connection/tests/client-apply.client.spec.ts` 已经覆盖同一桩上的通用 RPC 调用方。
