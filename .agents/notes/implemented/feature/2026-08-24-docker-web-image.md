# Agent Note: Docker image for the Web UI

Status: implemented

English | [中文](2026-08-24-docker-web-image.zh.md)

## Problem

Operators want to build DeepSeek Harness as a container, choose a host port at `docker run` time, and open the Web UI at `http://<host-ip>:<port>`. The product CLI binds `127.0.0.1` by default and rejects `--host 0.0.0.0`, so a published Docker port never reaches the Node process. A container also has different interface addresses than the host IP in the browser `Host` header, so the `/api` DNS-rebinding fence that only listed the process's own LAN IPs would 403 a legitimate IP visit.

## Decision

The repository ships a root `Dockerfile` that installs the workspace, runs `pnpm run build`, and starts the built `dsh` bin through `deploy/docker/entrypoint.sh`. The entrypoint applies `deploy/docker/bind-all.patch.yml` (webserver `host: '0.0.0.0'`, port from `webStartup` / `PORT`) and never passes `--host 0.0.0.0`, so the CLI safety rejection stays in place. Host port selection is Docker's `-p host:container` mapping; `PORT` changes the listen port inside the container when the operator publishes that same port.

Ordinary `/api` routes grant canonical IP-literal Hosts (`isTrustedApiRequest(..., { ipLiterals: true })`) because a rebound page carries a DNS name, not an IP literal. Privileged methods still pass the fence with an empty trust list and no IP-literal grant unless connection `privilegedIpLiterals` is true. Unauthenticated container deploys therefore keep Settings and credential RPCs loopback-only and supply `DEEPSEEK_API_KEY` through the process environment. DNS names still require `DSH_TRUSTED_HOST` / `--trusted-host`.

The image has no authentication layer unless `DSH_ACCESS_TOKEN` is set. Unset, reachability of the published port is the operator's network policy, matching the unauthenticated `0.0.0.0` posture recorded in the [API browser-trust fence](../architecture/2026-07-28-api-browser-trust-boundary.md). Set, the entrypoint puts [the Docker access-token proxy](2026-08-26-docker-web-access-token.md) on the published port, keeps `dsh web` on loopback, and turns on `privilegedIpLiterals` so a token-authenticated LAN browser can call Settings.

## Alternatives considered

- **Re-enable `dsh web --host 0.0.0.0`.** Rejected for the image: the CLI rejection exists so a local `dsh web` does not accidentally expose remote code execution; the overlay is an explicit container choice.
- **`docker run --network host`.** Rejected as the default: Docker Desktop on Windows and macOS does not provide Linux host networking, which is the operator's stated target.
- **A reverse-proxy sidecar that rewrites `Host` to `127.0.0.1`.** Rejected: the Origin fence requires Origin to equal the Host authority, so a rewritten Host would fail same-origin browser calls.
- **Require `DSH_TRUSTED_HOST=<lan-ip>` for every IP visit.** Rejected as the only path: the host IP is not knowable from inside a bridged container at boot, and IP-literal Hosts are already safe against DNS rebinding.

## Consequences

- `docker build` from the repository root produces `deepseek-harness:local`; `docker run -p 8080:3080` serves the UI at that host port.
- Remote browsers can use ordinary session RPCs over an IP URL. Settings and credential RPCs stay loopback-only unless `DSH_ACCESS_TOKEN` turns on `privilegedIpLiterals`.
- A published port on an untrusted network exposes an unauthenticated coding agent unless `DSH_ACCESS_TOKEN` is set. Operator docs state that limit next to the run commands.

## Testing

Package tests in `dsh-client-connection` pin IP-literal grants on the non-privileged prefix, loopback-only privileged methods by default, and `privilegedIpLiterals`. Building and publishing the image is an operator path; it is not part of `pnpm run test`.
