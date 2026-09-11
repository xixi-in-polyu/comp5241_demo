# Repository Guide

## Project Overview

This is a client-only React 19 notes application built with Vite. Notes are edited as Markdown, previewed with `react-markdown`, and persisted in the browser with `localStorage`. There is no server, database, routing layer, or test suite.

## Architecture

- `src/main.jsx` is the React entry point. It mounts `App` under `StrictMode`.
- `src/App.jsx` is the state and workflow controller. It loads and sorts notes, derives the active and filtered note lists, handles create/select/update/delete/undo actions, manages edit/preview mode, installs keyboard shortcuts, and debounces persistence.
- `src/components/Sidebar.jsx` is the note navigation surface. It renders search, note selection, relative timestamps, new-note, and delete controls. Keep note state and mutations in `App`.
- `src/components/NoteEditor.jsx` owns the editing surface and Edit/Preview toggle. It sends complete updated note objects back through `onUpdate`.
- `src/components/MarkdownPreview.jsx` is the Markdown rendering boundary. Use `react-markdown` here rather than parsing Markdown in the controller or editor.
- `src/components/EmptyState.jsx` renders the no-active-note state and delegates new-note creation through its callback.
- `src/utils/storage.js` is the persistence boundary. `loadNotes` and `saveNotes` use the `notes-app-data` `localStorage` key; `createNote` creates the note shape and IDs.
- `src/App.css` contains the complete layout, responsive rules, design tokens, editor/preview styling, Markdown styling, and toast styling.

## File Map

- `index.html`: Vite HTML shell, document metadata, favicon reference, and `#root` mount point.
- `package.json`: project metadata, npm scripts, and React/Vite/Oxlint dependencies.
- `package-lock.json`: locked npm dependency graph; update it with dependency changes.
- `vite.config.js`: Vite configuration with the official React plugin.
- `README.md`: inherited Vite starter documentation; update it if project-specific setup or usage documentation is added.
- `public/favicon.svg`: favicon referenced by `index.html`.
- `public/icons.svg`: static icon sprite; verify usage before changing or removing it.
- `src/assets/vite.svg`: unused Vite starter asset.
- `src/assets/hero.png`: static asset currently not referenced by the React source.
- `.gitignore`: ignores dependencies, build output, logs, editor metadata, and local files.

## Data Flow and Conventions

1. `App` initializes from `loadNotes()` and derives `activeNote` and the searched/sorted display list.
2. Child components emit semantic callbacks such as `onSelect`, `onUpdate`, `onDelete`, and `onNewNote`.
3. `App` updates state, stamps edited notes with a new `updatedAt`, and schedules `saveNotes` after 400 ms.
4. Reloading restores the serialized note array from `localStorage`; the active note itself is not persisted.

Preserve the existing JavaScript/JSX style and component boundaries. Prefer the existing callbacks and CSS variables over introducing a second state or styling system. Keep browser storage access inside `src/utils/storage.js`. When changing the note shape, update creation, loading assumptions, editor usage, filtering, and persistence together.

## Commands

```sh
npm install
npm run dev
npm run build
npm run lint
npm run preview
```

There are currently no automated tests or test script. Run `npm run lint` for focused static validation and `npm run build` for a production compilation check.

## Known Constraints

- The app depends on modern browser APIs, including `crypto.randomUUID()` and CSS `:has()`.
- `StrictMode` is enabled in development, so effects may be exercised more than once.
- Search assumes loaded notes have string `title` and `content` fields; validate or normalize persisted data before broadening the accepted storage format.
- Autosave is debounced and browser storage can fail due to quota or security restrictions; handle those errors at the storage boundary if reliability work touches persistence.
- The current undo behavior intentionally tracks only the most recently deleted note.

For the starter toolchain details, see [README.md](README.md). Keep this file focused on agent-facing architecture and conventions rather than duplicating user documentation.