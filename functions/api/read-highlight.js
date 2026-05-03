import { json } from '../_auth.js';

// POST /api/read-highlight — Claude vision reads a photo of a book page and
// returns the highlighted/quoted passage as plain text.
export async function onRequestPost(context) {
  const { request, env } = context;
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'AI not configured' }, 503);

  const { image } = await request.json();
  if (!image) return json({ error: 'No image provided' }, 400);

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
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageData } },
            {
              type: 'text',
              text: 'This is a photo of a book page. The reader wants to capture a passage. If a passage is clearly highlighted, underlined, bracketed, or otherwise marked, return only that passage. Otherwise return the most prominent passage on the page (typically a single paragraph or a few sentences). Respond in this exact JSON format and nothing else: {"text":"...","page":"..."}\nUse "page" only if a page number is visible — otherwise empty string. Preserve original punctuation. Do not add commentary, ellipses, or your own framing.'
            }
          ]
        }]
      })
    });

    const result = await resp.json();
    if (!resp.ok) return json({ error: result.error?.message || 'AI request failed' }, 502);

    const text = result.content?.find(b => b.type === 'text')?.text || '{}';
    try {
      const parsed = JSON.parse(text);
      return json({ text: parsed.text || '', page: parsed.page || '' });
    } catch {
      return json({ text: text, page: '' });
    }
  } catch (e) {
    return json({ error: 'Failed to read highlight' }, 502);
  }
}
