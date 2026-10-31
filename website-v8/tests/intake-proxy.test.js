// Cloudflare Pages Function proxy for /api/intake/v1/* (functions/api/intake/v1/[[path]].js), with fetch intercepted.
import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/intake/v1/[[path]].js';

const SECRET = 's'.repeat(40);
const env = {INTAKE_API_ORIGIN: 'https://api.example.invalid', INTAKE_PROXY_SECRET: SECRET};
function intercept(reply = () => new Response('{"ok":true}', {status: 200, headers: {'content-type': 'application/json'}})) {
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push({url: String(url), init}); return reply(url, init); };
  return calls;
}
const call = (path, init = {}, e = env) => onRequest({request: new Request('https://www.example.invalid/api/intake/v1/' + path, init), env: e, params: {path: path.split('/')}});

test('off unless the API origin and a 32+ character secret are configured', async () => {
  const calls = intercept();
  for (const e of [{}, {INTAKE_API_ORIGIN: env.INTAKE_API_ORIGIN}, {...env, INTAKE_PROXY_SECRET: 'short'}, {...env, INTAKE_API_ORIGIN: 'http://api.example.invalid'}]) {
    const r = await call('session', {}, e);
    assert.equal(r.status, 503);
    assert.match((await r.json()).message, /020 3397 8990/);
  }
  assert.equal(calls.length, 0);
});

test('only contract routes and methods are forwarded', async () => {
  const calls = intercept();
  assert.equal((await call('../admin')).status, 404);
  assert.equal((await call('staff/import', {method: 'POST', body: '{}'})).status, 404);
  assert.equal((await call('session', {method: 'POST', body: '{}'})).status, 405);
  assert.equal((await call('submission')).status, 405);
  assert.equal(calls.length, 0);
  assert.equal((await call('session')).status, 200);
  assert.equal(calls[0].url, 'https://api.example.invalid/api/intake/v1/session');
});

test('forwards only the contract headers and the intake cookie, adds the secret and the visitor address', async () => {
  const calls = intercept();
  await call('draft/save', {method: 'POST', body: '{"a":1}', headers: {
    'content-type': 'application/json', origin: 'https://www.example.invalid', 'sec-fetch-site': 'same-origin',
    'x-csrf-token': 'csrf', 'idempotency-key': 'key-0123456789abcdef', authorization: 'Bearer staff-token',
    cookie: 'other=1; __Host-p2d_intake=abc; tracking=2', 'cf-connecting-ip': '203.0.113.7',
    'x-p2d-proxy-auth': 'forged', 'x-p2d-client-ip': '198.51.100.1', 'x-forwarded-for': '198.51.100.2'}});
  const h = calls[0].init.headers;
  assert.equal(h.get('cookie'), '__Host-p2d_intake=abc');
  assert.equal(h.get('authorization'), null);
  assert.equal(h.get('x-forwarded-for'), null);
  assert.equal(h.get('x-p2d-proxy-auth'), SECRET, 'a visitor cannot supply the secret');
  assert.equal(h.get('x-p2d-client-ip'), '203.0.113.7', 'the visitor address comes from Cloudflare, not the visitor');
  for (const k of ['content-type', 'origin', 'sec-fetch-site', 'x-csrf-token', 'idempotency-key']) assert.ok(h.get(k), k);
  assert.equal(new TextDecoder().decode(calls[0].init.body), '{"a":1}');
  assert.equal(calls[0].init.redirect, 'manual');
});

test('refuses bodies over 64 KB without calling the API', async () => {
  const calls = intercept();
  assert.equal((await call('draft/save', {method: 'POST', body: 'x'.repeat(65537)})).status, 413);
  assert.equal(calls.length, 0);
});

test('returns only the intake cookie and safe headers, never other upstream headers', async () => {
  intercept(() => {
    const h = new Headers({'content-type': 'application/json', 'x-powered-by': 'PHP', server: 'Apache', 'access-control-allow-origin': '*'});
    h.append('set-cookie', '__Host-p2d_intake=v; Path=/; Secure; HttpOnly; SameSite=Strict');
    h.append('set-cookie', 'ARRAffinity=x; Path=/');
    return new Response('{}', {status: 200, headers: h});
  });
  const r = await call('session');
  assert.deepEqual(r.headers.getSetCookie(), ['__Host-p2d_intake=v; Path=/; Secure; HttpOnly; SameSite=Strict']);
  for (const k of ['x-powered-by', 'server', 'access-control-allow-origin']) assert.equal(r.headers.get(k), null, k);
  assert.equal(r.headers.get('cache-control'), 'no-store, private');
});

test('an unreachable API or a redirect answers 503 with the phone number', async () => {
  intercept(() => { throw new TypeError('network'); });
  assert.equal((await call('session')).status, 503);
  intercept(() => new Response(null, {status: 302, headers: {location: 'https://elsewhere.invalid/'}}));
  assert.equal((await call('session')).status, 503);
});
