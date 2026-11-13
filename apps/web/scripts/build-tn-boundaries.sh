#!/usr/bin/env bash
# Builds public/maps/tn-ac-2008.geojson: the 234 Tamil Nadu assembly
# constituencies on the 2008 delimitation, with one property, `ac` (the AC
# number), which the map joins to results.
#
# Source: DataMeet `assembly-constituencies/India_AC` at a pinned commit.
# Licence: CC BY 2.5 India (per that folder's README); the map credits it.
# Re-run only when moving to a newer DataMeet commit.
set -euo pipefail

COMMIT=7a1c21c2e3f059a19aba1023f64ed7e174462ca4
BASE="https://raw.githubusercontent.com/datameet/maps/${COMMIT}/assembly-constituencies"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/maps/tn-ac-2008.geojson"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
for ext in shp shx dbf prj; do
  curl -fsSL -o "${work}/India_AC.${ext}" "${BASE}/India_AC.${ext}"
done

mkdir -p "$(dirname "$OUT")"
pnpm dlx mapshaper@0.7.101 "${work}/India_AC.shp" \
  -filter 'ST_NAME === "TAMIL NADU"' \
  -each 'ac = AC_NO' \
  -filter-fields ac \
  -simplify 12% keep-shapes \
  -o "$OUT" format=geojson precision=0.0001

count="$(grep -o '"ac":' "$OUT" | wc -l)"
if [ "$count" -ne 234 ]; then
  echo "expected 234 constituencies, wrote ${count}" >&2
  exit 1
fi
echo "wrote ${OUT} ($(wc -c < "$OUT") bytes, ${count} constituencies)"
