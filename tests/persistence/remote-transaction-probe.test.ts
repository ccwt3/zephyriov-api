import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { openRemoteProbe } from '../../tools/b04/remote-probe.mjs';

describe.skipIf(process.env.B04_REMOTE_PROBE !== '1')('B04.02 remote Turso transactions', () => {
  let probe: Awaited<ReturnType<typeof openRemoteProbe>>;
  let startedAt = 0;

  beforeAll(async () => {
    const setupStartedAt = performance.now();
    probe = await openRemoteProbe({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const version = await probe.writerB.execute('select sqlite_version() as version');
    console.log(JSON.stringify({ phase: 'setup', latencyMs: Math.round(performance.now() - setupStartedAt), sqliteVersion: version.rows[0]?.version }));
  });

  afterAll(async () => {
    if (probe) {
      const cleanupStartedAt = performance.now();
      await probe.cleanup();
      console.log(JSON.stringify({ phase: 'cleanup', latencyMs: Math.round(performance.now() - cleanupStartedAt), remainingTables: 0 }));
    }
  });

  beforeEach(() => { startedAt = performance.now(); });
  afterEach((context) => {
    console.log(JSON.stringify({ phase: context.task.name, latencyMs: Math.round(performance.now() - startedAt) }));
  });

  test('driver commits two writes visible to another connection and rolls back two writes', async () => {
    const committed = await probe.writerA.transaction('write');
    await committed.execute({ sql: `insert into ${probe.names.writes} (id, value) values (?, ?)`, args: ['driver-1', 1] });
    await committed.execute({ sql: `insert into ${probe.names.writes} (id, value) values (?, ?)`, args: ['driver-2', 2] });
    await committed.commit();

    const aborted = await probe.writerA.transaction('write');
    await aborted.execute({ sql: `insert into ${probe.names.writes} (id, value) values (?, ?)`, args: ['driver-3', 3] });
    await aborted.execute({ sql: `insert into ${probe.names.writes} (id, value) values (?, ?)`, args: ['driver-4', 4] });
    await aborted.rollback();

    const seen = await probe.writerB.execute(`select id from ${probe.names.writes} order by id`);
    expect(seen.rows.map((row) => row.id)).toEqual(['driver-1', 'driver-2']);
  });

  test('Drizzle reverses both writes after an injected failure', async () => {
    await expect(probe.db.transaction(async (tx) => {
      await tx.insert(probe.writes).values({ id: 'drizzle-abort-1', value: 5 });
      await tx.insert(probe.writes).values({ id: 'drizzle-abort-2', value: 6 });
      throw new Error('injected after second Drizzle write');
    })).rejects.toThrow('injected after second Drizzle write');

    const absent = await probe.writerB.execute({
      sql: `select count(*) as total from ${probe.names.writes} where id like ?`,
      args: ['drizzle-abort-%'],
    });
    expect(absent.rows[0]?.total).toBe(0);

    await probe.db.insert(probe.writes).values({ id: 'drizzle-commit', value: 7 });
    const present = await probe.writerB.execute({
      sql: `select count(*) as total from ${probe.names.writes} where id = ?`,
      args: ['drizzle-commit'],
    });
    expect(present.rows[0]?.total).toBe(1);
  });

  test('Better Auth adapter commits and rolls back with transaction enabled', async () => {
    const user = (id: string) => ({
      id,
      name: id,
      email: `${id}@example.invalid`,
      emailVerified: false,
      createdAt: new Date('2026-09-19T00:00:00.000Z'),
      updatedAt: new Date('2026-09-19T00:00:00.000Z'),
    });

    await probe.authAdapter.transaction(async (tx) => {
      await tx.create({ model: 'user', data: user('auth-commit'), forceAllowId: true });
    });
    await expect(probe.authAdapter.transaction(async (tx) => {
      await tx.create({ model: 'user', data: user('auth-abort'), forceAllowId: true });
      throw new Error('injected auth failure');
    })).rejects.toThrow('injected auth failure');

    expect(await probe.db.select().from(probe.users).where(eq(probe.users.id, 'auth-commit'))).toHaveLength(1);
    expect(await probe.db.select().from(probe.users).where(eq(probe.users.id, 'auth-abort'))).toHaveLength(0);
    const fromOtherWriter = await probe.writerB.execute(`select id from ${probe.names.users}`);
    expect(fromOtherWriter.rows.map((row) => row.id)).toEqual(['auth-commit']);
  });

  test('two independent writers cannot both win the same revision', async () => {
    const [seenA, seenB] = await Promise.all([
      probe.writerA.execute(`select revision from ${probe.names.revisions} where id = 1`),
      probe.writerB.execute(`select revision from ${probe.names.revisions} where id = 1`),
    ]);
    expect(seenA.rows[0]?.revision).toBe(0);
    expect(seenB.rows[0]?.revision).toBe(0);

    const update = `update ${probe.names.revisions} set revision = revision + 1 where id = 1 and revision = 0`;
    const [resultA, resultB] = await Promise.all([
      probe.writerA.execute(update),
      probe.writerB.execute(update),
    ]);
    expect([resultA.rowsAffected, resultB.rowsAffected].sort()).toEqual([0, 1]);

    const [finalA, finalB] = await Promise.all([
      probe.writerA.execute(`select revision from ${probe.names.revisions} where id = 1`),
      probe.writerB.execute(`select revision from ${probe.names.revisions} where id = 1`),
    ]);
    expect(finalA.rows[0]?.revision).toBe(1);
    expect(finalB.rows[0]?.revision).toBe(1);
  });
});
