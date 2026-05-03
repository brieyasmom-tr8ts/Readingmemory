import { generateId, json } from '../_auth.js';
import { ensureHighlights } from '../_schema.js';

// POST /api/highlights — add a highlight/quote to a book
export async function onRequestPost(context) {
  const { request, env, data } = context;
  const userId = data.userId;
  const body = await request.json();

  if (!body.bookId) return json({ error: 'bookId required' }, 400);
  if (!body.text || !body.text.trim()) return json({ error: 'text required' }, 400);

  await ensureHighlights(env);

  const book = await env.DB.prepare('SELECT id FROM books WHERE id = ? AND user_id = ?')
    .bind(body.bookId, userId).first();
  if (!book) return json({ error: 'Book not found' }, 404);

  const id = body.id || generateId();
  await env.DB.prepare(
    'INSERT INTO highlights (id, book_id, user_id, text, page, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, body.bookId, userId, body.text.trim(), body.page || '', body.ts || Date.now()).run();

  return json({ ok: true, id }, 201);
}

// DELETE /api/highlights?id=xxx — delete a highlight
export async function onRequestDelete(context) {
  const { request, env, data } = context;
  const userId = data.userId;
  const url = new URL(request.url);
  const highlightId = url.searchParams.get('id');

  if (!highlightId) return json({ error: 'Highlight id required' }, 400);

  await ensureHighlights(env);

  await env.DB.prepare('DELETE FROM highlights WHERE id = ? AND user_id = ?')
    .bind(highlightId, userId).run();

  return json({ ok: true });
}
