# =============================================================================
# deepseek-harness:v1.0.1
#
# Runtime is the published `dsh` CLI. The web profile already composes
# @deepseek-ai/dsh-base + @deepseek-ai/dsh-web-app; extra plugins are seeded
# into /opt/dsh-seed at build time and copied into DSH_HOME on first start.
#
# Prerequisites: build.ps1 stages and compiles plugins/ before this file runs.
# =============================================================================

ARG BASE_IMAGE=docker.m.daocloud.io/library/node:22-bookworm-slim
FROM ${BASE_IMAGE}

ARG NPM_REGISTRY=https://registry.npmmirror.com
ARG DSH_VERSION=latest

RUN npm config set registry "$NPM_REGISTRY"

# Debian mirror: Aliyun. Security lives on a separate debian-security tree.
RUN rm -f /var/lib/apt/lists/lock /var/cache/apt/archives/lock /var/lib/dpkg/lock-frontend 2>/dev/null; \
    cat > /etc/apt/sources.list.d/debian.sources <<'EOF'
Types: deb
URIs: http://mirrors.aliyun.com/debian
Suites: bookworm bookworm-updates
Components: main
Signed-By: /usr/share/keyrings/debian-archive-keyring.gpg

Types: deb
URIs: http://mirrors.aliyun.com/debian-security
Suites: bookworm-security
Components: main
Signed-By: /usr/share/keyrings/debian-archive-keyring.gpg
EOF

RUN apt-get update -qq \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends \
      python3 python3-pandas python3-numpy python3-matplotlib python3-scipy \
      python3-openpyxl python3-requests python3-bs4 python3-xlrd \
      make g++ git curl ca-certificates fonts-noto-cjk \
 && ln -sf /usr/bin/python3 /usr/local/bin/python \
 && git config --global url."https://github.com/".insteadOf "git@github.com:" \
 && git config --global url."https://github.com/".insteadOf "git+ssh://git@github.com/" \
 && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@11.7.0 \
 && npm install -g "@deepseek-ai/dsh@${DSH_VERSION}" \
 && pnpm config set registry "$NPM_REGISTRY"

ENV DSH_HOME=/srv/dsh/user \
    PORT=3080 \
    VOLTMIND_PYTHON=python3 \
    npm_config_registry=${NPM_REGISTRY}

WORKDIR /srv/dsh

COPY plugins/voltmind-skills /srv/dsh/plugins/voltmind-skills
COPY plugins/voltmind-theme /srv/dsh/plugins/voltmind-theme
COPY plugins/bda-api-pass /srv/dsh/plugins/bda-api-pass

# voltmind-skills imports @deepseek-ai/dsh-tools / dsh-llm at runtime.
# Reuse the copies next to the `dsh` CLI so peers (cordis, dsh-session, …)
# resolve from the same graph the process already loaded.
RUN mkdir -p /srv/dsh/plugins/voltmind-skills/node_modules \
 && ln -sfn /usr/local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai \
      /srv/dsh/plugins/voltmind-skills/node_modules/@deepseek-ai

COPY seed-plugins.sh entrypoint.sh /usr/local/bin/
COPY webserver.patch.yml profile.patch.yml settings.yaml.tpl /srv/dsh/image/
RUN sed -i 's/\r$//' /usr/local/bin/seed-plugins.sh /usr/local/bin/entrypoint.sh \
 && chmod +x /usr/local/bin/seed-plugins.sh /usr/local/bin/entrypoint.sh

# Bake plugins into the image seed so first container start does not need npm.
ENV DSH_HOME=/opt/dsh-seed
RUN /usr/local/bin/seed-plugins.sh
ENV DSH_HOME=/srv/dsh/user

# Copied after the seed so editing the healer does not rebuild plugin install.
COPY heal-profile-links.sh /usr/local/bin/heal-profile-links.sh
COPY start.sh /usr/local/bin/start.sh
RUN sed -i 's/\r$//' /usr/local/bin/heal-profile-links.sh /usr/local/bin/start.sh \
 && chmod +x /usr/local/bin/heal-profile-links.sh /usr/local/bin/start.sh

EXPOSE 3080
ENTRYPOINT ["start.sh"]
