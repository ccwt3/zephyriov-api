import { afterEach, expect, test } from 'vitest';
import { createClient } from '@libsql/client';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateLocal } from '../../src/persistence/migrate.js';

const opened: Array<{ close: () => void; directory: string }> = [];

async function database() {
  const directory = await mkdtemp(join(tmpdir(), 'zephyriov-catalog-'));
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

const run = (client: Awaited<ReturnType<typeof database>>, sql: string, args: Array<string | number> = []) =>
  client.execute({ sql, args });
const hash = 'a'.repeat(64);

async function seedCatalog(client: Awaited<ReturnType<typeof database>>) {
  await run(client, "insert into openings (id, slug, name, eco, playable_white, playable_black) values ('o1', 'one', 'One', 'A00', 1, 0)");
  await run(client, "insert into lines (id, opening_id, name) values ('l1', 'o1', 'Line')");
  await run(client, 'insert into line_revisions (revision_id, line_id, moves_json, references_json, moves_hash, content_hash, sequence_generation, white_moves, black_moves) values (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ['r1', 'l1', '[{"ply":1,"san":"e4","explanation":""}]', '[]', hash, hash, 1, 1, 0]);
}

test('B04.04 migrates an empty or B04.03 database and repeats without changing data', async () => {
  for (const preexisting of [false, true]) {
    const client = await database();
    if (preexisting) await migrateLocal(client, '001_identity_profile.sql');
    await migrateLocal(client, '002_catalog.sql');
    await seedCatalog(client);
    const before = (await run(client, "select name, sql from sqlite_master where type in ('table','index','trigger') and name not like 'sqlite_%' order by name")).rows;
    await migrateLocal(client, '002_catalog.sql');
    expect((await run(client, "select name, sql from sqlite_master where type in ('table','index','trigger') and name not like 'sqlite_%' order by name")).rows).toEqual(before);
    expect((await run(client, 'select count(*) as n from schema_migrations')).rows[0]?.n).toBe(2);
    expect((await run(client, 'select count(*) as n from line_revisions')).rows[0]?.n).toBe(1);
  }
});

test('catalog identity, revision relationship, JSON, and immutable revision are enforced', async () => {
  const client = await database();
  await migrateLocal(client, '002_catalog.sql');
  await seedCatalog(client);
  await expect(run(client, "insert into openings (id, slug, name, eco, playable_white, playable_black) values ('o2', 'one', 'Other', 'A01', 1, 0)")).rejects.toThrow();
  await expect(run(client, "insert into openings (id, slug, name, eco, playable_white, playable_black) values ('o2', '-bad', 'Other', 'A01', 1, 0)")).rejects.toThrow();
  await expect(run(client, "insert into lines (id, opening_id, name) values ('l2', 'missing', 'Line')")).rejects.toThrow();
  await expect(run(client, 'insert into line_revisions (revision_id, line_id, moves_json, references_json, moves_hash, content_hash, sequence_generation, white_moves, black_moves) values (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ['r2', 'l1', '{', '[]', hash, hash, 1, 1, 0])).rejects.toThrow();
  await expect(run(client, "update line_revisions set white_moves = 2 where revision_id = 'r1'")).rejects.toThrow();
  await expect(run(client, "delete from line_revisions where revision_id = 'r1'")).rejects.toThrow();
  await run(client, "insert into lines (id, opening_id, name) values ('l2', 'o1', 'Other')");
  await run(client, "insert into catalog_manifests (id, status, expected_line_count) values ('m1', 'staging', 1)");
  await expect(run(client, "insert into manifest_lines (manifest_id, line_id, revision_id, sort_order, active) values ('m1', 'l2', 'r1', 0, 1)")).rejects.toThrow();
});

test('head accepts only a complete prepared manifest and a failed load leaves it unchanged', async () => {
  const client = await database();
  await migrateLocal(client, '002_catalog.sql');
  await seedCatalog(client);
  await run(client, "insert into catalog_manifests (id, status, expected_line_count) values ('m1', 'staging', 1)");
  await expect(run(client, "insert into catalog_head (singleton, manifest_id) values (1, 'm1')")).rejects.toThrow();
  await run(client, "insert into manifest_lines (manifest_id, line_id, revision_id, opening_sort_order, sort_order, active) values ('m1', 'l1', 'r1', 4, 0, 1)");
  expect((await run(client, "select opening_sort_order from manifest_lines where manifest_id = 'm1'")).rows[0]?.opening_sort_order).toBe(4);
  await expect(run(client, "update catalog_manifests set status = 'validated', expected_line_count = 2 where id = 'm1'")).rejects.toThrow();
  await run(client, "update catalog_manifests set status = 'validated' where id = 'm1'");
  await run(client, "insert into catalog_head (singleton, manifest_id) values (1, 'm1')");
  await expect(run(client, "delete from manifest_lines where manifest_id = 'm1'")).rejects.toThrow();
  await expect(run(client, "update catalog_manifests set expected_line_count = 2 where id = 'm1'")).rejects.toThrow();
  await expect(run(client, "update catalog_manifests set status = 'superseded' where id = 'm1'")).rejects.toThrow();
  await run(client, "update catalog_manifests set status = 'active' where id = 'm1'");
  await expect(run(client, "update catalog_manifests set status = 'superseded' where id = 'm1'")).rejects.toThrow();

  const tx = await client.transaction('write');
  try {
    await tx.execute("insert into catalog_manifests (id, status, expected_line_count) values ('m2', 'staging', 2)");
    await tx.execute("insert into manifest_lines (manifest_id, line_id, revision_id, sort_order, active) values ('m2', 'l1', 'r1', 0, 1)");
    await tx.execute("update catalog_manifests set status = 'validated', expected_line_count = 1 where id = 'm2'");
    await tx.execute("update catalog_head set manifest_id = 'm2' where singleton = 1");
    await tx.commit();
  } catch {
    await tx.rollback();
  }
  expect((await run(client, 'select manifest_id from catalog_head')).rows[0]?.manifest_id).toBe('m1');
  expect((await run(client, "select count(*) as n from catalog_manifests where id = 'm2'")).rows[0]?.n).toBe(0);
});

test('a manifest cannot seal conflicting opening orders', async () => {
  const client = await database();
  await migrateLocal(client, '002_catalog.sql');
  await seedCatalog(client);
  await run(client, "insert into lines (id, opening_id, name) values ('l2', 'o1', 'Other')");
  await run(client, 'insert into line_revisions (revision_id, line_id, moves_json, references_json, moves_hash, content_hash, sequence_generation, white_moves, black_moves) values (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ['r2', 'l2', '[]', '[]', hash, hash, 1, 1, 0]);
  await run(client, "insert into catalog_manifests (id, status, expected_line_count) values ('m1', 'staging', 2)");
  await run(client, "insert into manifest_lines (manifest_id, line_id, revision_id, opening_sort_order, sort_order, active) values ('m1', 'l1', 'r1', 1, 0, 1), ('m1', 'l2', 'r2', 2, 1, 1)");
  await expect(run(client, "update catalog_manifests set status = 'validated' where id = 'm1'")).rejects.toThrow();
});
