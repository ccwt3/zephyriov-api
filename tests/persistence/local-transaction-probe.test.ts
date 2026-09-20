import { afterEach, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { openLocalProbe } from '../../tools/b04/local-probe.mjs';

const openProbes: Array<Awaited<ReturnType<typeof openLocalProbe>>> = [];

async function probe() {
  const opened = await openLocalProbe();
  openProbes.push(opened);
  return opened;
}

afterEach(() => {
  for (const opened of openProbes.splice(0)) opened.close();
});

test('libSQL interactive transaction commits and rolls back on the same connection', async () => {
  const { client } = await probe();
  const committed = await client.transaction();
  await committed.execute({ sql: 'insert into probe_writes (id, value) values (?, ?)', args: ['driver-commit', 1] });
  await committed.commit();

  const aborted = await client.transaction();
  await aborted.execute({ sql: 'insert into probe_writes (id, value) values (?, ?)', args: ['driver-abort', 2] });
  await aborted.rollback();

  const result = await client.execute('select id from probe_writes order by id');
  expect(result.rows.map((row) => row.id)).toEqual(['driver-commit']);
});

test('Drizzle observes interim writes and reverses both writes after an injected failure', async () => {
  const { db, writes } = await probe();
  await db.transaction(async (tx) => {
    await tx.insert(writes).values({ id: 'committed', value: 1 });
    expect(await tx.select().from(writes)).toHaveLength(1);
  });

  await expect(db.transaction(async (tx) => {
    await tx.insert(writes).values({ id: 'first', value: 2 });
    await tx.insert(writes).values({ id: 'second', value: 3 });
    expect(await tx.select().from(writes)).toHaveLength(3);
    throw new Error('injected after second write');
  })).rejects.toThrow('injected after second write');

  expect((await db.select().from(writes)).map((row) => row.id)).toEqual(['committed']);
  await db.insert(writes).values({ id: 'connection-reused', value: 4 });
  expect(await db.select().from(writes)).toHaveLength(2);
});

test('Better Auth Drizzle adapter uses a real transaction when explicitly enabled', async () => {
  const { authAdapter, db, users } = await probe();
  const user = (id: string) => ({
    id,
    name: id,
    email: `${id}@example.invalid`,
    emailVerified: false,
    createdAt: new Date('2026-09-19T00:00:00.000Z'),
    updatedAt: new Date('2026-09-19T00:00:00.000Z'),
  });

  await authAdapter.transaction(async (tx) => {
    await tx.create({ model: 'user', data: user('auth-commit'), forceAllowId: true });
  });
  await expect(authAdapter.transaction(async (tx) => {
    await tx.create({ model: 'user', data: user('auth-abort'), forceAllowId: true });
    throw new Error('injected auth failure');
  })).rejects.toThrow('injected auth failure');

  expect(await db.select().from(users).where(eq(users.id, 'auth-commit'))).toHaveLength(1);
  expect(await db.select().from(users).where(eq(users.id, 'auth-abort'))).toHaveLength(0);
});
