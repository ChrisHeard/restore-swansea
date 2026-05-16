# Clean Swansea SVG map scaffold

This package was generated from the uploaded `qgis2web_swansea.htm`.

## What was extractable

The uploaded file contains the qgis2web/Leaflet wiring, including:

- `32` referenced qgis2web data scripts.
- The map extent:
  - south-west: `51.515890331854955`, `-4.9453587217946975`
  - north-east: `51.98429784793227`, `-3.7501765850341595`
- Layer names, data variable names, z-index values, and styles.

## What was not inside the uploaded file

The actual polygon coordinates are not embedded in the uploaded HTML. They are referenced as external files such as:

```text
data/WD25NM_Bishopston_0.js
data/WD25NM_Bnymaen_1.js
...
data/WD25NM_WestCross_31.js
```

To render the clean SVG map, copy the original qgis2web `data/` folder into this folder so the paths match:

```text
clean_swansea_svg_map/
  index.html
  data/
    layers-manifest.json
    WD25NM_Bishopston_0.js
    WD25NM_Bnymaen_1.js
    ...
```

Then serve this folder locally. A local web server is required because browsers usually block `fetch()` from `file://` pages.

```bash
cd clean_swansea_svg_map
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000
```

## Projection model

The original qgis2web export uses Leaflet, whose default display CRS is Web Mercator. The qgis2web data files are expected to be GeoJSON coordinates in longitude/latitude order.

This scaffold therefore uses:

```text
source data: EPSG:4326 / WGS84 lon-lat GeoJSON
display:     EPSG:3857 / Web Mercator fitted into an SVG viewport
```

The fitted projection parameters are exposed at runtime as:

```js
window.__mapProjection
```

Each polygon becomes a plain SVG `<path>` element with useful data attributes:

```html
<path class="map-feature" data-layer="..." data-source="...">
```

Use `src/svg-map.js`, especially `wireInteractivity()`, as the place to add your own custom interaction.

## Optional: merge qgis2web data files into one GeoJSON

Once you have the original qgis2web `data/` folder, run:

```bash
python3 tools/extract_qgis2web_data.py source/qgis2web_index_reconstructed.html --data-dir data --out data/combined.geojson
```

This creates a clean `FeatureCollection` with all the qgis2web features in one file.
## Verified qgis2web data signature

The supplied sample `WD25NM_Bishopston_0.js` uses the standard qgis2web data-file pattern:

```js
var json_WD25NM_Bishopston_0 = { "type": "FeatureCollection", ... };
```

The embedded GeoJSON declares `urn:ogc:def:crs:OGC:1.3:CRS84`, so coordinates are longitude/latitude order. The sample geometry is a `MultiPolygon` and is supported directly by both the browser renderer and the offline SVG builder.

## Offline projected SVG builder

To generate a static, clean SVG containing projected path graphics, copy all original qgis2web `data/*.js` files into `data/`, then run:

```bash
python3 tools/build_projected_svg.py \
  --manifest data/layers-manifest.json \
  --data-dir data \
  --out-svg out/swansea.svg \
  --out-json out/swansea.projection.json \
  --width 1200 \
  --height 900
```

This produces:

- `out/swansea.svg` — standalone projected SVG paths, one per feature.
- `out/swansea.projection.json` — the Web Mercator bounds and fit transform used to create the SVG.

Each generated SVG path includes clean attributes for interaction:

```html
<path class="map-feature"
      data-layer="Bishopston"
      data-source="data/WD25NM_Bishopston_0.js"
      data-name="Bishopston"
      data-feature-index="0" />
```

The package includes a sample output from the one provided data file:

```text
out/sample-bishopston.svg
out/sample-bishopston.projection.json
```
