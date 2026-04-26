import { json } from '../../_auth.js';

// PUT /api/books/:id — update a book
export async function onRequestPut(context) {
  const { request, env, data, params } = context;
  const userId = data.userId;
  const bookId = params.id;
  const body = await request.json();

  // Verify ownership
  const book = await env.DB.prepare('SELECT id FROM books WHERE id = ? AND user_id = ?')
    .bind(bookId, userId).first();
  if (!book) return json({ error: 'Book not found' }, 404);

  await env.DB.prepare(`
    UPDATE books SET title=?, author=?, cover=?, status=?, category=?, sub_category=?,
      recommended_by=?, recommend=?, notes_about=?, notes_final=?, ai_summary=?,
      started_at=?, finished_at=?
    WHERE id=? AND user_id=?
  `).bind(
    body.title, body.author || '', body.cover || null,
    body.status || 'want', body.category || null, body.subCategory || null,
    body.recommendedBy || '', body.recommend ? 1 : 0,
    body.notes?.about || '', body.notes?.final || '', body.aiSummary || null,
    body.startedAt || null, body.finishedAt || null,
    bookId, userId
  ).run();

  // Save custom subcategory
  if (body.category && body.subCategory) {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO custom_subcategories (user_id, category, name) VALUES (?, ?, ?)'
    ).bind(userId, body.category, body.subCategory).run();
  }

  return json({ ok: true });
}

// DELETE /api/books/:id — delete a book and its entries
export async function onRequestDelete(context) {
  const { env, data, params } = context;
  const userId = data.userId;
  const bookId = params.id;

  // Verify ownership
  const book = await env.DB.prepare('SELECT id FROM books WHERE id = ? AND user_id = ?')
    .bind(bookId, userId).first();
  if (!book) return json({ error: 'Book not found' }, 404);

  // Delete entries first, then book
  await env.DB.prepare('DELETE FROM entries WHERE book_id = ? AND user_id = ?')
    .bind(bookId, userId).run();
  await env.DB.prepare('DELETE FROM books WHERE id = ? AND user_id = ?')
    .bind(bookId, userId).run();

  return json({ ok: true });
}
