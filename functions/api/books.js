import { generateId, json } from '../_auth.js';

// GET /api/books — list all books for the user (with entries)
export async function onRequestGet(context) {
  const { env, data } = context;
  const userId = data.userId;

  const booksResult = await env.DB.prepare(
    'SELECT * FROM books WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all();

  const books = booksResult.results || [];

  // Fetch entries for all books
  if (books.length > 0) {
    const entriesResult = await env.DB.prepare(
      'SELECT * FROM entries WHERE user_id = ? ORDER BY created_at ASC'
    ).bind(userId).all();
    const entriesByBook = {};
    (entriesResult.results || []).forEach(e => {
      if (!entriesByBook[e.book_id]) entriesByBook[e.book_id] = [];
      entriesByBook[e.book_id].push({
        id: e.id, position: e.position, emoji: e.emoji,
        note: e.note, ts: e.created_at
      });
    });
    books.forEach(b => {
      b.entries = entriesByBook[b.id] || [];
      b.notes = { about: b.notes_about || '', final: b.notes_final || '' };
      b.subCategory = b.sub_category;
      b.recommendedBy = b.recommended_by;
      b.recommend = !!b.recommend;
      b.startedAt = b.started_at;
      b.finishedAt = b.finished_at;
      b.createdAt = b.created_at;
      b.aiSummary = b.ai_summary;
      b.rating = b.rating || null;
      b.source = b.source || '';
    });
  }

  // Fetch custom subcategories
  const subsResult = await env.DB.prepare(
    'SELECT category, name FROM custom_subcategories WHERE user_id = ?'
  ).bind(userId).all();
  const customSubs = {};
  (subsResult.results || []).forEach(r => {
    if (!customSubs[r.category]) customSubs[r.category] = [];
    customSubs[r.category].push(r.name);
  });

  return json({ books, customSubs });
}

// POST /api/books — create a new book
export async function onRequestPost(context) {
  const { request, env, data } = context;
  const userId = data.userId;
  const body = await request.json();

  if (!body.title) return json({ error: 'Title is required' }, 400);

  const id = body.id || generateId();
  const now = Date.now();

  await env.DB.prepare(`
    INSERT OR REPLACE INTO books (id, user_id, title, author, cover, status, category, sub_category,
      recommended_by, recommend, notes_about, notes_final, ai_summary, started_at, finished_at, created_at, rating, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, userId, body.title, body.author || '', body.cover || null,
    body.status || 'want', body.category || null, body.subCategory || null,
    body.recommendedBy || '', body.recommend ? 1 : 0,
    body.notes?.about || '', body.notes?.final || '', body.aiSummary || null,
    body.startedAt || null, body.finishedAt || null, body.createdAt || now,
    body.rating || null, body.source || ''
  ).run();

  // Save custom subcategory if provided and new
  if (body.category && body.subCategory) {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO custom_subcategories (user_id, category, name) VALUES (?, ?, ?)'
    ).bind(userId, body.category, body.subCategory).run();
  }

  return json({ ok: true, id }, 201);
}
