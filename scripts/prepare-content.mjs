import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import matter from 'gray-matter'
import sharp from 'sharp'

const root = process.cwd()
const source = path.resolve(root, process.env.CONTENT_SOURCE_DIR || 'content')
const generated = path.join(root, '.generated-content')
const publicGenerated = path.join(root, 'public', 'generated')
const stickerCache = path.join(root, '.content-cache', 'stickers')
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.avif'])

async function exists(target) {
  try {
    await stat(target)
    return true
  } catch {
    return false
  }
}

async function walk(directory) {
  if (!(await exists(directory))) return []
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(target) : [target]
  }))
  return nested.flat()
}

function publicPath(target) {
  return `/${path.relative(path.join(root, 'public'), target).split(path.sep).join('/')}`
}

function dateValue(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.valueOf()) ? String(value) : date.toISOString().slice(0, 10)
}

async function publishAttachment(file) {
  const relative = path.relative(source, file)
  const destination = path.join(publicGenerated, 'content', relative)
  await mkdir(path.dirname(destination), { recursive: true })
  const extension = path.extname(file).toLowerCase()
  if (!imageExtensions.has(extension)) return cp(file, destination)

  const pipeline = sharp(file).rotate()
  if (extension === '.jpg' || extension === '.jpeg') return pipeline.jpeg({ quality: 86 }).toFile(destination)
  if (extension === '.png') return pipeline.png({ compressionLevel: 9 }).toFile(destination)
  if (extension === '.webp') return pipeline.webp({ quality: 86 }).toFile(destination)
  if (extension === '.avif') return pipeline.avif({ quality: 72 }).toFile(destination)
  return pipeline.tiff({ compression: 'lzw' }).toFile(destination)
}

async function resolveImage(markdownFile, imageReference) {
  if (!imageReference) return null
  const clean = String(imageReference).replace(/^!\[\[/, '').replace(/\]\]$/, '').split('|')[0]
  const candidates = [path.resolve(path.dirname(markdownFile), clean), path.resolve(source, clean), path.resolve(source, 'assets', clean)]
  for (const candidate of candidates) {
    if (candidate.startsWith(source) && await exists(candidate)) return candidate
  }
  return null
}

function convexHull(points) {
  if (points.length < 3) return points
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const lower = []
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), point) <= 0) lower.pop()
    lower.push(point)
  }
  const upper = []
  for (const point of sorted.reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), point) <= 0) upper.pop()
    upper.push(point)
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1))
}

async function alphaHull(file) {
  const { data, info } = await sharp(file).ensureAlpha().resize({ width: 72, height: 72, fit: 'inside' }).raw().toBuffer({ resolveWithObject: true })
  const points = []
  for (let y = 0; y < info.height; y += 2) {
    for (let x = 0; x < info.width; x += 2) {
      if (data[(y * info.width + x) * info.channels + 3] > 40) points.push({ x: x / info.width, y: y / info.height })
    }
  }
  const hull = convexHull(points)
  const step = Math.max(1, Math.ceil(hull.length / 12))
  return hull.filter((_, index) => index % step === 0).slice(0, 12)
}

const rembgAvailable = spawnSync('rembg', ['--help'], { stdio: 'ignore' }).status === 0

