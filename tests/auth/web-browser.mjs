// Opt-in integration: start tools/auth-web/run.mjs and Firefox WebDriver BiDi first.
import assert from 'node:assert/strict';
import { once } from 'node:events';

const web = 'http://localhost:3401';
const api = 'http://localhost:3400';
const socket = new WebSocket('ws://127.0.0.1:9224/session');
await once(socket, 'open');
let sequence = 0;
const pending = new Map();
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  if (message.type === 'error') request.reject(new Error(`${request.method}: ${message.error}`));
  else request.resolve(message.result);
});
function command(method, params) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, method });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
try {
  const session = await command('session.new', { capabilities: {} });
  console.log(`Browser: ${session.capabilities.browserName} ${session.capabilities.browserVersion}`);
  const { context } = await command('browsingContext.create', { type: 'tab' });
  const evaluate = async (expression) => {
    const response = await command('script.evaluate', { expression, target: { context }, awaitPromise: true });
    assert.equal(response.type, 'success', 'Browser script must succeed (sensitive values suppressed)');
    return response.result.value;
  };
  const waitFor = (expression) => evaluate(`new Promise((resolve, reject) => {
    const deadline = Date.now() + 10000;
    const poll = () => { if (${expression}) resolve(true); else if (Date.now() > deadline) reject(new Error('timeout')); else setTimeout(poll, 50); }; poll();
  })`);
  const click = async (id) => {
    await evaluate(`document.querySelector('#${id}').click()`);
    await waitFor("document.querySelector('#status').dataset.busy === 'false'");
  };
  const set = (id, value) => evaluate(`document.querySelector('#${id}').value = ${JSON.stringify(value)}`);
  await command('browsingContext.navigate', { context, url: web, wait: 'complete' });
  await waitFor("document.querySelector('#status')?.dataset.busy === 'false'");
  assert.equal(await evaluate("document.querySelector('h1').textContent"), 'Ensayo local de Auth');
  await set('email', `browser-${Date.now()}@example.invalid`);
  await set('password', 'browser-only-test-password-123');
  await set('name', 'Browser test');
  await click('signup');
  await click('session');
  assert.equal(await evaluate("document.querySelector('#identity').dataset.verified"), 'false');
  assert.equal(await evaluate('document.cookie'), '', 'Auth cookie must be HttpOnly');
  assert.equal(await evaluate('localStorage.length + sessionStorage.length'), 0);
  await click('resend');
  await click('mail');
  assert.equal(await evaluate("document.querySelectorAll('#mailbox a').length"), 2);
  const verificationLink = await evaluate("document.querySelector('#mailbox a').href");
  await command('browsingContext.navigate', { context, url: verificationLink, wait: 'complete' });
  await waitFor("document.querySelector('#identity')?.dataset.verified === 'true'");
  console.log('PASS register, resend, verification return and credentialed session');

  const anonymous = await evaluate(`fetch('${api}/api/auth/get-session', { credentials: 'omit' }).then(r => r.json()).then(v => v === null)`);
  assert.equal(anonymous, true);
  const cookieFlags = await command('storage.getCookies', {});
  const authCookie = cookieFlags.cookies.find((cookie) => cookie.name.includes('session_token'));
  assert.equal(authCookie?.httpOnly, true);
  assert.equal(authCookie?.sameSite, 'lax');
  console.log('PASS cookie credentials, HttpOnly/Lax and no browser storage');

  await set('email', await evaluate("document.querySelector('#identity').dataset.email"));
  await click('recovery');
  await click('mail');
  const resetLink = await evaluate("document.querySelector('#mailbox a[data-kind=reset]').href");
  await command('browsingContext.navigate', { context, url: resetLink, wait: 'complete' });
  await waitFor("document.querySelector('#status')?.dataset.busy === 'false'");
  assert.equal(await evaluate('location.search'), '', 'Reset token must be removed from the address bar');
  await set('new-password', 'browser-reset-password-456');
  await click('reset');
  await click('session');
  assert.equal(await evaluate("document.querySelector('#identity').textContent"), 'Sin sesión');
  // The recovery navigation starts a fresh document; recover the synthetic email from the local inbox.
  const email = await evaluate("fetch('/__mail').then(r => r.json()).then(m => m.find(v => v.kind === 'reset').email)");
  await set('email', email);
  await set('password', 'wrong-password-123');
  await click('login');
  assert.equal(await evaluate("document.querySelector('#status').dataset.http"), '401');
  await set('password', 'browser-reset-password-456');
  await click('login');
  await click('session');
  assert.equal(await evaluate("document.querySelector('#identity').dataset.verified"), 'true');
  console.log('PASS reset return, session revocation, invalid and valid login');

  const rejected = await evaluate(`fetch('${api}/api/auth/request-password-reset', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: ${JSON.stringify(email)}, redirectTo: 'https://evil.test/' }) }).then(r => r.status)`);
  assert.equal(rejected, 403);
  const deniedCors = await evaluate(`fetch('http://127.0.0.1:3400/api/auth/get-session', { credentials: 'include' }).then(() => false, () => true)`);
  // Host header rejection also ensures the local probe cannot be reached under an unregistered host.
  assert.equal(deniedCors, true);
  await command('browsingContext.navigate', { context, url: `${web}/?error=INVALID_TOKEN`, wait: 'complete' });
  await waitFor("document.querySelector('#status')?.dataset.busy === 'false'");
  assert.match(await evaluate("document.querySelector('#return-error').textContent"), /INVALID_TOKEN/);
  console.log('PASS invalid return and callback error presentation');
} finally {
  await command('session.end', {}).catch(() => {});
  socket.close();
}
