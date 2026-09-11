import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

const root = process.cwd()
const generatedRoot = path.join(root, '.generated-content')

export interface Note {
  id: string
  title: string
  slug: string
  date: string
  updated: string
  description: string
  tags: string[]
  comments: boolean
  html: string
  backlinks: Array<Pick<Note, 'title' | 'slug'>>
  related: Array<Pick<Note, 'title' | 'slug' | 'description'>>
}

export interface Project {
  title: string
  summary: string
  url: string
  repoUrl: string
  tags: string[]
  image: string
  featured: boolean
  status: string
}

export interface GalleryItem {
  id: string
  title: string
  alt: string
  caption: string
  date: string
  featured: boolean
  image: string
  thumbnail: string
  sticker: string
  shape: Array<{ x: number; y: number }>
}

type RawNote = Omit<Note, 'html' | 'backlinks' | 'related'> & {
  body: string
  file: string
  outbound: string[]
}

async function walkMarkdown(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true })
    const files = await Promise.all(entries.map((entry) => {
      const target = path.join(directory, entry.name)
      return entry.isDirectory() ? walkMarkdown(target) : entry.name.endsWith('.md') ? [target] : []
    }))
    return files.flat()
  } catch {
    return []
  }
}

function dateValue(value: unknown) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.valueOf()) ? String(value) : date.toISOString().slice(0, 10)
}

function contentAssetUrl(file: string, target: string) {
  const clean = target.trim().replace(/^<|>$/g, '').split('#')[0]
  if (/^(https?:|mailto:|#|\/)/.test(clean)) return target
  const relativeFile = path.relative(path.join(generatedRoot, 'notes'), file).split(path.sep).join('/')
  const relativeAsset = path.posix.normalize(path.posix.join('notes', path.posix.dirname(relativeFile), clean))
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}/generated/content/${relativeAsset}`
}

function normalizeTarget(value: string) {
  return value.split('#')[0].trim().toLowerCase().replace(/\.md$/, '')
}

function resolveWikiLinks(note: RawNote, notes: RawNote[]) {
  const outbound: string[] = []
  let body = note.body.replace(/!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, (_, target) => {
    const url = contentAssetUrl(note.file, target)
    return `![${path.basename(target, path.extname(target))}](${url})`
  })

  body = body.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => {
    const key = normalizeTarget(target)
    const match = notes.find((candidate) => [candidate.slug, candidate.title.toLowerCase(), path.basename(candidate.file, '.md').toLowerCase()].includes(key))
    const label = alias || String(target).split('#')[0]
    if (!match) {
      console.warn(`Unpublished Wiki Link in ${note.slug}: ${target}`)
      return label
    }
    outbound.push(match.id)
    const base = import.meta.env.BASE_URL.replace(/\/$/, '')
    return `[${label}](${base}/notes/${match.slug}/)`
  })

  body = body.replace(/(!?\[[^\]]*\]\()([^)]+)(\))/g, (whole, open, target, close) => {
    if (/^(https?:|mailto:|#|\/)/.test(target)) return whole
    return `${open}${contentAssetUrl(note.file, target)}${close}`
  })
  return { body, outbound }
}

function renderMarkdown(markdown: string) {
  return sanitizeHtml(marked.parse(markdown) as string, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'figure', 'figcaption', 'details', 'summary']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'loading'],
      code: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
  })
}

export async function getNotes(): Promise<Note[]> {
  const files = await walkMarkdown(path.join(generatedRoot, 'notes'))
  const rawNotes: RawNote[] = []

  for (const file of files) {
    const parsed = matter(await readFile(file, 'utf8'))
    const data = parsed.data
    if (data.share !== true || data.draft === true) continue
    const missing = ['id', 'title', 'slug', 'date'].filter((field) => !data[field])
    if (missing.length) {
      console.warn(`Skipping ${path.basename(file)}; missing ${missing.join(', ')}.`)
      continue
    }
    rawNotes.push({
      id: String(data.id), title: String(data.title), slug: String(data.slug),
      date: dateValue(data.date), updated: dateValue(data.updated || data.date),
      description: String(data.description || ''), tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      comments: data.comments !== false, body: parsed.content, file, outbound: [],
    })
  }

  const ids = new Set<string>()
  const slugs = new Set<string>()
  for (const note of rawNotes) {
    if (ids.has(note.id) || slugs.has(note.slug)) throw new Error(`Duplicate note id or slug: ${note.title}`)
    ids.add(note.id); slugs.add(note.slug)
  }

  const rendered = rawNotes.map((note) => {
    const resolved = resolveWikiLinks(note, rawNotes)
    note.outbound = resolved.outbound
    return { note, html: renderMarkdown(resolved.body) }
  })

  return rendered.map(({ note, html }) => {
    const backlinkNotes = rawNotes.filter((candidate) => candidate.outbound.includes(note.id))
    const relatedNotes = rawNotes
      .filter((candidate) => candidate.id !== note.id)
      .map((candidate) => ({ candidate, score: candidate.tags.filter((tag) => note.tags.includes(tag)).length }))
      .filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map(({ candidate }) => candidate)
    return {
      id: note.id, title: note.title, slug: note.slug, date: note.date, updated: note.updated,
      description: note.description, tags: note.tags, comments: note.comments, html,
      backlinks: backlinkNotes.map(({ title, slug }) => ({ title, slug })),
      related: relatedNotes.map(({ title, slug, description }) => ({ title, slug, description })),
    }
  }).sort((a, b) => b.date.localeCompare(a.date))
}

export async function getProjects(): Promise<Project[]> {
  const files = await walkMarkdown(path.join(generatedRoot, 'projects'))
  const projects: Project[] = []
  for (const file of files) {
    const data = matter(await readFile(file, 'utf8')).data
    if (data.share !== true || data.draft === true) continue
    projects.push({
      title: String(data.title || ''), summary: String(data.summary || ''), url: String(data.url || ''),
      repoUrl: String(data.repoUrl || ''), tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      image: String(data.image || ''), featured: data.featured === true, status: String(data.status || ''),
    })
  }
  return projects.sort((a, b) => Number(b.featured) - Number(a.featured))
}

export async function getGallery(): Promise<GalleryItem[]> {
  try {
    return JSON.parse(await readFile(path.join(generatedRoot, 'gallery.json'), 'utf8'))
  } catch {
    return []
  }
}
