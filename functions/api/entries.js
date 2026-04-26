import { generateId, json } from '../_auth.js';

// POST /api/entries — add a journal entry to a book
export async function onRequestPost(context) {
  const { request, env, data } = context;
  const userId = data.userId;
  const body = await request.json();

  if (!body.bookId) return json({ error: 'bookId required' }, 400);
  if (!body.position) return json({ error: 'position required' }, 400);

  // Verify book ownership
  const book = await env.DB.prepare('SELECT id FROM books WHERE id = ? AND user_id = ?')
    .bind(body.bookId, userId).first();
  if (!book) return json({ error: 'Book not found' }, 404);

  const id = body.id || generateId();
  await env.DB.prepare(
    'INSERT INTO entries (id, book_id, user_id, position, emoji, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, body.bookId, userId, body.position, body.emoji || '', body.note || '', body.ts || Date.now()).run();

  return json({ ok: true, id }, 201);
}

// DELETE /api/entries?id=xxx — delete a journal entry
export async function onRequestDelete(context) {
  const { request, env, data } = context;
  const userId = data.userId;
  const url = new URL(request.url);
  const entryId = url.searchParams.get('id');

  if (!entryId) return json({ error: 'Entry id required' }, 400);

  await env.DB.prepare('DELETE FROM entries WHERE id = ? AND user_id = ?')
    .bind(entryId, userId).run();

  return json({ ok: true });
}
