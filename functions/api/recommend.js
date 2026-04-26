import { json } from '../_auth.js';

// POST /api/recommend — get book recommendations based on a rated book
export async function onRequestPost(context) {
  const { request, env } = context;
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'AI not configured' }, 503);

  const { title, author, category, subCategory, rating, notes } = await request.json();

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
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `I just finished "${title}" by ${author || 'unknown'} and rated it ${rating}/10. Category: ${category || 'general'}${subCategory ? ' / ' + subCategory : ''}.

My notes: ${notes?.about || 'none'}
Final thoughts: ${notes?.final || 'none'}

Based on what I enjoyed about this book, recommend exactly 5 similar books I might love. For each, give:
- Title and Author
- One sentence on why I'd like it based on what I liked about ${title}

Format as a simple numbered list. No intro text, just the list.`
        }]
      })
    });
    const data = await resp.json();
    if (!resp.ok) return json({ error: 'AI request failed' }, 502);
    const text = data.content?.find(b => b.type === 'text')?.text || '';
    return json({ recommendations: text });
  } catch (e) {
    return json({ error: 'Failed to get recommendations' }, 502);
  }
}
