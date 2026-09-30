import { afterEach, expect, test } from 'vitest';
import { requireVerifiedSession } from '../../src/auth/authorization.js';
import { authFixture, baseURL, credentials, sessionHeaders } from './helpers.js';

const opened: Awaited<ReturnType<typeof authFixture>>[] = [];
afterEach(async () => {
  for (const value of opened.splice(0)) await value.close();
});

/** Two independent accounts A/B; B stays unverified unless a test verifies it. */
async function twoAccounts() {
  const f = await authFixture();
  opened.push(f);
  const a = sessionHeaders(await f.post('/sign-up/email', credentials));
  await f.auth.handler(new Request(f.verificationEmails[0]!.url));
  const bCredentials = { name: 'Other', email: 'other@example.invalid', password: 'other-test-password-456' };
  const b = sessionHeaders(await f.post('/sign-up/email', bCredentials));
  const sessionA = (await f.auth.api.getSession({ headers: a }))!;
  const sessionB = (await f.auth.api.getSession({ headers: b }))!;
  const get = (path: string, headers: Headers) => f.auth.handler(new Request(`${baseURL}/api/auth${path}`, { headers }));
  return { ...f, a, b, sessionA, sessionB, bCredentials, get };
}

test('session and account listings expose only the caller identity', async () => {
  const f = await twoAccounts();
  const sessions = await (await f.get('/list-sessions', f.a)).json() as Array<{ userId: string; token?: string }>;
  expect(sessions.map((s) => s.userId)).toEqual([f.sessionA.user.id]);
  expect(JSON.stringify(sessions)).not.toContain(f.sessionB.session.token);
  const accounts = await (await f.get('/list-accounts', f.a)).json() as Array<{ userId: string }>;
  expect(accounts.map((account) => account.userId)).toEqual([f.sessionA.user.id]);
  expect((await f.get('/list-sessions', new Headers())).status).toBe(401);
});

test('profile and password mutations with A cookie cannot target B, even when B identifiers are supplied', async () => {
  const f = await twoAccounts();
  const cookie = f.a.get('cookie')!;
  const update = await f.post('/update-user', { name: 'Renamed', id: f.sessionB.user.id, userId: f.sessionB.user.id }, cookie);
  expect(update.status).toBe(200);
  expect((await f.post('/update-user', { emailVerified: true, email: f.bCredentials.email }, f.b.get('cookie')!)).status).toBe(400);
  const users = (await f.client.execute('select id, name, email_verified from user order by name')).rows;
  expect(users).toEqual([
    expect.objectContaining({ id: f.sessionB.user.id, name: 'Other', email_verified: 0 }),
    expect.objectContaining({ id: f.sessionA.user.id, name: 'Renamed', email_verified: 1 }),
  ]);
  const changed = await f.post('/change-password', { currentPassword: f.bCredentials.password, newPassword: 'attempted-password-789' }, cookie);
  expect(changed.status).toBe(400);
  expect((await f.post('/sign-in/email', { email: f.bCredentials.email, password: f.bCredentials.password })).status).toBe(200);
  const bAccount = (await f.client.execute({ sql: 'select id from account where user_id = ?', args: [f.sessionB.user.id] })).rows[0]!;
  await f.post('/unlink-account', { providerId: 'credential', accountId: String(bAccount.id) }, cookie);
  expect((await f.client.execute({ sql: 'select count(*) n from account where user_id = ?', args: [f.sessionB.user.id] })).rows[0]?.n).toBe(1);
  expect((await f.client.execute('select count(*) n from profiles')).rows[0]?.n).toBe(2);
});

test('B verification link opened with A cookie verifies only B and never switches or unlocks A session', async () => {
  const f = await twoAccounts();
  const response = await f.auth.handler(new Request(f.verificationEmails[1]!.url, { headers: f.a }));
  expect(response.headers.getSetCookie().some((cookie) => cookie.startsWith('better-auth.session_token='))).toBe(false);
  expect((await requireVerifiedSession(f.auth, f.a)).user.id).toBe(f.sessionA.user.id);
  expect((await requireVerifiedSession(f.auth, f.b)).user.id).toBe(f.sessionB.user.id);
});

test('an unverified account stays locked while the other one is verified, and socket checks reject foreign references', async () => {
  const f = await twoAccounts();
  await expect(requireVerifiedSession(f.auth, f.b)).rejects.toMatchObject({ statusCode: 403 });
  expect((await requireVerifiedSession(f.auth, f.a)).user.id).toBe(f.sessionA.user.id);
  const lifecycle = f.auth.sessionLifecycle;
  expect(await lifecycle.check({ userId: f.sessionA.user.id, sessionId: f.sessionB.session.id })).toBeNull();
  expect(await lifecycle.check({ userId: f.sessionB.user.id, sessionId: f.sessionA.session.id })).toBeNull();
  expect(await lifecycle.check({ userId: f.sessionA.user.id, sessionId: f.sessionA.session.id })).not.toBeNull();
});
