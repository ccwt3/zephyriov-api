import type { Client } from '@libsql/client';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHmac } from 'node:crypto';
import { APIError, isAPIError } from 'better-auth/api';
import type { AuthEmail } from './auth.js';

export interface LimitRule { limit: number; windowMs: number }

/** Local trial values. Real provider quota and throughput are accepted in B05.11. */
export const DEFAULT_USAGE_LIMITS = {
  signup: { limit: 10, windowMs: 60_000 },
  signupIdentity: { limit: 3, windowMs: 3_600_000 },
  login: { limit: 30, windowMs: 60_000 },
  loginIdentity: { limit: 10, windowMs: 60_000 },
  mail: { limit: 20, windowMs: 60_000 },
  password: { limit: 10, windowMs: 60_000 },
  verification: { limit: 30, windowMs: 60_000 },
  oauth: { limit: 30, windowMs: 60_000 },
  session: { limit: 120, windowMs: 60_000 },
  other: { limit: 60, windowMs: 60_000 },
  emailGlobal: { limit: 100, windowMs: 86_400_000 },
  emailIdentity: { limit: 5, windowMs: 3_600_000 },
  businessRead: { limit: 60, windowMs: 60_000 },
  businessEvents: { limit: 30, windowMs: 60_000 },
} satisfies Record<string, LimitRule>;
export type UsageLimitOptions = Partial<Record<keyof typeof DEFAULT_USAGE_LIMITS, LimitRule>>;
export type BusinessOperation = 'read' | 'events';
type Requirement = { scope: string; subject: string; userId?: string; rule: LimitRule; cost?: number };
type MailKind = 'verification' | 'reset';

