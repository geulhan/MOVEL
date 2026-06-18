/**
 * 1024×1024 운동 왕국 캠퍼스 지형
 */

import type { PixelRect } from '../../pixel/pixelTypes'
import { VILLAGE_ROAD_NETWORK } from './campusRoads'
import { PLAZA_HUB, TREE_WORLD, WORLD_BUILDINGS, WORLD_SIZE, stageRank } from './worldLayout'

const TILE = 16

function hash2(x: number, y: number): number {
  return ((x * 374761393 + y * 668265263) ^ (x >> 3)) & 0xff
}

function noise2(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const a = hash2(ix, iy) / 255
  const b = hash2(ix + 1, iy) / 255
  const c = hash2(ix, iy + 1) / 255
  const d = hash2(ix + 1, iy + 1) / 255
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}

function distToSegment(
  px: number,
  py: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  const dx = x1 - x0
  const dy = y1 - y0
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(px - x0, py - y0)
  let t = ((px - x0) * dx + (py - y0) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy))
}

function minDistToPolyline(px: number, py: number, points: [number, number][]): number {
  let min = Infinity
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    min = Math.min(min, distToSegment(px, py, x0, y0, x1, y1))
  }
  return min
}

/** @deprecated import from campusRoads */
export { VILLAGE_ROAD_NETWORK } from './campusRoads'

export type WorldTerrainLayers = {
  grass: PixelRect[]
  elevation: PixelRect[]
  forest: PixelRect[]
  paths: PixelRect[]
  plaza: PixelRect[]
  rocks: PixelRect[]
  smallTrees: PixelRect[]
  groundShadows: PixelRect[]
}

function grassColor(elev: number, variant: number, cx: number, cy: number): string {
  const dist = Math.hypot(cx - TREE_WORLD.cx, cy - TREE_WORLD.cy)
  const meadow =
    dist < 190 ? 1.22 : dist < 300 ? 1.08 : dist < 380 ? 0.98 : 0.82
  const bases =
    elev > 0.62
      ? ['#a8e88a', '#9fe082', '#95d47a']
      : elev > 0.48
        ? ['#92dc7e', '#88d474', '#7ec46e']
        : ['#7ec46e', '#72ba64', '#6aab58']
  let pick = bases[variant % 3]
  if (meadow > 1.1 && variant % 4 === 0) pick = elev > 0.5 ? '#b8f09a' : '#a0e080'
  if (meadow < 0.9) pick = elev > 0.5 ? '#5f9e52' : '#4d8c45'
  return pick
}

function inForestZone(x: number, y: number): boolean {
  const dist = Math.hypot(x - TREE_WORLD.cx, y - TREE_WORLD.cy)
  if (dist > 300) return true
  if (x < 28 || x > 996 || y < 28 || y > 996) return true
  return false
}

function inCentralPlaza(x: number, y: number): boolean {
  const dx = (x - PLAZA_HUB.cx) / PLAZA_HUB.rx
  const dy = (y - PLAZA_HUB.cy) / PLAZA_HUB.ry
  return dx * dx + dy * dy <= 1
}

function inBuildingPlot(cx: number, cy: number): boolean {
  for (const b of WORLD_BUILDINGS) {
    if (b.terrainOnly) continue
    const dx = (cx - b.cx) / b.plotRx
    const dy = (cy - (b.cy + 14)) / b.plotRy
    if (dx * dx + dy * dy <= 1.05) return true
  }
  return false
}