async function processGalleryRecord(markdownFile) {
  const parsed = matter(await readFile(markdownFile, 'utf8'))
  const data = parsed.data
  if (data.share !== true || data.draft === true || data.type !== 'photo') return null

  const wikiImage = parsed.content.match(/!\[\[([^\]]+)\]\]/)?.[1]
  const markdownImage = parsed.content.match(/!\[[^\]]*\]\(([^)]+)\)/)?.[1]
  const sourceImage = await resolveImage(markdownFile, data.image || wikiImage || markdownImage)
  if (!sourceImage) {
    console.warn(`Photo ${path.relative(source, markdownFile)} has no readable image; skipping.`)
    return null
  }

  const id = String(data.id || path.basename(markdownFile, path.extname(markdownFile)))
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '-')
  const galleryDirectory = path.join(publicGenerated, 'gallery')
  await mkdir(galleryDirectory, { recursive: true })
  const full = path.join(galleryDirectory, `${safeId}.webp`)
  const thumbnail = path.join(galleryDirectory, `${safeId}-thumb.webp`)
  await sharp(sourceImage).rotate().resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toFile(full)
  await sharp(sourceImage).rotate().resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toFile(thumbnail)

  let stickerUrl = ''
  let shape = []
  if (data.sticker === true) {
    const override = data.cutoutOverride ? await resolveImage(markdownFile, data.cutoutOverride) : null
    const inputBuffer = await readFile(override || sourceImage)
    const digest = createHash('sha256').update(inputBuffer).digest('hex')
    const cached = path.join(stickerCache, `${digest}.png`)
    await mkdir(stickerCache, { recursive: true })

    if (!(await exists(cached))) {
      if (override) await sharp(override).rotate().png().toFile(cached)
      else if (rembgAvailable) {
        const result = spawnSync('rembg', ['i', '-m', 'u2net', sourceImage, cached], { stdio: 'inherit' })
        if (result.status !== 0) await sharp(sourceImage).rotate().png().toFile(cached)
      } else await sharp(sourceImage).rotate().png().toFile(cached)
    }

    const sticker = path.join(galleryDirectory, `${safeId}-sticker.webp`)
    await sharp(cached).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).extend({ top: 12, bottom: 12, left: 12, right: 12, background: { r: 255, g: 255, b: 255, alpha: 0 } }).resize({ width: 420, height: 420, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88, alphaQuality: 100 }).toFile(sticker)
    stickerUrl = publicPath(sticker)
    shape = await alphaHull(sticker)
  }

  return {
    id,
    title: data.title || '',
    alt: String(data.alt || data.title || 'Personal photograph'),
    caption: data.caption || '',
    date: dateValue(data.date),
    featured: data.featured === true,
    image: publicPath(full),
    thumbnail: publicPath(thumbnail),
    sticker: stickerUrl,
    shape,
  }
}

await rm(generated, { recursive: true, force: true })
await rm(publicGenerated, { recursive: true, force: true })
await mkdir(generated, { recursive: true })
await mkdir(publicGenerated, { recursive: true })

if (await exists(source)) {
  for (const directory of ['notes', 'projects']) {
    const sourceDirectory = path.join(source, directory)
    if (await exists(sourceDirectory)) await cp(sourceDirectory, path.join(generated, directory), { recursive: true })
  }

  const files = await walk(source)
  const galleryMarkdown = files.filter((item) => path.extname(item).toLowerCase() === '.md')
  const privatePhotoInputs = new Set()
  for (const file of galleryMarkdown) {
    const parsed = matter(await readFile(file, 'utf8'))
    if (parsed.data.share !== true || parsed.data.draft === true || parsed.data.type !== 'photo') continue
    const wikiImage = parsed.content.match(/!\[\[([^\]]+)\]\]/)?.[1]
    const markdownImage = parsed.content.match(/!\[[^\]]*\]\(([^)]+)\)/)?.[1]
    const input = await resolveImage(file, parsed.data.image || wikiImage || markdownImage)
    const override = parsed.data.cutoutOverride ? await resolveImage(file, parsed.data.cutoutOverride) : null
    if (input) privatePhotoInputs.add(input)
    if (override) privatePhotoInputs.add(override)
  }
  for (const file of files.filter((item) => path.extname(item).toLowerCase() !== '.md' && !privatePhotoInputs.has(item))) await publishAttachment(file)

  const gallery = (await Promise.all(galleryMarkdown.map(processGalleryRecord))).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date))
  await writeFile(path.join(generated, 'gallery.json'), `${JSON.stringify(gallery, null, 2)}\n`)
} else {
  await writeFile(path.join(generated, 'gallery.json'), '[]\n')
}

console.log(`Prepared publishable content from ${path.relative(root, source) || '.'}${rembgAvailable ? ' with U²-Net cutouts' : ''}.`)
