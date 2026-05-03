import { json } from '../_auth.js';
import { ensureHighlights } from '../_schema.js';

// GET /api/export — return the user's full library as JSON, suitable for
// downloading as a backup. Includes books, entries, highlights, and
// custom subcategories.
export async function onRequestGet(context) {
  const { env, data } = context;
  const userId = data.userId;

  await ensureHighlights(env);

  const [user, booksRes, entriesRes, subsRes, highlightsRes] = await Promise.all([
    env.DB.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').bind(userId).first(),
    env.DB.prepare('SELECT * FROM books WHERE user_id = ? ORDER BY created_at ASC').bind(userId).all(),
    env.DB.prepare('SELECT * FROM entries WHERE user_id = ? ORDER BY created_at ASC').bind(userId).all(),
    env.DB.prepare('SELECT category, name FROM custom_subcategories WHERE user_id = ?').bind(userId).all(),
    env.DB.prepare('SELECT * FROM highlights WHERE user_id = ? ORDER BY created_at ASC').bind(userId).all(),
  ]);

  const payload = {
    exportedAt: Date.now(),
    version: 1,
    user: user || { id: userId },
    books: booksRes.results || [],
    entries: entriesRes.results || [],
    highlights: highlightsRes.results || [],
    customSubcategories: subsRes.results || [],
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="readthatme-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