export function buildCompleteWorldTerrain(treeStageKey: string): WorldTerrainLayers {
  const rank = stageRank(treeStageKey)
  const grass: PixelRect[] = []
  const elevation: PixelRect[] = []
  const forest: PixelRect[] = []
  const paths: PixelRect[] = []
  const plaza: PixelRect[] = []
  const rocks: PixelRect[] = []
  const smallTrees: PixelRect[] = []
  const groundShadows: PixelRect[] = []

  const cols = WORLD_SIZE / TILE
  const rows = WORLD_SIZE / TILE
  const paved = rank >= 2

  for (let ty = 0; ty < rows; ty += 1) {
    for (let tx = 0; tx < cols; tx += 1) {
      const x = tx * TILE
      const y = ty * TILE
      const cx = x + TILE / 2
      const cy = y + TILE / 2

      const elev = noise2(tx * 0.14, ty * 0.14)
      const variant = hash2(tx, ty)

      grass.push({
        x,
        y,
        width: TILE,
        height: TILE,
        fill: grassColor(elev, variant, cx, cy),
      })

      if (elev < 0.42) {
        elevation.push({
          x,
          y,
          width: TILE,
          height: TILE,
          fill: 'rgba(30,60,25,0.12)',
        })
      } else if (elev > 0.68) {
        elevation.push({
          x,
          y,
          width: TILE,
          height: TILE,
          fill: 'rgba(255,255,220,0.08)',
        })
      }

      if (inForestZone(cx, cy) && !inCentralPlaza(cx, cy)) {
        const forestShade = hash2(tx + 7, ty + 11) % 3
        forest.push({
          x,
          y,
          width: TILE,
          height: TILE,
          fill:
            forestShade === 0
              ? '#3d6b38'
              : forestShade === 1
                ? '#356032'
                : '#2d5530',
        })
      }

      let isRoadTile = false
      for (const polyline of VILLAGE_ROAD_NETWORK) {
        const d = minDistToPolyline(cx, cy, polyline)
        const w = paved ? 38 : 30
        if (d <= w) {
          isRoadTile = true
          const edge = d > 24
          paths.push({
            x,
            y,
            width: TILE,
            height: TILE,
            fill: edge
              ? hash2(tx, ty) % 2 === 0
                ? '#a08058'
                : '#8d6e4a'
              : hash2(tx + 3, ty) % 3 === 0
                ? '#d4bc96'
                : '#c9ad82',
          })
          break
        }
      }

      if (inCentralPlaza(cx, cy)) {
        const dx = (cx - PLAZA_HUB.cx) / PLAZA_HUB.rx
        const dy = (cy - PLAZA_HUB.cy) / PLAZA_HUB.ry
        const ring = dx * dx + dy * dy
        const isEdge = ring > 0.55 && ring <= 1
        const isInner = ring <= 0.55
        plaza.push({
          x,
          y,
          width: TILE,
          height: TILE,
          fill: isInner
            ? hash2(tx, ty) % 2 === 0
              ? '#f0e6d4'
              : '#e5d8c0'
            : isEdge
              ? '#c4b090'
              : '#d8c8a8',
        })
      }

      if (inBuildingPlot(cx, cy) && !inCentralPlaza(cx, cy) && !isRoadTile) {
        plaza.push({
          x,
          y,
          width: TILE,
          height: TILE,
          fill: hash2(tx + 5, ty) % 3 === 0 ? '#72b85e' : '#7ec46e',
        })
      }
    }
  }

  const rockSpots: [number, number, number][] = [
    [90, 120, 22],
    [920, 140, 24],
    [85, 880, 20],
  ]
  for (const [rx, ry, r] of rockSpots) {
    for (let py = -r; py < r; py += 6) {
      for (let px = -r; px < r; px += 6) {
        if (px * px + py * py > r * r) continue
        if (inCentralPlaza(rx + px, ry + py)) continue
        const shade = hash2(rx + px, ry + py) % 3
        rocks.push({
          x: rx + px,
          y: ry + py,
          width: 6,
          height: 6,
          fill: shade === 0 ? '#7a7a72' : shade === 1 ? '#9a9a90' : '#6a6a62',
        })
      }
    }
    groundShadows.push({
      x: rx - r * 0.6,
      y: ry + r * 0.5,
      width: r * 1.4,
      height: r * 0.35,
      fill: 'rgba(30,50,25,0.25)',
    })
  }

  const treeSpots: [number, number][] = [
    [70, 90],
    [940, 100],
    [55, 900],
    [930, 880],
    [512, 48],
    [48, 512],
    [976, 512],
    [512, 976],
  ]
  for (let i = 0; i < 16; i += 1) {
    const angle = (i / 16) * Math.PI * 2 - Math.PI / 2
    const rx = 470 + (hash2(i, 99) % 40)
    treeSpots.push([
      Math.round(TREE_WORLD.cx + rx * Math.cos(angle)),
      Math.round(TREE_WORLD.cy + rx * 0.82 * Math.sin(angle)),
    ])
  }
  for (const [tx, ty] of treeSpots) {
    if (inCentralPlaza(tx, ty)) continue
    const trunk = '#5d4037'
    const leaf = hash2(tx, ty) % 2 === 0 ? '#388e3c' : '#43a047'
    smallTrees.push({ x: tx - 3, y: ty + 4, width: 6, height: 14, fill: trunk })
    for (let ly = -16; ly <= 0; ly += 4) {
      for (let lx = -12; lx <= 12; lx += 4) {
        if (lx * lx + ly * ly > 100) continue
        smallTrees.push({ x: tx + lx, y: ty + ly, width: 4, height: 4, fill: leaf })
      }
    }
    groundShadows.push({
      x: tx - 14,
      y: ty + 16,
      width: 28,
      height: 8,
      fill: 'rgba(30,50,25,0.22)',
    })
  }

  return {
    grass,
    elevation,
    forest,
    paths,
    plaza,
    rocks,
    smallTrees,
    groundShadows,
  }
}

export function buildConstructionSite(cx: number, cy: number): PixelRect[] {
  const rects: PixelRect[] = []
  const size = 48
  const half = size / 2
  for (let py = -half; py < half; py += 4) {
    for (let px = -half; px < half; px += 4) {
      const dist =
        (px * px) / (half * half) + (py * py) / ((half * 0.85) * (half * 0.85))
      if (dist > 1) continue
      rects.push({
        x: cx + px,
        y: cy + py,
        width: 4,
        height: 4,
        fill: dist > 0.75 ? '#8d6e4a' : '#d4bc96',
      })
    }
  }
  return rects
}

export function buildLockedMist(cx: number, cy: number): PixelRect[] {
  const rects: PixelRect[] = []
  for (let py = -28; py < 28; py += 8) {
    for (let px = -28; px < 28; px += 8) {
      const d = (px * px + py * py) / (28 * 28)
      if (d > 1) continue
      const v = Math.round(110 + d * 30)
      rects.push({
        x: cx + px,
        y: cy + py,
        width: 8,
        height: 8,
        fill: `rgb(${v},${v + 10},${v - 5})`,
      })
    }
  }
  return rects
}
