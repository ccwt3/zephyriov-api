import type { Client } from '@libsql/client';

/** Server-owned references only: no session tokens in invalidation messages. */
export interface SessionReference { userId: string; sessionId: string }
export type SessionInvalidator = (reference: SessionReference) => Promise<void>;

/** B10 uses check at attachment, expiry and revalidation; this does not open sockets. */
export function createSessionLifecycle(client: Client, invalidate?: SessionInvalidator) {
  return {
    async deleted(reference: SessionReference) {
      await invalidate?.(reference);
    },
    async check(reference: SessionReference, now = Date.now()): Promise<{ expiresAt: number } | null> {
      const result = await client.execute({
        sql: 'select expires_at from session where id = ? and user_id = ? and expires_at > ?',
        args: [reference.sessionId, reference.userId, now],
      });
      const row = result.rows[0];
      return row ? { expiresAt: Number(row.expires_at) } : null;
    },
  };
}
