// Opt-in acceptance after the developer signs in on both real consumers.
// Never captures email, cookies, authorization codes or provider tokens.
import assert from 'node:assert/strict';
const response = await fetch('http://localhost:3402/probe/google-evidence');
assert.equal(response.status, 200);
const evidence = await response.json();
assert.equal(evidence.web, true, 'Complete Google login and session check on the web page');
assert.equal(evidence.android, true, 'Complete Google login and session check on Android');
assert.equal(evidence.sameIdentity, true, 'Both consumers must use the same Google identity');
assert.equal(evidence.profiles, 1, 'Exactly one product profile must exist');
assert.equal(evidence.googleAccounts, 1, 'Exactly one Google provider account must exist');
console.log('PASS real Google web/Android, verified identity, one account and one profile');

const base = 'http://localhost:3402';
const start = await fetch(`${base}/api/auth/sign-in/social`, {
  method: 'POST', headers: { origin: base, 'content-type': 'application/json' },
  body: JSON.stringify({ provider: 'google', callbackURL: `${base}/probe/google`,
    errorCallbackURL: `${base}/probe/google`, disableRedirect: true }),
});
assert.equal(start.status, 200);
const state = new URL((await start.json()).url).searchParams.get('state');
const cookie = start.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
async function negative(params, expected) {
  const r = await fetch(`${base}/api/auth/callback/google?${new URLSearchParams(params)}`, {
    headers: { cookie }, redirect: 'manual',
  });
  assert.equal(r.status, 302);
  const error = new URL(r.headers.get('location')).searchParams.get('error');
  assert.ok(error);
  if (expected) assert.equal(error, expected);
  assert.equal(r.headers.getSetCookie().some((value) => value.startsWith('better-auth.session_token=')), false);
}
await negative({ state: 'altered', error: 'access_denied' });
await negative({ state, error: 'access_denied' }, 'access_denied');
await negative({ state, code: 'unused-after-cancellation' });
assert.deepEqual(await (await fetch(`${base}/probe/google-evidence`)).json(), evidence);
console.log('PASS altered/cancelled/reused callbacks on the live handler preserve identities and issue no session');
