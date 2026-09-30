import { createClient } from '@libsql/client';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { afterEach, expect, test, vi } from 'vitest';
import { createUsageLimits } from '../../src/auth/usage-limits.js';
import { requireLimitedSession } from '../../src/auth/authorization.js';
import { authFixture, baseURL, credentials, sessionHeaders } from './helpers.js';

const opened: Awaited<ReturnType<typeof authFixture>>[] = [];
async function fixture(options: Parameters<typeof authFixture>[0] = {}) {
  const value = await authFixture(options);
  opened.push(value);
  return value;
}
afterEach(async () => {
  vi.useRealTimers();
  for (const value of opened.splice(0)) await value.close();
});

test('business budgets count events in batches, keep reads separate, and isolate accounts', async () => {
  const f = await fixture();
  await f.client.execute("insert into user (id, name, email) values ('u1', 'One', 'one@example.invalid'), ('u2', 'Two', 'two@example.invalid')");
  const limits = f.auth.usageLimits;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-28T12:00:00Z'));
  for (let i = 0; i < 60; i++) await limits.consumeBusiness('u1', 'read');
  await expect(limits.consumeBusiness('u1', 'read')).rejects.toMatchObject({ statusCode: 429 });
  await limits.consumeBusiness('u1', 'events', 20);
  await expect(limits.consumeBusiness('u1', 'events', 11)).rejects.toMatchObject({ statusCode: 429 });
  await limits.consumeBusiness('u1', 'events', 10);
  await expect(limits.consumeBusiness('u1', 'events')).rejects.toMatchObject({ statusCode: 429 });
  await limits.consumeBusiness('u2', 'events', 20);
  for (const count of [0, -1, 1.5, 21, NaN]) await expect(limits.consumeBusiness('u2', 'events', count)).rejects.toThrow();
  vi.setSystemTime(new Date('2026-09-28T12:01:00Z'));
  await limits.consumeBusiness('u1', 'events', 20);
  expect((await f.client.execute('select count(*) n from study_events')).rows[0]?.n).toBe(0);
});

test('business entry point authenticates and verifies before consuming any quota', async () => {
  const f = await fixture();
  await expect(requireLimitedSession(f.auth, new Headers(), 'read')).rejects.toMatchObject({ statusCode: 401 });
  const headers = sessionHeaders(await f.post('/sign-up/email', credentials));
  await expect(requireLimitedSession(f.auth, headers, 'read')).rejects.toMatchObject({ statusCode: 403 });
  expect((await f.client.execute("select * from rate_limit_buckets where scope in ('read', 'study')")).rows).toEqual([]);
  await f.auth.handler(new Request(f.verificationEmails[0]!.url));
  expect((await requireLimitedSession(f.auth, headers, 'events', 2)).user.emailVerified).toBe(true);
  expect((await f.client.execute("select used from rate_limit_buckets where scope = 'study'")).rows[0]?.used).toBe(2);
});

test('last slot is atomic across independent writers and persists after reopening the database', async () => {
  const f = await fixture();
  await f.client.execute("insert into user (id, name, email) values ('u1', 'One', 'one@example.invalid')");
  const config = { businessRead: { limit: 2, windowMs: 60_000 } };
  const first = createUsageLimits(f.client, 'test-secret', config);
  const secondClient = createClient({ url: f.databaseURL });
  const second = createUsageLimits(secondClient, 'test-secret', config);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-28T12:00:01Z'));
  try {
    await first.consumeBusiness('u1', 'read');
    const result = await Promise.allSettled([first.consumeBusiness('u1', 'read'), second.consumeBusiness('u1', 'read')]);
    expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(result.find((r) => r.status === 'rejected')).toMatchObject({ reason: { statusCode: 429 } });
  } finally { secondClient.close(); }
  const reopened = createClient({ url: f.databaseURL });
  try {
    await expect(createUsageLimits(reopened, 'test-secret', config).consumeBusiness('u1', 'read')).rejects.toMatchObject({ statusCode: 429 });
  } finally { reopened.close(); }
});

