import { afterEach, expect, test } from 'vitest';
import { authFixture, credentials, sessionHeaders } from './helpers.js';

const api = 'http://localhost:3402';
const nativeOrigin = 'zephyriov-auth-probe://';
const callback = `${nativeOrigin}verified`;
const opened: Awaited<ReturnType<typeof authFixture>>[] = [];
async function fixture() {
  const options = { baseURL: api, nativeOrigins: [nativeOrigin], allowedReturnURLs: [callback] };
  const value = await authFixture(options);
  opened.push(value);
  return value;
}
afterEach(async () => { for (const value of opened.splice(0)) await value.close(); });
function request(path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Request(`${api}/api/auth${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', 'expo-origin': nativeOrigin, ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test('official Expo headers reach real Auth, verify via exact deep link and retain the session', async () => {
  const { auth, verificationEmails } = await fixture();
  const signup = await auth.handler(request('/sign-up/email', { ...credentials, callbackURL: callback }));
  expect(signup.status).toBe(200);
  expect(signup.headers.get('access-control-allow-origin')).toBeNull();
  const cookie = sessionHeaders(signup).get('cookie')!;
  const before = await auth.handler(request('/get-session', undefined, { cookie }));
  expect((await before.json()).user.emailVerified).toBe(false);
  const verify = await auth.handler(new Request(verificationEmails[0]!.url));
  expect(verify.status).toBe(302);
  expect(verify.headers.get('location')).toBe(callback);
  const after = await auth.handler(request('/get-session', undefined, { cookie }));
  expect((await after.json()).user.emailVerified).toBe(true);
  expect((await auth.handler(request('/sign-out', {}, { cookie }))).status).toBe(200);
  expect(await (await auth.handler(request('/get-session', undefined, { cookie }))).json()).toBeNull();
});

test('Expo transport cannot override browser origins or Fetch Metadata and rejects foreign returns before effects', async () => {
  const { auth, client, verificationEmails } = await fixture();
  for (const headers of [
    { 'expo-origin': 'foreign://' }, { 'expo-origin': `${nativeOrigin}path` },
    { 'expo-origin': 'exp://' }, { origin: 'https://evil.test' },
    { origin: api }, { 'sec-fetch-site': 'cross-site' },
    { 'sec-fetch-site': 'same-origin' },
  ]) {
    expect((await auth.handler(request('/sign-up/email', credentials, headers))).status).toBe(403);
  }
  for (const value of ['foreign://verified', `${callback}/`, `${callback}?x=1`, `${callback}#x`,
    `${nativeOrigin}other`, 'javascript:alert(1)']) {
    expect((await auth.handler(request('/sign-up/email', { ...credentials, callbackURL: value }))).status).toBe(403);
  }
  const duplicate = new URLSearchParams([['token', 'invalid'], ['callbackURL', callback], ['callbackURL', 'foreign://verified']]);
  expect((await auth.handler(request(`/verify-email?${duplicate}`))).status).toBe(403);
  expect((await client.execute('select count(*) as n from user')).rows[0]?.n).toBe(0);
  expect(verificationEmails).toHaveLength(0);
});

test('native transport remains opt-in and browser preflight cannot enable expo-origin', async () => {
  const plain = await authFixture();
  opened.push(plain);
  expect((await plain.auth.handler(request('/sign-up/email', credentials))).status).toBe(403);
  const { auth } = await fixture();
  const response = await auth.handler(new Request(`${api}/api/auth/sign-up/email`, {
    method: 'OPTIONS', headers: { origin: api, 'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type,expo-origin' },
  }));
  expect(response.status).toBe(403);
});
