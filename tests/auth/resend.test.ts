import { afterEach, expect, test, vi } from 'vitest';
import { createResendTransport, resendConfigFromEnv, ResendDeliveryError } from '../../src/auth/resend.js';
import { DEFAULT_USAGE_LIMITS } from '../../src/auth/usage-limits.js';
import { authFixture, baseURL, credentials } from './helpers.js';

const from = 'Zephyriov <no-reply@mail.zephyriov.reicot.dev>';
const apiKey = 're_test_key_value';
const linkOrigin = 'https://api.example.invalid';
const message = {
  user: { id: 'u1', name: '<b>Evil</b>', email: 'a@example.invalid' },
  url: `${linkOrigin}/api/auth/reset-password/token-value?callbackURL=${encodeURIComponent('https://web.example.invalid/?a=1&b=2')}`,
  token: 'token-value',
};

type Call = { url: string; init: RequestInit };
function fakeFetch(response: () => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return response();
  });
  return { calls, fetch: fetch as unknown as typeof globalThis.fetch };
}
const accepted = () => Response.json({ id: '49a3999c-0ce1-4ea6-ab68-afcd6dc2e794' });

const opened: Awaited<ReturnType<typeof authFixture>>[] = [];
afterEach(async () => {
  vi.useRealTimers();
  for (const value of opened.splice(0)) await value.close();
});

test('sends one HTTPS request per message with bearer key, fixed sender, single recipient and both bodies', async () => {
  const { calls, fetch } = fakeFetch(accepted);
  const transport = createResendTransport({ apiKey, from, linkOrigin, fetch });
  await transport.sendResetPassword(message);
  await transport.sendVerificationEmail({ ...message, url: `${linkOrigin}/api/auth/verify-email?token=t` });
  expect(calls).toHaveLength(2);
  const [reset] = calls;
  expect(reset!.url).toBe('https://api.resend.com/emails');
  expect(reset!.init.method).toBe('POST');
  const headers = new Headers(reset!.init.headers);
  expect(headers.get('authorization')).toBe(`Bearer ${apiKey}`);
  expect(headers.get('content-type')).toBe('application/json');
  expect(headers.get('user-agent')).toMatch(/^zephyriov-api\//);
  expect(reset!.init.signal).toBeInstanceOf(AbortSignal);
  const body = JSON.parse(String(reset!.init.body));
  expect(Object.keys(body).sort()).toEqual(['from', 'html', 'subject', 'tags', 'text', 'to']);
  expect(body).toMatchObject({ from, to: [message.user.email], tags: [{ name: 'kind', value: 'reset' }] });
  expect(body.text).toContain(message.url);
  // The link is escaped once in HTML and the user-controlled display name is never rendered.
  expect(body.html).toContain(message.url.replaceAll('&', '&amp;'));
  expect(body.html).not.toContain('<b>Evil</b>');
  expect(body.text).not.toContain('Evil');
  expect(body.subject).not.toBe(JSON.parse(String(calls[1]!.init.body)).subject);
  expect(JSON.parse(String(calls[1]!.init.body)).tags).toEqual([{ name: 'kind', value: 'verification' }]);
});

test('refuses links outside the configured API origin before contacting the provider', async () => {
  const { calls, fetch } = fakeFetch(accepted);
  const transport = createResendTransport({ apiKey, from, linkOrigin, fetch });
  for (const url of ['https://evil.invalid/api/auth/verify-email?token=t', 'http://api.example.invalid/api/auth/verify-email',
    'https://api.example.invalid.evil.invalid/x', 'javascript:alert(1)', 'not a url']) {
    await expect(transport.sendVerificationEmail({ ...message, url })).rejects.toBeInstanceOf(ResendDeliveryError);
  }
  expect(calls).toHaveLength(0);
});

test('provider errors expose only status and code, never key, recipient, link or provider message', async () => {
  for (const [status, name] of [[429, 'daily_quota_exceeded'], [403, 'validation_error'], [500, 'application_error']] as const) {
    const { fetch } = fakeFetch(() => Response.json({ statusCode: status, name, message: `${message.user.email} ${apiKey}` }, { status }));
    const error = await createResendTransport({ apiKey, from, linkOrigin, fetch }).sendResetPassword(message)
      .then(() => undefined, (reason: unknown) => reason);
    expect(error).toBeInstanceOf(ResendDeliveryError);
    expect(error).toMatchObject({ status, code: name });
    const exposed = `${String(error)} ${JSON.stringify(error)} ${(error as Error).stack}`;
    for (const secret of [apiKey, message.user.email, message.token, 'callbackURL']) expect(exposed).not.toContain(secret);
  }
  const unparsable = fakeFetch(() => new Response('<html>gateway</html>', { status: 502 }));
  await expect(createResendTransport({ apiKey, from, linkOrigin, fetch: unparsable.fetch }).sendResetPassword(message))
    .rejects.toMatchObject({ status: 502, code: 'provider_error' });
  const network = createResendTransport({ apiKey, from, linkOrigin,
    fetch: (async () => { throw new TypeError(`connect failed ${apiKey}`); }) as unknown as typeof globalThis.fetch });
  const failure = await network.sendResetPassword(message).then(() => undefined, (reason: unknown) => reason);
  expect(failure).toMatchObject({ status: 0, code: 'network_error' });
  expect(String((failure as Error).stack)).not.toContain(apiKey);
});

test('aborts a hung provider request at the configured timeout', async () => {
  const fetch = ((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
  })) as unknown as typeof globalThis.fetch;
  const started = Date.now();
  await expect(createResendTransport({ apiKey, from, linkOrigin, fetch, timeoutMs: 50 }).sendResetPassword(message))
    .rejects.toMatchObject({ code: 'network_error' });
  expect(Date.now() - started).toBeLessThan(2000);
});

