import { afterEach, expect, test, vi } from 'vitest';
import { authFixture, baseURL, credentials, sessionHeaders } from './helpers.js';

const opened: Awaited<ReturnType<typeof authFixture>>[] = [];
async function fixture() {
  const value = await authFixture({ google: { clientId: 'synthetic-client', clientSecret: 'synthetic-secret' } });
  opened.push(value);
  const provider = (await value.auth.$context).socialProviders.find((item) => item.id === 'google')!;
  vi.spyOn(provider, 'validateAuthorizationCode').mockResolvedValue({ accessToken: 'synthetic-access' });
  const identity = vi.spyOn(provider, 'getUserInfo');
  const claim = (email: string, verified = true, sub = 'synthetic-google-id') => identity.mockResolvedValue({
    user: { name: 'Linking test', email, emailVerified: verified }, data: { sub },
  });
  return { ...value, claim };
}
afterEach(async () => {
  vi.restoreAllMocks();
  for (const value of opened.splice(0)) await value.close();
});
type Fixture = Awaited<ReturnType<typeof fixture>>;
async function local(value: Fixture, verified = true, email = credentials.email) {
  const response = await value.post('/sign-up/email', { ...credentials, email });
  expect(response.status).toBe(200);
  const cookie = sessionHeaders(response).get('cookie')!;
  if (verified) await value.auth.handler(new Request(value.verificationEmails.at(-1)!.url));
  const session = await value.auth.api.getSession({ headers: new Headers({ cookie }) });
  return { cookie, userId: session!.user.id, sessionId: session!.session.id };
}
async function begin(value: Fixture, cookie?: string, path = '/link-social', additionalData?: object) {
  const response = await value.post(path, { provider: 'google', callbackURL: `${baseURL}/`,
    errorCallbackURL: `${baseURL}/`, disableRedirect: true, additionalData }, cookie);
  expect(response.status).toBe(200);
  const state = new URL((await response.json()).url).searchParams.get('state')!;
  return new Request(`${baseURL}/api/auth/callback/google?${new URLSearchParams({ state, code: 'synthetic-code' })}`, {
    headers: sessionHeaders(response),
  });
}
function error(response: Response) {
  expect(response.status).toBe(302);
  return new URL(response.headers.get('location')!).searchParams.get('error');
}
async function googleCount(value: Fixture) {
  return (await value.client.execute("select count(*) as n from account where provider_id = 'google'")).rows[0]!.n;
}

test('linking requires an authenticated, verified session created less than five minutes ago', async () => {
  const value = await fixture();
  const body = { provider: 'google', callbackURL: `${baseURL}/` };
  expect((await value.post('/link-social', body)).status).toBe(401);
  const pending = await local(value, false);
  expect((await value.post('/link-social', body, pending.cookie)).status).toBe(403);
  await value.auth.handler(new Request(value.verificationEmails[0]!.url));
  await value.client.execute({ sql: 'update session set created_at = ? where id = ?', args: [Date.now() - 300_000, pending.sessionId] });
  expect((await value.post('/link-social', body, pending.cookie)).status).toBe(401);
  expect(await googleCount(value)).toBe(0);
});

test.each([[false, false], [false, true], [true, false], [true, true]])(
  'sign-in never implicitly merges local verified=%s / Google verified=%s', async (localVerified, googleVerified) => {
    const value = await fixture();
    const account = await local(value, localVerified);
    value.claim(credentials.email, googleVerified);
    expect(error(await value.auth.handler(await begin(value, undefined, '/sign-in/social')))).toBe('account_not_linked');
    expect(await googleCount(value)).toBe(0);
    expect((await value.client.execute('select count(*) as n from profiles')).rows[0]!.n).toBe(1);
    const user = await value.auth.api.getSession({ headers: new Headers({ cookie: account.cookie }) });
    expect(user!.user.emailVerified).toBe(localVerified);
  },
);

test('explicit linking preserves the profile, is idempotent and enables later Google login', async () => {
  const value = await fixture();
  const account = await local(value);
  value.claim(credentials.email);
  for (let i = 0; i < 2; i++) {
    const request = await begin(value, account.cookie, '/link-social', {
      link: { userId: 'foreign-user', email: 'foreign@example.invalid' },
      serverContext: { linkSessionId: 'foreign-session' },
    });
    expect(error(await value.auth.handler(request.clone()))).toBeNull();
    expect(error(await value.auth.handler(request))).toBeTruthy();
  }
  expect(await googleCount(value)).toBe(1);
  expect((await value.client.execute('select count(*) as n from profiles')).rows[0]!.n).toBe(1);
  expect((await value.client.execute('select count(*) as n from account')).rows[0]!.n).toBe(2);
  const login = await value.auth.handler(await begin(value, undefined, '/sign-in/social'));
  expect(error(login)).toBeNull();
  const session = await value.auth.api.getSession({ headers: sessionHeaders(login) });
  expect(session!.user.id).toBe(account.userId);
});