function unavailable() {
  return new APIError('SERVICE_UNAVAILABLE', { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable' });
}
function exhausted(end: number, now: number) {
  return new APIError('TOO_MANY_REQUESTS', { code: 'RATE_LIMITED', message: 'Rate limit exceeded' }, {
    'Retry-After': String(Math.max(1, Math.ceil((end - now) / 1000))),
  });
}

function authGroup(path: string): keyof typeof DEFAULT_USAGE_LIMITS {
  if (path === '/sign-up/email') return 'signup';
  if (path === '/sign-in/email') return 'login';
  if (['/send-verification-email', '/request-password-reset'].includes(path)) return 'mail';
  if (['/reset-password', '/change-password', '/set-password'].includes(path) || path.startsWith('/reset-password/')) return 'password';
  if (path === '/verify-email') return 'verification';
  if (['/sign-in/social', '/link-social', '/unlink-account'].includes(path) || path.startsWith('/callback/')) return 'oauth';
  if (['/get-session', '/list-sessions', '/sign-out', '/revoke-session', '/revoke-sessions', '/revoke-other-sessions'].includes(path)) return 'session';
  return 'other';
}

export function createUsageLimits(client: Client, secret: string, overrides: UsageLimitOptions = {}) {
  const rules = Object.fromEntries(Object.entries({ ...DEFAULT_USAGE_LIMITS, ...overrides })
    .map(([name, rule]) => [name, { ...rule }])) as typeof DEFAULT_USAGE_LIMITS;
  for (const rule of Object.values(rules)) {
    if (!Number.isSafeInteger(rule.limit) || rule.limit < 1 || !Number.isSafeInteger(rule.windowMs) || rule.windowMs < 1000) {
      throw new TypeError('Usage limits require positive integer limits and windows of at least one second');
    }
  }
  // A stable server secret prevents plaintext emails in durable counters. Never key by an untrusted IP header.
  const identity = (email: string) => createHmac('sha256', secret).update(`usage-email:${email.trim().toLowerCase()}`).digest('hex');
  const deliveryContext = new AsyncLocalStorage<{
    reservation?: { subject: string; used: boolean }; deliveries: Array<() => Promise<void>>;
  }>();
  const mailRequirements = (subject: string): Requirement[] => [
    { scope: 'email:global', subject: 'all', rule: rules.emailGlobal },
    { scope: 'email:identity', subject, rule: rules.emailIdentity },
  ];

  async function consume(requirements: Requirement[], now = Date.now()) {
    for (let attempt = 0; ; attempt++) try {
      const tx = await client.transaction('write');
      try {
        for (const { scope, subject, userId, rule, cost = 1 } of requirements) {
          const start = Math.floor(now / rule.windowMs) * rule.windowMs;
          const end = start + rule.windowMs;
          if (cost > rule.limit) throw exhausted(end, now);
          const result = await tx.execute({
            sql: `insert into rate_limit_buckets (scope, subject_key, user_id, window_start, window_end, used, limit_count)
              values (?, ?, ?, ?, ?, ?, ?)
              on conflict(scope, subject_key, window_start) do update set used = used + excluded.used
              where rate_limit_buckets.window_end = excluded.window_end
                and rate_limit_buckets.limit_count = excluded.limit_count
                and rate_limit_buckets.used <= rate_limit_buckets.limit_count - excluded.used
              returning used`,
            args: [scope, subject, userId ?? null, start, end, cost, rule.limit],
          });
          if (!result.rows.length) throw exhausted(end, now);
        }
        await tx.commit();
        return;
      } catch (error) { await tx.rollback(); throw error; }
      finally { tx.close(); }
    } catch (error) {
      if (isAPIError(error)) throw error;
      // Local SQLite writers may fail immediately instead of waiting. Retry only
      // a rolled-back lock conflict, never a delivery or an ambiguous remote failure.
      if (attempt < 6 && error && typeof error === 'object' && 'code' in error &&
        ['SQLITE_BUSY', 'SQLITE_LOCKED'].includes(String(error.code))) {
        await new Promise((resolve) => setTimeout(resolve, 10 * 2 ** attempt));
        continue;
      }
      throw unavailable();
    }
  }

  async function recordDelivery(kind: MailKind, result: 'sent' | 'failed') {
    const start = Math.floor(Date.now() / 86_400_000) * 86_400_000;
    // Aggregate outcomes use the existing durable counters; never store tokens, URLs or provider errors.
    await client.execute({
      sql: `insert into rate_limit_buckets (scope, subject_key, window_start, window_end, used, limit_count)
        values (?, 'all', ?, ?, 1, 9007199254740991)
        on conflict(scope, subject_key, window_start) do update set used = used + 1`,
      args: [`email:${result}:${kind}`, start, start + 86_400_000],
    });
  }

  async function deliverEmail(kind: MailKind, message: AuthEmail, transport: (message: AuthEmail) => Promise<void>,
    reservation?: { subject: string; used: boolean }) {
    const subject = identity(message.user.email);
    if (reservation?.subject === subject && !reservation.used) reservation.used = true;
    else await consume(mailRequirements(subject));
    try {
      try { await transport(message); }
      catch {
        await recordDelivery(kind, 'failed');
        throw unavailable();
      }
      await recordDelivery(kind, 'sent');
    } catch { throw unavailable(); }
  }

  return {
    requireAdmission(path: string) {
      if (path !== '/get-session' && !deliveryContext.getStore()) {
        throw new APIError('BAD_REQUEST', { code: 'AUTH_HANDLER_REQUIRED', message: 'Use the Auth HTTP handler' });
      }
    },
    async consumeBusiness(userId: string, operation: BusinessOperation, count = 1) {
      if (!userId || !['read', 'events'].includes(operation) || !Number.isInteger(count) || count < 1 || count > (operation === 'events' ? 20 : 1)) {
        throw new APIError('UNPROCESSABLE_ENTITY', { code: 'VALIDATION_ERROR', message: 'Invalid operation count' });
      }
      await consume([{ scope: operation === 'read' ? 'read' : 'study', subject: userId, userId,
        rule: operation === 'read' ? rules.businessRead : rules.businessEvents, cost: count }]);
    },

    async handleAuth(request: Request, handler: (request: Request) => Promise<Response>): Promise<Response> {
      try {
        const rawPath = new URL(request.url).pathname;
        // Reject alternate spellings before the library router can normalize into a cheaper bucket.
        if (rawPath.includes('%') || rawPath.includes('//')) {
          return Response.json({ code: 'INVALID_AUTH_PATH' }, { status: 400 });
        }
        const path = rawPath.replace(/^\/api\/auth/, '').replace(/\/+$/, '');
        const group = authGroup(path);
        const body = request.method === 'POST' ? await request.clone().json() as Record<string, unknown> | null : null;
        const email = body && typeof body.email === 'string' ? body.email : undefined;
        const subject = email === undefined ? undefined : identity(email);
        const requirements: Requirement[] = [{ scope: `auth:${group}`, subject: 'all', rule: rules[group] }];
        if (subject && (group === 'signup' || group === 'login')) {
          requirements.push({ scope: `auth:${group}:identity`, subject, rule: group === 'signup' ? rules.signupIdentity : rules.loginIdentity });
        }
        // Reserve even for unknown/already-verified addresses: quota responses cannot enumerate users.
        // Unused reservations are intentionally not refunded; the budget bounds attempts, not delivery receipts.
        const reservesMail = request.method === 'POST' && subject !== undefined && (group === 'signup' || group === 'mail');
        if (reservesMail) requirements.push(...mailRequirements(subject));
        await consume(requirements);
        const context: NonNullable<ReturnType<typeof deliveryContext.getStore>> = {
          reservation: reservesMail ? { subject, used: false } : undefined,
          deliveries: [],
        };
        const response = await deliveryContext.run(context, () => handler(request));
        // Sign-up holds a DB transaction during its email callback. Flush only
        // after successful Auth completion, outside that transaction. Await the
        // real transport here, beyond Better Auth's background-error suppression.
        try {
          if (response.status < 400) for (const deliver of context.deliveries) await deliver();
        } catch (error) {
          const safe = isAPIError(error) ? error : unavailable();
          const headers = new Headers(response.headers);
          headers.delete('location');
          headers.delete('content-length');
          new Headers(safe.headers).forEach((value, key) => headers.set(key, value));
          return Response.json(safe.body, { status: safe.statusCode, headers });
        }
        return response;
      } catch (error) {
        const safe = isAPIError(error) ? error : unavailable();
        return Response.json(safe.body, { status: safe.statusCode, headers: safe.headers });
      }
    },

    async sendEmail(kind: MailKind, message: AuthEmail, transport: (message: AuthEmail) => Promise<void>) {
      const context = deliveryContext.getStore();
      if (context) context.deliveries.push(() => deliverEmail(kind, message, transport, context.reservation));
      else await deliverEmail(kind, message, transport);
    },
  };
}
