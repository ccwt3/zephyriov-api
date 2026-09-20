import { afterEach, expect, test } from 'vitest';
import { createClient } from '@libsql/client';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateLocal } from '../../src/persistence/migrate.js';

const opened: Array<{ close: () => void; directory: string }> = [];
async function database() {
  const directory = await mkdtemp(join(tmpdir(), 'zephyriov-study-'));
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

async function seed(client: Awaited<ReturnType<typeof database>>) {
  await client.execute("insert into user (id, name, email, email_verified) values ('u1', 'One', 'one@example.invalid', 1), ('u2', 'Two', 'two@example.invalid', 1)");
  await client.execute("insert into openings (id, slug, name, eco, playable_white, playable_black) values ('o1', 'one', 'One', 'A00', 1, 1)");
  await client.execute("insert into lines (id, opening_id, name) values ('l1', 'o1', 'One')");
  await client.execute({ sql: 'insert into line_revisions (revision_id, line_id, moves_json, references_json, moves_hash, content_hash, sequence_generation, white_moves, black_moves) values (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['r1', 'l1', '[]', '[]', 'a'.repeat(64), 'b'.repeat(64), 1, 4, 4] });
  await client.execute("insert into user_openings (user_id, opening_id, color, active, version) values ('u1', 'o1', 'white', 1, '1'), ('u2', 'o1', 'black', 1, '1')");
  const card = 'insert into cards (id, user_id, opening_id, line_id, color, generation, content_generation, version, state, unlocked_moves, interval_days, due_date, reps, lapses) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  await client.execute({ sql: card, args: ['c1', 'u1', 'o1', 'l1', 'white', 'g1', 'e1', '1', 'new', 1, '0.00', '2026-09-20', 0, 0] });
  await client.execute({ sql: card, args: ['c2', 'u2', 'o1', 'l1', 'black', 'g2', 'e1', '1', 'review', 1, '1.00', '2026-09-20', 1, 0] });
}

const sessionSql = 'insert into study_sessions (id, user_id, study_date, settings_version, timezone, new_lines_per_day, moves_per_block, plan_seed, status) values (?, ?, ?, ?, ?, ?, ?, ?, ?)';
const session = (id = 's1', user = 'u1', date = '2026-09-20') =>
  [id, user, date, '1', 'UTC', 6, 4, 'seed-v1', 'in_progress'];
const itemSql = `insert into study_items
  (id, user_id, session_id, card_id, line_id, line_revision_id, logical_key, origin_type, attempt_number, parent_event_id, status, sort_order, base_card_json, effective_moves, settings_version, moves_per_block, srs_version)
  values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
const item = (id = 'i1', user = 'u1', sessionId = 's1', cardId = 'c1') =>
  [id, user, sessionId, cardId, 'l1', 'r1', `key-${id}`, 'new', 1, null, 'pending', 0,
    JSON.stringify({ id: cardId, lineId: 'l1', state: 'new', version: '1' }), 4, '1', 4, 'B03.12-v1'];

test('B04.06 migrates a fresh and an existing database once and preserves snapshots', async () => {
  const client = await database();
  await migrateLocal(client, '003_cards_repertoire.sql');
  await seed(client);
  await migrateLocal(client, '004_study.sql');
  await client.execute({ sql: sessionSql, args: session() });
  await client.execute({ sql: itemSql, args: item() });
  await migrateLocal(client, '004_study.sql');
  expect((await client.execute('select count(*) as n from schema_migrations')).rows[0]?.n).toBe(4);
  expect((await client.execute("select base_card_json from study_items where id = 'i1'")).rows[0]?.base_card_json)
    .toBe(item()[12]);
  const fresh = await database();
  await migrateLocal(fresh, '004_study.sql');
  expect((await fresh.execute("select name from sqlite_master where name = 'study_sessions'")).rows).toHaveLength(1);
});

test('one canonical session per account and day retains its pedagogy', async () => {
  const client = await database();
  await migrateLocal(client, '004_study.sql');
  await seed(client);
  await client.execute({ sql: sessionSql, args: session() });
  await expect(client.execute({ sql: sessionSql, args: session('s2') })).rejects.toThrow();
  await client.execute({ sql: sessionSql, args: session('s2', 'u2') });
  await expect(client.execute("update study_sessions set moves_per_block = 6 where id = 's1'")).rejects.toThrow();
  await expect(client.execute({ sql: sessionSql, args: session('s3', 'u1', '2026-09-31') })).rejects.toThrow();
});

test('items enforce same owner, line revision, stable origin and repeat shape', async () => {
  const client = await database();
  await migrateLocal(client, '004_study.sql');
  await seed(client);
  await client.execute({ sql: sessionSql, args: session() });
  await client.execute({ sql: itemSql, args: item() });
  await expect(client.execute({ sql: itemSql, args: item('i2', 'u2') })).rejects.toThrow();
  await expect(client.execute({ sql: itemSql, args: item('i2', 'u1', 's1', 'c2') })).rejects.toThrow();
  const badRevision = item('i2'); badRevision[5] = 'missing';
  await expect(client.execute({ sql: itemSql, args: badRevision })).rejects.toThrow();
  const badRepeat = item('i2'); badRepeat[8] = 2;
  await expect(client.execute({ sql: itemSql, args: badRepeat })).rejects.toThrow();
  await client.execute({ sql: sessionSql, args: session('s3', 'u1', '2026-09-21') });
  const missingBaseId = item('i2', 'u1', 's3'); missingBaseId[12] = JSON.stringify({ lineId: 'l1' });
  await expect(client.execute({ sql: itemSql, args: missingBaseId })).rejects.toThrow();
  await expect(client.execute("update study_items set origin_type = 'review' where id = 'i1'")).rejects.toThrow();
  await expect(client.execute({ sql: itemSql, args: item() })).rejects.toThrow();
  await expect(client.execute("update study_sessions set status = 'completed' where id = 's1'")).rejects.toThrow();
  await client.execute("update study_items set status = 'graded' where id = 'i1'");
  await expect(client.execute("update study_items set status = 'cancelled' where id = 'i1'")).rejects.toThrow();
  await client.execute("update study_sessions set status = 'completed' where id = 's1'");
  await expect(client.execute("update study_sessions set status = 'in_progress' where id = 's1'")).rejects.toThrow();
});

test('a failed session plan leaves no session or item', async () => {
  const client = await database();
  await migrateLocal(client, '004_study.sql');
  await seed(client);
  const tx = await client.transaction('write');
  await tx.execute({ sql: sessionSql, args: session() });
  await expect(tx.execute({ sql: itemSql, args: item('i1', 'u1', 's1', 'c2') })).rejects.toThrow();
  await tx.rollback();
  expect((await client.execute('select count(*) as n from study_sessions')).rows[0]?.n).toBe(0);
});