test('rejects incomplete configuration and reads only the documented environment names', () => {
  const fetch = fakeFetch(accepted).fetch;
  for (const invalid of [{ apiKey: '' }, { apiKey: ' re_x' }, { from: 'no-reply@mail.zephyriov.reicot.dev\r\nBcc: x@y' },
    { from: 'Zephyriov' }, { linkOrigin: 'https://api.example.invalid/path' }, { linkOrigin: 'http://api.example.invalid' }, { timeoutMs: 0 }]) {
    expect(() => createResendTransport({ apiKey, from, linkOrigin, fetch, ...invalid })).toThrow(TypeError);
  }
  expect(() => createResendTransport({ apiKey, from, linkOrigin: 'http://localhost:3403', fetch })).not.toThrow();
  expect(resendConfigFromEnv({ RESEND_API_KEY: apiKey, AUTH_EMAIL_FROM: from, OTHER: 'x' })).toEqual({ apiKey, from });
  expect(() => resendConfigFromEnv({ AUTH_EMAIL_FROM: from })).toThrow(/RESEND_API_KEY/);
  expect(() => resendConfigFromEnv({ RESEND_API_KEY: apiKey })).toThrow(/AUTH_EMAIL_FROM/);
});

test('real Auth sign-up sends through the adapter after commit and a provider quota error stays a safe 503', async () => {
  const ok = fakeFetch(accepted);
  const transport = createResendTransport({ apiKey, from, linkOrigin: baseURL, fetch: ok.fetch });
  const f = await authFixture(transport);
  opened.push(f);
  expect((await f.post('/sign-up/email', credentials)).status).toBe(200);
  expect(ok.calls).toHaveLength(1);
  expect(JSON.parse(String(ok.calls[0]!.init.body)).text).toContain(`${baseURL}/api/auth/verify-email?token=`);
  expect((await f.client.execute("select used from rate_limit_buckets where scope = 'email:sent:verification'")).rows[0]?.used).toBe(1);

  const quota = fakeFetch(() => Response.json({ name: 'daily_quota_exceeded', message: 'quota' }, { status: 429 }));
  const g = await authFixture(createResendTransport({ apiKey, from, linkOrigin: baseURL, fetch: quota.fetch }));
  opened.push(g);
  const response = await g.post('/sign-up/email', credentials);
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('quota');
  expect((await g.client.execute("select used from rate_limit_buckets where scope = 'email:failed:verification'")).rows[0]?.used).toBe(1);
  expect((await g.client.execute('select email_verified from user')).rows[0]?.email_verified).toBe(0);
});

test('default mail budget leaves margin under the Resend Free day and month quotas', () => {
  const { emailGlobal, emailIdentity } = DEFAULT_USAGE_LIMITS;
  expect(emailGlobal.windowMs).toBe(86_400_000);
  expect(emailGlobal.limit).toBeLessThan(100);
  // Even a 31-day month of exhausted days stays below the 3,000 monthly quota.
  expect(emailGlobal.limit * 31).toBeLessThan(3000);
  expect(emailIdentity.limit).toBeLessThan(emailGlobal.limit);
  // Worst-case admitted mail throughput stays far below 10 provider requests/second.
  const perSecond = (DEFAULT_USAGE_LIMITS.signup.limit + DEFAULT_USAGE_LIMITS.mail.limit) / 60;
  expect(perSecond).toBeLessThan(1);
});

test('the daily mail window resets at UTC midnight, like the provider quota', async () => {
  const f = await authFixture({ limits: { emailGlobal: { limit: 1, windowMs: 86_400_000 } } });
  opened.push(f);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-30T23:59:59.500Z'));
  expect((await f.post('/request-password-reset', { email: 'x@example.invalid', redirectTo: `${baseURL}/reset` })).status).toBe(200);
  const blocked = await f.post('/request-password-reset', { email: 'y@example.invalid', redirectTo: `${baseURL}/reset` });
  expect(blocked.status).toBe(429);
  expect(blocked.headers.get('retry-after')).toBe('1');
  vi.setSystemTime(new Date('2026-10-01T00:00:00.000Z'));
  expect((await f.post('/request-password-reset', { email: 'y@example.invalid', redirectTo: `${baseURL}/reset` })).status).toBe(200);
});
