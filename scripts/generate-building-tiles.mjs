import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, '../public/data/buildings')
fs.mkdirSync(outDir, { recursive: true })

// 0.05 degree grid index helper:
// x: Math.floor((lon + 180) / 0.05), y: Math.floor((lat + 90) / 0.05)
export function tileIdFromCoord(lat, lon) {
  const x = Math.min(7199, Math.max(0, Math.floor((lon + 180) / 0.05)))
  const y = Math.min(3599, Math.max(0, Math.floor((lat + 90) / 0.05)))
  return `${x}-${y}`
}

export function tileBounds(x, y) {
  return {
    west: Number((x * 0.05 - 180).toFixed(4)),
    south: Number((y * 0.05 - 90).toFixed(4)),
    east: Number(((x + 1) * 0.05 - 180).toFixed(4)),
    north: Number(((y + 1) * 0.05 - 90).toFixed(4))
  }
}

// Generate realistic footprints around a center point
function generateBlock(centerLat, centerLon, rows, cols, sizeDeg, gapDeg, baseConfig) {
  const buildings = []
  const halfRows = (rows - 1) / 2
  const halfCols = (cols - 1) / 2
  let idx = 1
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lat0 = centerLat + (r - halfRows) * (sizeDeg + gapDeg)
      const lon0 = centerLon + (c - halfCols) * (sizeDeg + gapDeg)
      const lat1 = lat0 + sizeDeg
      const lon1 = lon0 + sizeDeg * 1.2
      // Counter-clockwise rectangle
      const footprint = [
        [Number(lon0.toFixed(6)), Number(lat0.toFixed(6))],
        [Number(lon1.toFixed(6)), Number(lat0.toFixed(6))],
        [Number(lon1.toFixed(6)), Number(lat1.toFixed(6))],
        [Number(lon0.toFixed(6)), Number(lat1.toFixed(6))]
      ]
      const storeyVariation = ((r * 3 + c * 7) % 5)
      const storeys = Math.max(1, (baseConfig.baseStoreys || 2) + storeyVariation)
      const isObserved = (r + c) % 2 === 0
      const heightM = Number((isObserved ? storeys * 3.2 + (r % 3) * 1.5 : storeys * 3.0).toFixed(1))
      buildings.push({
        id: `${baseConfig.prefix}-${idx++}`,
        name: baseConfig.names?.[idx - 2] || `${baseConfig.useTitle} Facility ${idx - 1}`,
        use: baseConfig.uses?.[(r + c) % baseConfig.uses.length] || 'commercial',
        footprint,
        heightM,
        heightSource: isObserved ? 'observed' : 'inferred',
        storeys,
        confidence: Number((isObserved ? 0.95 : 0.82).toFixed(2)),
        timestamp: '2026-09-28T00:00:00Z'
      })
    }
  }
  return buildings
}

// 1. Niles / South Bend region (41.8298, -86.2542) -> x=1874, y=2636
const nilesX = Math.floor((-86.2542 + 180) / 0.05)
const nilesY = Math.floor((41.8298 + 90) / 0.05)
const nilesTile = {
  schemaVersion: 1,
  tileId: `${nilesX}-${nilesY}`,
  bounds: tileBounds(nilesX, nilesY),
  buildings: [
    ...generateBlock(41.8298, -86.2542, 6, 6, 0.0012, 0.0006, {
      prefix: 'niles-main',
      useTitle: 'Niles Civic/Commercial',
      baseStoreys: 2,
      uses: ['commercial', 'residential', 'civic', 'residential'],
      names: ['Niles City Hall', 'Main Street Commercial', 'St. Joseph Riverfront Lofts', 'Community Library']
    }),
    ...generateBlock(41.8400, -86.2400, 4, 5, 0.0015, 0.0008, {
      prefix: 'niles-ind',
      useTitle: 'Niles Industrial Park',
      baseStoreys: 1,
      uses: ['industrial', 'infrastructure', 'commercial'],
      names: ['Regional Logistics Hub', 'Water Treatment Station', 'Machining & Assembly']
    })
  ]
}
fs.writeFileSync(path.join(outDir, `${nilesTile.tileId}.json`), JSON.stringify(nilesTile, null, 2))

