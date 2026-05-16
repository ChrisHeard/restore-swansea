/*
  Clean qgis2web-to-SVG renderer.

  What it expects:
  - data/layers-manifest.json, generated from the qgis2web index.
  - The original qgis2web data/*.js files copied next to this page.
    Each data file should define a global variable such as:
    var json_WD25NM_Bishopston_0 = { "type": "FeatureCollection", ... };

  What it does:
  - Loads those qgis2web data variables.
  - Projects lon/lat GeoJSON coordinates to Web Mercator.
  - Fits the projected geometry to a standalone SVG.
  - Gives each polygon a clean DOM element for your own interactivity.
*/

const SVG_NS = "http://www.w3.org/2000/svg";
const MAX_WEB_MERCATOR_LAT = 85.0511287798066;

const svg = document.getElementById("map");
const statusEl = document.getElementById("status");
const readoutEl = document.getElementById("feature-readout");

main().catch((error) => {
  console.error(error);
  statusEl.textContent = error.message;
  statusEl.classList.add("error");
});

async function main() {
  const manifest = await fetchJson("data/layers-manifest.json");
  const loadedLayers = await loadQgis2webLayers(manifest.layers);

  const features = flattenFeatures(loadedLayers);
  if (!features.length) {
    throw new Error(
      "No features were loaded. Copy the original qgis2web data/*.js files into the data/ folder, then reload."
    );
  }

  renderSvg(features, manifest);

  statusEl.textContent = `${features.length} features from ${loadedLayers.length} layers. Projection: ${manifest.displayProjection}.`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${url}: ${response.status}`);
  }
  return response.json();
}

async function loadQgis2webLayers(layers) {
  const loaded = [];

  for (const layer of layers) {
    await loadScript(layer.source);

    const collection = window[layer.dataVar];
    if (!collection) {
      console.warn(`Loaded ${layer.source}, but ${layer.dataVar} was not found on window.`);
      continue;
    }

    loaded.push({
      ...layer,
      collection
    });
  }

  return loaded;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-qgis-src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.qgisSrc = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Missing ${src}. Copy it from the original qgis2web export.`));
    document.head.appendChild(script);
  });
}

function flattenFeatures(loadedLayers) {
  const features = [];

  for (const layer of loadedLayers) {
    const sourceFeatures = Array.isArray(layer.collection.features)
      ? layer.collection.features
      : [layer.collection];

    for (const feature of sourceFeatures) {
      features.push({
        feature,
        layerName: layer.name,
        source: layer.source,
        dataVar: layer.dataVar,
        zIndex: layer.zIndex,
        style: layer.style || {}
      });
    }
  }

  return features.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
}

function renderSvg(features, manifest) {
  const bounds = computeProjectedBounds(features);
  const viewport = getViewport();
  const transform = fitBoundsToViewport(bounds, viewport.width, viewport.height, 24);

  svg.setAttribute("viewBox", `0 0 ${viewport.width} ${viewport.height}`);
  svg.innerHTML = "";

  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("id", "features");
  svg.appendChild(group);

  for (const item of features) {
    const pathData = geometryToPath(item.feature.geometry, transform);
    if (!pathData) continue;

    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", pathData);
    path.setAttribute("class", "map-feature");
    path.dataset.layer = item.layerName;
    path.dataset.source = item.source;

    applyStyle(path, item.style);
    wireInteractivity(path, item);

    group.appendChild(path);
  }

  window.__mapProjection = {
    type: "WebMercatorFittedToSvgViewport",
    sourceCRS: manifest.sourceCRS,
    displayProjection: manifest.displayProjection,
    qgis2webFitBounds: manifest.qgis2web.fitBounds,
    projectedBounds: bounds,
    viewport,
    transform
  };
}

function getViewport() {
  const rect = svg.getBoundingClientRect();
  return {
    width: Math.max(320, Math.round(rect.width || window.innerWidth)),
    height: Math.max(240, Math.round(rect.height || window.innerHeight))
  };
}

function applyStyle(path, style) {
  path.setAttribute("fill", cssColor(style.fill) || "#051b3a");
  path.setAttribute("fill-opacity", style.fillOpacity ?? 1);
  path.setAttribute("stroke", cssColor(style.stroke) || "#051b3a");
  path.setAttribute("stroke-opacity", style.strokeOpacity ?? 1);
  path.setAttribute("stroke-width", style.strokeWidth ?? 1);

  if (style.dashArray) {
    path.setAttribute("stroke-dasharray", style.dashArray);
  }
}

function cssColor(value) {
  return value || null;
}

