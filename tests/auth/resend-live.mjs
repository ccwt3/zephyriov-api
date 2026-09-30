// Opt-in B05.11 acceptance with real Resend delivery to two developer mailboxes.
// Usage (after `pnpm build`): node tests/auth/resend-live.mjs <mailbox-A> <mailbox-B>
// Sends exactly four real messages: A verification + reset, B verification twice.
// Never prints tokens, links, cookies, passwords or the API key.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [mailboxA, mailboxB] = process.argv.slice(2);
assert.ok(mailboxA && mailboxB && mailboxA !== mailboxB, 'Pass two distinct developer mailboxes');
const base = 'http://localhost:3403';
const returnURL = `${base}/probe/mail`;
// Long epoch-aligned trial windows so a slow manual step cannot cross a reset boundary.
const windowMs = 30 * 86_400_000;
const windowEnd = (Math.floor(Date.now() / windowMs) + 1) * windowMs;
assert.ok(windowEnd - Date.now() > 6 * 3_600_000, 'Trial window closes within six hours; retry later');
const limits = { emailGlobal: { limit: 5, windowMs }, emailIdentity: { limit: 2, windowMs } };
const directory = await mkdtemp(join(tmpdir(), 'zephyriov-auth-mail-'));
let server;

async function start() {
  server = spawn(process.execPath, ['tools/auth-mail/run.mjs', directory, JSON.stringify(limits)], { stdio: ['ignore', 'pipe', 'inherit'] });
  const [line] = await Promise.race([once(server.stdout, 'data'), once(server, 'exit').then(() => { throw new Error('Trial server exited'); })]);
  assert.match(String(line), /Resend Auth trial/);
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  server.kill('SIGTERM');
  await once(server, 'exit');
}
const post = (path, body) => fetch(`${base}/api/auth${path}`, {
  method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: JSON.stringify(body),
});
const evidence = async (email = '') => (await fetch(`${base}/probe/mail-evidence?${new URLSearchParams({ email })}`)).json();
const pass = (message) => console.log(`PASS ${message}`);
async function waitFor(description, check, timeoutMs = 30 * 60_000) {
  console.log(`WAIT ${description}`);
  for (const deadline = Date.now() + timeoutMs; Date.now() < deadline;) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error(`Timed out: ${description}`);
}
async function rejected(response, message) {
  assert.equal(response.status, 429, message);
  assert.ok(Number(response.headers.get('retry-after')) > 0, 'Retry-After must be positive');
  assert.equal((await response.json()).code, 'RATE_LIMITED');
}
const mailRequest = (email) => post('/send-verification-email', { email, callbackURL: returnURL });

try {
  await start();
  const signUp = (name, email) => post('/sign-up/email', { name, email, password: randomBytes(18).toString('hex'), callbackURL: returnURL });

  assert.equal((await signUp('Ensayo A', mailboxA)).status, 200);
  assert.equal((await evidence()).counters['email:sent:verification'], 1);
  pass('A sign-up accepted by Resend over HTTPS; one verification sent, budget consumed first');
  await waitFor('Open the verification message in mailbox A and click its link once', async () => (await evidence(mailboxA)).verified);
  pass('A verified through the real delivered link');

  assert.equal((await post('/request-password-reset', { email: mailboxA, redirectTo: returnURL })).status, 200);
  assert.equal((await evidence()).counters['email:sent:reset'], 1);
  await waitFor('Open the reset message in mailbox A and click its link once', async () => (await evidence()).resetProofs.length > 0);
  const afterReset = await evidence();
  assert.deepEqual(afterReset.resetProofs, [{ reset: true, reuseStatus: 400 }]);
  assert.equal(afterReset.pendingResets, 0);
  pass('A reset link consumed once; reuse rejected with 400 and no reset token left');

  const sentBefore = (await evidence()).counters;
  await rejected(await mailRequest(mailboxA), 'Identity N+1 (A third message) must be rejected');
  assert.deepEqual((await evidence()).counters, sentBefore);
  pass('Identity N=2 accepted, N+1 rejected with Retry-After and no provider call or counter change');

  assert.equal((await signUp('Ensayo B', mailboxB)).status, 200);
  const race = await Promise.all([mailRequest(mailboxB), mailRequest(mailboxB)]);
  assert.deepEqual(race.map((r) => r.status).sort(), [200, 429]);
  await rejected(race.find((r) => r.status === 429), 'Concurrent loser must be 429');
  const beforeRestart = (await evidence()).counters;
  assert.equal(beforeRestart['email:sent:verification'], 3);
  assert.equal(beforeRestart['email:global'], 4);
  assert.equal(beforeRestart['email:identity'], 4);
  pass('Two concurrent requests for B last identity slot: exactly one real send, one 429');

  await stop();
  await start();
  await rejected(await mailRequest(mailboxA), 'A must stay exhausted after restart');
  await rejected(await mailRequest(mailboxB), 'B must stay exhausted after restart');
  assert.deepEqual((await evidence()).counters, beforeRestart);
  pass('Process restart kept every mail counter; no consumption reset');

  const unknown = (label) => post('/request-password-reset', { email: `${label}-${randomBytes(4).toString('hex')}@example.invalid`, redirectTo: returnURL });
  assert.equal((await unknown('c')).status, 200);
  await rejected(await unknown('d'), 'Global N+1 must be rejected for any identity');
  const final = (await evidence()).counters;
  assert.equal(final['email:global'], 5);
  assert.equal(final['email:sent:verification'], 3);
  assert.equal(final['email:sent:reset'], 1);
  assert.equal(final['email:failed:verification'] ?? 0, 0);
  assert.equal(final['email:failed:reset'] ?? 0, 0);
  pass('Global N=5 reached (unknown address reserves without sending), N+1 rejected; 4 sent, 0 failed');
  console.log('INFO Mailbox B should hold two verification messages; confirm receipt and SPF/DKIM results manually.');
} finally {
  await stop();
  await rm(directory, { recursive: true, force: true });
}
