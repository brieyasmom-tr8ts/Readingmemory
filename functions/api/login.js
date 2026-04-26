import { verifyPassword, createToken, json } from '../_auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const { email, password } = await request.json();

  if (!email || !password) return json({ error: 'Email and password required' }, 400);

  const emailLower = email.toLowerCase().trim();
  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(emailLower).first();
  if (!user) return json({ error: 'No account found. Sign up first.' }, 401);

  const valid = await verifyPassword(password, emailLower, user.password_hash);
  if (!valid) return json({ error: 'Wrong password' }, 401);

  const secret = env.JWT_SECRET || 'dev-secret-change-me';
  const token = await createToken(
    { userId: user.id, email: emailLower, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 },
    secret
  );

  return new Response(JSON.stringify({ ok: true, user: { id: user.id, email: user.email, name: user.name } }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `rm_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${30 * 24 * 3600}; Secure`
    }
  });
}