test('business and mail consumption survives an actual process restart', async () => {
  const f = await fixture();
  await f.client.execute("insert into user (id, name, email) values ('restart-user', 'Restart', 'restart@example.invalid')");
  const exec = promisify(execFile);
  for (const phase of ['first', 'restarted']) {
    await exec(process.execPath, ['--experimental-strip-types', 'tests/auth/usage-limits-worker.mjs', f.databaseURL, phase]);
  }
  const rows = (await f.client.execute('select scope, used from rate_limit_buckets')).rows;
  expect(rows.find((row) => row.scope === 'read')?.used).toBe(2);
  expect(rows.find((row) => row.scope === 'email:global')?.used).toBe(1);
  expect(rows.find((row) => row.scope === 'email:sent:verification')?.used).toBe(1);
  expect(rows.some((row) => row.scope === 'email:sent:reset')).toBe(false);
});

test('Auth limits wrong passwords by normalized identity, expose Retry-After through CORS and ignore spoofed IP', async () => {
  const f = await fixture({ limits: { loginIdentity: { limit: 2, windowMs: 60_000 } } });
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-28T12:00:01Z'));
  for (let i = 0; i < 3; i++) {
    const response = await f.auth.handler(new Request(`${baseURL}/api/auth/sign-in/email`, {
      method: 'POST', headers: { origin: baseURL, 'content-type': 'application/json', 'x-forwarded-for': `192.0.2.${i}` },
      body: JSON.stringify({ ...credentials, email: i === 1 ? credentials.email.toUpperCase() : credentials.email }),
    }));
    expect(response.status).toBe(i < 2 ? 401 : 429);
    if (i === 2) {
      expect(response.headers.get('retry-after')).toBe('59');
      expect(response.headers.get('access-control-expose-headers')).toContain('Retry-After');
      expect(response.headers.get('access-control-allow-origin')).toBe(baseURL);
      expect((await response.json()).code).toBe('RATE_LIMITED');
    }
  }
  const rows = (await f.client.execute('select * from rate_limit_buckets')).rows;
  expect(JSON.stringify(rows)).not.toContain(credentials.email);
  expect(JSON.stringify(rows)).not.toContain('192.0.2.');
  expect(rows.find((r) => r.scope === 'auth:login')?.used).toBe(2);
});

test('OAuth callback variants share a finite budget and invalid origins consume nothing', async () => {
  const f = await fixture({ limits: { oauth: { limit: 1, windowMs: 60_000 } } });
  const denied = await f.auth.handler(new Request(`${baseURL}/api/auth/sign-in/social`, {
    method: 'POST', headers: { origin: 'https://evil.invalid', 'content-type': 'application/json' }, body: JSON.stringify({ provider: 'google' }),
  }));
  expect(denied.status).toBe(403);
  expect((await f.client.execute('select * from rate_limit_buckets')).rows).toEqual([]);
  await f.auth.handler(new Request(`${baseURL}/api/auth/callback/google?state=one`));
  const exhausted = await f.auth.handler(new Request(`${baseURL}/api/auth/callback/google?state=two`));
  expect(exhausted.status).toBe(429);
  expect(JSON.stringify((await f.client.execute('select * from rate_limit_buckets')).rows)).not.toContain('state');
});

test('global email exhaustion rejects known and unknown identities equally and leaves verification locked', async () => {
  const f = await fixture({ limits: { emailGlobal: { limit: 1, windowMs: 86_400_000 } } });
  const headers = sessionHeaders(await f.post('/sign-up/email', credentials));
  expect(f.verificationEmails).toHaveLength(1);
  for (const email of [credentials.email, 'unknown@example.invalid']) {
    const response = await f.post('/request-password-reset', { email });
    expect(response.status).toBe(429);
    expect(Number(response.headers.get('retry-after'))).toBeGreaterThan(0);
  }
  expect(f.resetEmails).toHaveLength(0);
  await expect(requireLimitedSession(f.auth, headers, 'read')).rejects.toMatchObject({ statusCode: 403 });
  expect((await f.client.execute("select used from rate_limit_buckets where scope = 'email:global'")).rows[0]?.used).toBe(1);
  expect((await f.client.execute("select * from rate_limit_buckets where scope = 'auth:mail'")).rows).toEqual([]);
});

