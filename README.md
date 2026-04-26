# 📚 Reading Memory

A personal mobile-first web app to remember books and how they felt while reading.

## Features

- 📖 Book library with cover photos, status, and mood tracking
- 📷 Camera support to capture book covers
- ✅ Quick check-ins (under 5 seconds) with mood emojis
- 🧠 Personal memory section — summary, feelings, favourite moments
- ✨ AI-powered reading summary for finished books
- ↗ Share any book via clipboard or native share sheet
- 💾 All data saved locally — no login, no backend, fully private

## Deploy

Single file app — just upload `index.html` anywhere that serves static files.

**Cloudflare Pages (recommended):**
1. Push this repo to GitHub
2. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
3. Connect GitHub → select this repo
4. Leave all build settings blank
5. Click Deploy

Your app will be live at `reading-memory.pages.dev` in ~60 seconds.

## Tech

- Vanilla HTML / CSS / JavaScript
- Local Storage (no backend)
- Anthropic Claude API (for AI summary feature)
- Mobile-first, works on any device

## Privacy

All your books and notes are stored only in your browser's local storage.
Nothing is sent to any server except when using the AI Summary feature,
which sends your check-in notes to the Anthropic API.
