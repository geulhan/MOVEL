/**
 * 1024×1024 운동 마을 지형 생성기
 * 지형 70% · 건물 30% — CoC/부족전쟁식 초기 마을 느낌
 */

import type { PixelRect } from '../../pixel/pixelTypes'
import { TREE_WORLD, WORLD_SIZE, stageRank } from './worldLayout'

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

/** 마을 전체 도로망 — 항상 표시 */
export const VILLAGE_ROAD_NETWORK: [number, number][][] = [
  [
    [512, 520],
    [508, 440],
    [495, 340],
    [485, 240],
    [478, 155],
  ],
  [
    [512, 520],
    [580, 505],
    [660, 475],
    [745, 445],
    [835, 415],
  ],
  [
    [512, 520],
    [445, 515],
    [360, 495],
    [270, 478],
    [175, 462],
  ],
  [
    [512, 520],
    [555, 565],
    [630, 615],
    [710, 655],
    [795, 688],
  ],
  [
    [512, 520],
    [465, 575],
    [385, 635],
    [305, 685],
    [235, 712],
  ],
  [
    [200, 530],
    [320, 525],
    [420, 522],
    [512, 520],
    [600, 518],
    [700, 515],
    [820, 510],
  ],
]

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

function grassColor(elev: number, variant: number): string {
  const base = elev > 0.62 ? '#95d47a' : elev > 0.48 ? '#7ec46e' : '#6aab58'
  if (variant % 5 === 0) return elev > 0.55 ? '#a8e08a' : '#72b85e'
  if (variant % 7 === 0) return elev > 0.5 ? '#88cc6a' : '#5f9e52'
  return base
}

function inForestZone(x: number, y: number): boolean {
  if (x < 140 && y < 200) return true
  if (x > 880 && y < 180) return true
  if (x < 120 && y > 780) return true
  if (x > 860 && y > 760) return true
  if (y < 95 && x > 200 && x < 820) return true
  if (x < 80 || x > 940 || y < 60 || y > 960) return true
  return false
}

function inCentralPlaza(x: number, y: number): boolean {
  const dx = (x - TREE_WORLD.cx) / 118
  const dy = (y - (TREE_WORLD.cy + 15)) / 95
  return dx * dx + dy * dy <= 1
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
        fill: grassColor(elev, variant),
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

      for (const polyline of VILLAGE_ROAD_NETWORK) {
        const d = minDistToPolyline(cx, cy, polyline)
        const w = paved ? 34 : 28
        if (d <= w) {
          const edge = d > 22
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
        const ring =
          ((cx - TREE_WORLD.cx) / 118) ** 2 + ((cy - TREE_WORLD.cy - 15) / 95) ** 2
        const isEdge = ring > 0.55 && ring <= 1
        const isInner = ring <= 0.55
        plaza.push({
          x,
          y,
          width: TILE,
          height: TILE,
          fill: isInner
            ? hash2(tx, ty) % 2 === 0
              ? '#e8dcc8'
              : '#ddd0b8'
            : isEdge
              ? '#b8a888'
              : '#d4c4a8',
        })
      }
    }
  }

  const rockSpots: [number, number, number][] = [
    [155, 320, 28],
    [870, 290, 32],
    [120, 620, 24],
    [900, 580, 30],
    [640, 780, 22],
    [380, 820, 26],
    [720, 180, 20],
    [280, 200, 18],
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
    [95, 140],
    [180, 95],
    [340, 75],
    [680, 85],
    [850, 120],
    [940, 200],
    [70, 380],
    [60, 720],
    [130, 880],
    [940, 850],
    [880, 920],
    [350, 900],
    [750, 860],
    [250, 250],
    [780, 260],
    [160, 540],
    [860, 520],
    [420, 780],
    [620, 760],
  ]
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
