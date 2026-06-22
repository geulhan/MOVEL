/**
 * 검정 배경이 포함된 로고 PNG → 투명 배경 PNG 변환
 * 사용: node scripts/make-logo-transparent.mjs [input.png]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const brandDir = path.join(root, 'public/brand/motionhub')
const input =
  process.argv[2] ?? path.join(brandDir, 'logo-dark.png')
const outPath = path.join(brandDir, 'logo-transparent.png')

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

for (let i = 0; i < data.length; i += 4) {
  const r = data[i]
  const g = data[i + 1]
  const b = data[i + 2]
  if (r < 45 && g < 45 && b < 45) {
    data[i + 3] = 0
  }
}

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toFile(outPath)

console.log(`Wrote ${outPath} (${info.width}x${info.height})`)
