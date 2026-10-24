<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project layout

- `src/app/`: Next.js routes, layouts, API handlers, and application-wide styles.
- `src/components/landing/`: landing-page UI, styles, and scroll-driven 3D scene.
- `src/components/packing/`: packing workspace and its interactive 3D suitcase.
- `src/lib/`: shared domain types, packing logic, workers, persistence, and vision adapters; keep direct tests beside their modules.
- `public/fixtures/`: bundled test images and their source information.
- `scripts/`: development utilities.
- `.testmuai/tests/`: Kane-generated browser tests; keep raw recordings and evidence ignored.

## Completing a session

The user authorized committing and pushing completed work on 2026-10-24. After the session's implementation and relevant checks are complete, commit its changes and push to the current branch's configured remote without asking again. Do not force-push or rewrite shared history.

This checkout can contain work from other sessions. Stage explicit completed files, preserve unfinished work, and update imports and worker URLs when moving code. Never commit credentials, local environment files, raw browser evidence, or unfinished test drafts. Treat older progress notes that prohibit pushing as superseded by the user's later authorization.
