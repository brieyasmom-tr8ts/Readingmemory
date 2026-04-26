import { json } from '../_auth.js';

export async function onRequestGet(context) {
  const { env, data } = context;
  const user = await env.DB.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?')
    .bind(data.userId).first();
  if (!user) return json({ error: 'User not found' }, 404);
  return json({ user });
}