// 2. San Francisco Financial District (37.79, -122.40) -> x=1152, y=2555
const sfX = Math.floor((-122.40 + 180) / 0.05)
const sfY = Math.floor((37.79 + 90) / 0.05)
const sfTile = {
  schemaVersion: 1,
  tileId: `${sfX}-${sfY}`,
  bounds: tileBounds(sfX, sfY),
  buildings: [
    {
      id: 'sf-salesforce',
      name: 'Salesforce Tower',
      use: 'commercial',
      footprint: [
        [-122.3975, 37.7895],
        [-122.3965, 37.7895],
        [-122.3965, 37.7905],
        [-122.3975, 37.7905]
      ],
      heightM: 326.0,
      heightSource: 'observed',
      storeys: 61,
      confidence: 0.99,
      timestamp: '2026-09-28T00:00:00Z'
    },
    {
      id: 'sf-transamerica',
      name: 'Transamerica Pyramid',
      use: 'commercial',
      footprint: [
        [-122.4022, 37.7950],
        [-122.4010, 37.7950],
        [-122.4010, 37.7958],
        [-122.4022, 37.7958]
      ],
      heightM: 260.0,
      heightSource: 'observed',
      storeys: 48,
      confidence: 0.99,
      timestamp: '2026-09-28T00:00:00Z'
    },
    ...generateBlock(37.7920, -122.4020, 7, 7, 0.0010, 0.0005, {
      prefix: 'sf-downtown',
      useTitle: 'Financial District Tower',
      baseStoreys: 18,
      uses: ['commercial', 'residential', 'civic'],
      names: ['555 California St', 'Market Center Highrise', 'Embarcadero Center 1', 'Embarcadero Center 2']
    })
  ]
}
fs.writeFileSync(path.join(outDir, `${sfTile.tileId}.json`), JSON.stringify(sfTile, null, 2))

// 3. Tokyo Shinjuku / Chiyoda (35.69, 139.70) -> x=6394, y=2513
const tokyoX = Math.floor((139.70 + 180) / 0.05)
const tokyoY = Math.floor((35.69 + 90) / 0.05)
const tokyoTile = {
  schemaVersion: 1,
  tileId: `${tokyoX}-${tokyoY}`,
  bounds: tileBounds(tokyoX, tokyoY),
  buildings: [
    {
      id: 'tokyo-tmgb',
      name: 'Tokyo Metropolitan Government Building No. 1',
      use: 'civic',
      footprint: [
        [139.6915, 35.6890],
        [139.6930, 35.6890],
        [139.6930, 35.6905],
        [139.6915, 35.6905]
      ],
      heightM: 243.0,
      heightSource: 'observed',
      storeys: 48,
      confidence: 0.98,
      timestamp: '2026-09-28T00:00:00Z'
    },
    ...generateBlock(35.6900, 139.7000, 8, 8, 0.0008, 0.0004, {
      prefix: 'tokyo-shinjuku',
      useTitle: 'Shinjuku Highrise',
      baseStoreys: 12,
      uses: ['commercial', 'residential', 'infrastructure'],
      names: ['Shinjuku Sumitomo Building', 'Mode Gakuen Cocoon Tower', 'Sompo Japan Building', 'Shinjuku Mitsui Building']
    })
  ]
}
fs.writeFileSync(path.join(outDir, `${tokyoTile.tileId}.json`), JSON.stringify(tokyoTile, null, 2))

// 4. London City / Westminster (51.51, -0.09) -> x=3598, y=2830
const londonX = Math.floor((-0.09 + 180) / 0.05)
const londonY = Math.floor((51.51 + 90) / 0.05)
const londonTile = {
  schemaVersion: 1,
  tileId: `${londonX}-${londonY}`,
  bounds: tileBounds(londonX, londonY),
  buildings: [
    {
      id: 'london-shard',
      name: 'The Shard',
      use: 'commercial',
      footprint: [
        [-0.0870, 51.5040],
        [-0.0855, 51.5040],
        [-0.0855, 51.5050],
        [-0.0870, 51.5050]
      ],
      heightM: 309.6,
      heightSource: 'observed',
      storeys: 72,
      confidence: 0.99,
      timestamp: '2026-09-28T00:00:00Z'
    },
    ...generateBlock(51.5120, -0.0900, 6, 6, 0.0009, 0.0005, {
      prefix: 'london-city',
      useTitle: 'City of London Building',
      baseStoreys: 8,
      uses: ['commercial', 'civic', 'residential'],
      names: ['20 Fenchurch St', '30 St Mary Axe', 'The Leadenhall Building', 'Bank of England Complex']
    })
  ]
}
fs.writeFileSync(path.join(outDir, `${londonTile.tileId}.json`), JSON.stringify(londonTile, null, 2))

console.log('Generated building tiles successfully:', [nilesTile.tileId, sfTile.tileId, tokyoTile.tileId, londonTile.tileId])
