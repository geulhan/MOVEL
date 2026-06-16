import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default function handler(_req, res) {
  const xml = readFileSync(join(__dirname, '../seo/sitemap.xml'), 'utf8')
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.status(200).send(xml)
}
