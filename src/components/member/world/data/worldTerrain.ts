import type { PixelRect } from '../../pixel/pixelTypes'
import { stageRank, TREE_WORLD, WORLD_PATHS } from './worldLayout'
import type { WorldBuildingState } from '../hooks/useVillageWorldState'

function hash2(x: number, y: number): number {
  return ((x * 374761393 + y * 668265263) ^ (x >> 3)) & 0xff
}

function meadowRadius(treeStageKey: string): number {
  const rank = stageRank(treeStageKey)
  return 180 + rank * 55
}

export function buildWorldMeadow(treeStageKey: string): PixelRect[] {
  const rects: PixelRect[] = []
  const cx = TREE_WORLD.cx
  const cy = TREE_WORLD.cy + 40
  const r = meadowRadius(treeStageKey)

  for (let y = cy - r; y < cy + r; y += 8) {
    for (let x = cx - r; x < cx + r; x += 8) {
      const dx = (x - cx) / r
      const dy = (y - cy) / (r * 0.88)
      if (dx * dx + dy * dy > 1) continue
      const h = hash2(x, y)
      const edge = dx * dx + dy * dy > 0.72
      const fill = edge
        ? h % 2 === 0
          ? '#6a9e58'
          : '#5d8f4e'
        : h % 3 === 0
          ? '#8ecf7a'
          : h % 3 === 1
            ? '#7ec46e'
            : '#72b862'
      rects.push({ x, y, width: 8, height: 8, fill })
    }
  }
  return rects
}

export function buildWorldPaths(buildings: WorldBuildingState[]): PixelRect[] {
  const rects: PixelRect[] = []
  const unlocked = new Set(buildings.filter((b) => b.isUnlocked).map((b) => b.key))

  for (const path of WORLD_PATHS) {
    if (!unlocked.has(path.key)) continue
    const points = path.points
    for (let i = 0; i < points.length - 1; i += 1) {
      const [x0, y0] = points[i]
      const [x1, y1] = points[i + 1]
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / 6
      for (let s = 0; s <= steps; s += 1) {
        const t = s / steps
        const px = Math.round(x0 + (x1 - x0) * t)
        const py = Math.round(y0 + (y1 - y0) * t)
        for (let oy = -10; oy <= 10; oy += 5) {
          for (let ox = -10; ox <= 10; ox += 5) {
            if (Math.abs(ox) > 8 && Math.abs(oy) > 8) continue
            rects.push({
              x: px + ox,
              y: py + oy,
              width: 5,
              height: 5,
              fill: hash2(px + ox, py + oy) % 2 === 0 ? '#c9b896' : '#d4c4a0',
            })
          }
        }
      }
    }
  }
  return rects
}

export function buildConstructionSite(cx: number, cy: number): PixelRect[] {
  const rects: PixelRect[] = []
  const size = 80
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
  const wood = '#6d4c33'
  rects.push({ x: cx - 3, y: cy - 24, width: 6, height: 32, fill: wood })
  rects.push({ x: cx - 20, y: cy - 3, width: 40, height: 6, fill: wood })
  return rects
}

export function buildLockedMist(cx: number, cy: number): PixelRect[] {
  const rects: PixelRect[] = []
  for (let py = -50; py < 50; py += 8) {
    for (let px = -50; px < 50; px += 8) {
      const d = (px * px + py * py) / (50 * 50)
      if (d > 1) continue
      const v = Math.round(100 + d * 40)
      rects.push({
        x: cx + px,
        y: cy + py,
        width: 8,
        height: 8,
        fill: `rgb(${v},${v + 12},${v - 8})`,
      })
    }
  }
  return rects
}
