import { afterEach, expect, test } from 'vitest';
import { createClient } from '@libsql/client';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateLocal } from '../../src/persistence/migrate.js';
import { createZephyriovAuth, ensureAccountProfile } from '../../src/auth/auth.js';

const opened: Array<{ close: () => void; directory: string }> = [];

async function database() {
  const directory = await mkdtemp(join(tmpdir(), 'zephyriov-auth-'));
  const client = createClient({ url: `file:${join(directory, 'test.db')}` });
  opened.push({ close: () => client.close(), directory });
  await migrateLocal(client);
  return client;
}

afterEach(async () => {
  for (const item of opened.splice(0)) {
    item.close();
    await rm(item.directory, { recursive: true, force: true });
  }
});

test('Better Auth creates one stable product profile through its user hook', async () => {
  const client = await database();
  const auth = createZephyriovAuth(client, {
    baseURL: 'http://localhost:3000',
    secret: 'test-secret-that-is-at-least-thirty-two-characters',
  });
  const context = await auth.$context;

  const user = await context.internalAdapter.createUser({
    id: 'stable-user-id',
    name: 'First',
    email: 'FIRST@EXAMPLE.INVALID',
    emailVerified: false,
  }, { method: 'email-password' });

  expect(user.id).toBe('stable-user-id');
  expect((await client.execute("select email from user where id = 'stable-user-id'")).rows[0]?.email).toBe('first@example.invalid');
  expect((await client.execute("select * from profiles where user_id = 'stable-user-id'")).rows[0]).toMatchObject({
    user_id: 'stable-user-id', settings_version: '1', timezone: 'UTC', new_lines_per_day: 6, moves_per_block: 4, onboarded_at: null,
  });
  expect((await client.execute("select version from settings_revisions where user_id = 'stable-user-id'")).rows.map((row) => row.version)).toEqual(['1']);
  expect((await client.execute("select revision from account_revisions where user_id = 'stable-user-id'")).rows[0]?.revision).toBe('1');
});

test('profile initialization is idempotent and preserves an existing profile', async () => {
  const client = await database();
  await client.execute("insert into user (id, name, email, email_verified) values ('u1', 'One', 'one@example.invalid', 1)");

  await ensureAccountProfile(client, 'u1');
  await client.execute("update profiles set timezone = 'America/Mexico_City' where user_id = 'u1'");
  await Promise.all([ensureAccountProfile(client, 'u1'), ensureAccountProfile(client, 'u1')]);

  expect((await client.execute("select count(*) as total from profiles where user_id = 'u1'")).rows[0]?.total).toBe(1);
  expect((await client.execute("select timezone from profiles where user_id = 'u1'")).rows[0]?.timezone).toBe('America/Mexico_City');
  expect((await client.execute("select count(*) as total from settings_revisions where user_id = 'u1'")).rows[0]?.total).toBe(1);
  expect((await client.execute("select count(*) as total from account_revisions where user_id = 'u1'")).rows[0]?.total).toBe(1);
});

test('profile initialization rejects an unknown Auth user without partial rows', async () => {
  const client = await database();

  await expect(ensureAccountProfile(client, 'missing')).rejects.toThrow();

  for (const table of ['profiles', 'settings_revisions', 'account_revisions']) {
    expect((await client.execute(`select count(*) as total from ${table}`)).rows[0]?.total).toBe(0);
  }
});
