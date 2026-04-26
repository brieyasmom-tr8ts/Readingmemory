import { json } from '../_auth.js';

// POST /api/clean-text — clean up voice transcription with AI
export async function onRequestPost(context) {
  const { request, env } = context;
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'AI not configured' }, 503);

  const { text } = await request.json();
  if (!text) return json({ error: 'No text provided' }, 400);

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
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Clean up this voice transcription. Fix spacing, punctuation, and capitalization. Keep the exact meaning and words — just make it readable. Do NOT add any extra commentary, just return the cleaned text:\n\n${text}`
        }]
      })
    });
    const data = await resp.json();
    if (!resp.ok) return json({ error: 'AI request failed' }, 502);
    const cleaned = data.content?.find(b => b.type === 'text')?.text || text;
    return json({ text: cleaned });
  } catch (e) {
    return json({ text }); // Return original if AI fails
  }
}
