# Run the Web UI in Docker

English | [中文](README.zh.md)

This image boots `dsh web` with an overlay that binds `0.0.0.0` so Docker port publishing can reach the process. The product CLI still rejects `--host 0.0.0.0`; the overlay is the container's explicit network exposure. The published port has no authentication unless `DSH_ACCESS_TOKEN` is set. Without that token, serve the image only on a network you trust: the agent can run commands in the mounted workspace.

Without `DSH_ACCESS_TOKEN`, Settings and credential RPCs stay loopback-only. Pass `DEEPSEEK_API_KEY` (and optional `DEEPSEEK_BASE_URL`) into the container instead of saving a key from a remote browser. With the token, the access-token overlay also sets `privilegedIpLiterals`, so a token-authenticated LAN browser can load Settings → Models.

The image seeds the `web` profile with:

- `@voltmind/dsh-skills` and `@voltmind/dsh-theme` from a sibling **aiworkspace** checkout (`--build-context voltmind=…`)
- `@wxg-prc-cpg/dsh-weknora` (disable with `--build-arg DSH_PRESET_WEKNORA=0`)
- `@wxg-prc-cpg/browser-skill-dsh-plugin` ([BrowserSkill](https://github.com/Tencent/BrowserSkill); disable with `--build-arg DSH_PRESET_BROWSERSKILL=0`)

`WEKNORA_API_KEY` defaults from the Dockerfile `ENV`. `WEKNORA_BASE_URL` must be the API root shown on the WeKnora publish page (currently `http://8.149.246.29/api/v1`, without `:8000`). Override both at run time if needed.

The BrowserSkill plugin only injects native `browser_*` tools into dsh; driving a real browser still needs the host-side `bsk` CLI and browser extension (see upstream docs).

The image also installs a Python science stack into `/opt/scientific-python` (`pandas`, `numpy`, `matplotlib`, `scipy`, `openpyxl`, `seaborn`, `xlrd`, `requests`, `beautifulsoup4`) and `fonts-noto-cjk` so data-analysis skills can render Chinese chart labels. Pip tries Aliyun, then Tencent, USTC, and Tsinghua indexes.

## Build

From the **deepseek-harness** repository root (aiworkspace must sit next to it as `../aiworkspace`):

```sh
docker build -t deepseek-harness:local \
  --build-context voltmind=../aiworkspace .
```

Or from `deploy/docker`:

```sh
docker compose -f deploy/docker/docker-compose.yml build
```

The compose file sets `additional_contexts.voltmind` to `../../../aiworkspace`. The first build compiles dsh, builds the two VoltMind packages, and installs them plus WeKnora into `/root/.dsh` profiles/web.

## Run and choose the host port

Map a host port to container port `3080` (the default listen port). Replace `8080` with any free host port:

```sh
docker run --rm -p 8080:3080 \
  -e DEEPSEEK_API_KEY \
  -v "${PWD}:/workspace" \
  deepseek-harness:local
```

Open `http://127.0.0.1:8080` on the same machine, or `http://<host-ip>:8080` from another machine on the trusted network. A canonical IP-literal Host is accepted on ordinary `/api` routes. A DNS name needs `DSH_TRUSTED_HOST` (comma-separated `host` or `host:port` entries, forwarded as `--trusted-host`).

When `DSH_ACCESS_TOKEN` is set, the published port runs an access proxy in front of loopback `dsh web`. Direct visits without the header `x-dsh-access-token` receive 401. Query parameters and cookies are ignored, so a leftover browser cookie cannot reopen the port after logout. Loopback requests (including the image HEALTHCHECK) skip the token. The proxy does not rewrite `Host` or `Origin`. The token overlay sets connection `privilegedIpLiterals` so Settings and credential RPCs accept the same IP-literal Host as ordinary methods.

To listen on a different port inside the container, set `PORT` and publish that same port:

```sh
docker run --rm -p 9000:9000 -e PORT=9000 \
  -e DEEPSEEK_API_KEY \
  -v "${PWD}:/workspace" \
  deepseek-harness:local
```

`docker compose` from this directory publishes `${DSH_PORT:-3080}` on the host:

```sh
export DEEPSEEK_API_KEY
export DSH_PORT=8080
export DSH_WORKSPACE=/path/to/project
docker compose -f deploy/docker/docker-compose.yml up --build
```

## Workspace and home

The process cwd is `/workspace`. Mount the project you want the agent to edit there, then add that directory in **Choose workspace**. Session data and other harness files live in `/root/.dsh`; the compose file keeps that directory on a named volume. An empty volume is seeded from `/opt/dsh-home-seed` on first start. If an older volume already has a `web` profile without these plugins, recreate that volume.

## Related

- [Web UI guide](../../docs/user/guide/index.md)
- [API browser-trust fence](../../.agents/notes/implemented/architecture/2026-07-28-api-browser-trust-boundary.md)
- [Docker Web image Agent Note](../../.agents/notes/implemented/feature/2026-08-24-docker-web-image.md)
