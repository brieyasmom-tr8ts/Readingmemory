import { verifyToken, parseCookie, json } from '../_auth.js';

// Auth middleware — attaches user to context for all /api/ routes
// Public routes (signup, login) handle their own auth
export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Public routes — no auth needed
  if (path === '/api/signup' || path === '/api/login') {
    return next();
  }

  // Check for auth token
  const cookie = request.headers.get('Cookie');
  const token = parseCookie(cookie, 'rm_token');
  if (!token) {
    return json({ error: 'Not authenticated' }, 401);
  }

  const secret = env.JWT_SECRET || 'dev-secret-change-me';
  const payload = await verifyToken(token, secret);
  if (!payload) {
    return json({ error: 'Invalid or expired token' }, 401);
  }

  // Attach user info to context
  context.data = context.data || {};
  context.data.userId = payload.userId;
  context.data.email = payload.email;

  return next();
}
