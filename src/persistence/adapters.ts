import type { Client, ResultSet, Transaction } from '@libsql/client';

type Row = ResultSet['rows'][number];

export class RevisionNotReadyError extends Error {
  constructor() { super('Requested account revision is not yet visible on the primary'); }
}

function checkRevision(actual: string, minimum?: string) {
  if (minimum !== undefined) {
    if (!/^(0|[1-9][0-9]*)$/.test(minimum)) throw new TypeError('Invalid minimum revision');
    if (BigInt(actual) < BigInt(minimum)) throw new RevisionNotReadyError();
  }
}

async function readRevision(tx: Transaction, userId: string, minimum?: string): Promise<string | null> {
  const result = await tx.execute({ sql: 'select revision from account_revisions where user_id = ?', args: [userId] });
  if (!result.rows.length) return null;
  const revision = String(result.rows[0]?.revision);
  checkRevision(revision, minimum);
  return revision;
}

/** Read grouped owner rows and their revision in one primary transaction. B08 builds the public DTO. */
export async function readAccountSnapshot(client: Client, userId: string, studyDate: string, minRevision?: string): Promise<{
  revision: string; profile: Row | null; repertoire: Row[]; cards: Row[]; activity: Row[]; session: Row | null; items: Row[];
} | null> {
  const tx = await client.transaction('read');
  try {
    const revision = await readRevision(tx, userId, minRevision);
    if (revision === null) { await tx.commit(); return null; }
    const profile = (await tx.execute({ sql: 'select * from profiles where user_id = ?', args: [userId] })).rows[0] ?? null;
    const repertoire = (await tx.execute({ sql: 'select * from user_openings where user_id = ? order by opening_id', args: [userId] })).rows;
    const cards = (await tx.execute({ sql: 'select * from cards where user_id = ? order by line_id', args: [userId] })).rows;
    const activity = (await tx.execute({ sql: 'select * from activity_days where user_id = ? order by study_date desc', args: [userId] })).rows;
    const session = (await tx.execute({ sql: 'select * from study_sessions where user_id = ? and study_date = ?', args: [userId, studyDate] })).rows[0] ?? null;
    const items = session === null ? [] : (await tx.execute({
      sql: 'select * from study_items where user_id = ? and session_id = ? order by sort_order', args: [userId, String(session.id)],
    })).rows;
    await tx.commit();
    return { revision, profile, repertoire: [...repertoire], cards: [...cards], activity: [...activity], session, items: [...items] };
  } catch (error) { await tx.rollback(); throw error; }
}

/** Return the owned session and all its items in one primary snapshot. */
export async function readStudySessionSnapshot(client: Client, userId: string, sessionId: string, minRevision?: string): Promise<{
  revision: string; session: Row; items: Row[];
} | null> {
  const tx = await client.transaction('read');
  try {
    const revision = await readRevision(tx, userId, minRevision);
    if (revision === null) { await tx.commit(); return null; }
    const session = (await tx.execute({ sql: 'select * from study_sessions where user_id = ? and id = ?', args: [userId, sessionId] })).rows[0];
    if (!session) { await tx.commit(); return null; }
    const items = (await tx.execute({ sql: 'select * from study_items where user_id = ? and session_id = ? order by sort_order', args: [userId, sessionId] })).rows;
    await tx.commit();
    return { revision, session, items: [...items] };
  } catch (error) { await tx.rollback(); throw error; }
}

/** Call inside the same write transaction as the mutation it versions. */
export async function compareAndSwapAccountRevision(tx: Transaction, userId: string, expected: string): Promise<string | null> {
  if (!/^(0|[1-9][0-9]*)$/.test(expected)) throw new TypeError('Invalid expected revision');
  const next = (BigInt(expected) + 1n).toString();
  const result = await tx.execute({ sql: 'update account_revisions set revision = ? where user_id = ? and revision = ?',
    args: [next, userId, expected] });
  return result.rowsAffected === 1 ? next : null;
}

/** One SQL statement arbitrates the final slot across processes. */
export async function takeRateLimitSlot(client: Client, bucket: {
  scope: string; subjectKey: string; userId: string | null; windowStart: number; windowEnd: number; limit: number;
}, now: number): Promise<number | null> {
  if (now < bucket.windowStart || now >= bucket.windowEnd) return null;
  const result = await client.execute({ sql: `
    insert into rate_limit_buckets (scope, subject_key, user_id, window_start, window_end, used, limit_count)
    values (?, ?, ?, ?, ?, 1, ?)
    on conflict(scope, subject_key, window_start) do update set used = used + 1
    where rate_limit_buckets.window_end = excluded.window_end
      and rate_limit_buckets.limit_count = excluded.limit_count
      and rate_limit_buckets.used < rate_limit_buckets.limit_count
    returning used`, args: [bucket.scope, bucket.subjectKey, bucket.userId, bucket.windowStart, bucket.windowEnd, bucket.limit] });
  return result.rows.length ? Number(result.rows[0]?.used) : null;
}

/** Consume only a live ticket tied to a still-live Auth session; the caller supplies its hash. */
export async function consumeRealtimeTicket(client: Client, ticketHash: string, userId: string, now: number): Promise<{
  userId: string; authSessionId: string;
} | null> {
  const result = await client.execute({ sql: `
    update realtime_tickets set consumed_at = ?
    where ticket_hash = ? and user_id = ? and consumed_at is null
      and issued_at <= ? and expires_at > ?
      and exists (select 1 from session where session.id = realtime_tickets.auth_session_id
        and session.user_id = realtime_tickets.user_id and session.expires_at > ?)
    returning user_id, auth_session_id`, args: [now, ticketHash, userId, now, now, now] });
  const row = result.rows[0];
  return row ? { userId: String(row.user_id), authSessionId: String(row.auth_session_id) } : null;
}
