# 📚 ReadThat.me

A personal mobile-first reading journal. Remember what you read and how
it felt — and keep writing notes on a flight, in the subway, or anywhere
else without signal.

## Features

- 📖 Book library with cover photos, status, ratings, and mood tracking
- 📷 Camera capture with AI cover reader to auto-fill title and author
- ✅ Quick check-ins (under 5 seconds) with mood emojis tied to a position
- 🧠 Personal notes — about the book and a final reflection
- ✨ AI features: reading-journey summaries, "find this book", book
  descriptions, recommendations, and voice-to-text cleanup
- 📴 Offline-first — every edit saves to your device immediately and
  syncs when you're back online (mid-flight notes are safe)
- 🖼 Cover images cached on-device so they render offline too
- 🔐 Multi-user with email/password auth; data stays scoped to your
  account
- 📱 Installable PWA — add to home screen on iOS/Android

## Tech

- Vanilla HTML / CSS / JavaScript (single `public/index.html`, no build)
- Cloudflare Pages (static hosting) + Pages Functions (`functions/api/`)
- Cloudflare D1 (SQLite) for persistent storage
- IndexedDB + localStorage for the offline cache and mutation queue
- Service worker (`public/sw.js`) for app shell, API, and image caching
- Anthropic Claude API for AI features

## Deploy (Cloudflare Pages)

1. Push this repo to GitHub.
2. In Cloudflare Pages, connect the repo. Leave build command and output
   directory blank — Pages Functions in `functions/` are auto-discovered.
3. Bind a D1 database named `DB` (see `wrangler.toml`). Apply the schema
   in order:
   ```
   schema.sql
   migration-v2.sql
   migration-v3.sql
   ```
4. Set environment variables:
   - `JWT_SECRET` — a long random string for signing auth cookies
   - `ANTHROPIC_API_KEY` — for AI features
5. Deploy. Production builds from `main`.

## Offline behaviour

- Every save (books, notes, entries) writes to IndexedDB before hitting
  the API. If the network call fails it goes onto a per-user queue.
- Closing and reopening the app while offline restores your library
  from the local cache and shows an "Offline · N changes saved locally"
  pill on the home screen.
- When the connection returns, the queue drains automatically and you
  see a "Synced N changes" toast.

## Privacy

Books, notes, and entries live in your account in Cloudflare D1. The
offline cache lives in your browser's IndexedDB / localStorage. AI
features (summary, recommendations, voice cleanup, cover reading) send
the relevant text or image to the Anthropic API.
