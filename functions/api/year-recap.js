import { json } from '../_auth.js';

// POST /api/year-recap — AI-generated reading-year retrospective.
// Body: { year: 2025 }. Pulls the user's books finished in that year
// from D1 and synthesises themes, mood arc, and standouts.
export async function onRequestPost(context) {
  const { request, env, data } = context;
  const userId = data.userId;

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'AI features not configured. Set ANTHROPIC_API_KEY.' }, 503);

  const body = await request.json().catch(() => ({}));
  const year = parseInt(body.year, 10);
  if (!year || year < 1900 || year > 2100) return json({ error: 'Valid year required' }, 400);

  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);

  const booksResult = await env.DB.prepare(
    `SELECT id, title, author, category, sub_category, rating, recommend, notes_about, notes_final, finished_at
     FROM books
     WHERE user_id = ? AND status = 'finished' AND finished_at >= ? AND finished_at < ?
     ORDER BY finished_at ASC`
  ).bind(userId, start, end).all();
  const books = booksResult.results || [];

  if (books.length === 0) {
    return json({ recap: '', count: 0 });
  }

  const entriesResult = await env.DB.prepare(
    `SELECT book_id, position, emoji, note FROM entries
     WHERE user_id = ? AND book_id IN (${books.map(() => '?').join(',')})
     ORDER BY created_at ASC`
  ).bind(userId, ...books.map(b => b.id)).all();
  const entriesByBook = {};
  (entriesResult.results || []).forEach(e => {
    if (!entriesByBook[e.book_id]) entriesByBook[e.book_id] = [];
    entriesByBook[e.book_id].push(e);
  });

  const summarise = (raw) => {
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(n => n.text).filter(Boolean).join(' / ');
    } catch (_) {}
    return raw;
  };

  const lines = books.map(b => {
    const cat = [b.category, b.sub_category].filter(Boolean).join(' / ') || 'uncategorised';
    const moods = (entriesByBook[b.id] || []).map(e => e.emoji).filter(Boolean).join(' ') || '(no moods)';
    const about = summarise(b.notes_about).slice(0, 200);
    const final = summarise(b.notes_final).slice(0, 300);
    return `- "${b.title}" by ${b.author || 'unknown'} [${cat}] — rating: ${b.rating || '–'}/10, would-recommend: ${b.recommend ? 'yes' : 'no'}, moods: ${moods}\n   about: ${about || '(none)'}\n   final: ${final || '(none)'}`;
  }).join('\n');

  const prompt = `You are helping a reader look back at the books they finished in ${year}. Use ONLY the notes and ratings below — do not invent details.

Books finished in ${year} (${books.length} total):
${lines}

Write a warm, personal year-in-review with these sections (use ## headings):

## ${year} in Books
A 2-3 sentence opener — overall shape of the year (volume, range, dominant moods).

## Themes I Kept Returning To
2-4 bullets identifying recurring threads across the books based on categories, notes, and moods.

## Stand-outs
- The book I loved most (with one-sentence why, drawn from notes and rating)
- The one that surprised me
- The one I'd recommend to a friend

## What This Reading Year Says About Me
2-3 sentences synthesising the emotional arc of the year. Be specific to this reader's notes, not generic.

Write it like the reader is telling a friend about their year. Warm, personal, honest. No book report tone.`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const result = await resp.json();
    if (!resp.ok) return json({ error: result.error?.message || 'AI request failed' }, 502);

    const text = result.content?.find(b => b.type === 'text')?.text || '';
    return json({ recap: text, count: books.length });
  } catch (e) {
    return json({ error: 'Failed to reach AI service' }, 502);
  }
}
