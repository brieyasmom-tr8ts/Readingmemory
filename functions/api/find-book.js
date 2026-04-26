import { json } from '../_auth.js';

// POST /api/find-book — AI finds book details when Open Library doesn't have it
export async function onRequestPost(context) {
  const { request, env } = context;
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'AI not configured' }, 503);

  const { query } = await request.json();
  if (!query) return json({ error: 'No search query' }, 400);

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
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `I'm looking for a book. My search query is: "${query}"

Find the most likely book match. Return ONLY valid JSON in this exact format, nothing else:
{"title":"Full Book Title","author":"Author Name","description":"2-3 sentence description of what the book is about","isbn":"ISBN-13 if you know it, otherwise empty string"}

If you can think of multiple possible matches, return the most popular/well-known one. If you truly cannot identify any book from this query, return:
{"title":"","author":"","description":"","isbn":""}`
        }]
      })
    });
    const data = await resp.json();
    if (!resp.ok) return json({ error: 'AI request failed' }, 502);
    let text = data.content?.find(b => b.type === 'text')?.text || '{}';
    // Strip markdown code fences if present
    text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    try {
      const parsed = JSON.parse(text);
      // Try to find cover via ISBN on Open Library
      let cover = null;
      if (parsed.isbn) {
        try {
          const olResp = await fetch(`https://openlibrary.org/isbn/${parsed.isbn}.json`);
          if (olResp.ok) {
            const olData = await olResp.json();
            if (olData.covers && olData.covers.length > 0) {
              cover = `https://covers.openlibrary.org/b/id/${olData.covers[0]}-L.jpg`;
            }
          }
        } catch (e) {}
        // Fallback: try cover by ISBN directly
        if (!cover) {
          cover = `https://covers.openlibrary.org/b/isbn/${parsed.isbn}-L.jpg`;
        }
      }
      return json({ title: parsed.title || '', author: parsed.author || '', description: parsed.description || '', cover });
    } catch (parseErr) {
      // If JSON parse fails, try to extract info from raw text
      return json({ title: '', author: '', description: text.substring(0, 300), cover: null });
    }
  } catch (e) {
    return json({ error: 'Search failed' }, 502);
  }
}