test('delivery failures retain global consumption, record a durable failure and return a safe error', async () => {
  const f = await fixture({ sendVerificationEmail: async () => { throw new Error('provider-secret-and-token'); } });
  const response = await f.post('/sign-up/email', credentials);
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('provider-secret-and-token');
  expect((await f.client.execute("select used from rate_limit_buckets where scope = 'email:global'")).rows[0]?.used).toBe(1);
  expect((await f.client.execute("select used from rate_limit_buckets where scope = 'email:failed:verification'")).rows[0]?.used).toBe(1);
  expect((await f.client.execute('select email_verified from user')).rows[0]?.email_verified).toBe(0);
});

test('mail budget is consumed before delivery, is shared across identities and has only one final-slot winner', async () => {
  const f = await fixture();
  const otherClient = createClient({ url: f.databaseURL });
  const config = { emailGlobal: { limit: 1, windowMs: 86_400_000 } };
  const first = createUsageLimits(f.client, 'test-secret', config);
  const second = createUsageLimits(otherClient, 'test-secret', config);
  const sent: string[] = [];
  const deliver = async (message: { user: { email: string } }) => {
    expect((await f.client.execute("select used from rate_limit_buckets where scope = 'email:global'")).rows[0]?.used).toBe(1);
    sent.push(message.user.email);
  };
  const message = { user: { id: 'u1', name: 'One', email: 'one@example.invalid' }, url: 'https://api.invalid/verify', token: 'sensitive' };
  try {
    const result = await Promise.allSettled([
      first.sendEmail('verification', message, deliver),
      second.sendEmail('reset', { ...message, user: { ...message.user, email: 'two@example.invalid' } }, deliver),
    ]);
    expect(sent).toHaveLength(1);
    expect(result.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(result.find((r) => r.status === 'rejected')).toMatchObject({ reason: { statusCode: 429 } });
    const counters = (await f.client.execute('select scope, used from rate_limit_buckets')).rows;
    expect(counters.filter((r) => String(r.scope).startsWith('email:sent:'))).toHaveLength(1);
    expect(counters.filter((r) => r.scope === 'email:identity')).toHaveLength(1);
  } finally { otherClient.close(); }
});

test('a database outage fails closed before Auth hashing or delivery', async () => {
  const f = await fixture();
  const spy = vi.spyOn(f.client, 'transaction').mockRejectedValueOnce(new Error('database-secret'));
  try {
    const response = await f.post('/sign-up/email', credentials);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('database-secret');
    expect(f.verificationEmails).toHaveLength(0);
    expect((await f.client.execute('select * from user')).rows).toEqual([]);
  } finally { spy.mockRestore(); }
});

test('email transport runs only after account commit and is not called on Auth rollback', async () => {
  const f = await fixture();
  const adapter = (await f.auth.$context).internalAdapter;
  const spy = vi.spyOn(adapter, 'createSession').mockRejectedValueOnce(new Error('injected rollback'));
  try {
    const response = await f.post('/sign-up/email', credentials);
    expect(response.status).toBe(500);
    expect(f.verificationEmails).toHaveLength(0);
    expect((await f.client.execute('select * from user')).rows).toEqual([]);
    expect((await f.client.execute("select used from rate_limit_buckets where scope = 'email:global'")).rows[0]?.used).toBe(1);
  } finally { spy.mockRestore(); }
});

test('direct Auth mutations cannot bypass durable HTTP admission', async () => {
  const f = await fixture();
  await expect(f.auth.api.signUpEmail({ body: credentials })).rejects.toMatchObject({
    statusCode: 400, body: { code: 'AUTH_HANDLER_REQUIRED' },
  });
  expect(f.verificationEmails).toHaveLength(0);
  expect((await f.client.execute('select * from user')).rows).toEqual([]);
});
