import { afterEach, expect, test } from 'vitest';
import { createClient } from '@libsql/client';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateLocal } from '../../src/persistence/migrate.js';

const opened: Array<{ close: () => void; directory: string }> = [];
async function database() {
  const directory = await mkdtemp(join(tmpdir(), 'zephyriov-cards-'));
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

async function seed(client: Awaited<ReturnType<typeof database>>) {
  await run(client, "insert into user (id, name, email, email_verified) values ('u1', 'One', 'one@example.invalid', 1), ('u2', 'Two', 'two@example.invalid', 1)");
  await run(client, "insert into openings (id, slug, name, eco, playable_white, playable_black) values ('o1', 'one', 'One', 'A00', 1, 1), ('o2', 'two', 'Two', 'B00', 1, 0)");
  await run(client, "insert into lines (id, opening_id, name) values ('l1', 'o1', 'One'), ('l2', 'o2', 'Two')");
  await run(client, "insert into user_openings (user_id, opening_id, color, active, version) values ('u1', 'o1', 'white', 1, '1'), ('u2', 'o1', 'black', 1, '1')");
}

const insertCard = 'insert into cards (id, user_id, opening_id, line_id, color, generation, content_generation, version, state, unlocked_moves, interval_days, due_date, reps, lapses, last_grade) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
const card = (id = 'c1', user = 'u1', opening = 'o1', line = 'l1', color = 'white') =>
  [id, user, opening, line, color, 'personal-1', 'editorial-1', '1', 'new', 1, '0.00', '2026-09-19', 0, 0, null] as Array<string | number | null>;

test('B04.05 migrates once after B04.04 and retains repertoire and cards on restart', async () => {
  const client = await database();
  await migrateLocal(client, '002_catalog.sql');
  await migrateLocal(client, '003_cards_repertoire.sql');
  await seed(client);
  await run(client, insertCard, card() as Array<string | number>);
  await migrateLocal(client, '003_cards_repertoire.sql');
  expect((await run(client, 'select count(*) as n from schema_migrations')).rows[0]?.n).toBe(3);
  expect((await run(client, 'select generation from cards where id = ?', ['c1'])).rows[0]?.generation).toBe('personal-1');
});

test('repertoire enforces ownership, allowed colors, versions, and retains inactive entries', async () => {
  const client = await database();
  await migrateLocal(client, '003_cards_repertoire.sql');
  await seed(client);
  await expect(run(client, "insert into user_openings (user_id, opening_id, color, active, version) values ('missing', 'o1', 'white', 1, '1')")).rejects.toThrow();
  await expect(run(client, "insert into user_openings (user_id, opening_id, color, active, version) values ('u1', 'o2', 'black', 1, '1')")).rejects.toThrow();
  await expect(run(client, "update user_openings set version = '01' where user_id = 'u1'")).rejects.toThrow();
  await run(client, "update user_openings set active = 0 where user_id = 'u1'");
  await expect(run(client, "delete from user_openings where user_id = 'u1'")).rejects.toThrow();
  expect((await run(client, "select active from user_openings where user_id = 'u1'")).rows[0]?.active).toBe(0);
});

test('cards enforce composite owner and opening, one card per line, and SRS bounds', async () => {
  const client = await database();
  await migrateLocal(client, '003_cards_repertoire.sql');
  await seed(client);
  await run(client, insertCard, card() as Array<string | number>);
  await expect(run(client, insertCard, card('c2') as Array<string | number>)).rejects.toThrow();
  await expect(run(client, insertCard, card('c2', 'u1', 'o1', 'l2') as Array<string | number>)).rejects.toThrow();
  await expect(run(client, insertCard, card('c2', 'u1', 'o1', 'l1', 'black') as Array<string | number>)).rejects.toThrow();
  await expect(run(client, insertCard, card('c2', 'u2', 'o1', 'l1', 'white') as Array<string | number>)).rejects.toThrow();
  await expect(run(client, "update cards set interval_days = '01.00' where id = 'c1'")).rejects.toThrow();
  await expect(run(client, "update cards set unlocked_moves = 0 where id = 'c1'")).rejects.toThrow();
  await expect(run(client, "update cards set generation = '' where id = 'c1'")).rejects.toThrow();
});

test('color generation reset can commit atomically; incomplete reset rolls back', async () => {
  const client = await database();
  await migrateLocal(client, '003_cards_repertoire.sql');
  await seed(client);
  await run(client, insertCard, card() as Array<string | number>);
  const failed = await client.transaction('write');
  await failed.execute("update user_openings set color = 'black', version = '2' where user_id = 'u1' and opening_id = 'o1'");
  await expect(failed.commit()).rejects.toThrow();
  await failed.rollback();
  expect((await run(client, "select color from user_openings where user_id = 'u1'")).rows[0]?.color).toBe('white');

  const tx = await client.transaction('write');
  await tx.execute("update user_openings set color = 'black', version = '2' where user_id = 'u1' and opening_id = 'o1'");
  await tx.execute("update cards set color = 'black', generation = 'personal-2', version = '2', state = 'new', unlocked_moves = 1, interval_days = '0.00', reps = 0, lapses = 0, last_grade = null where id = 'c1'");
  await tx.commit();
  expect((await run(client, "select color, generation from cards where id = 'c1'")).rows[0]).toMatchObject({ color: 'black', generation: 'personal-2' });
});
