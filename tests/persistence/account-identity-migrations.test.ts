import { afterEach, expect, test } from 'vitest';
import { createClient } from '@libsql/client';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateLocal } from '../../src/persistence/migrate.js';

const opened: ReturnType<typeof createClient>[] = [];
const directories: string[] = [];
async function database(url = ':memory:') {
  const client = createClient({ url });
  opened.push(client);
  await migrateLocal(client, '006_operational.sql');
  await client.execute("insert into user (id, name, email) values ('u1', 'One', 'one@example.invalid'), ('u2', 'Two', 'two@example.invalid')");
  return client;
}
afterEach(async () => {
  for (const client of opened.splice(0)) client.close();
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true });
});
function insert(client: ReturnType<typeof createClient>, id: string, user = 'u1', provider = 'google', subject = 'subject') {
  return client.execute({ sql: 'insert into account (id, user_id, provider_id, account_id, updated_at) values (?, ?, ?, ?, ?)',
    args: [id, user, provider, subject, 1] });
}

test('the identity migration upgrades valid data and remains idempotent', async () => {
  const client = await database();
  await insert(client, 'a1');
  const before = (await client.execute('select * from account')).rows;
  await migrateLocal(client);
  await migrateLocal(client);
  expect((await client.execute('select * from account')).rows).toEqual(before);
  expect((await client.execute('select count(*) as n from schema_migrations')).rows[0]!.n).toBe(7);
  await expect(insert(client, 'a2')).rejects.toThrow(/UNIQUE/);
  await expect(insert(client, 'a3', 'u2')).rejects.toThrow(/UNIQUE/);
  await insert(client, 'a4', 'u2', 'other-provider');
  await insert(client, 'a5', 'u2', 'google', 'other-subject');
  await expect(client.execute("update account set account_id = 'subject' where id = 'a5'")).rejects.toThrow(/UNIQUE/);
  expect((await client.execute('select count(*) as n from account')).rows[0]!.n).toBe(3);
});

test('an upgrade with duplicate identities fails without deleting data or recording the migration', async () => {
  const client = await database();
  await insert(client, 'a1');
  await insert(client, 'a2', 'u2');
  const accounts = (await client.execute('select * from account order by id')).rows;
  const schema = (await client.execute('select * from sqlite_master order by type, name')).rows;
  const journal = (await client.execute('select * from schema_migrations order by name')).rows;
  await expect(migrateLocal(client)).rejects.toThrow(/UNIQUE/);
  expect((await client.execute('select * from account order by id')).rows).toEqual(accounts);
  expect((await client.execute('select * from sqlite_master order by type, name')).rows).toEqual(schema);
  expect((await client.execute('select * from schema_migrations order by name')).rows).toEqual(journal);
});

test('independent database connections cannot assign one provider subject to two owners', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zephyriov-identity-race-'));
  directories.push(directory);
  const url = `file:${join(directory, 'test.db')}`;
  const first = await database(url);
  await migrateLocal(first);
  const second = createClient({ url });
  opened.push(second);
  const results = await Promise.allSettled([insert(first, 'a1'), insert(second, 'a2', 'u2')]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  const accounts = (await first.execute('select * from account')).rows;
  expect(accounts).toHaveLength(1);
  expect((await second.execute('select * from account')).rows).toEqual(accounts);
});
