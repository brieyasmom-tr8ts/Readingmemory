import { hashPassword, createToken, json } from '../_auth.js';

// POST /api/reset-password — set a new password for an existing email.
// Single-user / personal app: no email verification. Knowing the email is
// sufficient to reset. Logs the caller in on success.
export async function onRequestPost(context) {
  const { request, env } = context;
  const { email, password } = await request.json();

  if (!email || !password) return json({ error: 'Email and new password required' }, 400);
  if (password.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400);

  const emailLower = email.toLowerCase().trim();
  const user = await env.DB.prepare('SELECT id, email, name FROM users WHERE email = ?')
    .bind(emailLower).first();
  if (!user) return json({ error: 'No account found for that email.' }, 404);

  const passwordHash = await hashPassword(password, emailLower);
  await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .bind(passwordHash, user.id).run();

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
