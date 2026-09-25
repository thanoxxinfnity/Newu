#!/usr/bin/env python3
"""Parse the public-apis README.md category tables into data/apis.json.

Usage:
    python3 tools/parse_readme.py <path-to-README.md> <output-json-path>
"""
import json
import re
import sys
from collections import Counter

ROW_RE = re.compile(
    r"^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|"
)
HEADER_RE = re.compile(r"^\|?\s*API\s*\|\s*Description\s*\|\s*Auth\s*\|\s*HTTPS\s*\|\s*CORS")
SEPARATOR_RE = re.compile(r"^\|?:?-{2,}")


def parse(readme_path):
    with open(readme_path, encoding="utf-8") as f:
        lines = f.readlines()

    current_category = None
    in_table = False
    data = []

    for line in lines:
        stripped = line.strip()

        if stripped.startswith("### "):
            current_category = stripped[4:].strip()
            in_table = False
            continue

        if current_category is None:
            continue

        if HEADER_RE.match(stripped):
            in_table = True
            continue

        if in_table and SEPARATOR_RE.match(stripped):
            continue

        if in_table:
            if not stripped.startswith("|"):
                in_table = False
                continue
            m = ROW_RE.match(stripped)
            if m:
                name, url, desc, auth, https, cors = m.groups()
                auth = auth.replace("`", "").strip()
                if auth.lower() in ("no", ""):
                    auth = "No"
                data.append(
                    {
                        "category": current_category,
                        "name": name.strip(),
                        "url": url.strip(),
                        "description": desc.strip(),
                        "auth": auth,
                        "https": https.strip(),
                        "cors": cors.strip(),
                    }
                )

    return data


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)

    readme_path, out_path = sys.argv[1], sys.argv[2]
    data = parse(readme_path)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

    counts = Counter(d["category"] for d in data)
    print(f"Parsed {len(data)} APIs across {len(counts)} categories -> {out_path}")


if __name__ == "__main__":
    main()
