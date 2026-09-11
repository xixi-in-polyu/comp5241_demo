# Publishable content fallback

This folder keeps the site build reproducible when the private content repository is not available. Production can replace it by setting `CONTENT_SOURCE_DIR`.

Expected folders:

- `notes/` — Markdown notes with `share: true`.
- `projects/` — hand-picked project records.
- `photos/` — photo records with `type: photo` and their image files.
- `assets/` — shared note attachments.

The complete frontmatter contracts and private-repository setup are documented in `docs/CONTENT_PUBLISHING.md`.

