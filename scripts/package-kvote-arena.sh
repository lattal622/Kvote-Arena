#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT="$ROOT/artifacts/kvote-arena/public/kvote-arena-source.zip"

mkdir -p "$(dirname "$OUTPUT")"
rm -f "$OUTPUT"

cd "$ROOT"
zip -q -r "$OUTPUT" . \
  -x "./.git/*" \
  -x "./.local/*" \
  "./.agents/*" \
  -x "./.cache/*" \
  -x "./.conversation/*" \
  "node_modules/*" \
  -x "*/node_modules/*" \
  -x "*/dist/*" \
  -x "*/build/*" \
  -x "*/.turbo/*" \
  -x "*/.cache/*" \
  -x "./artifacts/kvote-arena/public/kvote-arena-source.zip" \
  -x "*/.env" \
  -x "*/.env.*" \
  -x "*.tsbuildinfo"

printf 'Created %s\n' "$OUTPUT"
