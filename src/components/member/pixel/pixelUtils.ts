import type { PixelGrid, PixelRect } from './pixelTypes'

export function gridToRects(
  grid: PixelGrid,
  offsetX: number,
  offsetY: number,
  cellPx: number,
): PixelRect[] {
  const rects: PixelRect[] = []
  for (let y = 0; y < grid.pixels.length; y += 1) {
    const row = grid.pixels[y] ?? ''
    for (let x = 0; x < row.length; x += 1) {
      const idx = Number(row[x])
      if (!idx) continue
      const fill = grid.palette[idx]
      if (!fill) continue
      rects.push({
        x: offsetX + x * cellPx,
        y: offsetY + y * cellPx,
        width: cellPx,
        height: cellPx,
        fill,
      })
    }
  }
  return rects
}

export function drawSpriteCentered(
  grid: PixelGrid,
  cx: number,
  cy: number,
  drawSize: number,
): PixelRect[] {
  const cellPx = drawSize / grid.gridSize
  const w = grid.gridSize * cellPx
  const h = grid.gridSize * cellPx
  return gridToRects(grid, cx - w / 2, cy - h / 2, cellPx)
}

function hash2(x: number, y: number): number {
  return ((x * 374761393 + y * 668265263) ^ (x >> 3)) & 0xff
}

export function buildPlazaAndPaths(): PixelRect[] {
  const rects: PixelRect[] = []
  const cx = 512
  const cy = 468
  const plazaR = 168

  for (let y = cy - plazaR; y < cy + plazaR; y += 6) {
    for (let x = cx - plazaR; x < cx + plazaR; x += 6) {
      const dx = (x - cx) / plazaR
      const dy = (y - cy) / plazaR
      const dist = dx * dx + dy * dy
      if (dist > 1.02) continue

      const ring = dist > 0.82
      const h = hash2(x, y)
      let fill: string
      if (ring) {
        fill = h % 2 === 0 ? '#a89878' : '#9a8a6c'
      } else {
        fill = h % 3 === 0 ? '#ddd0b0' : h % 3 === 1 ? '#d4c4a0' : '#c9b896'
      }
      rects.push({ x, y, width: 6, height: 6, fill })
    }
  }

  const drawPath = (x0: number, y0: number, x1: number, y1: number, width: number) => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / 4
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps
      const px = Math.round(x0 + (x1 - x0) * t)
      const py = Math.round(y0 + (y1 - y0) * t)
      const h = hash2(px, py)
      for (let oy = -width / 2; oy < width / 2; oy += 6) {
        for (let ox = -width / 2; ox < width / 2; ox += 6) {
          const edge = Math.abs(ox) > width / 2 - 10 || Math.abs(oy) > width / 2 - 10
          rects.push({
            x: px + ox,
            y: py + oy,
            width: 6,
            height: 6,
            fill: edge ? '#9a8a6c' : h % 2 === 0 ? '#c4b498' : '#b8a888',
          })
        }
      }
    }
  }

  drawPath(cx, cy - plazaR + 20, cx, 200, 48)
  drawPath(cx, cy + plazaR - 20, cx, 824, 48)
  drawPath(cx - plazaR + 20, cy, 200, cy, 48)
  drawPath(cx + plazaR - 20, cy, 824, cy, 48)

  return rects
}

export function buildGrassAccents(): PixelRect[] {
  const rects: PixelRect[] = []
  const accents = [
    { x: 88, y: 780, c: '#66bb6a' },
    { x: 120, y: 800, c: '#57a85a' },
    { x: 900, y: 760, c: '#66bb6a' },
    { x: 860, y: 820, c: '#4caf50' },
    { x: 100, y: 200, c: '#81c784' },
    { x: 920, y: 220, c: '#81c784' },
  ]

  for (const a of accents) {
    rects.push({ x: a.x, y: a.y, width: 8, height: 8, fill: a.c })
    rects.push({ x: a.x + 6, y: a.y - 4, width: 6, height: 6, fill: '#a5d6a7' })
    rects.push({ x: a.x - 4, y: a.y + 4, width: 5, height: 5, fill: '#388e3c' })
  }

  return rects
}

export function buildEmptySlotMarker(cx: number, cy: number, unlocked: boolean): PixelRect[] {
  const rects: PixelRect[] = []
  const size = 136
  const half = size / 2

  for (let py = -half; py < half; py += 4) {
    for (let px = -half; px < half; px += 4) {
      const dist = (px * px) / (half * half) + (py * py) / ((half * 0.82) * (half * 0.82))
      if (dist > 1) continue

      const edge = dist > 0.78
      const inner = dist < 0.35
      let fill: string
      if (!unlocked) {
        fill = edge ? '#8a8f94' : inner ? '#b8bcc0' : '#a8adb2'
      } else if (edge) {
        fill = '#8d6e4a'
      } else if (inner) {
        fill = '#e8d5b5'
      } else {
        fill = hash2(px, py) % 2 === 0 ? '#d4bc96' : '#c9ad82'
      }
      rects.push({ x: cx + px, y: cy + py, width: 4, height: 4, fill })
    }
  }

  const post = unlocked ? '#6d4c33' : '#6b7075'
  const posts: [number, number][] = [
    [-half + 8, -half + 10],
    [half - 12, -half + 10],
    [-half + 8, half - 14],
    [half - 12, half - 14],
  ]
  for (const [px, py] of posts) {
    rects.push({ x: cx + px, y: cy + py, width: 6, height: 18, fill: post })
    rects.push({
      x: cx + px - 1,
      y: cy + py - 4,
      width: 8,
      height: 5,
      fill: unlocked ? '#a1887f' : '#909498',
    })
  }

  if (unlocked) {
    const gold = '#e6b422'
    rects.push({ x: cx - 3, y: cy - 22, width: 6, height: 44, fill: gold })
    rects.push({ x: cx - 22, y: cy - 3, width: 44, height: 6, fill: gold })
  } else {
    rects.push({ x: cx - 10, y: cy - 14, width: 20, height: 16, fill: '#757a80' })
    rects.push({ x: cx - 6, y: cy - 10, width: 12, height: 10, fill: '#9aa0a6' })
    rects.push({ x: cx - 2, y: cy - 4, width: 4, height: 8, fill: '#5c636a' })
  }

  return rects
}

export function hitTestSlot(
  x: number,
  y: number,
  areas: Record<string, { x: number; y: number; w: number; h: number }>,
): string | null {
  for (const [key, area] of Object.entries(areas)) {
    if (x >= area.x && x < area.x + area.w && y >= area.y && y < area.y + area.h) {
      return key
    }
  }
  return null
}

export function buildGrassBackground(): PixelRect[] {
  return buildGrassAccents()
}

export function buildSkyGradient(): PixelRect[] {
  return []
}
