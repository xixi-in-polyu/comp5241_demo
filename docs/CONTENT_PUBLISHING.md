# Content publishing setup

The homepage remains a static GitHub Pages site. Notes and photographs can live in a separate private repository and are copied into the build only when they are explicitly marked for sharing.

## 1. Private content repository

Create a private repository named `homepage-content` with this shape:

```text
notes/
projects/
photos/
assets/
```

In the homepage repository, add:

- Repository variable `CONTENT_REPO`: `OWNER/homepage-content`
- Repository secret `CONTENT_REPO_TOKEN`: a fine-grained, read-only token for that repository
- Optional repository variables `GISCUS_REPO_ID`, `GISCUS_CATEGORY_ID`, and `GISCUS_CATEGORY`

Use a different fine-grained token in Obsidian. It should have write access only to `homepage-content`.

## 2. Obsidian and Enveloppe

Install Enveloppe, point it at `homepage-content`, and configure the plugin to publish a note only when `share` is `true`. Enable Wiki Link conversion and attachment upload. Do not point Enveloppe at the full vault.

Public note frontmatter:

```yaml
---
share: true
id: "stable UUID"
title: "Title"
slug: "stable-english-or-pinyin-path"
date: "2026-09-12"
updated: "2026-09-12"
description: "Summary"
tags: ["AI", "learning"]
comments: true
draft: false
---
```

The `id` is the stable Giscus discussion key. Keep it unchanged when a note title or slug changes. Wiki Links to unpublished notes render as plain text and produce a build warning.

Photo records use:

```yaml
---
share: true
type: photo
id: "stable UUID"
date: "2026-09-12"
title: "Optional title"
alt: "Required image description"
caption: "Optional caption"
image: "../assets/photo.jpg"
featured: true
sticker: true
cutoutOverride: ""
---
```

During deployment the source image is rotated according to EXIF, resized, re-encoded without EXIF/GPS, and never copied into `dist`. If `cutoutOverride` is empty, the workflow uses U²-Net through `rembg`. Generated cutouts are cached by input hash.

## 3. Trigger a homepage rebuild

Add this workflow to `homepage-content/.github/workflows/notify-homepage.yml`, and add a secret named `HOMEPAGE_DISPATCH_TOKEN` with permission to call Actions in the homepage repository:

```yaml
name: Rebuild homepage
on:
  push:
    branches: [main]
jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - run: gh api repos/xixi-in-polyu/comp5241_demo/dispatches -f event_type=content-updated
        env:
          GH_TOKEN: ${{ secrets.HOMEPAGE_DISPATCH_TOKEN }}
```

## 4. Comments

Enable GitHub Discussions in `xixi-in-polyu/comp5241_demo`, install the Giscus App, create or choose a category, then copy its repository ID and category ID into the variables above. Comments stay hidden until both IDs are configured.

## 5. Account data

GitHub activity uses the Actions `GITHUB_TOKEN`. To enable LeetCode later, edit `src/config/site-data.json` and add the username. A failed or changed upstream API keeps the previous cache and marks it stale instead of failing the deployment.

