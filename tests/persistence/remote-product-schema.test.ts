import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { migrateLocal } from '../../src/persistence/migrate.js';
import { compareAndSwapAccountRevision } from '../../src/persistence/adapters.js';
import { openRemoteProductProbe } from '../../tools/b04/remote-product-probe.mjs';

describe.skipIf(process.env.B04_REMOTE_PRODUCT_PROBE !== '1')('B04.10 remote product schema', () => {
  let probe: Awaited<ReturnType<typeof openRemoteProductProbe>>;

  beforeAll(async () => {
    probe = await openRemoteProductProbe({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    await probe.seedProduct();
  }, 120_000);

  afterAll(async () => {
    await probe?.cleanup();
  }, 120_000);

  test('migrates an empty primary and a second startup preserves schema and data', async () => {
    const before = await probe.schemaSnapshot();
    expect(before.migrations).toBe(6);
    expect(before.tables).toContain('study_events');
    expect(before.triggers).toContain('event_decisions_no_update');

    await migrateLocal(probe.writerA);

    expect(await probe.schemaSnapshot()).toEqual(before);
    expect((await probe.writerB.execute('select count(*) as total from user')).rows[0]?.total).toBe(2);
  }, 120_000);

  test('enforces CHECK, UNIQUE, FK, ownership and immutability remotely', async () => {
    await expect(probe.writerA.execute(
      "insert into profiles (user_id, settings_version, timezone, new_lines_per_day, moves_per_block) values ('bad', '1', 'UTC', 0, 4)",
    )).rejects.toThrow();
    await expect(probe.writerA.execute(
      "insert into user (id, name, email, email_verified) values ('u3', 'Three', 'one@example.invalid', 1)",
    )).rejects.toThrow();
    await expect(probe.writerA.execute(
      "insert into session (id, expires_at, token, user_id, updated_at) values ('bad-session', 9999999999999, 'bad-token', 'missing', 1)",
    )).rejects.toThrow();
    await expect(probe.writerA.execute(
      "insert into realtime_tickets (ticket_hash, user_id, auth_session_id, issued_at, expires_at) values ('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'u2', 'auth1', 1, 30001)",
    )).rejects.toThrow();
    await expect(probe.writerA.execute(
      "update settings_revisions set timezone = 'Europe/Madrid' where user_id = 'u1' and version = '1'",
    )).rejects.toThrow();

    expect((await probe.writerB.execute("select count(*) as total from user where id = 'u3'")).rows[0]?.total).toBe(0);
    expect((await probe.writerB.execute("select timezone from settings_revisions where user_id = 'u1' and version = '1'")).rows[0]?.timezone).toBe('UTC');
  }, 120_000);

  test('two accounts remain isolated and only one writer wins a revision CAS', async () => {
    const [txA, txB] = await Promise.all([
      probe.writerA.transaction('write'),
      probe.writerB.transaction('write'),
    ]);
    const [winnerA, winnerB] = await Promise.all([
      compareAndSwapAccountRevision(txA, 'u2', '0').then(async (value) => { await txA.commit(); return value; }),
      compareAndSwapAccountRevision(txB, 'u2', '0').then(async (value) => { await txB.commit(); return value; }),
    ]);
    expect([winnerA, winnerB].filter(Boolean)).toEqual(['1']);
    expect((await probe.writerA.execute("select revision from account_revisions where user_id = 'u1'")).rows[0]?.revision).toBe('0');
  }, 120_000);

  test('rolls back every prefix of the representative B06 write sequence', async () => {
    for (let failureAfter = 1; failureAfter <= probe.b06WriteCount; failureAfter += 1) {
      await probe.expectB06Rollback(failureAfter);
    }

    expect((await probe.writerB.execute("select status from study_items where id = 'i1'")).rows[0]?.status).toBe('pending');
    expect((await probe.writerB.execute("select version from cards where id = 'c1'")).rows[0]?.version).toBe('0');
    expect((await probe.writerB.execute("select count(*) as total from study_events where id like 'rollback-%'")).rows[0]?.total).toBe(0);
    expect((await probe.writerB.execute("select count(*) as total from event_decisions where event_id like 'rollback-%'")).rows[0]?.total).toBe(0);
  }, 120_000);
});
