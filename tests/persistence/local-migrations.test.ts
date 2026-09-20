import { afterEach, expect, test } from 'vitest';
import { createClient } from '@libsql/client';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getAuthTables } from 'better-auth/db';
import { drizzle } from 'drizzle-orm/libsql';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { migrateLocal } from '../../src/persistence/migrate.js';
import * as authSchema from '../../src/persistence/auth-schema.js';

const opened: Array<{ close: () => void; directory: string }> = [];

async function database() {
  const directory = await mkdtemp(join(tmpdir(), 'zephyriov-b04-'));
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

async function schemaSnapshot(client: Awaited<ReturnType<typeof database>>) {
  const rows = await client.execute("select type, name, tbl_name, sql from sqlite_master where name not like 'sqlite_%' order by type, name");
  return rows.rows.map((row) => ({ ...row }));
}

test('empty local database gets the effective Better Auth tables and personal tables once', async () => {
  const client = await database();
  await migrateLocal(client, '001_identity_profile.sql');
  const tables = new Set((await client.execute("select name from sqlite_master where type = 'table'")).rows.map((row) => row.name));
  expect(tables).toEqual(new Set(['user', 'session', 'account', 'verification', 'profiles', 'settings_revisions', 'account_revisions', 'schema_migrations']));

  for (const [model, definition] of Object.entries(getAuthTables({}))) {
    const columns = new Set((await client.execute(`pragma table_info(${model})`)).rows.map((row) => row.name));
    expect(columns).toEqual(new Set(['id', ...Object.values(definition.fields).map((field) => field.fieldName!.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`))]));
  }

  await client.execute({ sql: 'insert into user (id, name, email, email_verified) values (?, ?, ?, ?)', args: ['u1', 'First', 'first@example.invalid', 1] });
  await client.execute({ sql: 'insert into profiles (user_id, settings_version, timezone, new_lines_per_day, moves_per_block) values (?, ?, ?, ?, ?)', args: ['u1', '1', 'UTC', 6, 4] });
  const before = await schemaSnapshot(client);
  await migrateLocal(client, '001_identity_profile.sql');
  expect(await schemaSnapshot(client)).toEqual(before);
  expect((await client.execute('select count(*) as count from user')).rows[0]?.count).toBe(1);
  expect((await client.execute('select count(*) as count from schema_migrations')).rows[0]?.count).toBe(1);
});

test('identity and personal tables enforce unique keys, foreign keys, and settings bounds', async () => {
  const client = await database();
  await migrateLocal(client, '001_identity_profile.sql');
  const run = (sql: string, args: Array<string | number>) => client.execute({ sql, args });
  await run('insert into user (id, name, email, email_verified) values (?, ?, ?, ?)', ['u1', 'First', 'first@example.invalid', 1]);
  await run('insert into user (id, name, email, email_verified) values (?, ?, ?, ?)', ['u2', 'Second', 'second@example.invalid', 0]);
  await expect(run('insert into user (id, name, email, email_verified) values (?, ?, ?, ?)', ['u3', 'Third', 'first@example.invalid', 0])).rejects.toThrow();
  await expect(run('insert into session (id, expires_at, token, user_id, updated_at) values (?, ?, ?, ?, ?)', ['s1', 1000, 'token', 'missing', 1000])).rejects.toThrow();
  await run('insert into session (id, expires_at, token, user_id, updated_at) values (?, ?, ?, ?, ?)', ['s1', 1000, 'token', 'u1', 1000]);
  await expect(run('insert into session (id, expires_at, token, user_id, updated_at) values (?, ?, ?, ?, ?)', ['s2', 1000, 'token', 'u2', 1000])).rejects.toThrow();
  await expect(run('insert into profiles (user_id, settings_version, timezone, new_lines_per_day, moves_per_block) values (?, ?, ?, ?, ?)', ['missing', '1', 'UTC', 6, 4])).rejects.toThrow();
  await expect(run('insert into profiles (user_id, settings_version, timezone, new_lines_per_day, moves_per_block) values (?, ?, ?, ?, ?)', ['u1', '1', 'UTC', 0, 4])).rejects.toThrow();
  await expect(run('insert into profiles (user_id, settings_version, timezone, new_lines_per_day, moves_per_block) values (?, ?, ?, ?, ?)', ['u1', '1', 'UTC', 6, 11])).rejects.toThrow();
  await run('insert into profiles (user_id, settings_version, timezone, new_lines_per_day, moves_per_block) values (?, ?, ?, ?, ?)', ['u1', '1', 'UTC', 6, 4]);
  await expect(run('insert into profiles (user_id, settings_version, timezone, new_lines_per_day, moves_per_block) values (?, ?, ?, ?, ?)', ['u1', '1', 'UTC', 6, 4])).rejects.toThrow();
  await expect(run('insert into settings_revisions (user_id, version, timezone, new_lines_per_day, moves_per_block) values (?, ?, ?, ?, ?)', ['u2', '01', 'UTC', 6, 4])).rejects.toThrow();
  await run('insert into settings_revisions (user_id, version, timezone, new_lines_per_day, moves_per_block) values (?, ?, ?, ?, ?)', ['u1', '1', 'UTC', 6, 4]);
  await expect(run('insert into settings_revisions (user_id, version, timezone, new_lines_per_day, moves_per_block) values (?, ?, ?, ?, ?)', ['u1', '1', 'UTC', 6, 4])).rejects.toThrow();
  await expect(run('insert into account_revisions (user_id, revision) values (?, ?)', ['u2', '-1'])).rejects.toThrow();
  await run('insert into account_revisions (user_id, revision) values (?, ?)', ['u1', '9']);
  await run('update account_revisions set revision = ? where user_id = ?', ['10', 'u1']);
  await expect(run('update account_revisions set revision = ? where user_id = ?', ['9', 'u1'])).rejects.toThrow();
  await expect(run('update settings_revisions set timezone = ? where user_id = ?', ['Europe/Madrid', 'u1'])).rejects.toThrow();
});

test('the installed Better Auth adapter writes against the migrated identity schema', async () => {
  const client = await database();
  await migrateLocal(client, '001_identity_profile.sql');
  const db = drizzle({ client, schema: authSchema });
  const adapter = drizzleAdapter(db, { provider: 'sqlite', schema: authSchema, transaction: true })({});
  const now = new Date('2026-09-19T00:00:00.000Z');
  await adapter.transaction(async (tx) => {
    await tx.create({ model: 'user', forceAllowId: true, data: {
      id: 'u1', name: 'First', email: 'first@example.invalid', emailVerified: true,
      createdAt: now, updatedAt: now,
    } });
    await tx.create({ model: 'session', forceAllowId: true, data: {
      id: 's1', token: 'opaque-token', userId: 'u1', expiresAt: now,
      createdAt: now, updatedAt: now,
    } });
  });
  expect((await client.execute('select user_id from session where id = ?', ['s1'])).rows[0]?.user_id).toBe('u1');
});

test('representative account initialization rolls back every row after a failure', async () => {
  const client = await database();
  await migrateLocal(client, '001_identity_profile.sql');
  await client.execute({ sql: 'insert into user (id, name, email, email_verified) values (?, ?, ?, ?)', args: ['u1', 'First', 'first@example.invalid', 1] });
  const tx = await client.transaction('write');
  try {
    await tx.execute({ sql: 'insert into profiles (user_id, settings_version, timezone, new_lines_per_day, moves_per_block) values (?, ?, ?, ?, ?)', args: ['u1', '1', 'UTC', 6, 4] });
    await tx.execute({ sql: 'insert into settings_revisions (user_id, version, timezone, new_lines_per_day, moves_per_block) values (?, ?, ?, ?, ?)', args: ['u1', '1', 'UTC', 6, 4] });
    await tx.execute({ sql: 'insert into account_revisions (user_id, revision) values (?, ?)', args: ['u1', '-1'] });
    await tx.commit();
  } catch {
    await tx.rollback();
  }
  for (const table of ['profiles', 'settings_revisions', 'account_revisions']) {
    expect((await client.execute(`select count(*) as count from ${table}`)).rows[0]?.count).toBe(0);
  }
});

test('a failed migration rolls back earlier DDL and its journal entry', async () => {
  const client = await database();
  await client.execute('create table account (collision integer)');
  await expect(migrateLocal(client, '001_identity_profile.sql')).rejects.toThrow();
  const tables = (await client.execute("select name from sqlite_master where type = 'table' order by name")).rows.map((row) => row.name);
  expect(tables).toEqual(['account']);
});
