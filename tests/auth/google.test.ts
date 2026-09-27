import { afterEach, expect, test, vi } from 'vitest';
import { authFixture, sessionHeaders } from './helpers.js';
import { requireVerifiedSession } from '../../src/auth/authorization.js';

const baseURL = 'http://localhost:3402';
const web = 'http://localhost:3401';
const native = 'zephyriov-auth-probe://verified';
const google = { clientId: 'synthetic-client.apps.googleusercontent.com', clientSecret: 'synthetic-google-secret' };
const opened: Awaited<ReturnType<typeof authFixture>>[] = [];
async function fixture() {
  const value = await authFixture({ baseURL, webOrigins: [web],
    nativeOrigins: ['zephyriov-auth-probe://'], allowedReturnURLs: [`${web}/`, native], google });
  opened.push(value);
  return value;
}
afterEach(async () => {
  vi.restoreAllMocks();
  for (const value of opened.splice(0)) await value.close();
});

async function begin(value: Awaited<ReturnType<typeof fixture>>, callbackURL = `${web}/`) {
  const response = await value.post('/sign-in/social', { provider: 'google', callbackURL,
    errorCallbackURL: callbackURL, disableRedirect: true });
  expect(response.status).toBe(200);
  const url = new URL((await response.json()).url);
  return { url, cookie: sessionHeaders(response).get('cookie')! };
}
function callback(state: string, cookie: string, params: Record<string, string> = { code: 'synthetic-code' }) {
  return new Request(`${baseURL}/api/auth/callback/google?${new URLSearchParams({ state, ...params })}`, { headers: { cookie } });
}

test('Google uses the official authorization endpoint, PKCE, exact callback and identity scopes only', async () => {
  const value = await fixture();
  for (const target of [`${web}/`, native]) {
    const { url } = await begin(value, target);
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('redirect_uri')).toBe(`${baseURL}/api/auth/callback/google`);
    expect(url.searchParams.get('client_id')).toBe(google.clientId);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(url.searchParams.get('state')).toBeTruthy();
    expect(url.searchParams.get('scope')!.split(' ').sort()).toEqual(['email', 'openid', 'profile']);
    expect(url.toString()).not.toContain(google.clientSecret);
  }
});

test('unregistered returns, extra scopes and direct ID tokens cannot start a Google session', async () => {
  const value = await fixture();
  for (const body of [
    { callbackURL: `${web}/foreign` }, { callbackURL: `${native}?foreign=1` },
    { scopes: ['https://www.googleapis.com/auth/drive'] },
    { additionalParams: { access_type: 'offline' } },
    { idToken: { token: 'not-a-provider-token' } },
  ]) {
    const response = await value.post('/sign-in/social', { provider: 'google', callbackURL: `${web}/`, ...body });
    expect(response.status).toBeGreaterThanOrEqual(400);
  }
  expect((await value.client.execute('select count(*) as n from session')).rows[0]!.n).toBe(0);
});

test('altered state, missing browser cookie, cancelled and reused callbacks create no identity', async () => {
  const value = await fixture();
  const provider = (await value.auth.$context).socialProviders.find((item) => item.id === 'google')!;
  const exchange = vi.spyOn(provider, 'validateAuthorizationCode');
  const first = await begin(value);
  for (const request of [callback('', first.cookie), callback('altered-state', first.cookie), callback(first.url.searchParams.get('state')!, '')]) {
    const response = await value.auth.handler(request);
    expect(response.status).toBe(302);
    expect(new URL(response.headers.get('location')!).searchParams.has('error')).toBe(true);
  }
  const cancelled = await begin(value);
  const state = cancelled.url.searchParams.get('state')!;
  const response = await value.auth.handler(callback(state, cancelled.cookie, { error: 'access_denied' }));
  expect(new URL(response.headers.get('location')!).searchParams.get('error')).toBe('access_denied');
  const replay = await value.auth.handler(callback(state, cancelled.cookie));
  expect(new URL(replay.headers.get('location')!).searchParams.has('error')).toBe(true);
  expect(exchange).not.toHaveBeenCalled();
  expect((await value.client.execute('select count(*) as n from user')).rows[0]!.n).toBe(0);
});

// Only the provider boundary is stubbed. This exercises HTTP/state/DB policy,
// and deliberately does not count as proof of a real Google login.
test.each([true, false])('provider emailVerified=%s controls session issuance and business access', async (verified) => {
  const value = await fixture();
  const provider = (await value.auth.$context).socialProviders.find((item) => item.id === 'google')!;
  vi.spyOn(provider, 'validateAuthorizationCode').mockResolvedValue({ accessToken: 'synthetic-access' });
  vi.spyOn(provider, 'getUserInfo').mockResolvedValue({ user: {
    name: 'Provider boundary test', email: 'google@example.invalid', emailVerified: verified,
  }, data: { sub: 'synthetic-subject' } });
  for (const target of [`${web}/`, native]) {
    const { url, cookie } = await begin(value, target);
    const response = await value.auth.handler(callback(url.searchParams.get('state')!, cookie));
    expect(response.status).toBe(302);
    if (verified) {
      const session = await requireVerifiedSession(value.auth, sessionHeaders(response));
      expect(session.user.emailVerified).toBe(true);
      const replay = await value.auth.handler(callback(url.searchParams.get('state')!, cookie));
      expect(new URL(replay.headers.get('location')!).searchParams.has('error')).toBe(true);
      expect(replay.headers.getSetCookie().some((item) => item.startsWith('better-auth.session_token='))).toBe(false);
    } else {
      expect(new URL(response.headers.get('location')!).searchParams.get('error')).toBe('email_not_verified');
      await expect(requireVerifiedSession(value.auth, sessionHeaders(response))).rejects.toMatchObject({ status: 'UNAUTHORIZED' });
    }
  }
  expect((await value.client.execute('select count(*) as n from profiles')).rows[0]!.n).toBe(1);
  expect((await value.client.execute('select count(*) as n from account')).rows[0]!.n).toBe(1);
  if (!verified) expect((await value.client.execute('select count(*) as n from session')).rows[0]!.n).toBe(0);
});
