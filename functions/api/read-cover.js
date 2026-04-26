import { json } from '../_auth.js';

// POST /api/read-cover — AI reads a book cover image to extract title/author
export async function onRequestPost(context) {
  const { request, env } = context;
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'AI not configured' }, 503);

  const { image } = await request.json();
  if (!image) return json({ error: 'No image provided' }, 400);

  // Extract base64 data and media type from data URL
  const match = image.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!match) return json({ error: 'Invalid image format' }, 400);
  const mediaType = match[1];
  const imageData = match[2];

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
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageData }
            },
            {
              type: 'text',
              text: 'This is a book cover. Extract the book title and author name. Respond in exactly this JSON format, nothing else: {"title":"...","author":"..."}\nIf you cannot determine one, use an empty string.'
            }
          ]
        }]
      })
    });
    const data = await resp.json();
    if (!resp.ok) return json({ error: 'AI request failed' }, 502);
    const text = data.content?.find(b => b.type === 'text')?.text || '{}';
    try {
      const parsed = JSON.parse(text);
      return json({ title: parsed.title || '', author: parsed.author || '' });
    } catch {
      return json({ title: '', author: '' });
    }
  } catch (e) {
    return json({ error: 'Failed to read cover' }, 502);
  }
}
