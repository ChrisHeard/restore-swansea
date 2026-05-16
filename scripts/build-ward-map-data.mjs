import fs from 'node:fs/promises'
import path from 'node:path'

const MAX_WEB_MERCATOR_LAT = 85.0511287798066
const RADIUS = 6378137
const WIDTH = 1200
const HEIGHT = 900
const PADDING = 24

const repoRoot = process.cwd()
const manifestPath = path.join(repoRoot, 'map_test/data/layers-manifest.json')
const outPath = path.join(repoRoot, 'lib/ward-map/swansea-ward-paths.json')

const qgisVarPattern = /^\s*var\s+(json_[A-Za-z0-9_]+)\s*=\s*(\{[\s\S]*\})\s*;?\s*$/

function lonLatToWebMercator([lon, lat]) {
  const safeLat = Math.max(-MAX_WEB_MERCATOR_LAT, Math.min(MAX_WEB_MERCATOR_LAT, Number(lat)))
  const x = RADIUS * (Number(lon) * Math.PI / 180)
  const y = RADIUS * Math.log(Math.tan(Math.PI / 4 + (safeLat * Math.PI / 180) / 2))
  return [x, -y]
}

function forEachCoordinate(geometry, fn) {
  if (!geometry) return
  const { type, coordinates, geometries } = geometry
  if (type === 'Point') return fn(coordinates)
  if (type === 'MultiPoint' || type === 'LineString') return coordinates.forEach(fn)
  if (type === 'MultiLineString' || type === 'Polygon') return coordinates.forEach((line) => line.forEach(fn))
  if (type === 'MultiPolygon') return coordinates.forEach((poly) => poly.forEach((ring) => ring.forEach(fn)))
  if (type === 'GeometryCollection') return (geometries || []).forEach((g) => forEachCoordinate(g, fn))
  throw new Error(`Unsupported geometry type: ${type}`)
}

function geometryToPath(geometry, projectPoint) {
  const lineToPath = (line, close = false) => {
    if (!line?.length) return ''
    const points = line.map(projectPoint)
    const [first, ...rest] = points
    const parts = [`M ${first[0].toFixed(2)} ${first[1].toFixed(2)}`, ...rest.map((p) => `L ${p[0].toFixed(2)} ${p[1].toFixed(2)}`)]
    if (close) parts.push('Z')
    return parts.join(' ')
  }

  const { type, coordinates } = geometry
  if (type === 'Polygon') return coordinates.map((ring) => lineToPath(ring, true)).join(' ')
  if (type === 'MultiPolygon') return coordinates.flatMap((poly) => poly.map((ring) => lineToPath(ring, true))).join(' ')
  throw new Error(`Unsupported path geometry type: ${type}`)
}

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
const items = []

for (const layer of manifest.layers) {
  const jsPath = path.join(repoRoot, 'map_test/data', path.basename(layer.source))
  const text = await fs.readFile(jsPath, 'utf8')
  const match = text.match(qgisVarPattern)
  if (!match) throw new Error(`Unsupported qgis2web signature: ${layer.source}`)
  const dataVar = match[1]
  const collection = JSON.parse(match[2])
  const features = Array.isArray(collection.features) ? collection.features : [collection]
  features.forEach((feature, featureIndex) => items.push({ layer, dataVar, feature, featureIndex }))
}

let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
for (const item of items) {
  forEachCoordinate(item.feature.geometry, (coord) => {
    const [x, y] = lonLatToWebMercator(coord)
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
  })
}

const scale = Math.min((WIDTH - PADDING * 2) / (maxX - minX), (HEIGHT - PADDING * 2) / (maxY - minY))
const offsetX = (WIDTH - (maxX - minX) * scale) / 2 - minX * scale
const offsetY = (HEIGHT - (maxY - minY) * scale) / 2 - minY * scale
const projectPoint = (coord) => {
  const [x, y] = lonLatToWebMercator(coord)
  return [x * scale + offsetX, y * scale + offsetY]
}

const wards = items.map(({ layer, feature, featureIndex }) => {
  const props = feature.properties || {}
  const wardCode = props.WD25CD || null
  const wardName = props.WD25NM || layer.name || null
  if (!wardCode || !wardName) throw new Error(`Missing WD25CD/WD25NM in ${layer.source} feature ${featureIndex}`)

  return {
    wardCode,
    wardName,
    path: geometryToPath(feature.geometry, projectPoint),
    sourceFile: path.basename(layer.source),
    featureIndex,
    centroid: projectPoint([Number(props.long), Number(props.lat)]),
    properties: {
      WD25CD: wardCode,
      WD25NM: wardName,
    },
  }
})

const out = {
  viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
  width: WIDTH,
  height: HEIGHT,
  padding: PADDING,
  wardCount: wards.length,
  sourceCRS: manifest.sourceCRS,
  displayProjection: manifest.displayProjection,
  wards,
}

await fs.writeFile(outPath, JSON.stringify(out, null, 2) + '\n')
console.log(`Generated ${outPath} with ${wards.length} wards.`)
