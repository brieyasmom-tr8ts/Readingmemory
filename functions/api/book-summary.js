import { json } from '../_auth.js';

// POST /api/book-summary — get a brief AI summary of what a book is about
export async function onRequestPost(context) {
  const { request, env } = context;
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'AI not configured' }, 503);

  const { title, author, category } = await request.json();
  if (!title) return json({ error: 'Title required' }, 400);

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Give me a 3-4 sentence summary of the book "${title}"${author ? ' by ' + author : ''}${category ? ' (category: ' + category + ')' : ''}. What is it about and why do people read it? Keep it conversational and spoiler-free — like a friend telling you why you should read it. No bullet points, just a short paragraph.`
        }]
      })
    });
    const data = await resp.json();
    if (!resp.ok) return json({ error: 'AI request failed' }, 502);
    const text = data.content?.find(b => b.type === 'text')?.text || '';
    return json({ summary: text });
  } catch (e) {
    return json({ error: 'Failed to get summary' }, 502);
  }
}
