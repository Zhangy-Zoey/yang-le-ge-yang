#!/usr/bin/env bash
# 从微信开发者工具用户目录同步 yang-debug.log 到项目根目录
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/debug.log"
BASE="$HOME/Library/Application Support/微信开发者工具"
FOUND=""

if [[ -d "$BASE" ]]; then
  FOUND="$(find "$BASE" -name 'yang-debug.log' -print0 2>/dev/null | xargs -0 ls -t 2>/dev/null | head -1 || true)"
fi

if [[ -n "$FOUND" && -f "$FOUND" ]]; then
  cp "$FOUND" "$OUT"
  echo "synced: $FOUND -> $OUT"
  exit 0
fi

echo "yang-debug.log not found under: $BASE" >&2
echo "Run the game in WeChat DevTools first, then retry." >&2
exit 1
