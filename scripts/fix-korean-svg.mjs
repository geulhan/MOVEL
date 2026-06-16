import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svgDir = join(__dirname, '../assets/brand/motionhub/svg')
const tagline = '운동센터 운영 SaaS 플랫폼'

const combinationKoDark = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 72" fill="none" role="img" aria-label="모션허브 로고">
  <title>모션허브 한글 조합 로고 - 다크</title>
  <g transform="translate(0, 4)">
    <circle cx="32" cy="32" r="28" stroke="#2FF3D6" stroke-width="1.5" opacity="0.35"/>
    <line x1="32" y1="6" x2="32" y2="14" stroke="#2FF3D6" stroke-width="2" stroke-linecap="round"/>
    <line x1="32" y1="50" x2="32" y2="58" stroke="#2FF3D6" stroke-width="2" stroke-linecap="round"/>
    <line x1="6" y1="32" x2="14" y2="32" stroke="#2FF3D6" stroke-width="2" stroke-linecap="round"/>
    <line x1="50" y1="32" x2="58" y2="32" stroke="#2FF3D6" stroke-width="2" stroke-linecap="round"/>
    <circle cx="32" cy="6" r="3" fill="#2FF3D6"/>
    <circle cx="32" cy="58" r="3" fill="#2FF3D6"/>
    <circle cx="6" cy="32" r="3" fill="#2FF3D6"/>
    <circle cx="58" cy="32" r="3" fill="#2FF3D6"/>
    <path d="M19 44V22l8 12 5-8 5 8 8-12v22" stroke="#2FF3D6" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <line x1="76" y1="12" x2="76" y2="60" stroke="#8A94A6" stroke-width="1" opacity="0.6"/>
  <g transform="translate(92, 8)">
    <text x="0" y="34" font-family="'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" font-size="30" font-weight="700" fill="#F8FAFC">모션허브</text>
    <text x="1" y="52" font-family="'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" font-size="11" font-weight="400" fill="#8A94A6">${tagline}</text>
  </g>
</svg>
`

writeFileSync(join(svgDir, 'combination-ko-dark.svg'), combinationKoDark, 'utf8')
console.log('wrote combination-ko-dark.svg')

for (const name of ['combination-dark.svg', 'combination-light.svg', 'combination-vertical-dark.svg']) {
  const filePath = join(svgDir, name)
  let content = readFileSync(filePath, 'utf8')
  content = content.replace(
    /(<text[^>]*fill="#8A94A6"[^>]*>)[^<]+(<\/text>)/g,
    `$1${tagline}$2`,
  )
  writeFileSync(filePath, content, 'utf8')
  console.log(`fixed ${name}`)
}
