#!/usr/bin/env python3
"""
Build a clean, projected SVG from qgis2web GeoJSON-as-JS data files.

Input signature supported:
  var json_LAYER_NAME = {"type":"FeatureCollection", ...};

Typical usage from the package root:
  python3 tools/build_projected_svg.py --manifest data/layers-manifest.json --data-dir data --out-svg out/swansea.svg --out-json out/swansea-projection.json

The output SVG contains one <path> per source feature, projected from CRS84/WGS84
lon-lat into EPSG:3857 Web Mercator and fitted into the requested SVG viewport.
"""

from __future__ import annotations

import argparse
import json
import math
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Iterable

RADIUS = 6378137.0
MAX_WEB_MERCATOR_LAT = 85.0511287798066


@dataclass
class Bounds:
    min_x: float = math.inf
    min_y: float = math.inf
    max_x: float = -math.inf
    max_y: float = -math.inf

    def include(self, x: float, y: float) -> None:
        self.min_x = min(self.min_x, x)
        self.min_y = min(self.min_y, y)
        self.max_x = max(self.max_x, x)
        self.max_y = max(self.max_y, y)

    @property
    def width(self) -> float:
        return self.max_x - self.min_x

    @property
    def height(self) -> float:
        return self.max_y - self.min_y

    def as_dict(self) -> dict[str, float]:
        return {
            "minX": self.min_x,
            "minY": self.min_y,
            "maxX": self.max_x,
            "maxY": self.max_y,
        }


def load_qgis2web_var(path: Path) -> tuple[str, dict[str, Any]]:
    text = path.read_text(encoding="utf-8", errors="replace").strip()
    match = re.match(r"^\s*var\s+(json_[A-Za-z0-9_]+)\s*=\s*(\{.*\})\s*;?\s*$", text, re.S)
    if not match:
        raise ValueError(f"Unsupported qgis2web data signature in {path}")
    return match.group(1), json.loads(match.group(2))


def lonlat_to_web_mercator(lon: float, lat: float) -> tuple[float, float]:
    lat = max(-MAX_WEB_MERCATOR_LAT, min(MAX_WEB_MERCATOR_LAT, float(lat)))
    lon = float(lon)
    x = RADIUS * math.radians(lon)
    y = RADIUS * math.log(math.tan(math.pi / 4.0 + math.radians(lat) / 2.0))
    return x, -y  # SVG y-axis increases downward; invert so north is visually up.


def for_each_coordinate(geometry: dict[str, Any], callback: Callable[[list[float]], None]) -> None:
    if not geometry:
        return
    gtype = geometry.get("type")
    coords = geometry.get("coordinates")

    if gtype == "Point":
        callback(coords)
    elif gtype in {"MultiPoint", "LineString"}:
        for coord in coords:
            callback(coord)
    elif gtype in {"MultiLineString", "Polygon"}:
        for line in coords:
            for coord in line:
                callback(coord)
    elif gtype == "MultiPolygon":
        for polygon in coords:
            for ring in polygon:
                for coord in ring:
                    callback(coord)
    elif gtype == "GeometryCollection":
        for child in geometry.get("geometries", []):
            for_each_coordinate(child, callback)
    else:
        raise ValueError(f"Unsupported geometry type: {gtype}")


def compute_projected_bounds(features: list[dict[str, Any]]) -> Bounds:
    bounds = Bounds()
    for feature in features:
        for_each_coordinate(feature["geometry"], lambda coord: bounds.include(*lonlat_to_web_mercator(coord[0], coord[1])))
    if not math.isfinite(bounds.min_x):
        raise ValueError("No coordinates found")
    return bounds


def fit_transform(bounds: Bounds, width: int, height: int, padding: int) -> dict[str, float]:
    scale = min((width - padding * 2) / bounds.width, (height - padding * 2) / bounds.height)
    offset_x = (width - bounds.width * scale) / 2 - bounds.min_x * scale
    offset_y = (height - bounds.height * scale) / 2 - bounds.min_y * scale
    return {"scale": scale, "offsetX": offset_x, "offsetY": offset_y}


def project_point(coord: list[float], transform: dict[str, float]) -> tuple[float, float]:
    x, y = lonlat_to_web_mercator(coord[0], coord[1])
    return x * transform["scale"] + transform["offsetX"], y * transform["scale"] + transform["offsetY"]


def fmt(point: tuple[float, float]) -> str:
    return f"{point[0]:.2f} {point[1]:.2f}"


def line_to_path(line: list[list[float]], transform: dict[str, float], close: bool = False) -> str:
    if not line:
        return ""
    points = [project_point(coord, transform) for coord in line]
    first, rest = points[0], points[1:]
    parts = [f"M {fmt(first)}", *[f"L {fmt(point)}" for point in rest]]
    if close:
        parts.append("Z")
    return " ".join(parts)


def geometry_to_path(geometry: dict[str, Any], transform: dict[str, float]) -> str:
    gtype = geometry.get("type")
    coords = geometry.get("coordinates")
    if gtype == "Polygon":
        return " ".join(line_to_path(ring, transform, close=True) for ring in coords)
    if gtype == "MultiPolygon":
        return " ".join(
            line_to_path(ring, transform, close=True)
            for polygon in coords
            for ring in polygon
        )
    if gtype == "LineString":
        return line_to_path(coords, transform)
    if gtype == "MultiLineString":
        return " ".join(line_to_path(line, transform) for line in coords)
    raise ValueError(f"Unsupported SVG path geometry type: {gtype}")


