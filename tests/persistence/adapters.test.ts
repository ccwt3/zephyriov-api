import { afterEach, expect, test } from 'vitest';
import { createClient } from '@libsql/client';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateLocal } from '../../src/persistence/migrate.js';
import { compareAndSwapAccountRevision, consumeRealtimeTicket, readAccountSnapshot,
  readStudySessionSnapshot, takeRateLimitSlot, RevisionNotReadyError } from '../../src/persistence/adapters.js';

const opened: Array<{ close: () => void; directory: string }> = [];
async function database() {
  const directory = await mkdtemp(join(tmpdir(), 'zephyriov-adapters-'));
  const client = createClient({ url: `file:${join(directory, 'test.db')}` });
  opened.push({ close: () => client.close(), directory });
  await migrateLocal(client);
  await client.execute("insert into user (id, name, email, email_verified) values ('u1', 'One', 'one@example.invalid', 1), ('u2', 'Two', 'two@example.invalid', 1)");
  await client.execute("insert into account_revisions (user_id, revision) values ('u1', '18446744073709551616'), ('u2', '1')");
  await client.execute("insert into profiles (user_id, settings_version, timezone, new_lines_per_day, moves_per_block) values ('u1', '1', 'UTC', 6, 4), ('u2', '1', 'UTC', 8, 6)");
  return client;
}
afterEach(async () => {
  for (const item of opened.splice(0)) {
    item.close();
    await rm(item.directory, { recursive: true, force: true });
  }
});

test('primary account read groups owner rows and observes arbitrary precision revision barrier', async () => {
  const db = await database();
  await db.execute("insert into activity_days (user_id, study_date, completed_blocks, distinct_lines) values ('u1', '2026-09-20', 2, 1), ('u2', '2026-09-20', 1, 1)");
  const state = await readAccountSnapshot(db, 'u1', '2026-09-20', '18446744073709551616');
  expect(state).toMatchObject({ revision: '18446744073709551616', profile: { user_id: 'u1' },
    activity: [{ user_id: 'u1', study_date: '2026-09-20' }], repertoire: [], cards: [], session: null, items: [] });
  expect(await readAccountSnapshot(db, 'missing', '2026-09-20')).toBeNull();
  await expect(readAccountSnapshot(db, 'u1', '2026-09-20', '18446744073709551617')).rejects.toBeInstanceOf(RevisionNotReadyError);
  const other = await readAccountSnapshot(db, 'u2', '2026-09-20');
  expect(other?.activity).toHaveLength(1);
  expect(other?.activity[0]?.user_id).toBe('u2');
});

test('session read is owner scoped and returns all items in sort order from one snapshot', async () => {
  const db = await database();
  await db.execute("insert into study_sessions (id, user_id, study_date, settings_version, timezone, new_lines_per_day, moves_per_block, plan_seed, status) values ('s1', 'u1', '2026-09-20', '1', 'UTC', 6, 4, 'seed', 'in_progress')");
  const mine = await readStudySessionSnapshot(db, 'u1', 's1', '18446744073709551616');
  expect(mine).toMatchObject({ revision: '18446744073709551616', session: { id: 's1' }, items: [] });
  expect(await readStudySessionSnapshot(db, 'u2', 's1')).toBeNull();
});

test('CAS changes one revision and a zero-row conflict preserves the original value', async () => {
  const db = await database();
  const first = await db.transaction('write');
  expect(await compareAndSwapAccountRevision(first, 'u1', '18446744073709551616')).toBe('18446744073709551617');
  await first.commit();
  const stale = await db.transaction('write');
  expect(await compareAndSwapAccountRevision(stale, 'u1', '18446744073709551616')).toBeNull();
  await stale.commit();
  expect((await db.execute("select revision from account_revisions where user_id = 'u1'")).rows[0]?.revision).toBe('18446744073709551617');
});

test('rate slot and hashed ticket consume atomically, including exhausted and expired cases', async () => {
  const db = await database();
  const start = Date.parse('2026-09-20T00:00:00.000Z');
  const bucket = { scope: 'study', subjectKey: 'u1', userId: 'u1', windowStart: start, windowEnd: start + 60_000, limit: 2 };
  expect(await takeRateLimitSlot(db, bucket, start + 1)).toBe(1);
  expect(await takeRateLimitSlot(db, bucket, start + 2)).toBe(2);
  expect(await takeRateLimitSlot(db, bucket, start + 3)).toBeNull();
  expect(await takeRateLimitSlot(db, { ...bucket, subjectKey: 'u2', userId: 'u2' }, start + 3)).toBe(1);
  await db.execute({ sql: 'insert into session (id, expires_at, token, user_id, updated_at) values (?, ?, ?, ?, ?)',
    args: ['auth1', start + 60_000, 'secret', 'u1', start] });
  const hash = 'a'.repeat(64);
  await db.execute({ sql: 'insert into realtime_tickets (ticket_hash, user_id, auth_session_id, issued_at, expires_at) values (?, ?, ?, ?, ?)',
    args: [hash, 'u1', 'auth1', start, start + 30_000] });
  expect(await consumeRealtimeTicket(db, hash, 'u2', start + 1)).toBeNull();
  expect(await consumeRealtimeTicket(db, hash, 'u1', start + 1)).toMatchObject({ userId: 'u1', authSessionId: 'auth1' });
  expect(await consumeRealtimeTicket(db, hash, 'u1', start + 2)).toBeNull();
  const expired = 'b'.repeat(64);
  await db.execute({ sql: 'insert into realtime_tickets (ticket_hash, user_id, auth_session_id, issued_at, expires_at) values (?, ?, ?, ?, ?)',
    args: [expired, 'u1', 'auth1', start, start + 30_000] });
  expect(await consumeRealtimeTicket(db, expired, 'u1', start + 30_000)).toBeNull();
  const revoked = 'c'.repeat(64);
  await db.execute({ sql: 'insert into realtime_tickets (ticket_hash, user_id, auth_session_id, issued_at, expires_at) values (?, ?, ?, ?, ?)',
    args: [revoked, 'u1', 'auth1', start, start + 30_000] });
  await db.execute("delete from session where id = 'auth1'");
  expect(await consumeRealtimeTicket(db, revoked, 'u1', start + 1)).toBeNull();
});

test('grouped reads use account and session indexes', async () => {
  const db = await database();
  const queries = [
    "select * from cards where user_id = 'u1' order by line_id",
    "select * from study_sessions where user_id = 'u1' and study_date = '2026-09-20'",
    "select * from study_items where user_id = 'u1' and session_id = 's1' order by sort_order",
    "select * from activity_days where user_id = 'u1' order by study_date desc",
  ];
  for (const query of queries) {
    const plan = await db.execute(`explain query plan ${query}`);
    expect(plan.rows.some((row) => String(row.detail).includes('INDEX') || String(row.detail).includes('PRIMARY KEY'))).toBe(true);
  }
});
