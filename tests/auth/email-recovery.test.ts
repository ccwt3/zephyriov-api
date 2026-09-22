import { afterEach, expect, test, vi } from 'vitest';
import { requireVerifiedSession } from '../../src/auth/authorization.js';
import { authFixture, baseURL, credentials, sessionHeaders } from './helpers.js';

const opened: Awaited<ReturnType<typeof authFixture>>[] = [];
async function fixture() {
  const value = await authFixture();
  opened.push(value);
  return value;
}
afterEach(async () => {
  vi.useRealTimers();
  for (const value of opened.splice(0)) await value.close();
});

test('resend and verification unlock the same session; reused link creates no session or profile', async () => {
  const { auth, client, post, verificationEmails } = await fixture();
  const headers = sessionHeaders(await post('/sign-up/email', credentials));
  const userId = (await auth.api.getSession({ headers }))!.user.id;
  expect((await post('/send-verification-email', { email: credentials.email }, headers.get('cookie')!)).status).toBe(200);
  expect(verificationEmails).toHaveLength(2);
  const link = verificationEmails[1]!.url;
  const verified = await auth.handler(new Request(link));
  expect(verified.status).toBe(302);
  expect(verified.headers.get('set-cookie')).toBeNull();
  expect((await requireVerifiedSession(auth, headers)).user).toMatchObject({ id: userId, emailVerified: true });
  const snapshot = (await client.execute('select id, email_verified, updated_at from user')).rows;
  const repeated = await auth.handler(new Request(link));
  expect(repeated.status).toBe(302);
  expect(repeated.headers.get('set-cookie')).toBeNull();
  expect((await client.execute('select id, email_verified, updated_at from user')).rows).toEqual(snapshot);
  expect((await client.execute('select count(*) as total from session')).rows[0]?.total).toBe(1);
  expect((await client.execute('select count(*) as total from profiles')).rows[0]?.total).toBe(1);
  const resendVerified = await post('/send-verification-email', { email: credentials.email }, headers.get('cookie')!);
  expect(resendVerified.status).toBe(400);
  expect((await resendVerified.json()).code).toBe('EMAIL_ALREADY_VERIFIED');
  expect(verificationEmails).toHaveLength(2);
});

test('altered and expired verification tokens cannot unlock business; a fresh resend can', async () => {
  const { auth, post, verificationEmails } = await fixture();
  const headers = sessionHeaders(await post('/sign-up/email', credentials));
  const token = verificationEmails[0]!.token;
  const verify = (value: string) => auth.handler(new Request(`${baseURL}/api/auth/verify-email?token=${encodeURIComponent(value)}`));
  const altered = await verify(`${token}broken`);
  expect(altered.status).toBe(401);
  expect((await altered.json()).code).toBe('INVALID_TOKEN');
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(Date.now() + 3_601_000);
  const expired = await verify(token);
  expect(expired.status).toBe(401);
  expect((await expired.json()).code).toBe('TOKEN_EXPIRED');
  await expect(requireVerifiedSession(auth, headers)).rejects.toMatchObject({ statusCode: 403 });
  expect((await post('/send-verification-email', { email: credentials.email }, headers.get('cookie')!)).status).toBe(200);
  expect((await verify(verificationEmails[1]!.token)).status).toBe(200);
  expect((await requireVerifiedSession(auth, headers)).user.emailVerified).toBe(true);
});

test('anonymous resend and recovery for unknown email disclose no account and send no mail', async () => {
  const { post, resetEmails, verificationEmails } = await fixture();
  expect((await post('/sign-up/email', credentials)).status).toBe(200);
  const unknown = { email: 'missing@example.invalid' };
  const resendKnown = await post('/send-verification-email', { email: credentials.email });
  const resendUnknown = await post('/send-verification-email', unknown);
  expect(resendKnown.status).toBe(200);
  expect(resendUnknown.status).toBe(200);
  expect(await resendUnknown.json()).toEqual(await resendKnown.json());
  expect(verificationEmails).toHaveLength(2);
  const resetKnown = await post('/request-password-reset', { email: credentials.email });
  const resetUnknown = await post('/request-password-reset', unknown);
  expect(resetKnown.status).toBe(200);
  expect(resetUnknown.status).toBe(200);
  expect(await resetUnknown.json()).toEqual(await resetKnown.json());
  expect(resetEmails).toHaveLength(1);
});

