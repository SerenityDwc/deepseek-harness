#!/bin/sh
set -eu

PORT="${PORT:-3080}"
case "$PORT" in
  ''|*[!0-9]*)
    echo "dsh docker: PORT must be a non-negative integer, got ${PORT}" >&2
    exit 1
    ;;
esac

# Named volume /root/.dsh hides the profile baked at image build. Seed once
# when the mount has no web profile yet.
if [ ! -f /root/.dsh/profiles/web/package.json ] && [ -d /opt/dsh-home-seed ]; then
  mkdir -p /root/.dsh
  cp -a /opt/dsh-home-seed/. /root/.dsh/
fi

cd /workspace

if [ -n "${DEEPSEEK_BASE_URL:-}" ]; then
  node /opt/dsh/deploy/docker/pin-llm-proxy.mjs || true
fi

if [ -n "${DSH_ACCESS_TOKEN:-}" ]; then
  UPSTREAM=$((PORT + 1))
  # Loopback-only dsh; the access proxy publishes PORT. Do not apply bind-all.
  # privileged-ip lets Settings/credentials use the browser's IP-literal Host.
  set -- web --patch /opt/dsh/deploy/docker/privileged-ip.patch.yml --no-open --port "$UPSTREAM"
  if [ -n "${DSH_TRUSTED_HOST:-}" ]; then
    old_ifs=$IFS
    IFS=,
    for host in $DSH_TRUSTED_HOST; do
      IFS=$old_ifs
      host=$(printf '%s' "$host" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
      [ -n "$host" ] || continue
      set -- "$@" --trusted-host "$host"
    done
    IFS=$old_ifs
  fi
  export DSH_LISTEN_PORT="$PORT"
  export DSH_UPSTREAM_PORT="$UPSTREAM"
  exec node /opt/dsh/deploy/docker/access-proxy.mjs \
    node /opt/dsh/apps/cli/lib/bin.js "$@"
fi

# `--patch` belongs on the `web` subcommand (or with `--profile web` on the
# root). Parent `--patch` before `web` is rejected by the launcher.
set -- web --patch /opt/dsh/deploy/docker/bind-all.patch.yml --no-open --port "$PORT"
if [ -n "${DSH_TRUSTED_HOST:-}" ]; then
  old_ifs=$IFS
  IFS=,
  for host in $DSH_TRUSTED_HOST; do
    IFS=$old_ifs
    host=$(printf '%s' "$host" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    [ -n "$host" ] || continue
    set -- "$@" --trusted-host "$host"
  done
  IFS=$old_ifs
fi
exec node /opt/dsh/apps/cli/lib/bin.js "$@"
