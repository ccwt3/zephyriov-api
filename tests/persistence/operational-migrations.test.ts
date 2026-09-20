import { afterEach, expect, test } from 'vitest';
import { createClient } from '@libsql/client';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateLocal } from '../../src/persistence/migrate.js';

const opened: Array<{ close: () => void; directory: string }> = [];
async function database() {
  const directory = await mkdtemp(join(tmpdir(), 'zephyriov-operational-'));
  const client = createClient({ url: `file:${join(directory, 'test.db')}` });
  opened.push({ close: () => client.close(), directory });
  return client;
}
afterEach(async () => {
  for (const item of opened.splice(0)) {
    item.close();
    await rm(item.directory, { recursive: true, force: true });
  }
});
type Db = Awaited<ReturnType<typeof database>>;
const run = (db: Db, sql: string, args: Array<string | number | null> = []) => db.execute({ sql, args });
const DAY = 86_400_000;
const issued = Date.parse('2026-09-20T00:00:00.000Z');

async function seed(db: Db) {
  await run(db, "insert into user (id, name, email, email_verified) values ('u1', 'One', 'one@example.invalid', 1), ('u2', 'Two', 'two@example.invalid', 1)");
  await run(db, "insert into session (id, expires_at, token, user_id, updated_at) values ('auth1', 9999999999999, 't1', 'u1', 1), ('auth2', 9999999999999, 't2', 'u2', 1)");
  await run(db, "insert into catalog_manifests (id, expected_line_count, status) values ('m1', 1, 'staging')");
}

