// WEB-INTAKE-VERIFY-UX-001: the emailed acceptance code on the live Fact-Find.
// A synthetic API with the real server's rules: only the newest code works, it is bound to the saved revision,
// 5 tries per code, 5 code emails per hour. No real traffic.
//   node tests/verification-ux-check.mjs                      checks the fixed page (dist/)
//   BASELINE_DIR=<dir> node tests/verification-ux-check.mjs --baseline
//                                                            reproduces the live defect with the original
//                                                            fact-find.js and intake-client.js from <dir>
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {startReview} from './review-harness.mjs';

const baseline = process.argv.includes('--baseline');
const source = name => baseline ? readFile(join(process.env.BASELINE_DIR, name), 'utf8') : readFile(new URL('../dist/' + name, import.meta.url), 'utf8');
const hooks = "\nwindow.verifyHooks={age:ms=>{if(typeof codeSent!=='undefined'&&codeSent)codeSent.at-=ms;},edit:()=>{submitKey=crypto.randomUUID();},snapshot:()=>({emailVerified,revision,finished})};";
const {browser} = await startReview(3031);
let passed = 0;
const check = (ok, name) => { assert.ok(ok, name); passed++; };

/** Opens the page with a fresh synthetic API and walks to "Check and accept" with the declarations ticked. */
async function open() {
  const api = {revision: 0, codes: [], calls: [], sentThisHour: 0, limit: 5, submitted: 0};
  const page = await browser.newPage();
  await page.route('**/runtime-config.js', r => r.fulfill({contentType: 'text/javascript', body: "export const runtime={mode:'live',apiBase:'/api/intake/v1',turnstileSiteKey:'synthetic'};"}));
  await page.route('**/fact-find.js', async r => r.fulfill({contentType: 'text/javascript', body: (await source('fact-find.js')) + hooks}));
  await page.route('**/intake-client.js', async r => r.fulfill({contentType: 'text/javascript', body: await source('intake-client.js')}));
  await page.route('https://challenges.cloudflare.com/**', r => r.fulfill({contentType: 'text/javascript', body: "window.turnstile={render:(c,o)=>{queueMicrotask(()=>o.callback('synthetic'));return 1;},remove:()=>{}};"}));
  await page.route('**/api/intake/v1/**', async r => {
    const path = new URL(r.request().url()).pathname.split('/v1')[1];
    const body = r.request().method() === 'POST' ? r.request().postDataJSON() : null;
    api.calls.push(path);
    const fail = (status, message) => r.fulfill({status, json: {status: 'error', message}});
    if (path === '/session') return r.fulfill({json: {contract: 'pay2day-intake-v1', acceptingEnquiries: true, csrfToken: 'synthetic'}});
    if (path === '/enquiries') return r.fulfill({json: {applicationId: 'synthetic-application', revision: ++api.revision}});
    if (path === '/draft/save') return r.fulfill({json: {revision: ++api.revision}});
    if (path === '/verification/request') {
      if (api.sentThisHour >= api.limit) return fail(429, 'Too many requests.');
      if (body.revision !== api.revision) return fail(409, 'The application changed.');
      for (const c of api.codes) c.cancelled = true;
      api.sentThisHour++;
      api.codes.push({code: String(100000 + api.codes.length * 7919), revision: api.revision, tries: 0, cancelled: false, verified: false});
      return r.fulfill({json: {sent: true}});
    }
    if (path === '/verification/confirm') {
      const c = api.codes.at(-1);
      if (!c || c.tries >= 5 || c.revision !== api.revision) return fail(401, 'The code is not valid or has expired.');
      if (body.code !== c.code) { c.tries++; return fail(401, 'The code is not valid or has expired.'); }
      if (c.cancelled && !c.verified) return fail(401, 'The code is not valid or has expired.');
      c.cancelled = c.verified = true;
      return r.fulfill({json: {verified: true}});
    }
    if (path === '/submission') {
      const c = api.codes.at(-1);
      if (!c?.verified || c.revision !== body.revision) return fail(403, 'Confirm your email address before you submit.');
      api.submitted++;
      return r.fulfill({json: {status: 'received', submitted: true, applicationId: body.applicationId, revision: body.revision}});
    }
    if (path === '/lookups/companies') return r.fulfill({json: {items: []}});
    return fail(404, 'Route not found.');
  });
  await page.goto('http://127.0.0.1:3031/fact-find.html');
  await page.locator('#ff-example').evaluate(e => e.click());
  for (let i = 0; await page.locator('#step-title').innerText() !== 'Check and accept'; i++) {
    assert.ok(i < 35, 'reached Check and accept');
    await page.locator('#ff-next').click();
    await page.waitForFunction(() => !document.getElementById('ff-next').disabled);
  }
  for (const name of ['businessUse', 'noPropertyPurchase', 'acceptance']) await page.locator('[name="application.' + name + '"]').check();
  const idle = () => page.waitForFunction(() => !document.getElementById('ff-next').disabled);
  const submit = async () => { await page.locator('#ff-next').click(); await idle(); };
  const count = path => api.calls.filter(p => p === path).length;
  return {page, api, idle, submit, count, latest: () => api.codes.at(-1).code, done: () => page.locator('#ff-end').isVisible()};
}

