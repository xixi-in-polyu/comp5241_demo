import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const dist = path.join(root, 'dist')
const base = '/comp5241_demo'

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  return (await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(target) : [target]
  }))).flat()
}

function localTarget(url) {
  const clean = url.split(/[?#]/)[0]
  if (!clean.startsWith(base)) return null
  const relative = clean.slice(base.length).replace(/^\//, '')
  if (!relative || relative.endsWith('/')) return path.join(dist, relative, 'index.html')
  return path.join(dist, relative)
}

const missing = []
for (const file of (await walk(dist)).filter((item) => item.endsWith('.html'))) {
  const html = await readFile(file, 'utf8')
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const target = localTarget(match[1])
    if (!target) continue
    try { await access(target) } catch { missing.push(`${path.relative(dist, file)} → ${match[1]}`) }
  }
}

if (missing.length) {
  console.error(`Broken local links:\n${missing.join('\n')}`)
  process.exitCode = 1
} else console.log('Built-site links are valid for the GitHub Pages base path.')

