#!/bin/sh
# Seed the web profile into $DSH_HOME: in-box dsh-base + dsh-web-app, then
# local + registry plugins. Runs at image build (DSH_HOME=/opt/dsh-seed) and
# is not used at container start unless the volume is empty (entrypoint copies
# the seed).
set -eu

PROFILE_DIR="${DSH_HOME}/profiles/web"
WS_YML="${PROFILE_DIR}/pnpm-workspace.yaml"
PNPM_EXTRA="--ignore-workspace-root-check --config.minimumReleaseAge=0"

echo "[seed] DSH_HOME=${DSH_HOME}"

# First invocation creates the web profile (dsh-base + dsh-web-app bundles).
dsh plugin --profile web list ${PNPM_EXTRA} >/tmp/dsh-plugin-list.out 2>&1 || true
if [ ! -d "${PROFILE_DIR}" ]; then
  echo "[seed] ERROR: web profile was not created" >&2
  cat /tmp/dsh-plugin-list.out >&2 || true
  exit 1
fi

if [ -f "${WS_YML}" ]; then
  if ! grep -q '^allowBuilds:' "${WS_YML}"; then
    cat >> "${WS_YML}" <<'EOF'

allowBuilds:
  node-pty: true
  protobufjs: true
minimumReleaseAge: 0
EOF
    echo "[seed] wrote allowBuilds + minimumReleaseAge=0"
  fi
fi

add_one() {
  echo "[seed] add $*"
  # shellcheck disable=SC2086
  dsh plugin --profile web add "$@" ${PNPM_EXTRA}
}

echo "[seed] mounting local plugins..."
add_one link:/srv/dsh/plugins/voltmind-skills
add_one link:/srv/dsh/plugins/voltmind-theme
add_one link:/srv/dsh/plugins/bda-api-pass

# Community scoped packages are often missing on npmmirror; use the origin registry.
printf 'registry=https://registry.npmjs.org\n' > "${PROFILE_DIR}/.npmrc"

add_try() {
  _ok=0
  for spec in "$@"; do
    echo "[seed] try ${spec}"
    # shellcheck disable=SC2086
    if dsh plugin --profile web add "${spec}" ${PNPM_EXTRA}; then
      _ok=1
      break
    fi
    echo "[seed] WARN: ${spec} failed, trying next spec if any"
  done
  if [ "${_ok}" -ne 1 ]; then
    echo "[seed] WARN: skipped (no spec succeeded): $*" >&2
    return 0
  fi
}

echo "[seed] installing registry plugins..."
add_try dshmarket
add_try @liustack/modlens
add_try dsh-at-file
add_try @changfenhuang/dsh-genui git+https://github.com/omdsh-dev/dsh-genui.git
add_try @dsh-external/dsh-visualize dsh-visualize github:Nagi-ovo/dsh-visualize git+https://github.com/Nagi-ovo/dsh-visualize.git
add_try dsh-better-sidebar
add_try @huanlin/dsh-plugin-better-sidebar-plugin-office
add_try dsh-files
add_try @wxg-prc-cpg/browser-skill-dsh-plugin
add_try @wxg-prc-cpg/dsh-weknora

PATCH="${PROFILE_DIR}/cordis.patch.yml"
TEMPLATE=/srv/dsh/image/profile.patch.yml
if [ -f "${TEMPLATE}" ]; then
  if [ ! -f "${PATCH}" ] || grep -q '^\[\]$' "${PATCH}" || ! grep -q 'ui-brand-official' "${PATCH}"; then
    # The shipped template is comments plus `[]`. Replace the empty array
    # with the brand-disable entries instead of concatenating after it.
    if [ -f "${PATCH}" ] && grep -q '^\[\]$' "${PATCH}"; then
      sed -i '/^\[\]$/d' "${PATCH}"
      cat "${TEMPLATE}" >> "${PATCH}"
    else
      cat "${TEMPLATE}" > "${PATCH}"
    fi
    echo "[seed] wrote ui-brand-official disable into cordis.patch.yml"
  fi
fi

echo "[seed] plugin list:"
dsh plugin --profile web list ${PNPM_EXTRA} || true
touch "${PROFILE_DIR}/.image-plugins-seeded"
echo "[seed] done"
