import { json } from '../_auth.js';

// POST /api/ai-summary — generate AI reading summary server-side
export async function onRequestPost(context) {
  const { request, env, data } = context;
  const userId = data.userId;

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'AI features not configured. Set ANTHROPIC_API_KEY.' }, 503);

  const body = await request.json();
  const { title, author, category, subCategory, recommend, entries, notes, rating, source } = body;

  const entriesText = (entries || []).map(e =>
    `[${(e.position || '').toUpperCase()}] ${e.emoji || ''} ${e.note || '(no note)'}`
  ).join('\n');

  const prompt = `You are helping a reader create a personal summary of a book they finished. Use ONLY their journal entries and notes below. Do NOT use outside knowledge about the book.

Book: "${title}" by ${author || 'unknown'}
Category: ${category || 'not set'}${subCategory ? ' / ' + subCategory : ''}
Source: ${source || 'not specified'}
Reader's rating: ${rating ? rating + '/10' : 'not rated'}
Recommended by reader: ${recommend ? 'Yes' : 'No'}

Their journal entries during reading (in order from start to finish):
${entriesText || '(none recorded)'}

Their notes:
About the book: ${notes?.about || '(none)'}
Final thoughts: ${notes?.final || '(none)'}

Generate a warm, personal reading summary with EXACTLY these sections (use ## headings):

## The Plot
2-3 sentences reconstructing what the book was about, based only on clues from their notes. If they didn't write much, keep it brief and honest — say something like "I didn't capture much about the plot, but here's what I remember..."

## My Journey Through It
Walk through their emotional arc from beginning to middle to end. Reference specific moods and thoughts they recorded. Be specific, not generic. Show how their feelings changed (or didn't).

## What I Loved
- Bullet points of specific things they enjoyed, pulled from positive entries and notes.

## What I Didn't Love
- Bullet points of things they didn't enjoy, from negative entries or low moods. If everything was positive, say "Honestly, I loved it all."

## The Verdict
Based on their rating (${rating ? rating + '/10' : 'unrated'}), recommend status, and overall sentiment, write 2-3 sentences summing up whether this book was worth it and who they'd recommend it to.

Write it like the reader is talking to a friend about this book. Warm, honest, personal. Not a book report.`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const result = await resp.json();
    if (!resp.ok) {
      return json({ error: result.error?.message || 'AI request failed' }, 502);
    }

    const text = result.content?.find(b => b.type === 'text')?.text || '';
    return json({ summary: text });
  } catch (e) {
    return json({ error: 'Failed to reach AI service' }, 502);
  }
}
