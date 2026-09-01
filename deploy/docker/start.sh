#!/bin/sh
set -eu
/usr/local/bin/heal-profile-links.sh
exec /usr/local/bin/entrypoint.sh
