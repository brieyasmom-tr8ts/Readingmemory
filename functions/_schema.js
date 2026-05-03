// Idempotent schema bootstrap. CREATE ... IF NOT EXISTS lets us add tables
// from inside the running app instead of forcing a manual D1 console step
// for every additive migration. Memoised per worker instance so the cost
// is one no-op CREATE on cold start.

let _highlightsReady = null;

export function ensureHighlights(env) {
  if (_highlightsReady) return _highlightsReady;
  _highlightsReady = (async () => {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS highlights (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      text TEXT NOT NULL,
      page TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`).run();
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_highlights_book ON highlights(book_id)').run();
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_highlights_user ON highlights(user_id)').run();
  })().catch((e) => {
    // Reset so a transient failure doesn't cache forever.
    _highlightsReady = null;
    throw e;
  });
  return _highlightsReady;
}
