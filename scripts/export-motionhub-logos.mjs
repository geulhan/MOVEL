#!/usr/bin/env node
/**
 * MotionHub logo SVG → PNG exporter
 * Usage: node scripts/export-motionhub-logos.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svgDir = join(root, 'assets/brand/motionhub/svg')
const pngDir = join(root, 'assets/brand/motionhub/png')

const exports = [
  { svg: 'symbol-dark.svg', png: 'symbol-dark-transparent.png', width: 512 },
  { svg: 'symbol-light.svg', png: 'symbol-light-transparent.png', width: 512 },
  { svg: 'wordmark-dark.svg', png: 'wordmark-dark-transparent.png', width: 960 },
  { svg: 'wordmark-light.svg', png: 'wordmark-light-transparent.png', width: 960 },
  { svg: 'combination-dark.svg', png: 'combination-dark-transparent.png', width: 1200 },
  { svg: 'combination-light.svg', png: 'combination-light-transparent.png', width: 1200 },
  { svg: 'combination-ko-dark.svg', png: 'combination-ko-dark-transparent.png', width: 960 },
  { svg: 'combination-vertical-dark.svg', png: 'combination-vertical-dark-transparent.png', width: 640 },
  { svg: 'app-icon.svg', png: 'app-icon-1024.png', width: 1024 },
  { svg: 'app-icon.svg', png: 'app-icon-512.png', width: 512 },
  { svg: 'app-icon.svg', png: 'app-icon-192.png', width: 192 },
  { svg: 'favicon.svg', png: 'favicon-32.png', width: 32 },
  { svg: 'favicon.svg', png: 'apple-touch-icon-180.png', width: 180 },
]

const koreanFontCandidates = [
  'C:/Windows/Fonts/malgun.ttf',
  'C:/Windows/Fonts/malgunbd.ttf',
  join(homedir(), 'AppData/Local/Microsoft/Windows/Fonts/NotoSansKR-Regular.ttf'),
]

function resolveKoreanFontFiles() {
  return koreanFontCandidates.filter((path) => existsSync(path))
}

function createResvg(svg, width) {
  const fontFiles = resolveKoreanFontFiles()
  return new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: {
      loadSystemFonts: true,
      defaultFontFamily: 'Malgun Gothic',
      fontFiles,
    },
  })
}

function renderSvg(svgPath, width) {
  const svg = readFileSync(svgPath, 'utf8')
  return createResvg(svg, width).render().asPng()
}

function renderOnBackground(svgName, width, bg, scaleBase = 1200) {
  const svg = readFileSync(join(svgDir, svgName), 'utf8')
  const inner = svg.replace(/<\?xml[^?]*\?>\s*/i, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  const height = Math.round(width * 0.22)
  const wrapped = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="${bg}"/>
  <g transform="translate(${width * 0.04}, ${height * 0.12}) scale(${width / scaleBase})">
  ${inner}
  </g>
</svg>`
  return createResvg(wrapped, width).render().asPng()
}

if (!existsSync(pngDir)) mkdirSync(pngDir, { recursive: true })

for (const item of exports) {
  const svgPath = join(svgDir, item.svg)
  const outPath = join(pngDir, item.png)
  writeFileSync(outPath, renderSvg(svgPath, item.width))
  console.log(`✓ ${item.png}`)
}

writeFileSync(
  join(pngDir, 'combination-dark.png'),
  renderOnBackground('combination-dark.svg', 1200, '#0B0F14'),
)
console.log('✓ combination-dark.png')

writeFileSync(
  join(pngDir, 'combination-light.png'),
  renderOnBackground('combination-light.svg', 1200, '#FFFFFF'),
)
console.log('✓ combination-light.png')

writeFileSync(
  join(pngDir, 'combination-ko-dark.png'),
  renderOnBackground('combination-ko-dark.svg', 960, '#0B0F14', 420),
)
console.log('✓ combination-ko-dark.png')

writeFileSync(
  join(pngDir, 'symbol-dark.png'),
  renderOnBackground('symbol-dark.svg', 512, '#0B0F14', 64),
)
console.log('✓ symbol-dark.png')

writeFileSync(
  join(pngDir, 'symbol-light.png'),
  renderOnBackground('symbol-light.svg', 512, '#FFFFFF', 64),
)
console.log('✓ symbol-light.png')

const publicDir = join(root, 'public')
writeFileSync(join(publicDir, 'favicon.svg'), readFileSync(join(svgDir, 'favicon.svg')))
writeFileSync(join(publicDir, 'favicon-32.png'), readFileSync(join(pngDir, 'favicon-32.png')))
writeFileSync(join(publicDir, 'apple-touch-icon.png'), readFileSync(join(pngDir, 'apple-touch-icon-180.png')))
writeFileSync(join(publicDir, 'motionhub-og.png'), readFileSync(join(pngDir, 'app-icon-1024.png')))
console.log('✓ public favicon + og image updated')
