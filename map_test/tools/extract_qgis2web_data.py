#!/usr/bin/env python3
"""
Extract qgis2web data/*.js variables into one clean GeoJSON file.

Usage:
  python tools/extract_qgis2web_data.py /path/to/qgis2web/index.html --out data/combined.geojson

Run this from the clean_swansea_svg_map folder after copying the original qgis2web
data/ directory into this folder, or point --data-dir at the original data directory.
"""

from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path


def read_index(path: Path) -> str:
    raw = path.read_text(encoding="utf-8", errors="replace")

    # Handles a browser "view-source" save where code is inside spans and escaped.
    if 'body id="viewsource"' in raw:
      raw = re.sub(r"<[^>]+>", "", raw)
      raw = html.unescape(raw)

    return raw


def extract_data_scripts(index_source: str) -> list[tuple[str, str]]:
    scripts = re.findall(r'<script\s+src="(data/([^"]+\.js))"\s*></script>', index_source)
    return scripts


def load_qgis2web_var(path: Path) -> tuple[str, dict]:
    text = path.read_text(encoding="utf-8", errors="replace")
    match = re.search(r"\bvar\s+(json_[A-Za-z0-9_]+)\s*=\s*(\{.*\})\s*;?\s*$", text, re.S)
    if not match:
        raise ValueError(f"Could not find a qgis2web GeoJSON variable in {path}")

    return match.group(1), json.loads(match.group(2))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("index", type=Path, help="Original qgis2web index.html")
    parser.add_argument("--data-dir", type=Path, default=None, help="Directory containing qgis2web data/*.js files")
    parser.add_argument("--out", type=Path, default=Path("data/combined.geojson"))
    args = parser.parse_args()

    index_source = read_index(args.index)
    data_dir = args.data_dir or args.index.parent / "data"

    features = []
    missing = []

    for script_path, filename in extract_data_scripts(index_source):
        js_path = data_dir / filename
        if not js_path.exists():
            missing.append(str(js_path))
            continue

        var_name, geojson = load_qgis2web_var(js_path)
        source_features = geojson.get("features", [geojson])
        for feature in source_features:
            feature.setdefault("properties", {})
            feature["properties"]["_qgis2web_var"] = var_name
            feature["properties"]["_qgis2web_file"] = script_path
            features.append(feature)

    collection = {
        "type": "FeatureCollection",
        "features": features
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(collection, ensure_ascii=False), encoding="utf-8")

    print(f"Wrote {len(features)} features to {args.out}")
    if missing:
        print("\nMissing data files:")
        for item in missing:
            print(f"  - {item}")


if __name__ == "__main__":
    main()
