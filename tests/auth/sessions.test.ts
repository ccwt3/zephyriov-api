import { afterEach, expect, test, vi } from 'vitest';
import { requireVerifiedSession } from '../../src/auth/authorization.js';
import { authFixture, baseURL, credentials, sessionHeaders } from './helpers.js';

const opened: Awaited<ReturnType<typeof authFixture>>[] = [];
async function fixture() {
  const invalidated: Array<{ userId: string; sessionId: string }> = [];
  const value = await authFixture({ onSessionInvalidated: async (reference) => {
    // A consumer sees the committed deletion, not a speculative notification.
    expect((await value.client.execute({ sql: 'select id from session where id = ?', args: [reference.sessionId] })).rows).toEqual([]);
    invalidated.push(reference);
  } });
  opened.push(value);
  const first = sessionHeaders(await value.post('/sign-up/email', credentials));
  await value.auth.handler(new Request(value.verificationEmails[0]!.url));
  const second = sessionHeaders(await value.post('/sign-in/email', credentials));
  const a = (await value.auth.api.getSession({ headers: first }))!;
  const b = (await value.auth.api.getSession({ headers: second }))!;
  return { ...value, first, second, a, b, invalidated };
}
afterEach(async () => {
  vi.useRealTimers();
  for (const value of opened.splice(0)) await value.close();
});

test('logout removes only the current session, clears cookies and invalidates after commit', async () => {
  const f = await fixture();
  const response = await f.post('/sign-out', {}, f.first.get('cookie')!);
  expect(response.status).toBe(200);
  expect(response.headers.getSetCookie().some((cookie) => cookie.includes('session_token=;') && cookie.includes('Max-Age=0'))).toBe(true);
  expect(f.invalidated).toEqual([{ userId: f.a.user.id, sessionId: f.a.session.id }]);
  await expect(requireVerifiedSession(f.auth, f.first)).rejects.toMatchObject({ statusCode: 401 });
  expect((await requireVerifiedSession(f.auth, f.second)).session.id).toBe(f.b.session.id);
  expect((await f.post('/sign-out', {}, f.first.get('cookie')!)).status).toBe(200);
  expect(f.invalidated).toHaveLength(1);
  expect((await f.client.execute('select count(*) n from profiles')).rows[0]?.n).toBe(1);
});

test('revoking other sessions preserves current session and cannot revoke another account', async () => {
  const f = await fixture();
  const other = sessionHeaders(await f.post('/sign-up/email', { ...credentials, email: 'other@example.invalid' }));
  const foreign = (await f.auth.api.getSession({ headers: other }))!;
  expect((await f.post('/revoke-session', { token: foreign.session.token }, f.first.get('cookie')!)).status).toBe(200);
  expect(f.invalidated).toEqual([]);
  expect((await f.auth.api.getSession({ headers: other }))?.session.id).toBe(foreign.session.id);
  expect((await f.post('/revoke-other-sessions', {}, f.first.get('cookie')!)).status).toBe(200);
  expect(f.invalidated).toEqual([{ userId: f.a.user.id, sessionId: f.b.session.id }]);
  await expect(requireVerifiedSession(f.auth, f.second)).rejects.toMatchObject({ statusCode: 401 });
  expect((await requireVerifiedSession(f.auth, f.first)).session.id).toBe(f.a.session.id);
});

test.each(['/revoke-session', '/revoke-sessions'])('%s notifies each deleted session and rejects anonymous access', async (path) => {
  const f = await fixture();
  const body = { token: f.b.session.token };
  expect((await f.post(path, body)).status).toBe(401);
  expect((await f.post(path, body, f.first.get('cookie')!)).status).toBe(200);
  expect(f.invalidated.map((ref) => ref.sessionId).sort()).toEqual(
    (path === '/revoke-session' ? [f.b.session.id] : [f.a.session.id, f.b.session.id]).sort(),
  );
  await expect(requireVerifiedSession(f.auth, f.second)).rejects.toMatchObject({ statusCode: 401 });
});

test('password recovery invalidates all old sessions and preserves account/profile', async () => {
  const f = await fixture();
  await f.post('/request-password-reset', { email: credentials.email });
  expect((await f.post('/reset-password', { token: f.resetEmails[0]!.token, newPassword: 'replacement-password-123' })).status).toBe(200);
  expect(f.invalidated.map((ref) => ref.sessionId).sort()).toEqual([f.a.session.id, f.b.session.id].sort());
  for (const headers of [f.first, f.second]) await expect(requireVerifiedSession(f.auth, headers)).rejects.toMatchObject({ statusCode: 401 });
  expect((await f.client.execute('select count(*) n from profiles')).rows[0]?.n).toBe(1);
});

test('sessions use explicit seven-day expiry, daily renewal and no cookie cache', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-28T12:00:00Z'));
  const f = await fixture();
  expect(f.a.session.expiresAt.getTime() - f.a.session.createdAt.getTime()).toBe(604_800_000);
  expect(f.auth.options.session).toMatchObject({ expiresIn: 604800, updateAge: 86400, cookieCache: { enabled: false } });
  vi.setSystemTime(f.a.session.createdAt.getTime() + 86_400_001);
  const renewed = (await f.auth.api.getSession({ headers: f.first }))!;
  expect(renewed.session.expiresAt.getTime()).toBe(Date.now() + 604_800_000);
  vi.setSystemTime(renewed.session.expiresAt.getTime() + 1);
  expect(await f.auth.api.getSession({ headers: f.first })).toBeNull();
  expect(f.invalidated).toContainEqual({ userId: f.a.user.id, sessionId: f.a.session.id });
  const response = await f.auth.handler(new Request(`${baseURL}/api/auth/get-session`, { headers: f.first }));
  expect(await response.json()).toBeNull();
});

test('future socket consumers can revalidate ownership, expiry and missed revocation without a cookie', async () => {
  const f = await fixture();
  const reference = { userId: f.a.user.id, sessionId: f.a.session.id };
  expect(await f.auth.sessionLifecycle.check(reference, f.a.session.expiresAt.getTime() - 1)).toEqual({ expiresAt: f.a.session.expiresAt.getTime() });
  expect(await f.auth.sessionLifecycle.check(reference, f.a.session.expiresAt.getTime())).toBeNull();
  expect(await f.auth.sessionLifecycle.check({ ...reference, userId: 'foreign' })).toBeNull();
  await f.post('/sign-out', {}, f.first.get('cookie')!);
  expect(await f.auth.sessionLifecycle.check(reference)).toBeNull();
});
