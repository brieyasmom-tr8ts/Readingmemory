export async function onRequestPost() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'rm_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Secure'
    }
  });
}
