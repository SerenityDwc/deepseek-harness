#!/bin/sh
# Install the scientific venv. Try several China PyPI mirrors; Tsinghua often
# 403s Docker builders on wheel URLs.
set -eu

venv=/opt/scientific-python
python3 -m venv "$venv"
pip="$venv/bin/pip"
req=/opt/dsh/deploy/docker/requirements-scientific.txt

mirrors='
https://mirrors.aliyun.com/pypi/simple
https://mirrors.cloud.tencent.com/pypi/simple
https://pypi.mirrors.ustc.edu.cn/simple
https://pypi.tuna.tsinghua.edu.cn/simple
'

ok=0
for idx in $mirrors; do
  host=${idx#https://}
  host=${host%%/*}
  echo "dsh docker: pip index $idx" >&2
  if "$pip" install --upgrade pip setuptools wheel -i "$idx" --trusted-host "$host" \
    && "$pip" install --no-cache-dir -i "$idx" --trusted-host "$host" -r "$req"; then
    ok=1
    break
  fi
  echo "dsh docker: pip failed on $idx, trying next" >&2
done

if [ "$ok" -ne 1 ]; then
  echo "dsh docker: all PyPI mirrors failed" >&2
  exit 1
fi