def css_style(style: dict[str, Any]) -> str:
    fill = style.get("fill", "rgba(5,27,58,1.0)")
    stroke = style.get("stroke", "rgba(5,27,58,1.0)")
    stroke_width = style.get("strokeWidth", 1)
    fill_opacity = style.get("fillOpacity", 1)
    stroke_opacity = style.get("strokeOpacity", 1)
    dash = style.get("dashArray")
    parts = [
        f"fill:{fill}",
        f"fill-opacity:{fill_opacity}",
        f"stroke:{stroke}",
        f"stroke-opacity:{stroke_opacity}",
        f"stroke-width:{stroke_width}",
        "vector-effect:non-scaling-stroke",
    ]
    if dash:
        parts.append(f"stroke-dasharray:{dash}")
    return ";".join(parts)


def escape_attr(value: Any) -> str:
    text = str(value)
    return (
        text.replace("&", "&amp;")
        .replace('"', "&quot;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def load_features(manifest: dict[str, Any], data_dir: Path) -> tuple[list[dict[str, Any]], list[str]]:
    items: list[dict[str, Any]] = []
    missing: list[str] = []

    for layer in manifest["layers"]:
        source_name = Path(layer["source"]).name
        js_path = data_dir / source_name
        if not js_path.exists():
            missing.append(str(js_path))
            continue
        var_name, collection = load_qgis2web_var(js_path)
        source_features = collection.get("features", [])
        for index, feature in enumerate(source_features):
            props = dict(feature.get("properties") or {})
            props.setdefault("_qgis2web_var", var_name)
            props.setdefault("_qgis2web_file", layer["source"])
            items.append({
                "feature": {**feature, "properties": props},
                "layer": layer,
                "featureIndex": index,
            })

    return items, missing


def build_svg(items: list[dict[str, Any]], manifest: dict[str, Any], width: int, height: int, padding: int) -> tuple[str, dict[str, Any]]:
    features = [item["feature"] for item in items]
    bounds = compute_projected_bounds(features)
    transform = fit_transform(bounds, width, height, padding)

    paths: list[str] = []
    for i, item in enumerate(sorted(items, key=lambda it: it["layer"].get("zIndex", 0))):
        feature = item["feature"]
        props = feature.get("properties") or {}
        layer = item["layer"]
        d = geometry_to_path(feature["geometry"], transform)
        label = props.get("WD25NM") or props.get("name") or layer.get("name") or f"feature-{i}"
        path = (
            f'<path class="map-feature" id="feature-{i}" '
            f'data-layer="{escape_attr(layer.get("name", ""))}" '
            f'data-source="{escape_attr(layer.get("source", ""))}" '
            f'data-name="{escape_attr(label)}" '
            f'data-feature-index="{i}" '
            f'style="{escape_attr(css_style(layer.get("style") or {}))}" '
            f'fill-rule="evenodd" d="{escape_attr(d)}" />'
        )
        paths.append(path)

    metadata = {
        "sourceCRS": manifest.get("sourceCRS", "OGC:CRS84 / WGS84 longitude-latitude"),
        "displayProjection": "EPSG:3857 / Web Mercator fitted to SVG viewport",
        "width": width,
        "height": height,
        "padding": padding,
        "projectedBounds": bounds.as_dict(),
        "transform": transform,
        "featureCount": len(items),
    }

    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-label="Projected qgis2web polygons">
  <metadata>{escape_attr(json.dumps(metadata, ensure_ascii=False))}</metadata>
  <g id="features">
    {'\n    '.join(paths)}
  </g>
</svg>
'''
    return svg, metadata


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=Path("data/layers-manifest.json"))
    parser.add_argument("--data-dir", type=Path, default=Path("data"))
    parser.add_argument("--out-svg", type=Path, default=Path("out/projected-map.svg"))
    parser.add_argument("--out-json", type=Path, default=Path("out/projected-map.projection.json"))
    parser.add_argument("--width", type=int, default=1200)
    parser.add_argument("--height", type=int, default=900)
    parser.add_argument("--padding", type=int, default=24)
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    items, missing = load_features(manifest, args.data_dir)
    if not items:
        missing_msg = "\n".join(f"  - {m}" for m in missing[:10])
        raise SystemExit(f"No data files loaded. Missing examples:\n{missing_msg}")

    svg, metadata = build_svg(items, manifest, args.width, args.height, args.padding)
    args.out_svg.parent.mkdir(parents=True, exist_ok=True)
    args.out_svg.write_text(svg, encoding="utf-8")
    args.out_json.parent.mkdir(parents=True, exist_ok=True)
    args.out_json.write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Wrote {metadata['featureCount']} projected SVG paths to {args.out_svg}")
    print(f"Wrote projection metadata to {args.out_json}")
    if missing:
        print(f"Skipped {len(missing)} missing qgis2web data files")


if __name__ == "__main__":
    main()
