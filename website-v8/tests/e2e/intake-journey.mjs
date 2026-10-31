// End-to-end customer journey: real browser -> live website build -> Cloudflare Pages Function proxy -> real
// Pay2Day intake API (synthetic loopback copy, isolated database) -> CRM import. Only the human check (Turnstile
// script stubbed in the browser, accepted by the synthetic API) and email delivery (local outbox file) are replaced.
// Run by tests/e2e/run.sh in the API checkout's companion harness; needs:
//   dist/ built with: PAY2DAY_INTAKE_READY=yes PAY2DAY_TURNSTILE_SITE_KEY=<any valid key> node build.mjs --production --live
//   E2E_API (http://127.0.0.1:8099), E2E_SECRET (proxy secret, same as the API), E2E_OUTBOX (outbox file),
//   E2E_INSPECT (command printing the API database summary as JSON), E2E_PLAYWRIGHT (path to playwright-core).
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {readFileSync, existsSync} from 'node:fs';
import {execSync} from 'node:child_process';
import {resolve, extname, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.E2E_PLAYWRIGHT || 'playwright-core');
const {onRequest} = await import(pathToFileURL(fileURLToPath(new URL('../../functions/api/intake/v1/[[path]].js', import.meta.url))).href);
const API = process.env.E2E_API || 'http://127.0.0.1:8099', SECRET = process.env.E2E_SECRET, OUTBOX = process.env.E2E_OUTBOX;
const PORT = 8788, base = `http://localhost:${PORT}`, API_HOST = 'https://api.e2e.invalid';
assert.ok(SECRET && SECRET.length >= 32 && OUTBOX && process.env.E2E_INSPECT, 'E2E settings missing');

// The Pages Function talks to https://api.e2e.invalid; this loopback run forwards that to the synthetic API.
const realFetch = globalThis.fetch;
globalThis.fetch = (url, init) => realFetch(String(url).replace(API_HOST, API), init);

const root = fileURLToPath(new URL('../../dist/', import.meta.url));
const headerRules = [];
{
  let current = null;
  for (const line of readFileSync(root + '_headers', 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) { current = {path: line.trim(), headers: []}; headerRules.push(current); }
    else { const [k, ...v] = line.trim().split(':'); current.headers.push([k.trim(), v.join(':').trim()]); }
  }
}
const proxied = [];
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, base);
    if (url.pathname.startsWith('/api/intake/v1/')) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
      headers.set('cf-connecting-ip', '203.0.113.77'); // set by Cloudflare at the edge in production
      const request = new Request(url, {method: req.method, headers, body: req.method === 'POST' ? Buffer.concat(chunks) : undefined});
      const path = url.pathname.slice('/api/intake/v1/'.length).split('/');
      const response = await onRequest({request, env: {INTAKE_API_ORIGIN: API_HOST, INTAKE_PROXY_SECRET: SECRET}, params: {path}});
      proxied.push([req.method, url.pathname, response.status]);
      const out = {};
      response.headers.forEach((v, k) => { if (k !== 'set-cookie') out[k] = v; });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) out['set-cookie'] = cookies;
      res.writeHead(response.status, out);
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (req.method !== 'GET') throw Error('read-only');
    const file = resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    const mime = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml'};
    const headers = {'Content-Type': mime[extname(file)] || 'text/plain'};
    for (const rule of headerRules) if (rule.path === '/*' || rule.path === url.pathname) for (const [k, v] of rule.headers) headers[k] = v;
    res.writeHead(200, headers);
    res.end(await readFile(file));
  } catch (e) { res.writeHead(500); res.end(String(e.message)); }
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const outbox = () => existsSync(OUTBOX) ? readFileSync(OUTBOX, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
const last = (kind, purpose) => outbox().filter(m => m.kind === kind && (!purpose || m.purpose === purpose)).at(-1);
const inspect = () => JSON.parse(execSync(process.env.E2E_INSPECT, {encoding: 'utf8'}).trim().split('\n').at(-1));
const browser = await chromium.launch({channel: process.env.E2E_CHANNEL || 'msedge', headless: true});
const errors = [], thirdParty = [];
async function newPage() {
  const context = await browser.newContext({baseURL: base, viewport: {width: 1280, height: 950}});
  // Synthetic human check: the website loads the Turnstile script; this stand-in passes immediately.
  await context.route('https://challenges.cloudflare.com/**', r => r.fulfill({contentType: 'text/javascript',
    body: "window.turnstile={render(el,o){setTimeout(()=>o.callback('e2e-human'),20);return 'w'+Math.random();},remove(){}};"}));
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { const u = new URL(r.url()); if (u.host !== `localhost:${PORT}` && u.host !== 'challenges.cloudflare.com') thirdParty.push(r.url()); });
  page.app = {};
  page.on('response', async r => {
    if (!/\/api\/intake\/v1\/(enquiries|draft\/save|access\/confirm)$/.test(r.url()) || r.status() !== 200) return;
    try { const j = await r.json(); if (j.applicationId) page.app.id = j.applicationId; if (Number.isInteger(j.revision)) page.app.revision = j.revision; } catch {}
  });
  page.on('request', r => { if (r.url().endsWith('/api/intake/v1/draft/save')) page.app.lastSave = r.postData(); });
  return page;
}
// Locator waits only: the live Content-Security-Policy (kept on) forbids the eval that waitForFunction needs.
const settle = page => page.locator('#ff-next:enabled').waitFor({state: 'attached', timeout: 20000}).then(() => page.waitForTimeout(120));
const errorText = async page => (await page.locator('#ff-errors').isVisible()) ? await page.locator('#ff-errors').innerText() : '';
async function next(page, allow = null) {
  const title = await page.locator('#step-title').innerText();
  await page.locator('#ff-next').click();
  await settle(page);
  const e = await errorText(page);
  if (e && !(allow && allow.test(e))) throw new Error(`At "${title}": ${e}`);
  return e;
}
async function toAcceptance(page) {
  for (let i = 0; i < 40; i++) {
    if (await page.locator('#step-title').innerText() === 'Check and accept') return;
    if (await page.locator('[name="financial.turnoverChecked"]').count()) await page.locator('[name="financial.turnoverChecked"]').selectOption('yes');
    await next(page);
  }
  throw new Error('did not reach Check and accept');
}
const fillExample = page => page.evaluate(() => document.getElementById('ff-example').click()); // test shortcut for typing the website's own sample answers
const started = inspect();
const results = [];
const step = (label, ok) => { assert.ok(ok, label); results.push(label); console.log('PASS', label); };

