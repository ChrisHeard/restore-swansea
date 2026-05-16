# Ward Intelligence map shell

## What was extracted from `map_test`

The map shell is based on the qgis2web-derived files in `map_test`:

- `map_test/data/layers-manifest.json` for layer ordering and source files.
- `map_test/data/*.js` as the feature payloads (`var json_... = { FeatureCollection }`).
- `map_test/src/svg-map.js` and `map_test/tools/build_projected_svg.py` for projection and SVG path construction logic.

Inspection confirmed:

- 32 layer entries in the manifest.
- 32 qgis2web data files under `map_test/data`.
- Each file follows the expected `var json_... = {...}` pattern.
- `WD25CD` and `WD25NM` are present across all ward features.

## Generated clean map data

Generated output is committed at:

- `lib/ward-map/swansea-ward-paths.json`

This file stores:

- global `viewBox` metadata
- one record per ward with `wardCode`, `wardName`, `path`
- source metadata (`sourceFile`, `featureIndex`)
- lightweight join-safe properties (`WD25CD`, `WD25NM`)

## Generation script

Script:

- `scripts/build-ward-map-data.mjs`

It:

1. Reads `map_test/data/layers-manifest.json`.
2. Loads each qgis2web `data/*.js` file.
3. Parses the `var json_...` FeatureCollection payload.
4. Projects lon/lat to Web Mercator.
5. Fits geometry into a fixed `1200 x 900` SVG viewport.
6. Writes the clean static path dataset JSON.

The runtime app consumes committed JSON directly; Next.js does not depend on Python at runtime.

## Map component

Component:

- `components/ward-intelligence/WardMap.tsx`

Props:

- `data?: WardMapDatum[]`
- `selectedWardCode?: string | null`
- `onWardSelect?: (wardCode: string) => void`

Where `WardMapDatum` supports external styling and future joins:

- `wardCode`
- `label?`
- `value?`
- `colour?`

## Current page shell

Page:

- `app/dashboard/ward-intelligence/page.tsx`
- client shell: `app/dashboard/ward-intelligence/ward-intelligence-shell.tsx`

Includes:

- dashboard-style protected route via existing Supabase auth check.
- map + selected ward panel layout (desktop split / mobile stacked).
- placeholder map colouring explicitly marked as placeholder.
- future layer list for planned data layers.

## Deferred for later iterations

- database-backed choropleth layers
- dynamic legends and scales
- server-driven ward intelligence datasets
- advanced label placement and zoom/pan interactions

Future datasets should join by ward code (`WD25CD`) and display names should come from `WD25NM`.