function wireInteractivity(path, item) {
  const props = item.feature.properties || {};
  const label = props.WD25NM || props.name || item.layerName;

  path.addEventListener("mouseenter", () => {
    readoutEl.textContent = `${label} (${item.layerName})`;
  });

  path.addEventListener("mouseleave", () => {
    if (!path.classList.contains("is-selected")) {
      readoutEl.textContent = "";
    }
  });

  path.addEventListener("click", (event) => {
    document.querySelectorAll(".map-feature.is-selected")
      .forEach((el) => el.classList.remove("is-selected"));

    path.classList.add("is-selected");
    readoutEl.textContent = `${label}`;

    // Add your own interaction here.
    // You have direct access to:
    // - item.feature.geometry
    // - item.feature.properties
    // - item.layerName
    console.log("Selected feature", item);
    event.stopPropagation();
  });
}

svg.addEventListener("click", () => {
  document.querySelectorAll(".map-feature.is-selected")
    .forEach((el) => el.classList.remove("is-selected"));
  readoutEl.textContent = "";
});

window.addEventListener("resize", debounce(() => {
  // A simple reload is acceptable for a clean scaffold.
  // Replace this with retained-state re-rendering if needed.
  location.reload();
}, 200));

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function computeProjectedBounds(items) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const item of items) {
    forEachCoordinate(item.feature.geometry, ([lon, lat]) => {
      const [x, y] = projectLonLatToWebMercator(lon, lat);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
  }

  if (!Number.isFinite(minX)) {
    throw new Error("Could not compute geometry bounds.");
  }

  return { minX, minY, maxX, maxY };
}

function fitBoundsToViewport(bounds, width, height, padding) {
  const dataWidth = bounds.maxX - bounds.minX;
  const dataHeight = bounds.maxY - bounds.minY;

  const scale = Math.min(
    (width - padding * 2) / dataWidth,
    (height - padding * 2) / dataHeight
  );

  const offsetX = (width - dataWidth * scale) / 2 - bounds.minX * scale;
  const offsetY = (height - dataHeight * scale) / 2 - bounds.minY * scale;

  return { scale, offsetX, offsetY };
}

function projectPoint(coord, transform) {
  const [x, y] = projectLonLatToWebMercator(coord[0], coord[1]);
  return [
    x * transform.scale + transform.offsetX,
    y * transform.scale + transform.offsetY
  ];
}

function projectLonLatToWebMercator(lon, lat) {
  const clampedLat = Math.max(-MAX_WEB_MERCATOR_LAT, Math.min(MAX_WEB_MERCATOR_LAT, Number(lat)));
  const lambda = Number(lon) * Math.PI / 180;
  const phi = clampedLat * Math.PI / 180;

  // Spherical Web Mercator metres. Y is inverted later by the fit transform,
  // but using the conventional formula keeps this interoperable with EPSG:3857.
  const radius = 6378137;
  const x = radius * lambda;
  const y = radius * Math.log(Math.tan(Math.PI / 4 + phi / 2));

  // SVG y increases downward; invert y here so north is visually up.
  return [x, -y];
}

function geometryToPath(geometry, transform) {
  if (!geometry) return "";

  switch (geometry.type) {
    case "Polygon":
      return polygonToPath(geometry.coordinates, transform);
    case "MultiPolygon":
      return geometry.coordinates
        .map((polygon) => polygonToPath(polygon, transform))
        .join(" ");
    case "LineString":
      return lineToPath(geometry.coordinates, transform);
    case "MultiLineString":
      return geometry.coordinates
        .map((line) => lineToPath(line, transform))
        .join(" ");
    default:
      console.warn(`Unsupported geometry type: ${geometry.type}`);
      return "";
  }
}

function polygonToPath(rings, transform) {
  return rings
    .map((ring) => {
      if (!ring.length) return "";
      const projected = ring.map((coord) => projectPoint(coord, transform));
      const [first, ...rest] = projected;
      return [
        `M ${formatPoint(first)}`,
        ...rest.map((point) => `L ${formatPoint(point)}`),
        "Z"
      ].join(" ");
    })
    .join(" ");
}

function lineToPath(line, transform) {
  if (!line.length) return "";
  const projected = line.map((coord) => projectPoint(coord, transform));
  const [first, ...rest] = projected;
  return [
    `M ${formatPoint(first)}`,
    ...rest.map((point) => `L ${formatPoint(point)}`)
  ].join(" ");
}

function formatPoint([x, y]) {
  return `${x.toFixed(2)} ${y.toFixed(2)}`;
}

function forEachCoordinate(geometry, callback) {
  if (!geometry) return;

  switch (geometry.type) {
    case "Point":
      callback(geometry.coordinates);
      break;
    case "MultiPoint":
    case "LineString":
      geometry.coordinates.forEach(callback);
      break;
    case "MultiLineString":
    case "Polygon":
      geometry.coordinates.flat(1).forEach(callback);
      break;
    case "MultiPolygon":
      geometry.coordinates.flat(2).forEach(callback);
      break;
    case "GeometryCollection":
      geometry.geometries.forEach((child) => forEachCoordinate(child, callback));
      break;
    default:
      console.warn(`Unsupported geometry type: ${geometry.type}`);
  }
}