try {
  // 1. The live defect: the customer types the emailed code and presses Enter.
  {
    const t = await open();
    await t.submit();
    check(t.count('/verification/request') === 1, 'first Submit sends one code');
    await t.page.locator('#verification-code').fill(t.latest());
    await t.page.locator('#verification-code').press('Enter');
    await t.idle();
    if (baseline) {
      assert.equal(t.count('/verification/request'), 2, 'baseline: Enter in the code box requested a second code');
      assert.equal(await t.done(), false, 'baseline: the customer is not through');
      console.log('BASELINE REPRODUCED: Enter after typing the code sends a new code and cancels the typed one');
    } else {
      check(t.count('/verification/request') === 1, 'Enter in the code box does not send another code');
      check(t.count('/verification/confirm') === 1, 'Enter confirms the typed code');
      check(t.api.submitted === 1 && await t.done(), 'the submission completes after Enter');
    }
    await t.page.close();
  }

  // 2. Submit pressed repeatedly before entering a code.
  {
    const t = await open();
    for (let i = 0; i < 3; i++) await t.submit();
    if (baseline) {
      assert.equal(t.count('/verification/request'), 3, 'baseline: each Submit sent a new code');
      console.log('BASELINE REPRODUCED: 3 Submit presses send 3 codes, each cancelling the last');
    } else {
      check(t.count('/verification/request') === 1, 'repeated Submit sends only one code');
      check(/6-digit code/.test(await t.page.locator('#ff-errors').innerText()), 'Submit without a code points to the code box');
      check(await t.page.locator('#ff-verification').isVisible(), 'the code box stays visible');
      await t.page.locator('#verification-code').fill(t.latest());
      await t.submit();
      check(t.api.submitted === 1 && await t.done(), 'Submit with the code confirms it and completes');
    }
    await t.page.close();
  }

  if (!baseline) {
    // 3. A wrong code explains what to do; the right code then works through Confirm email.
    {
      const t = await open();
      await t.submit();
      check(/verification code/i.test(await t.page.locator('#ff-errors').innerText()), 'first Submit says a verification code was emailed');
      check(/most recent email/.test(await t.page.locator('#verification-status').innerText()), 'the code box says only the newest code works');
      await t.page.locator('#verification-code').fill('000000');
      await t.page.locator('#verify-email').click();
      await t.page.waitForFunction(() => /did not work/.test(document.getElementById('verification-status').textContent));
      check(/most recent email only/.test(await t.page.locator('#verification-status').innerText()), 'a wrong code explains that only the newest code works');
      check(t.count('/verification/request') === 1, 'a wrong code does not send another code');
      await t.page.locator('#verification-code').fill('12');
      await t.page.locator('#verify-email').click();
      await t.page.waitForFunction(() => /6-digit/.test(document.getElementById('verification-status').textContent));
      check(t.count('/verification/confirm') === 1, 'a code that is not 6 digits is not sent');
      await t.page.locator('#verification-code').fill(t.latest());
      await t.page.locator('#verify-email').click();
      await t.page.waitForFunction(() => /Email confirmed/.test(document.getElementById('verification-status').textContent));
      await t.submit();
      check(t.api.submitted === 1 && await t.done(), 'the submission completes after Confirm email');
      await t.page.close();
    }

    // 4. Send a new code: a 60-second wait, no extra save for an unchanged form, and only the new code works.
    {
      const t = await open();
      await t.submit();
      const first = t.latest(), saves = t.count('/draft/save');
      check(await t.page.locator('#resend-code').isDisabled(), 'Send a new code waits after a code is sent');
      check(/\(\d+s\)/.test(await t.page.locator('#resend-code').innerText()), 'the wait is shown as a countdown');
      await t.page.evaluate(() => window.verifyHooks.age(61000));
      await t.page.waitForFunction(() => !document.getElementById('resend-code').disabled);
      await t.page.locator('#resend-code').click();
      await t.page.waitForFunction(() => document.getElementById('resend-code').disabled);
      check(t.count('/verification/request') === 2, 'Send a new code sends exactly one new code');
      check(t.count('/draft/save') === saves, 'an unchanged form is not saved again, so the new code matches it');
      await t.page.locator('#verification-code').fill(first);
      await t.page.locator('#verify-email').click();
      await t.page.waitForFunction(() => /did not work/.test(document.getElementById('verification-status').textContent));
      check(true, 'the older code is refused after a new one is sent');
      await t.page.locator('#verification-code').fill(t.latest());
      await t.submit();
      check(t.api.submitted === 1 && await t.done(), 'the new code completes the submission');
      await t.page.close();
    }

    // 5. The hourly limit is explained, and the last code still works.
    {
      const t = await open();
      await t.submit();
      t.api.sentThisHour = t.api.limit;
      await t.page.evaluate(() => window.verifyHooks.age(61000));
      await t.page.waitForFunction(() => !document.getElementById('resend-code').disabled);
      await t.page.locator('#resend-code').click();
      await t.page.waitForFunction(() => /several codes/.test(document.getElementById('verification-status').textContent));
      check(/most recent email/.test(await t.page.locator('#verification-status').innerText()), 'the hourly limit says to use the latest code or wait');
      await t.page.locator('#verification-code').fill(t.latest());
      await t.submit();
      check(t.api.submitted === 1 && await t.done(), 'the last code still works after the limit is reached');
      await t.page.close();
    }

    // 6. A changed form, or an expired code, gets a fresh code instead of reusing a dead one.
    {
      const t = await open();
      await t.submit();
      await t.page.evaluate(() => window.verifyHooks.edit());
      const saves = t.count('/draft/save');
      await t.submit();
      check(t.count('/verification/request') === 2 && t.count('/draft/save') === saves + 1, 'after an edit, Submit saves and sends a new code');
      await t.page.evaluate(() => window.verifyHooks.age(11 * 60000));
      await t.page.locator('#verification-code').fill(t.latest());
      await t.submit();
      check(t.count('/verification/request') === 3 && t.count('/verification/confirm') === 0, 'an expired code is replaced, not confirmed');
      await t.page.locator('#verification-code').fill(t.latest());
      await t.submit();
      check(t.api.submitted === 1 && await t.done(), 'the fresh code completes the submission');
      await t.page.close();
    }
  }
  console.log(baseline ? 'PASS: live defect reproduced with the original page' : `PASS: ${passed} verification checks; synthetic API only, no real traffic`);
} finally {
  await browser.close();
}
