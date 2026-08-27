# Agent Note: Docker Web access-token proxy

Status: implemented

English | [中文](2026-08-26-docker-web-access-token.zh.md)

## Problem

A published Web image port is reachable by anyone who knows the host and port. VoltClaw hires a container per employee and needs the workbench to open only after a logged-in user clicks through VoltClaw, not from a pasted `http://<host>:<port>/` URL. The `/api` Host/Origin fence is a DNS-rebinding defense, not authentication, and rewriting `Host` to loopback would break same-origin browser calls.

## Decision

When `DSH_ACCESS_TOKEN` is non-empty, `deploy/docker/entrypoint.sh` starts loopback `dsh web` on `PORT+1` without `bind-all.patch.yml`, applies `deploy/docker/privileged-ip.patch.yml` (`privilegedIpLiterals: true`), and `deploy/docker/access-proxy.mjs` listens on `0.0.0.0:PORT`. Non-loopback HTTP and WebSocket upgrades must present that token as header `x-dsh-access-token`. Query `access_token` and cookies are ignored. Loopback clients skip the check so the image HEALTHCHECK and in-container probes keep working. The proxy forwards the original `Host` and `Origin`. Unset `DSH_ACCESS_TOKEN` keeps the previous bind-all, unauthenticated published port.

VoltClaw injects each employee's `gatewayToken` as `DSH_ACCESS_TOKEN`, reverse-proxies the workbench on `server.workbench-port` after login and ownership checks, and sends the header from Spring. The browser origin is that VoltClaw connector, not the published container port.

## Alternatives considered

- **Browser query token plus `dsh_access_<port>` cookie.** Rejected: cookies are not isolated by port in a way that survives VoltClaw logout, and a leftover cookie keeps `http://<host>:<port>/` working.
- **Bind published ports to `127.0.0.1` on the Docker host as the only control.** Incomplete on its own when VoltClaw talks to Docker over TCP on another machine and cannot reach that host-loopback mapping. Production colocated with Docker uses `use-internal-address` and does not publish the port.
- **Product-wide Web authentication in dsh.** Deferred: token minting, session storage, and privileged Settings access are a larger surface than the container hire path needs.
- **Path-prefix reverse proxy on the VoltClaw API port.** Rejected: the Harness SPA resolves `/api` from `location.origin`, which would collide with VoltClaw's own `/api`.

## Consequences

- Direct visits to a token-gated published port return 401 unless the caller is loopback or sends `x-dsh-access-token`.
- A leftover browser cookie or a bookmarked `?access_token=` URL does not open the workbench.
- Existing containers started with cookie/query-accepting access-proxy stay open that way until the image or the proxy file is replaced.
- Token mode also sets connection `privilegedIpLiterals`, so Settings and credential RPCs accept the same IP-literal and `trustedHosts` grants as ordinary methods. The browser settings mirror calls those RPCs on a canonical IP-literal page host (`settingsOnHost`). Unset `DSH_ACCESS_TOKEN` keeps privileged methods loopback-only.

## Testing

Operator path: build the image, run with and without `DSH_ACCESS_TOKEN`, confirm unauthenticated GET `/` is 401 when set and 200 when unset, confirm `/?access_token=` stays 401, and confirm `x-dsh-access-token` returns 200. Package tests in `dsh-client-connection` pin `privilegedIpLiterals`. `deploy/docker/access-proxy-auth.test.mjs` pins header-only token reading. Image build is not part of `pnpm run test`.
