# DeepSeek Harness Web UI image. Build from the repository root:
#   docker build -t deepseek-harness:local \
#     --build-context voltmind=../aiworkspace .
# Run instructions: deploy/docker/README.md
#
# Named context `voltmind` must point at the aiworkspace checkout that holds
# packages/voltmind-skills and packages/voltmind-theme.
# (Requires BuildKit / Docker Desktop; do not pin # syntax=docker/dockerfile
#  when Docker Hub is unreachable.)
FROM node:22.19-bookworm

# Build toolchain (node-gyp) + CJK fonts for matplotlib.
# Use Aliyun Debian mirrors — default deb.debian.org is often unreachable here.
RUN rm -f /etc/apt/sources.list.d/debian.sources \
  && printf '%s\n' \
    'deb http://mirrors.aliyun.com/debian bookworm main' \
    'deb http://mirrors.aliyun.com/debian bookworm-updates main' \
    'deb http://mirrors.aliyun.com/debian-security bookworm-security main' \
    > /etc/apt/sources.list \
  && apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    python3-setuptools \
    make \
    g++ \
    git \
    curl \
    fontconfig \
    fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/* \
  && fc-cache -f

RUN corepack enable && corepack prepare pnpm@11.7.0 --activate

# Scientific venv (own layer so source COPY does not redo pip).
COPY deploy/docker/requirements-scientific.txt deploy/docker/install-scientific-python.sh /opt/dsh/deploy/docker/
# Windows worktrees may still COPY CRLF; strip so the shebang is `/bin/sh`.
RUN sed -i 's/\r$//' /opt/dsh/deploy/docker/install-scientific-python.sh \
  && chmod +x /opt/dsh/deploy/docker/install-scientific-python.sh \
  && /opt/dsh/deploy/docker/install-scientific-python.sh

ENV PATH="/opt/scientific-python/bin:${PATH}"
ENV MATPLOTLIBRC=/opt/dsh/deploy/docker/matplotlibrc
ENV MPLBACKEND=Agg

# npm registry is often unreachable from this builder; pnpm/npm both read this.
RUN printf '%s\n' \
  'registry=https://registry.npmmirror.com' \
  'fetch-timeout=600000' \
  'fetch-retries=8' \
  > /root/.npmrc

WORKDIR /opt/dsh

ARG DSH_CLIENT_COMMIT_HASH=0000000
ENV CI=true
ENV DSH_CLIENT_COMMIT_HASH=$DSH_CLIENT_COMMIT_HASH

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm run build

# VoltMind out-of-tree plugins (sibling aiworkspace via --build-context voltmind=…).
COPY --from=voltmind tsconfig.base.json /opt/voltmind/tsconfig.base.json
COPY --from=voltmind packages/voltmind-skills /opt/voltmind/packages/voltmind-skills
COPY --from=voltmind packages/voltmind-theme /opt/voltmind/packages/voltmind-theme

WORKDIR /opt/voltmind/packages/voltmind-skills
# pnpm 11 ignores dependency build scripts unless allowBuilds is set (esbuild).
# tsconfig.build.json includes src tests; skip them so the image build does not
# compile test files.
RUN printf '%s\n' 'allowBuilds:' '  esbuild: true' > pnpm-workspace.yaml \
  && pnpm install \
  && python3 -c "import json; p='tsconfig.build.json'; d=json.load(open(p)); d['exclude']=['**/*.test.ts']; json.dump(d, open(p,'w'), indent=2)" \
  && pnpm run build \
  && pnpm prune --prod

# Join the already-built dsh workspace so @deepseek-ai/* resolve to /opt/dsh
# (public npm "latest" is still 0.0.1-rc and does not satisfy ^0.1.1).
WORKDIR /opt/dsh
RUN python3 - <<'PY'
from pathlib import Path
p = Path("pnpm-workspace.yaml")
text = p.read_text(encoding="utf-8")
entry = "  - ../voltmind/packages/voltmind-theme"
if entry not in text:
    text = text.replace("packages:\n", "packages:\n" + entry + "\n", 1)
    p.write_text(text, encoding="utf-8")
ts = Path("/opt/voltmind/packages/voltmind-theme/tsconfig.build.json")
data = __import__("json").loads(ts.read_text(encoding="utf-8"))
data["exclude"] = ["**/*.test.ts"]
ts.write_text(__import__("json").dumps(data, indent=2) + "\n", encoding="utf-8")
PY
RUN pnpm install --no-frozen-lockfile --filter @voltmind/dsh-theme...
RUN pnpm --filter @voltmind/dsh-theme run build

# Seed the web profile: VoltMind + WeKnora + BrowserSkill dsh plugin.
# BrowserSkill still needs a host-side `bsk` CLI + browser extension to drive a
# real browser; this step only installs the dsh plugin layer.
# See https://github.com/Tencent/BrowserSkill
ARG DSH_PRESET_WEKNORA=1
ARG DSH_PRESET_BROWSERSKILL=1
ENV DSH_HOME=/root/.dsh
RUN set -eux; \
  node /opt/dsh/apps/cli/lib/bin.js plugin --profile web add \
    link:/opt/voltmind/packages/voltmind-skills \
    link:/opt/voltmind/packages/voltmind-theme \
    --ignore-workspace-root-check; \
  npm_pkgs=""; \
  if [ "$DSH_PRESET_WEKNORA" = "1" ]; then \
    npm_pkgs="$npm_pkgs @wxg-prc-cpg/dsh-weknora"; \
  fi; \
  if [ "$DSH_PRESET_BROWSERSKILL" = "1" ]; then \
    npm_pkgs="$npm_pkgs @wxg-prc-cpg/browser-skill-dsh-plugin"; \
  fi; \
  if [ -n "$npm_pkgs" ]; then \
    # shellcheck disable=SC2086
    node /opt/dsh/apps/cli/lib/bin.js plugin --profile web add \
      $npm_pkgs \
      --ignore-workspace-root-check; \
  fi \
  && cp -a /root/.dsh /opt/dsh-home-seed

WORKDIR /workspace
VOLUME ["/workspace", "/root/.dsh"]

ENV PORT=3080
ENV WEKNORA_BASE_URL=http://8.149.246.29/api/v1
ENV WEKNORA_API_KEY=sk-BrrapQsTzhOG3fL6SqUzE8vo_t77ghq19q3epWSD8r4
EXPOSE 3080

RUN sed -i 's/\r$//' /opt/dsh/deploy/docker/entrypoint.sh \
    /opt/dsh/deploy/docker/access-proxy.mjs \
    /opt/dsh/deploy/docker/access-proxy-auth.mjs \
    /opt/dsh/deploy/docker/pin-llm-proxy.mjs \
  && chmod +x /opt/dsh/deploy/docker/entrypoint.sh \
  && ln -s /opt/dsh/deploy/docker/entrypoint.sh /usr/local/bin/dsh-web

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||'3080')+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dsh-web"]
