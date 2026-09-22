import { afterEach, expect, test } from 'vitest';
import { requireVerifiedSession } from '../../src/auth/authorization.js';
import { authFixture, credentials, sessionHeaders } from './helpers.js';

const opened: Awaited<ReturnType<typeof authFixture>>[] = [];
async function fixture() {
  const value = await authFixture();
  opened.push(value);
  return value;
}
afterEach(async () => { for (const value of opened.splice(0)) await value.close(); });

test('registration creates credential and stable profile, captures email and blocks business access', async () => {
  const { auth, client, post, verificationEmails } = await fixture();
  const response = await post('/sign-up/email', credentials);
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.user).toMatchObject({ email: credentials.email, emailVerified: false });
  const account = (await client.execute('select * from account')).rows[0];
  expect(account).toMatchObject({ user_id: body.user.id, provider_id: 'credential' });
  expect(account?.password).toEqual(expect.any(String));
  expect(account?.password).not.toBe(credentials.password);
  expect((await client.execute('select * from profiles')).rows).toMatchObject([
    { user_id: body.user.id, timezone: 'UTC', new_lines_per_day: 6, moves_per_block: 4 },
  ]);
  expect((await client.execute('select revision from account_revisions')).rows).toEqual([{ revision: '1' }]);
  expect(verificationEmails).toHaveLength(1);
  expect(verificationEmails[0]?.user.email).toBe(credentials.email);
  expect(new URL(verificationEmails[0]!.url).pathname).toBe('/api/auth/verify-email');
  const headers = sessionHeaders(response);
  expect((await auth.api.getSession({ headers }))?.user.id).toBe(body.user.id);
  await expect(requireVerifiedSession(auth, headers)).rejects.toMatchObject({
    statusCode: 403, body: { code: 'EMAIL_UNVERIFIED' },
  });
});

test('valid login keeps one profile; incorrect password and duplicate registration cannot create identities', async () => {
  const { auth, client, post, verificationEmails } = await fixture();
  expect((await post('/sign-up/email', credentials)).status).toBe(200);
  const login = await post('/sign-in/email', credentials);
  expect(login.status).toBe(200);
  expect((await auth.api.getSession({ headers: sessionHeaders(login) }))?.user.emailVerified).toBe(false);
  await expect(requireVerifiedSession(auth, sessionHeaders(login))).rejects.toMatchObject({ statusCode: 403 });
  const wrong = await post('/sign-in/email', { ...credentials, password: 'incorrect-password' });
  expect(wrong.status).toBe(401);
  expect(wrong.headers.get('set-cookie')).toBeNull();
  expect((await post('/sign-up/email', credentials)).status).toBe(422);
  for (const table of ['user', 'account', 'profiles', 'settings_revisions', 'account_revisions']) {
    expect((await client.execute(`select count(*) as total from ${table}`)).rows[0]?.total).toBe(1);
  }
  expect(verificationEmails).toHaveLength(1);
});

test('business access requires an actual Auth session', async () => {
  const { auth } = await fixture();
  for (const headers of [new Headers(), new Headers({ cookie: 'better-auth.session_token=forged', 'x-email-verified': 'true' })]) {
    await expect(requireVerifiedSession(auth, headers)).rejects.toMatchObject({
      statusCode: 401, body: { code: 'AUTH_REQUIRED' },
    });
  }
});
