// Cloudflare Pages Function: same-origin proxy from the website to the Pay2Day intake API (/api/intake/v1/*).
// Off unless both settings are present (Pages project > Settings > Variables, encrypted):
//   INTAKE_API_ORIGIN   https://<api host>[/base path]  (the Azure API; no trailing slash)
//   INTAKE_PROXY_SECRET 32+ random characters, identical to the API's P2D_PUBLIC_INTAKE_PROXY_SECRET
// The API answers only requests carrying the secret, and reads the visitor address from X-P2D-Client-IP, so its
// quotas apply per visitor. Only the headers the intake contract needs are forwarded, in both directions.
const ROUTES = new Set(['session', 'enquiries', 'draft/save', 'verification/request', 'verification/confirm', 'submission',
  'resume/request', 'access/request', 'access/confirm', 'callback/request', 'client-review/request', 'invitations/resolve',
  'lookups/companies', 'lookups/addresses']);
const REQUEST_HEADERS = ['accept', 'content-type', 'origin', 'sec-fetch-site', 'x-csrf-token', 'idempotency-key'];
const RESPONSE_HEADERS = ['content-type', 'cache-control', 'retry-after', 'x-request-id'];
const MAX_BODY = 65536;
const COOKIE = '__Host-p2d_intake';

function answer(status, code, message) {
  return new Response(JSON.stringify({status: 'error', error_code: code, message}), {status,
    headers: {'content-type': 'application/json; charset=UTF-8', 'cache-control': 'no-store, private', 'x-content-type-options': 'nosniff'}});
}
const unavailable = () => answer(503, 'PI-UNAVAILABLE-01', 'Online enquiries are unavailable. Please call 020 3397 8990.');

export async function onRequest({request, env, params}) {
  const origin = String(env.INTAKE_API_ORIGIN || '');
  const secret = String(env.INTAKE_PROXY_SECRET || '');
  if (!/^https:\/\/[A-Za-z0-9.-]+(:\d{1,5})?(\/[A-Za-z0-9._~\/-]*[A-Za-z0-9._~-])?$/.test(origin) || secret.length < 32) return unavailable();
  const path = (Array.isArray(params.path) ? params.path : [params.path]).filter(Boolean).join('/');
  if (!ROUTES.has(path)) return answer(404, 'HTTP-404', 'Route not found.');
  const method = request.method;
  if (method !== (path === 'session' ? 'GET' : 'POST')) return answer(405, 'HTTP-405', 'Method not allowed.');

  const headers = new Headers();
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  const cookie = (request.headers.get('cookie') || '').split(/;\s*/).find(c => c.startsWith(COOKIE + '='));
  if (cookie) headers.set('cookie', cookie);
  // CF-Connecting-IP is set by Cloudflare from the visitor's connection and cannot be supplied by the visitor.
  headers.set('x-p2d-client-ip', request.headers.get('cf-connecting-ip') || '');
  headers.set('x-p2d-proxy-auth', secret);

  let body;
  if (method === 'POST') {
    if (Number(request.headers.get('content-length') || 0) > MAX_BODY) return answer(413, 'PI-SIZE-01', 'Request too large.');
    body = await request.arrayBuffer();
    if (body.byteLength > MAX_BODY) return answer(413, 'PI-SIZE-01', 'Request too large.');
  }

  let upstream;
  try {
    upstream = await fetch(origin + '/api/intake/v1/' + path, {method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(20000)});
  } catch {
    return unavailable();
  }
  if (upstream.status >= 300 && upstream.status < 400) return unavailable();
  const out = new Headers({'cache-control': 'no-store, private', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer'});
  for (const name of RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value !== null) out.set(name, value);
  }
  const cookies = typeof upstream.headers.getSetCookie === 'function' ? upstream.headers.getSetCookie() : [upstream.headers.get('set-cookie')].filter(Boolean);
  for (const c of cookies) if (c.startsWith(COOKIE + '=')) out.append('set-cookie', c);
  return new Response(upstream.body, {status: upstream.status, headers: out});
}
