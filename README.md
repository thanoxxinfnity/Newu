# Public APIs Explorer

A fast, dependency-free web app for browsing the [public-apis](https://github.com/public-apis/public-apis) list — 1,900+ free APIs across 51 categories.

## Features

- Full-text search across API name and description
- Filter by category, auth type, HTTPS support, and CORS support
- Sort by name or category
- Favorites (saved locally in your browser)
- Dark / light theme toggle
- Infinite-scroll rendering for smooth performance with ~1,900 entries
- Fully static — no build step, no backend, no dependencies

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
