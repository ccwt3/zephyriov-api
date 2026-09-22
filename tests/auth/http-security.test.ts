import { afterEach, expect, test } from 'vitest';
import { authFixture, credentials, sessionHeaders } from './helpers.js';

const api = 'https://api.example.test';
const web = 'https://web.example.test';
const callback = `${web}/auth-return`;
const reset = `${web}/reset`;
const opened: Awaited<ReturnType<typeof authFixture>>[] = [];
async function fixture() {
  const value = await authFixture({ baseURL: api, webOrigins: [web], allowedReturnURLs: [callback, reset] });
  opened.push(value);
  return value;
}
afterEach(async () => { for (const value of opened.splice(0)) await value.close(); });

function request(path: string, body?: unknown, origin: string | null = web, extra = {}) {
  return new Request(`${api}/api/auth${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(origin === null ? {} : { origin }), 'content-type': 'application/json', ...extra },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test('HTTPS session cookies are Secure/HttpOnly/Lax, host-only, with credentialed exact CORS', async () => {
  const { auth } = await fixture();
  const response = await auth.handler(request('/sign-up/email', { ...credentials, callbackURL: callback }));
  expect(response.status).toBe(200);
  const cookie = response.headers.getSetCookie().find((value) => value.includes('session_token='))!;
  expect(cookie).toMatch(/; Secure/i);
  expect(cookie).toMatch(/; HttpOnly/i);
  expect(cookie).toMatch(/; SameSite=Lax/i);
  expect(cookie).toMatch(/; Path=\//i);
  expect(cookie).not.toMatch(/; Domain=/i);
  expect(response.headers.get('access-control-allow-origin')).toBe(web);
  expect(response.headers.get('access-control-allow-credentials')).toBe('true');
  expect(response.headers.get('vary')).toContain('Origin');
  const session = await auth.handler(request('/get-session', undefined, web, { cookie: sessionHeaders(response).get('cookie')! }));
  expect((await session.json()).user.email).toBe(credentials.email);
  const anonymous = await auth.handler(request('/get-session'));
  expect(await anonymous.json()).toBeNull();
});

test('preflight permits only exact origins, GET/POST and content-type', async () => {
  const { auth } = await fixture();
  for (const [origin, method, headers, expected] of [
    [web, 'POST', 'content-type', 204], [api, 'GET', '', 204],
    ['https://evil.example.test', 'POST', 'content-type', 403],
    [`${web}.evil.test`, 'POST', 'content-type', 403],
    ['null', 'POST', 'content-type', 403],
    [web, 'DELETE', '', 403], [web, 'POST', 'x-unapproved', 403],
  ] as const) {
    const response = await auth.handler(new Request(`${api}/api/auth/sign-in/email`, { method: 'OPTIONS', headers: {
      origin, 'access-control-request-method': method, 'access-control-request-headers': headers,
    } }));
    expect(response.status).toBe(expected);
    expect(response.headers.get('access-control-allow-origin')).toBe(expected === 204 ? origin : null);
    if (expected === 204) expect(response.headers.get('access-control-allow-credentials')).toBe('true');
  }
});

test('foreign, opaque, absent and spoofed origins cannot write, even before a session exists', async () => {
  const { auth, client, verificationEmails, resetEmails } = await fixture();
  for (const origin of ['https://evil.test', `${web}:8443`, `${web}/path`, 'null', null]) {
    for (const path of ['/sign-up/email', '/sign-in/email', '/send-verification-email', '/request-password-reset', '/reset-password']) {
      const response = await auth.handler(request(path, credentials, origin, { 'sec-fetch-site': 'same-origin' }));
      expect(response.status).toBe(403);
      expect(response.headers.get('access-control-allow-origin')).toBeNull();
    }
  }
  expect((await client.execute('select count(*) as n from user')).rows[0]?.n).toBe(0);
  expect(verificationEmails).toHaveLength(0);
  expect(resetEmails).toHaveLength(0);
  const signedUp = await auth.handler(request('/sign-up/email', credentials));
  const cookie = sessionHeaders(signedUp).get('cookie')!;
  expect((await auth.handler(request('/sign-out', {}, 'https://evil.test', { cookie }))).status).toBe(403);
  expect((await auth.api.getSession({ headers: new Headers({ cookie }) }))?.user.email).toBe(credentials.email);
});

test('Better Auth still rejects cross-site navigation and the boundary rejects alternate body encodings', async () => {
  const { auth, client, verificationEmails } = await fixture();
  const navigation = await auth.handler(request('/sign-up/email', credentials, web, {
    'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document',
  }));
  expect(navigation.status).toBe(403);
  expect((await navigation.json()).code).toBe('CROSS_SITE_NAVIGATION_LOGIN_BLOCKED');
  const form = await auth.handler(new Request(`${api}/api/auth/sign-up/email`, {
    method: 'POST', headers: { origin: web, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...credentials, callbackURL: 'https://evil.test/' }),
  }));
  expect(form.status).toBe(415);
  const malformed = await auth.handler(new Request(`${api}/api/auth/sign-up/email`, {
    method: 'POST', headers: { origin: web, 'content-type': 'application/json' }, body: '{',
  }));
  expect(malformed.status).toBe(400);
  expect(malformed.headers.get('access-control-allow-origin')).toBe(web);
  expect((await client.execute('select count(*) as n from user')).rows[0]?.n).toBe(0);
  expect(verificationEmails).toHaveLength(0);
});

test('only registered return URLs are accepted, including GET callbacks and duplicate parameters', async () => {
  const { auth, verificationEmails, resetEmails } = await fixture();
  const rejected = ['https://evil.test/', `${web}/unregistered`, `${callback}?next=https://evil.test`,
    `${callback}#fragment`, `//evil.test/`, `/\\evil.test/`, `https://web.example.test@evil.test/`,
    'javascript:alert(1)', `${web}/%2e%2e/auth-return`, `${web}/auth-return/`, 'null'];
  for (const value of rejected) {
    for (const field of ['callbackURL', 'errorCallbackURL', 'newUserCallbackURL', 'redirectTo']) {
      const response = await auth.handler(request('/sign-up/email', { ...credentials, [field]: value }));
      expect(response.status).toBe(403);
    }
    const query = new URLSearchParams({ token: 'invalid', callbackURL: value });
    expect((await auth.handler(request(`/verify-email?${query}`, undefined, null))).status).toBe(403);
  }
  expect(verificationEmails).toHaveLength(0);
  expect((await auth.handler(request('/sign-up/email', { ...credentials, callbackURL: callback }))).status).toBe(200);
  const verify = await auth.handler(new Request(verificationEmails[0]!.url));
  expect(verify.status).toBe(302);
  expect(verify.headers.get('location')).toBe(callback);
  const duplicate = new URL(verificationEmails[0]!.url);
  duplicate.searchParams.append('callbackURL', 'https://evil.test/');
  expect((await auth.handler(new Request(duplicate))).status).toBe(403);
  expect((await auth.handler(request('/request-password-reset', { email: credentials.email, redirectTo: reset }))).status).toBe(200);
  const returnResponse = await auth.handler(new Request(resetEmails[0]!.url));
  expect(returnResponse.status).toBe(302);
  expect(new URL(returnResponse.headers.get('location')!).origin).toBe(web);
  const badReset = new URL(resetEmails[0]!.url);
  badReset.searchParams.set('callbackURL', 'https://evil.test/');
  expect((await auth.handler(new Request(badReset))).status).toBe(403);
});
