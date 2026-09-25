#!/usr/bin/env python3
"""Merge tools/check_links.sh results into data/apis.json.

Adds two fields to every entry:
  - linkStatus: "ok" | "blocked" | "broken"
      ok      -> 2xx/3xx response
      blocked -> 4xx that usually means "server is up but rejected the
                 request" (401/402/403/405/406/429/400) - common for APIs
                 that block bare curl requests or require auth up front
      broken  -> 404/410/5xx, or no response at all (connect/DNS/timeout)
  - httpCode: the raw status code observed (or null if the request failed)

Usage:
    python3 tools/merge_link_status.py <results.tsv> <data/apis.json>
"""
import json
import sys

OK = {"200", "201", "202", "203", "204", "301", "302", "303", "307", "308"}
BLOCKED = {"400", "401", "402", "403", "405", "406", "429"}
BROKEN = {"404", "410", "500", "501", "502", "503", "504", "525", "000"}


def classify(code):
    if code in OK:
        return "ok"
    if code in BLOCKED:
        return "blocked"
    if code in BROKEN:
        return "broken"
    return "unknown"


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)

    results_path, apis_path = sys.argv[1], sys.argv[2]

    results = {}
    with open(results_path, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line or line == "DONE":
                continue
            url, code = line.rsplit("\t", 1)
            results[url] = code

    with open(apis_path, encoding="utf-8") as f:
        data = json.load(f)

    counts = {"ok": 0, "blocked": 0, "broken": 0, "unknown": 0}
    for item in data:
        code = results.get(item["url"], "")
        status = classify(code)
        item["linkStatus"] = status
        item["httpCode"] = code or None
        counts[status] += 1

    with open(apis_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

    print(f"Updated {apis_path}: {counts}")


if __name__ == "__main__":
    main()
