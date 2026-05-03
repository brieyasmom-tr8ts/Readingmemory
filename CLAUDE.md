# CLAUDE.md

Guide for Claude Code agents working in this repo. Read this before
making changes.

## What this app is

ReadThat.me — a single-page mobile reading journal. Users log in, add
books (with optional cover photos), make quick mood-tagged check-ins
while reading, and write reflective notes. AI features summarise the
reading journey, find books, read cover photos, clean up voice input,
and recommend next reads.

## Workflow (always follow this)

- Develop every change on a feature branch named `claude/<topic>-<id>`.
  Never commit directly to `main`.
- When the task is complete and pushed, open a PR from the feature
  branch into `main` and **squash-merge it**. Cloudflare Pages
  auto-deploys from `main`, so the merge is the deploy step.
- Use the GitHub MCP tools (`mcp__github__create_pull_request`,
  `mcp__github__merge_pull_request`) — there is no `gh` CLI.
- Don't push to a different repo or branch without explicit permission.

## Repo layout

- `public/index.html` — the entire client app (HTML + CSS + JS in one
  file, no build step). Sectioned by `/* === ... === */` comments:
  `API`, `AUTH`, `DATA (offline-first, IndexedDB-backed)`, `VIEWS`,
  `HOME`, `ADD BOOK`, `DETAIL`, `ENTRY`, `INIT`.
- `public/sw.js` — service worker. Caches the app shell, API GETs, and
  cover images (including opaque cross-origin responses).
- `public/manifest.json`, `public/icon.svg`, `public/logo.*` — PWA
  assets.
- `functions/_auth.js` — JWT signing/verification, password hashing
  (Web Crypto), cookie helpers.
- `functions/api/_middleware.js` — auth middleware applied to every
  `/api/*` route except `signup` and `login`. Attaches `userId` and
  `email` to `context.data`.
- `functions/api/*.js` — REST endpoints. Each file is one route; nested
  dirs (e.g. `functions/api/books/[id].js`) are dynamic segments.
- `schema.sql` — initial D1 schema.
- `migration-v2.sql`, `migration-v3.sql` — additive schema migrations.
  Apply in order on new D1 instances.
- `wrangler.toml` — Cloudflare Pages / D1 binding config.

## Stack

- Cloudflare Pages (static hosting) + Pages Functions (the API).
- Cloudflare D1 (SQLite) for persistent storage. Bound as `env.DB`.
- Anthropic Claude API for AI features. Key in `env.ANTHROPIC_API_KEY`.
- Vanilla HTML/CSS/JS on the client — no framework, no bundler.
- Service worker for PWA + offline.
- IndexedDB (primary) and localStorage (small data, fallback) for the
  offline cache and mutation queue.

## Offline architecture (don't break this)

- Every mutation in `index.html` (`apiSaveBook`, `apiDeleteBook`,
  `apiSaveEntry`, `apiDeleteEntry`) calls `await persistLocal()` first
  to write the full books snapshot to IndexedDB, then attempts the API
  call. On failure the call is pushed to a per-user queue in
  localStorage.
- `loadBooks()` drains the queue first, then either reads from cache
  (if offline or if the queue still has pending writes — so a stale
  service-worker GET response can't clobber unsynced edits) or fetches
  `/api/books` and persists the result.
- The `online` window event replays the queue and re-fetches.
- `checkAuth()` falls back to a cached user identity in localStorage
  (`rm_user` key) when `/api/me` is unreachable, so reopening offline
  shows the library instead of the login screen.
- The mutation queue is keyed per user (`rm_queue_<userId>`) and
  collapsed by op key (`book:<id>` or `entry:<id>`) so the latest op
  wins on replay.
- The service worker's `IMG_CACHE` caches covers (including opaque
  cross-origin responses from openlibrary.org).

When changing any of the above, preserve: write-locally-first,
queue-on-failure, drain-on-online, never-clobber-pending-writes.

## Conventions

- Keep the client a single file. Don't introduce a build step,
  bundler, or external JS dependencies.
- New API routes go under `functions/api/` and rely on the auth
  middleware — pull `userId` from `context.data.userId`.
- D1 schema changes ship as new `migration-vN.sql` files (additive
  only — don't edit `schema.sql` after the initial schema is in
  production).
- When changing the service worker behaviour, bump the `CACHE`
  constant (and `IMG_CACHE` if you change image handling) so existing
  installs pick up the new shell.
- Don't add backwards-compat shims, dead `// removed` comments, or
  rename-to-`_unused` placeholders. Just delete what's gone.
- The codebase uses minimal comments. Only explain non-obvious
  invariants or workarounds.

## Sanity checks (no test suite)

After client changes, at minimum:

```bash
node --check public/sw.js
node -e "const fs=require('fs');const m=fs.readFileSync('public/index.html','utf8').match(/<script>([\\s\\S]*?)<\\/script>/);new Function(m[1]);console.log('JS OK')"
```

For real testing, deploy the feature branch as a Cloudflare Pages
preview and run through the offline → reopen → online flow.
