/**
 * 건물 PNG 체크무늬·흰 배경 제거 (가장자리 flood-fill)
 * 사용: node scripts/strip-village-building-bg.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BUILDINGS_DIR = path.join(__dirname, '../public/assets/village/buildings')

function isBackgroundPixel(r, g, b, a) {
  if (a < 8) return true
  if (r >= 246 && g >= 246 && b >= 246) return true
  const spread = Math.max(r, g, b) - Math.min(r, g, b)
  if (spread <= 14 && r >= 168 && r <= 244) return true
  return false
}

function floodFillBackground(data, width, height) {
  const visited = new Uint8Array(width * height)
  const queue = []

  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const idx = y * width + x
    if (visited[idx]) return
    const i = idx * 4
    if (!isBackgroundPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) return
    visited[idx] = 1
    queue.push(idx)
  }

  for (let x = 0; x < width; x++) {
    enqueue(x, 0)
    enqueue(x, height - 1)
  }
  for (let y = 0; y < height; y++) {
    enqueue(0, y)
    enqueue(width - 1, y)
  }

  while (queue.length > 0) {
    const idx = queue.pop()
    const x = idx % width
    const y = (idx - x) / width
    const i = idx * 4
    data[i + 3] = 0
    enqueue(x - 1, y)
    enqueue(x + 1, y)
    enqueue(x, y - 1)
    enqueue(x, y + 1)
  }
}

function processFile(filePath) {
  const buffer = fs.readFileSync(filePath)
  const png = PNG.sync.read(buffer)
  floodFillBackground(png.data, png.width, png.height)
  fs.writeFileSync(filePath, PNG.sync.write(png))
  console.log(`processed ${path.basename(filePath)} (${png.width}x${png.height})`)
}

const files = fs
  .readdirSync(BUILDINGS_DIR)
  .filter((f) => f.endsWith('.png'))

for (const file of files) {
  processFile(path.join(BUILDINGS_DIR, file))
}

console.log(`Done. ${files.length} files.`)