const packageSql = `insert into offline_packages
  (id, user_id, device_id, issued_at, expires_at, submit_until, base_account_revision, manifest_id, srs_version, content_hash, payload_json)
  values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
const pkg = (id = 'p1', user = 'u1', device = 'd1') => [id, user, device, issued, issued + 7 * DAY,
  issued + 14 * DAY, '1', 'm1', 'B03.12-v1', 'a'.repeat(64), JSON.stringify({ id, deviceId: device, contentHash: 'a'.repeat(64) })];

test('B04.08 applies once to fresh and migrated databases, retaining packages', async () => {
  const db = await database();
  await migrateLocal(db, '005_events.sql');
  await seed(db);
  await migrateLocal(db, '006_operational.sql');
  await run(db, packageSql, pkg());
  await migrateLocal(db, '006_operational.sql');
  expect((await run(db, 'select count(*) as n from schema_migrations')).rows[0]?.n).toBe(6);
  expect((await run(db, 'select count(*) as n from offline_packages')).rows[0]?.n).toBe(1);
  const fresh = await database();
  await migrateLocal(fresh);
  expect((await run(fresh, "select name from sqlite_master where name = 'realtime_tickets'")).rows).toHaveLength(1);
});

test('packages require owner, manifest, exact windows and immutable snapshot', async () => {
  const db = await database();
  await migrateLocal(db);
  await seed(db);
  await run(db, packageSql, pkg());
  await expect(run(db, packageSql, pkg('p2', 'missing'))).rejects.toThrow();
  const wrongManifest = pkg('p2'); wrongManifest[7] = 'missing';
  await expect(run(db, packageSql, wrongManifest)).rejects.toThrow();
  const shortWindow = pkg('p2'); shortWindow[4] = issued + 7 * DAY - 1;
  await expect(run(db, packageSql, shortWindow)).rejects.toThrow();
  const longGrace = pkg('p2'); longGrace[5] = issued + 14 * DAY + 1;
  await expect(run(db, packageSql, longGrace)).rejects.toThrow();
  const wrongPayload = pkg('p2'); wrongPayload[10] = JSON.stringify({ id: 'other', deviceId: 'd1', contentHash: 'a'.repeat(64) });
  await expect(run(db, packageSql, wrongPayload)).rejects.toThrow();
  await expect(run(db, "update offline_packages set device_id = 'd2' where id = 'p1'")).rejects.toThrow();
  await expect(run(db, "delete from offline_packages where id = 'p1'")).rejects.toThrow();
});

test('an event cannot claim a package issued to another account or device', async () => {
  const db = await database();
  await migrateLocal(db);
  await seed(db);
  await run(db, packageSql, pkg());
  await run(db, "insert into openings (id, slug, name, eco, playable_white, playable_black) values ('o1', 'one', 'One', 'A00', 1, 1)");
  await run(db, "insert into lines (id, opening_id, name) values ('l1', 'o1', 'One')");
  await run(db, 'insert into line_revisions (revision_id, line_id, moves_json, references_json, moves_hash, content_hash, sequence_generation, white_moves, black_moves) values (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ['r1', 'l1', '[]', '[]', 'a'.repeat(64), 'b'.repeat(64), 1, 1, 1]);
  const sql = `insert into study_events (id, user_id, device_id, payload_hash, payload_json, line_id, line_revision_id, study_date, study_timezone,
    started_at, completed_at, session_ref_kind, session_ref_id, item_ref_kind, item_ref_id, package_id)
    values (?, ?, ?, ?, ?, 'l1', 'r1', '2026-09-20', 'UTC', '2026-09-20T10:00:00.000Z', '2026-09-20T10:01:00.000Z', 'local', 'local-s', 'local', 'local-i', 'p1')`;
  const event = (id: string, user: string, device: string) => [id, user, device, 'a'.repeat(64), JSON.stringify({
    eventId: id, deviceId: device, lineId: 'l1', lineRevisionId: 'r1', studyDate: '2026-09-20', studyTimezone: 'UTC',
    startedAt: '2026-09-20T10:00:00.000Z', completedAt: '2026-09-20T10:01:00.000Z',
    sessionRef: { kind: 'local', id: 'local-s' }, itemRef: { kind: 'local', id: 'local-i' },
    packageId: 'p1', dependsOnEventIds: [], attempts: [],
  })];
  await expect(run(db, sql, event('e2', 'u2', 'd1'))).rejects.toThrow();
  await expect(run(db, sql, event('e3', 'u1', 'd2'))).rejects.toThrow();
  await run(db, sql, event('e1', 'u1', 'd1'));
});

test('activity belongs to one account and civil day; failed multiwrite rolls back', async () => {
  const db = await database();
  await migrateLocal(db);
  await seed(db);
  const sql = 'insert into activity_days (user_id, study_date, completed_blocks, distinct_lines) values (?, ?, ?, ?)';
  await run(db, sql, ['u1', '2026-09-20', 2, 1]);
  await run(db, sql, ['u2', '2026-09-20', 1, 1]);
  await expect(run(db, sql, ['u1', '2026-09-20', 1, 1])).rejects.toThrow();
  await expect(run(db, sql, ['missing', '2026-09-21', 1, 1])).rejects.toThrow();
  await expect(run(db, sql, ['u1', '2026-09-31', 1, 1])).rejects.toThrow();
  await expect(run(db, sql, ['u1', '2026-09-21', 0, 1])).rejects.toThrow();
  await expect(run(db, "update activity_days set completed_blocks = 1 where user_id = 'u1'")).rejects.toThrow();
  await expect(run(db, "update activity_days set user_id = 'u2' where user_id = 'u1'")).rejects.toThrow();
  const tx = await db.transaction('write');
  await tx.execute({ sql, args: ['u1', '2026-09-21', 1, 1] });
  await expect(tx.execute({ sql, args: ['u1', '2026-09-21', 1, 1] })).rejects.toThrow();
  await tx.rollback();
  expect((await run(db, "select count(*) as n from activity_days where study_date = '2026-09-21'")).rows[0]?.n).toBe(0);
});

test('rate buckets have unique scope and bounded count for account or global keys', async () => {
  const db = await database();
  await migrateLocal(db);
  await seed(db);
  const sql = 'insert into rate_limit_buckets (scope, subject_key, user_id, window_start, window_end, used, limit_count) values (?, ?, ?, ?, ?, ?, ?)';
  await run(db, sql, ['study', 'u1', 'u1', issued, issued + 60_000, 1, 2]);
  await run(db, sql, ['study', 'u2', 'u2', issued, issued + 60_000, 0, 2]);
  await run(db, sql, ['email_global', 'all', null, issued, issued + 60_000, 0, 4]);
  await expect(run(db, sql, ['study', 'u1', 'u1', issued, issued + 60_000, 0, 2])).rejects.toThrow();
  await expect(run(db, sql, ['study', 'u2', 'u1', issued + 60_000, issued + 120_000, 0, 2])).rejects.toThrow();
  await expect(run(db, sql, ['study', 'u1', null, issued + 60_000, issued + 120_000, 0, 2])).rejects.toThrow();
  await expect(run(db, sql, ['email_global', 'all', 'u1', issued + 60_000, issued + 120_000, 0, 2])).rejects.toThrow();
  await expect(run(db, sql, ['study', 'u1', 'u1', issued + 60_000, issued + 60_000, 0, 2])).rejects.toThrow();
  await expect(run(db, 'update rate_limit_buckets set used = 3 where scope = ? and subject_key = ?', ['study', 'u1'])).rejects.toThrow();
  await expect(run(db, 'update rate_limit_buckets set limit_count = 3 where scope = ? and subject_key = ?', ['study', 'u1'])).rejects.toThrow();
  await expect(run(db, 'update rate_limit_buckets set used = 0 where scope = ? and subject_key = ?', ['study', 'u1'])).rejects.toThrow();
  const update = 'update rate_limit_buckets set used = used + 1 where scope = ? and subject_key = ? and window_start = ? and used < limit_count';
  expect((await run(db, update, ['study', 'u1', issued])).rowsAffected).toBe(1);
  expect((await run(db, update, ['study', 'u1', issued])).rowsAffected).toBe(0);
});

test('ticket is bound to its account and Auth session, then consumed once within 30 seconds', async () => {
  const db = await database();
  await migrateLocal(db);
  await seed(db);
  const sql = 'insert into realtime_tickets (ticket_hash, user_id, auth_session_id, issued_at, expires_at) values (?, ?, ?, ?, ?)';
  await run(db, sql, ['a'.repeat(64), 'u1', 'auth1', issued, issued + 30_000]);
  await expect(run(db, sql, ['b'.repeat(64), 'u2', 'auth1', issued, issued + 30_000])).rejects.toThrow();
  await expect(run(db, sql, ['b'.repeat(64), 'u1', 'auth1', issued, issued + 29_999])).rejects.toThrow();
  const consume = 'update realtime_tickets set consumed_at = ? where ticket_hash = ? and user_id = ? and consumed_at is null and expires_at > ?';
  expect((await run(db, consume, [issued + 1, 'a'.repeat(64), 'u2', issued + 1])).rowsAffected).toBe(0);
  expect((await run(db, consume, [issued + 1, 'a'.repeat(64), 'u1', issued + 1])).rowsAffected).toBe(1);
  expect((await run(db, consume, [issued + 2, 'a'.repeat(64), 'u1', issued + 2])).rowsAffected).toBe(0);
  await expect(run(db, "update realtime_tickets set consumed_at = null where ticket_hash = ?", ['a'.repeat(64)])).rejects.toThrow();
  await run(db, sql, ['c'.repeat(64), 'u2', 'auth2', issued, issued + 30_000]);
  expect((await run(db, consume, [issued + 30_000, 'c'.repeat(64), 'u2', issued + 30_000])).rowsAffected).toBe(0);
  await run(db, "delete from session where id = 'auth2'");
});
