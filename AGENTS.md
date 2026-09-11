# Repository Guide

## Project Overview

This is a static personal homepage built with Astro and React islands. It deploys to GitHub Pages under `/comp5241_demo/`. There is no runtime server or database.

## Architecture

- `src/pages/` owns Astro routes for the homepage, notes, note detail pages, and gallery.
- `src/layouts/BaseLayout.astro` owns shared metadata, navigation, footer, and global styling.
- `src/lib/content.ts` reads prepared Markdown, validates publishable notes, resolves Wiki Links, and derives backlinks and related notes.
- `src/components/StickerPlayground.jsx` is the only substantial browser-side React island. Keep it lazy-loaded.
- `scripts/prepare-content.mjs` is the publishing boundary. It copies only public content, strips image metadata, produces gallery variants and sticker shapes, and uses cached U²-Net output when available.
- `scripts/fetch-activity.mjs` normalizes GitHub and optional LeetCode activity into `src/data/activity-cache.json`.
- `content/` is a safe local fallback. Production can use the private content checkout through `CONTENT_SOURCE_DIR`.
- `src/styles/global.css` contains design tokens and site/page/component styling.

## Content rules

Only records with `share: true` and without `draft: true` may be published. Preserve stable note and photo IDs. Never copy a private content repository or original photos directly into `public/` or `dist/`. Image processing must continue to omit EXIF/GPS metadata.

Unresolved Wiki Links should remain plain text and produce a build warning. Project sections must stay hidden when there are no public project records. LeetCode must stay hidden when no username is configured.

## Commands

```sh
npm install
npm run dev
npm run build
npm run check:links
npm run lint
npm run preview
```

Run the production build, static-link check, and lint before deployment. There is no runtime API; external account data is fetched only in GitHub Actions and cached in the repository.
