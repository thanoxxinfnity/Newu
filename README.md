# Public APIs Explorer

A fast, dependency-free web app for browsing the [public-apis](https://github.com/public-apis/public-apis) list — 1,900+ free APIs across 51 categories.

## Features

- Full-text search across API name and description
- Filter by category, auth type, HTTPS support, CORS support, and link status
- Sort by name or category
- Favorites (saved locally in your browser)
- Dark / light theme toggle
- Infinite-scroll rendering for smooth performance with ~1,900 entries
- Fully static — no build step, no backend, no dependencies

## Link health

Every entry's URL was pinged once (`tools/check_links.sh`) and tagged with
a `linkStatus`:

- **ok** — responded 2xx/3xx
- **blocked** — responded 401/402/403/405/406/429/400 (server is up, just
  rejected a bare automated request — common for APIs that require auth
  headers or block bots)
- **broken** — 404/410/5xx, or no response at all (DNS/connect/timeout)

Entries flagged `broken` show a warning on their card and can be
filtered via the "Link status" dropdown. This is a point-in-time check
against the live public-apis list (1,448 ok / 220 blocked / 240 broken
as of the last run) — the upstream README is community-maintained, so
some churn is expected. Re-run the check with:

```bash
python3 -c "import json;print('\n'.join(sorted({d['url'] for d in json.load(open('data/apis.json'))})))" > /tmp/urls.txt
tools/check_links.sh /tmp/urls.txt /tmp/results.tsv
python3 tools/merge_link_status.py /tmp/results.tsv data/apis.json
```

## Running locally

Any static file server works, e.g.:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Data

`data/apis.json` is generated from the public-apis README table format (`API | Description | Auth | HTTPS | CORS`) via `tools/parse_readme.py`. To refresh it with the latest upstream list:

```bash
curl -o /tmp/public-apis-readme.md https://raw.githubusercontent.com/public-apis/public-apis/master/README.md
python3 tools/parse_readme.py /tmp/public-apis-readme.md data/apis.json
```