test('password reset consumes its token, revokes sessions and never verifies an unverified account', async () => {
  const { auth, client, post, resetEmails } = await fixture();
  const headers = sessionHeaders(await post('/sign-up/email', credentials));
  const secondHeaders = sessionHeaders(await post('/sign-in/email', credentials));
  const userId = (await auth.api.getSession({ headers }))!.user.id;
  const requested = await post('/request-password-reset', { email: credentials.email, redirectTo: `${baseURL}/reset` });
  expect(requested.status).toBe(200);
  expect(resetEmails).toHaveLength(1);
  expect(resetEmails[0]?.user.id).toBe(userId);
  const { token, url } = resetEmails[0]!;
  const callback = await auth.handler(new Request(url));
  expect(callback.status).toBe(302);
  expect(new URL(callback.headers.get('location')!).pathname).toBe('/reset');
  expect(new URL(callback.headers.get('location')!).searchParams.get('token') === token).toBe(true);
  const newPassword = 'replacement-password-456';
  expect((await post('/reset-password', { token, newPassword })).status).toBe(200);
  expect((await client.execute('select count(*) as total from verification')).rows[0]?.total).toBe(0);
  for (const session of [headers, secondHeaders]) {
    await expect(requireVerifiedSession(auth, session)).rejects.toMatchObject({ statusCode: 401 });
  }
  const reused = await post('/reset-password', { token, newPassword: 'another-password-789' });
  expect(reused.status).toBe(400);
  expect((await reused.json()).code).toBe('INVALID_TOKEN');
  expect((await post('/sign-in/email', credentials)).status).toBe(401);
  const login = await post('/sign-in/email', { ...credentials, password: newPassword });
  expect(login.status).toBe(200);
  await expect(requireVerifiedSession(auth, sessionHeaders(login))).rejects.toMatchObject({ statusCode: 403 });
  expect((await client.execute('select count(*) as total from profiles')).rows[0]?.total).toBe(1);
});

test('invalid and expired recovery tokens preserve the current password and verification state', async () => {
  const { auth, post, resetEmails, verificationEmails } = await fixture();
  expect((await post('/sign-up/email', credentials)).status).toBe(200);
  expect((await auth.handler(new Request(verificationEmails[0]!.url))).status).toBe(302);
  expect((await post('/request-password-reset', { email: credentials.email, redirectTo: `${baseURL}/reset` })).status).toBe(200);
  const { token, url } = resetEmails[0]!;
  const newPassword = 'replacement-password-456';
  const invalid = await post('/reset-password', { token: 'unknown-token', newPassword });
  expect(invalid.status).toBe(400);
  expect((await invalid.json()).code).toBe('INVALID_TOKEN');
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(Date.now() + 3_601_000);
  const callback = await auth.handler(new Request(url));
  expect(callback.status).toBe(302);
  expect(new URL(callback.headers.get('location')!).searchParams.get('error')).toBe('INVALID_TOKEN');
  const expired = await post('/reset-password', { token, newPassword });
  expect(expired.status).toBe(400);
  expect((await expired.json()).code).toBe('INVALID_TOKEN');
  const login = await post('/sign-in/email', credentials);
  expect(login.status).toBe(200);
  expect((await requireVerifiedSession(auth, sessionHeaders(login))).user.emailVerified).toBe(true);
  expect((await post('/sign-in/email', { ...credentials, password: newPassword })).status).toBe(401);
});
