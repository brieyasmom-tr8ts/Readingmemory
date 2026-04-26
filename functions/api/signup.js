import { hashPassword, generateId, createToken, json } from '../_auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const { email, password, name } = await request.json();

  if (!email || !password) return json({ error: 'Email and password required' }, 400);
  if (password.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400);

  const emailLower = email.toLowerCase().trim();

  // Check if user exists
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(emailLower).first();
  if (existing) return json({ error: 'Account already exists. Try logging in.' }, 409);

  const userId = generateId();
  const salt = emailLower; // Use email as salt (unique per user)
  const passwordHash = await hashPassword(password, salt);

  await env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(userId, emailLower, passwordHash, name || '', Date.now()).run();

  const secret = env.JWT_SECRET || 'dev-secret-change-me';
  const token = await createToken(
    { userId, email: emailLower, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 }, // 30 days
    secret
  );

  return new Response(JSON.stringify({ ok: true, user: { id: userId, email: emailLower, name: name || '' } }), {
    status: 201,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `rm_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${30 * 24 * 3600}; Secure`
    }
  });
}
