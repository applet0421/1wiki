#!/usr/bin/env bash
set -euo pipefail

site_url="${SITE_URL:?SITE_URL must be set, for example https://www.1wiki.org}"
site_url="${site_url%/}"
limit="${PREWARM_LIMIT:-100}"
temp_sitemap="$(mktemp)"
trap 'rm -f "$temp_sitemap"' EXIT

case "$limit" in
  ''|*[!0-9]*) echo "PREWARM_LIMIT must be a non-negative integer" >&2; exit 2 ;;
esac

echo "Prewarming ${site_url}/zh-tw and up to ${limit} sitemap URLs"
curl --fail --silent --show-error --max-time 20 "${site_url}/sitemap.xml" > "$temp_sitemap"
{
  printf '%s\n' "${site_url}/zh-tw"
  sed -n 's:.*<loc>\([^<]*\)</loc>.*:\1:p' "$temp_sitemap" \
    | head -n "$limit"
} | awk 'NF && !seen[$0]++' | while IFS= read -r url; do
  curl --fail --silent --show-error --max-time 20 -o /dev/null "$url"
  echo "warmed $url"
done