test.each(['unverified-provider', 'different-email'])('explicit linking rejects %s without writes', async (reason) => {
  const value = await fixture();
  const account = await local(value);
  value.claim(reason === 'different-email' ? 'other@example.invalid' : credentials.email, reason !== 'unverified-provider');
  expect(error(await value.auth.handler(await begin(value, account.cookie)))).toBeTruthy();
  expect(await googleCount(value)).toBe(0);
});

test.each(['revoked', 'stale', 'unverified'])('callback rechecks the initiating session when it becomes %s', async (change) => {
  const value = await fixture();
  const account = await local(value);
  value.claim(credentials.email);
  const request = await begin(value, account.cookie);
  if (change === 'revoked') await value.client.execute({ sql: 'delete from session where id = ?', args: [account.sessionId] });
  else if (change === 'stale') await value.client.execute({ sql: 'update session set created_at = ? where id = ?', args: [Date.now() - 300_000, account.sessionId] });
  else await value.client.execute({ sql: 'update user set email_verified = 0 where id = ?', args: [account.userId] });
  expect(error(await value.auth.handler(request))).toBe('LINK_REAUTHENTICATION_REQUIRED');
  expect(await googleCount(value)).toBe(0);
});

test('a Google subject owned by another account cannot be transferred by linking', async () => {
  const value = await fixture();
  const first = await local(value);
  value.claim(credentials.email);
  expect(error(await value.auth.handler(await begin(value, first.cookie)))).toBeNull();
  const second = await local(value, true, 'second@example.invalid');
  value.claim('second@example.invalid');
  expect(error(await value.auth.handler(await begin(value, second.cookie)))).toBe('account_already_linked_to_different_user');
  expect((await value.client.execute("select user_id from account where provider_id = 'google'")).rows[0]!.user_id).toBe(first.userId);
  expect((await value.client.execute('select count(*) as n from profiles')).rows[0]!.n).toBe(2);
});

test('linking does not expand scopes or allow direct client ID tokens', async () => {
  const value = await fixture();
  const account = await local(value);
  for (const extra of [{ scopes: ['drive'] }, { additionalParams: { access_type: 'offline' } }, { idToken: { token: 'synthetic' } }]) {
    expect((await value.post('/link-social', { provider: 'google', callbackURL: `${baseURL}/`, ...extra }, account.cookie)).status).toBe(403);
  }
  expect(await googleCount(value)).toBe(0);
});

test('two concurrent links of the same Google subject cannot create duplicate accounts', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const value = await fixture();
  const account = await local(value);
  value.claim(credentials.email);
  const requests = [await begin(value, account.cookie), await begin(value, account.cookie)];
  const adapter = (await value.auth.$context).internalAdapter;
  const lookup = adapter.findAccountByKey.bind(adapter);
  let readers = 0;
  let release!: () => void;
  const bothRead = new Promise<void>((resolve) => { release = resolve; });
  // Force the normal read-before-create interleaving, using real DB reads/writes.
  vi.spyOn(adapter, 'findAccountByKey').mockImplementation(async (key) => {
    const found = await lookup(key);
    if (!found) {
      if (++readers === 2) release();
      await bothRead;
    }
    return found;
  });
  const responses = await Promise.all(requests.map((request) => value.auth.handler(request)));
  expect(await googleCount(value)).toBe(1);
  expect(responses.filter((response) => response.status === 302)).toHaveLength(1);
  expect(responses.filter((response) => response.status === 409)).toHaveLength(1);
  for (const response of responses) expect(await response.text()).not.toContain('synthetic-access');
  expect(errors).not.toHaveBeenCalled();
  // A new flow can observe the winner and finish idempotently; no duplicate blocks login.
  expect(error(await value.auth.handler(await begin(value, account.cookie)))).toBeNull();
  const login = await value.auth.handler(await begin(value, undefined, '/sign-in/social'));
  expect(error(login)).toBeNull();
  expect((await value.auth.api.getSession({ headers: sessionHeaders(login) }))!.user.id).toBe(account.userId);
  expect(await googleCount(value)).toBe(1);
});

test('an unexpected account write failure cannot expose database parameters in HTTP or logs', async () => {
  const value = await fixture();
  const account = await local(value);
  value.claim(credentials.email);
  const adapter = (await value.auth.$context).internalAdapter;
  vi.spyOn(adapter, 'createAccount').mockRejectedValue(new Error('DB failure with synthetic-access'));
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const response = await value.auth.handler(await begin(value, account.cookie));
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ code: 'AUTH_INTERNAL_ERROR', message: 'Authentication failed' });
  expect(errors).not.toHaveBeenCalled();
  expect(await googleCount(value)).toBe(0);
});
