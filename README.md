# Personal homepage

A static Astro homepage with React islands for interaction. It is built for GitHub Pages at `/comp5241_demo/` and does not require a server, database, or browser-side account tokens.

## Features

- Build-time GitHub and optional LeetCode activity snapshots with stale-cache fallback
- Obsidian-compatible Markdown notes, Wiki Links, backlinks, related notes, and Giscus comments
- Hand-picked project collection that stays hidden until data exists
- Photo pipeline that strips metadata, creates responsive images, and supports cached U²-Net cutouts
- Lazy-loaded Matter.js sticker playground with touch, keyboard, pinning, reset, and reduced-motion support
- Responsive gallery with a native dialog lightbox

## Local development

```sh
npm install
npm run dev
npm run build
npm run check:links
npm run lint
```

The local fallback content lives in `content/`. To build from another directory:

```sh
CONTENT_SOURCE_DIR=/path/to/homepage-content npm run build
```

See [Content publishing](docs/CONTENT_PUBLISHING.md) for the private repository, Enveloppe, photo, Giscus, and repository-variable setup.

## Deployment

`.github/workflows/deploy-pages.yml` deploys on `main`, on a `content-updated` repository dispatch, and once per day. Activity or content API failures reuse cached data and do not block Pages deployment.