try {
  // 1. Customer A starts a Fact-Find, saves part-way, and asks to continue later.
  const A = await newPage();
  await A.goto('/fact-find.html');
  step('live build shows the self-service form only (no agent tools, no example button)',
    await A.locator('.conversation-tools').count() === 0 && await A.locator('#ff-example').isHidden());
  await A.locator('[data-lead-intent="callback"]').first().click();
  const dialog = await A.locator('#lead-dialog').innerText();
  step('callbacks are deferred: the dialog offers the phone number and email, and sends nothing',
    /020 3397 8990/.test(dialog) && /sales@pay2day\.co\.uk/.test(dialog) && proxied.length === 0);
  await A.locator('#lead-dialog .close-button').click();
  await fillExample(A);
  await next(A);
  await next(A);
  await next(A);
  const cookies = await A.context().cookies();
  const session = cookies.find(c => c.name === '__Host-p2d_intake');
  step('the session cookie is __Host-, HttpOnly, Secure and SameSite=Strict, through the proxy',
    session && session.httpOnly && session.secure && session.sameSite === 'Strict' && session.path === '/');
  const aApp = A.app.id;
  step('the first save created the application and later saves advanced its revision', typeof aApp === 'string' && A.app.revision >= 3);
  await A.locator('#ff-save-later').click();
  await A.locator('#ff-errors').waitFor({state: 'visible'});
  await A.locator('#ff-save-later:enabled').waitFor();
  { const said = await errorText(A); step('"Save & continue later" confirms and emails a continuation link' + (/progress is saved/i.test(said) ? '' : ' [' + said + ']'), /progress is saved/i.test(said) && last('link')); }
  const token = new URL(last('link').link).hash.slice('#resume='.length);

  // 2. The customer continues on another device: link + email code, never an email lookup.
  const B = await newPage();
  await B.goto('/fact-find.html#resume=' + token);
  await B.locator('#resume-send').click();
  await B.locator('#resume-code-form').waitFor({state: 'visible'});
  await B.locator('#resume-code').fill(last('code', 'access').code);
  await B.locator('#resume-code-form button').click();
  await B.locator('#resume-title').waitFor({state: 'detached'});
  step('resume on a new device restores the saved answers after an email code',
    /saved answers are here/i.test(await B.locator('#step-description').innerText()) && B.app.id === aApp);
  const revoked = await next(A, /could not complete|changed/i);
  step('resuming signs the first device out (its next save is refused)', revoked !== '');

  // 3. Verify email, accept terms, submit; the first answer is lost in transit and the retry is not duplicated.
  await toAcceptance(B);
  for (const name of ['businessUse', 'noPropertyPurchase', 'acceptance']) {
    const box = B.locator(`[name="application.${name}"]`);
    if (await box.count()) await box.check();
  }
  step('submitting first asks for an emailed verification code', /verification code/i.test(await next(B, /verification code/i)) && last('code', 'acceptance'));
  await B.locator('#verification-code').fill(last('code', 'acceptance').code);
  await B.locator('#verify-email').click();
  await B.locator('#verification-status', {hasText: 'Email confirmed'}).waitFor();
  await B.route('**/api/intake/v1/submission', async route => { await route.fetch(); await route.abort('failed'); }, {times: 1});
  step('a lost submission answer is reported truthfully as unconfirmed', /couldn.t confirm/i.test(await next(B, /couldn.t confirm/i)));
  await next(B);
  const end = await B.locator('#ff-end').innerText();
  step('retrying shows a positive confirmation only after the server confirms receipt', /ENQUIRY RECEIVED/.test(end) && !/nothing has been sent/i.test(end));

  // 4. Staff side: exactly one submission and one CRM lead, owned by the intake user, and the team was told.
  const after = inspect();
  const sub = after.submissions.at(-1);
  step('exactly one submission, imported into the CRM as one lead owned by the intake user',
    after.submissions.length === started.submissions.length + 1 && sub.status === 'IMPORTED' && sub.lead_id > 0
    && after.crm_rows === started.crm_rows + 1 && after.leads.at(-1).originator_id === 1);
  const team = last('team');
  step('the team notice names the business and the CRM lead number', team && team.text.includes('imported as lead #' + sub.lead_id) && /Business: /.test(team.text));
  const accepted = after.consents.filter(c => c.consent_type === 'APPLICATION_TERMS');
  step('acceptance evidence is recorded once, at the submitted revision', accepted.length === 1 && accepted[0].application_revision === B.app.revision);

  // 5. Another customer: no access to A's application, concurrent saves resolve to one revision, retries do not duplicate.
  const C = await newPage();
  await C.goto('/fact-find.html');
  await C.route('**/api/intake/v1/enquiries', async route => { await route.fetch(); await route.abort('failed'); }, {times: 1});
  await fillExample(C);
  await next(C, /.+/);
  await next(C);
  const apps = inspect().applications;
  step('a lost enquiry answer, retried, creates one application (not two)', apps === after.applications + 1);
  const probe = await C.evaluate(async ({victim, own, revision, saveBody}) => {
    const s = await (await fetch('/api/intake/v1/session', {credentials: 'same-origin'})).json();
    const post = (path, body) => fetch('/api/intake/v1' + path, {method: 'POST', credentials: 'same-origin',
      headers: {'Content-Type': 'application/json', 'X-CSRF-Token': s.csrfToken, 'Idempotency-Key': crypto.randomUUID()}, body: JSON.stringify(body)})
      .then(async r => ({status: r.status, body: await r.json()}));
    const body = JSON.parse(saveBody);
    const cross = await post('/draft/save', {...body, applicationId: victim, revision: 1});
    const crossLink = await post('/resume/request', {applicationId: victim, revision: 1});
    const twin = await Promise.all([post('/draft/save', {...body, applicationId: own, revision}), post('/draft/save', {...body, applicationId: own, revision})]);
    return {cross: cross.status, crossLink: crossLink.status, twin: twin.map(t => t.status).sort()};
  }, {victim: aApp, own: C.app.id, revision: C.app.revision, saveBody: C.app.lastSave});
  step('another customer cannot save to, or request a link for, someone else\'s application', probe.cross === 401 && probe.crossLink === 401);
  step('two concurrent saves of one revision: one is saved, the other gets a revision conflict', JSON.stringify(probe.twin) === JSON.stringify([200, 409]));
  const D = await newPage();
  await D.goto('/fact-find.html');
  await fillExample(D);
  const before = inspect().applications;
  await D.evaluate(() => { const b = document.getElementById('ff-next'); b.click(); b.click(); });
  await settle(D);
  step('a double click on Next starts one application', inspect().applications === before + 1);

  step('no browser errors, and no requests to third parties', errors.length === 0 && thirdParty.length === 0);
  console.log(JSON.stringify({result: 'PASS', checks: results.length, proxied: proxied.length}));
} finally {
  await browser.close();
  server.close();
}
