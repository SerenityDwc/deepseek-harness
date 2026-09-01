#!/bin/sh
# First start copies the image-seeded profile into DSH_HOME when the volume is
# empty, then starts dsh web bound to 0.0.0.0:$PORT.
set -eu

SEED=/opt/dsh-seed

if [ ! -d "${DSH_HOME}/profiles/web" ]; then
  echo "[dsh] seeding DSH_HOME=${DSH_HOME} from image"
  mkdir -p "${DSH_HOME}"
  cp -a "${SEED}/." "${DSH_HOME}/"
fi

if [ ! -f "${DSH_HOME}/settings.yaml" ]; then
  cp /srv/dsh/image/settings.yaml.tpl "${DSH_HOME}/settings.yaml"
  echo "[dsh] wrote settings.yaml from template"
fi

mkdir -p "${DSH_HOME}/skills"

TRUSTED_ARGS=""
if [ -n "${TRUSTED_HOSTS:-}" ]; then
  OLD_IFS="$IFS"
  IFS=','
  for h in $TRUSTED_HOSTS; do
    [ -n "$h" ] && TRUSTED_ARGS="$TRUSTED_ARGS --trusted-host $h"
  done
  IFS="$OLD_IFS"
fi

echo "[dsh] starting web on 0.0.0.0:${PORT} (DSH_HOME=${DSH_HOME})"
# shellcheck disable=SC2086
exec dsh --profile web --patch /srv/dsh/image/webserver.patch.yml --no-open --port "${PORT}" ${TRUSTED_ARGS}
