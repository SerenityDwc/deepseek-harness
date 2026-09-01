#!/bin/sh
# Repair profile artifacts that are valid in the image seed at /opt/dsh-seed
# but break after cp -a into a different-depth DSH_HOME, and point local
# plugins at the running dsh installation's @deepseek-ai packages.
set -eu

PROFILE="${DSH_HOME}/profiles/web"
if [ -d "${PROFILE}" ]; then
  # pnpm records `link:/abs` deps as relative symlinks. Those are valid while
  # DSH_HOME is /opt/dsh-seed (six `..` reaches /) and break after cp -a into
  # /srv/dsh/user (six `..` only reaches /srv).
  NM="${PROFILE}/node_modules"
  mkdir -p "${NM}/@voltmind"
  ln -sfn /srv/dsh/plugins/voltmind-skills "${NM}/@voltmind/dsh-skills"
  ln -sfn /srv/dsh/plugins/voltmind-theme "${NM}/@voltmind/dsh-theme"
  ln -sfn /srv/dsh/plugins/bda-api-pass "${NM}/bda-api-pass"

  # seed-plugins.sh used to append a list entry after the template's `[]`,
  # which is not valid YAML. Drop the empty-array sentinel.
  PATCH="${PROFILE}/cordis.patch.yml"
  if [ -f "${PATCH}" ] && grep -q '^\[\]$' "${PATCH}"; then
    sed -i '/^\[\]$/d' "${PATCH}"
  fi
fi

# voltmind-skills depends on dsh-tools / dsh-llm. An isolated `pnpm install
# --prod` in the plugin directory omits peers (cordis, dsh-session, …).
# Reuse the packages already installed next to the running `dsh` CLI.
CLI_DSH="/usr/local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai"
SKILLS_NM="/srv/dsh/plugins/voltmind-skills/node_modules"
if [ -d "${CLI_DSH}/dsh-tools" ] && [ -d "${CLI_DSH}/dsh-llm" ]; then
  rm -rf "${SKILLS_NM}"
  mkdir -p "${SKILLS_NM}"
  ln -sfn "${CLI_DSH}" "${SKILLS_NM}/@deepseek-ai"
fi
