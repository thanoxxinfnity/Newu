#!/usr/bin/env bash
# Pings every unique API URL in data/apis.json once (single HEAD/GET-style
# request per site via curl -L) and writes "<url>\t<http_code>" lines to
# the given output file. http_code "000" means the request failed entirely
# (DNS/connect/timeout). Run tools/merge_link_status.py afterwards to write
# the results back into data/apis.json.
#
# Usage: tools/check_links.sh <urls.txt> <results.tsv>
set -u

URLS_FILE="${1:?usage: check_links.sh <urls.txt> <results.tsv>}"
RESULTS_FILE="${2:?usage: check_links.sh <urls.txt> <results.tsv>}"

check_one() {
  local url="$1"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 12 -L --max-redirs 5 \
    -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" \
    "$url" 2>/dev/null)
  if [ -z "$code" ]; then code="000"; fi
  printf "%s\t%s\n" "$url" "$code"
}
export -f check_one

cat "$URLS_FILE" | xargs -P 40 -I{} bash -c 'check_one "$@"' _ {} > "$RESULTS_FILE"
