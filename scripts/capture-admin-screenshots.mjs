/**
 * 관리자·플랫폼 내부 화면 스크린샷 캡처
 *
 * 사용법 (PowerShell):
 *   $env:SCREENSHOT_BASE_URL = "https://motionhub.kr"
 *   $env:ADMIN_USERNAME = "your-id"
 *   $env:ADMIN_PASSWORD = "your-password"
 *   # 센터 slug가 URL에 필요한 경우만:
 *   # $env:ADMIN_CENTER_SLUG = "your-center"
 *   npx --yes playwright@1.49.1 install chromium
 *   node scripts/capture-admin-screenshots.mjs
 *
 * 출력: docs/assets/full-guide/admin-*.png
 */

import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '../docs/assets/full-guide')

const BASE = (process.env.SCREENSHOT_BASE_URL || 'https://motionhub.kr').replace(/\/$/, '')
const USER = process.env.ADMIN_USERNAME
const PASS = process.env.ADMIN_PASSWORD
const CENTER = process.env.ADMIN_CENTER_SLUG?.trim()
const MANUAL_LOGIN = process.env.MANUAL_LOGIN === '1'
const HEADLESS = process.env.HEADLESS !== '0' && !MANUAL_LOGIN

if (!MANUAL_LOGIN && (!USER || !PASS)) {
  console.error(
    'ADMIN_USERNAME, ADMIN_PASSWORD 환경 변수가 필요합니다.\n' +
      '또는 MANUAL_LOGIN=1 HEADLESS=0 로 브라우저에서 직접 로그인하세요.',
  )
  process.exit(1)
}

const ADMIN_PAGES = [
  { file: 'admin-01-beta-start.png', path: '/admin/beta-start' },
  { file: 'admin-02-dashboard.png', path: '/admin' },
  { file: 'admin-03-leads.png', path: '/admin/leads' },
  { file: 'admin-04-members.png', path: '/admin/members' },
  { file: 'admin-05-schedule.png', path: '/admin/schedule' },
  { file: 'admin-06-classes.png', path: '/admin/classes' },
  { file: 'admin-07-attendance.png', path: '/admin/attendance' },
  { file: 'admin-08-trainers.png', path: '/admin/trainers' },
  { file: 'admin-09-facility.png', path: '/admin/facility' },
  { file: 'admin-10-mileage.png', path: '/admin/motionhub' },
  { file: 'admin-11-payments.png', path: '/admin/payments' },
  { file: 'admin-12-analytics-dashboard.png', path: '/admin/analytics?tab=dashboard' },
  { file: 'admin-13-analytics-report.png', path: '/admin/analytics?tab=report' },
  { file: 'admin-14-analytics-assistant.png', path: '/admin/analytics?tab=assistant' },
  { file: 'admin-15-messages.png', path: '/admin/messages' },
  { file: 'admin-16-settings.png', path: '/admin/settings' },
]

async function loginAdmin(page) {
  const loginUrl = CENTER ? `${BASE}/login?center=${CENTER}` : `${BASE}/login`
  await page.goto(loginUrl, { waitUntil: 'networkidle' })

  if (MANUAL_LOGIN) {
    console.log('브라우저에서 로그인한 뒤 /admin 으로 이동해 주세요. (최대 3분 대기)')
    await page.waitForURL(/\/admin/, { timeout: 180_000 })
    return
  }

  await page.locator('input[autocomplete="username"]').fill(USER)
  await page.locator('input[autocomplete="current-password"]').fill(PASS)

  if (CENTER) {
    const slugField = page.getByPlaceholder('abc-pt')
    if (await slugField.isVisible().catch(() => false)) {
      await slugField.fill(CENTER)
    } else {
      await page.locator('input[autocomplete="username"]').fill(USER)
      await page.locator('input[autocomplete="current-password"]').fill(PASS)
      await page.getByRole('button', { name: '로그인' }).click()
      await page.waitForTimeout(1500)
      const slugAfter = page.getByPlaceholder('abc-pt')
      if (await slugAfter.isVisible().catch(() => false)) {
        await slugAfter.fill(CENTER)
      }
    }
  }

  await page.getByRole('button', { name: '로그인' }).click()
  await page.waitForURL(/\/admin/, { timeout: 30_000 })
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch({
    headless: HEADLESS,
    channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    await loginAdmin(page)
    for (const { file, path: route } of ADMIN_PAGES) {
      console.log(`capture ${route}`)
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1200)
      await page.screenshot({
        path: path.join(OUT_DIR, file),
        fullPage: true,
      })
    }
    console.log(`완료: ${OUT_DIR}`)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
