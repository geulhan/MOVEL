import type { PixelGrid, PixelRect } from './pixelTypes'
import { ARTBOARD_SIZE } from './pixelTypes'

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

/** 16×16 → 고밀도 그리드로 확대 (셀 내부 음영 변화) */
export function upscaleGrid(base: PixelGrid, targetSize: number): PixelGrid {
  const factor = Math.max(1, Math.round(targetSize / base.gridSize))
  const outSize = base.gridSize * factor
  const outPixels: string[] = []

  for (let y = 0; y < outSize; y += 1) {
    let row = ''
    const sy = Math.floor(y / factor)
    const subY = y % factor
    for (let x = 0; x < outSize; x += 1) {
      const sx = Math.floor(x / factor)
      const subX = x % factor
      const src = base.pixels[sy]?.[sx] ?? '0'
      if (src === '0') {
        row += '0'
        continue
      }
      const baseIdx = Number(src)
      const edge = subX === 0 || subY === 0
      const inner = subX === factor - 1 || subY === factor - 1
      let idx = baseIdx
      if (edge && baseIdx > 0 && base.palette.length > baseIdx + 1) {
        idx = Math.min(base.palette.length - 1, baseIdx + ((subX + subY) % 2))
      } else if (inner && baseIdx > 1) {
        idx = Math.max(1, baseIdx - 1)
      }
      row += String(idx)
    }
    outPixels.push(row)
  }

  return {
    gridSize: outSize,
    palette: base.palette,
    pixels: outPixels,
  }
}

function hash2(x: number, y: number): number {
  return ((x * 374761393 + y * 668265263) ^ (x >> 3)) & 0xff
}

export function buildGrassBackground(): PixelRect[] {
  const rects: PixelRect[] = []
  const tile = 16
  const cols = ARTBOARD_SIZE / tile
  const rows = ARTBOARD_SIZE / tile
  const greens = ['#4a7c3f', '#528c46', '#5a9e4f', '#62a857', '#6ba85c', '#73b363']
  const darks = ['#3d6b35', '#446f38', '#4a753c']

  for (let gy = 0; gy < rows; gy += 1) {
    for (let gx = 0; gx < cols; gx += 1) {
      const h = hash2(gx, gy)
      const palette = h % 7 === 0 ? darks : greens
      const color = palette[h % palette.length]
      rects.push({
        x: gx * tile,
        y: gy * tile,
        width: tile,
        height: tile,
        fill: color,
      })
      if (h % 11 === 0) {
        rects.push({
          x: gx * tile + 4,
          y: gy * tile + 4,
          width: 3,
          height: 3,
          fill: h % 2 === 0 ? '#7bc96f' : '#8ed16e',
        })
      }
    }
  }
  return rects
}

export function buildSkyGradient(): PixelRect[] {
  const rects: PixelRect[] = []
  const bands = [
    { y: 0, h: 120, c: '#9ec9e8' },
    { y: 120, h: 120, c: '#b4d4eb' },
    { y: 240, h: 120, c: '#c8e0f0' },
    { y: 360, h: 80, c: '#d8ebf5' },
  ]
  for (const band of bands) {
    rects.push({
      x: 0,
      y: band.y,
      width: ARTBOARD_SIZE,
      height: band.h,
      fill: band.c,
    })
  }
  return rects
}

export function buildPlazaAndPaths(): PixelRect[] {
  const rects: PixelRect[] = []
  const cx = 512
  const cy = 480

  for (let y = 320; y < 640; y += 8) {
    for (let x = 352; x < 672; x += 8) {
      const dx = (x - cx) / 160
      const dy = (y - cy) / 160
      if (dx * dx + dy * dy <= 1.05) {
        const h = hash2(x, y)
        rects.push({
          x,
          y,
          width: 8,
          height: 8,
          fill: h % 3 === 0 ? '#c9b896' : '#d4c4a0',
        })
      }
    }
  }

  const pathW = 56
  const pathColor = '#b8a888'
  rects.push({ x: cx - pathW / 2, y: 200, width: pathW, height: 180, fill: pathColor })
  rects.push({ x: cx - pathW / 2, y: 580, width: pathW, height: 180, fill: pathColor })
  rects.push({ x: 200, y: cy - pathW / 2, width: 180, height: pathW, fill: pathColor })
  rects.push({ x: 644, y: cy - pathW / 2, width: 180, height: pathW, fill: pathColor })

  return rects
}

export function buildEmptySlotMarker(cx: number, cy: number, unlocked: boolean): PixelRect[] {
  const rects: PixelRect[] = []
  const size = 120
  const x = cx - size / 2
  const y = cy - size / 2
  const fill = unlocked ? '#f5e6c8' : '#d8d8d8'
  const border = unlocked ? '#c9a227' : '#9e9e9e'

  for (let py = 0; py < size; py += 8) {
    for (let px = 0; px < size; px += 8) {
      const edge =
        px < 8 || py < 8 || px >= size - 8 || py >= size - 8
      rects.push({
        x: x + px,
        y: y + py,
        width: 8,
        height: 8,
        fill: edge ? border : fill,
      })
    }
  }

  if (unlocked) {
    const plus = '#c9a227'
    rects.push({ x: cx - 4, y: cy - 28, width: 8, height: 56, fill: plus })
    rects.push({ x: cx - 28, y: cy - 4, width: 56, height: 8, fill: plus })
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
