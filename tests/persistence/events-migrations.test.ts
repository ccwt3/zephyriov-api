import { afterEach, expect, test } from 'vitest';
import { createClient } from '@libsql/client';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateLocal } from '../../src/persistence/migrate.js';

const opened: Array<{ close: () => void; directory: string }> = [];
async function database() {
  const directory = await mkdtemp(join(tmpdir(), 'zephyriov-events-'));
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
const run = (client: Db, sql: string, args: Array<string | number | null> = []) => client.execute({ sql, args });

async function seed(client: Db) {
  await run(client, "insert into user (id, name, email, email_verified) values ('u1', 'One', 'one@example.invalid', 1), ('u2', 'Two', 'two@example.invalid', 1)");
  await run(client, "insert into openings (id, slug, name, eco, playable_white, playable_black) values ('o1', 'one', 'One', 'A00', 1, 1)");
  await run(client, "insert into lines (id, opening_id, name) values ('l1', 'o1', 'One')");
  await run(client, 'insert into line_revisions (revision_id, line_id, moves_json, references_json, moves_hash, content_hash, sequence_generation, white_moves, black_moves) values (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ['r1', 'l1', '[]', '[]', 'a'.repeat(64), 'b'.repeat(64), 1, 4, 4]);
  await run(client, "insert into user_openings (user_id, opening_id, color, active, version) values ('u1', 'o1', 'white', 1, '1'), ('u2', 'o1', 'black', 1, '1')");
  const cardSql = 'insert into cards (id, user_id, opening_id, line_id, color, generation, content_generation, version, state, unlocked_moves, interval_days, due_date, reps, lapses) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  await run(client, cardSql, ['c1', 'u1', 'o1', 'l1', 'white', 'g1', 'e1', '1', 'new', 1, '0.00', '2026-09-20', 0, 0]);
  await run(client, cardSql, ['c2', 'u2', 'o1', 'l1', 'black', 'g2', 'e1', '1', 'review', 1, '1.00', '2026-09-20', 1, 0]);
  await run(client, "insert into study_sessions (id, user_id, study_date, settings_version, timezone, new_lines_per_day, moves_per_block, plan_seed, status) values ('s1', 'u1', '2026-09-20', '1', 'UTC', 6, 4, 'seed', 'in_progress'), ('s2', 'u2', '2026-09-20', '1', 'UTC', 6, 4, 'seed', 'in_progress')");
  const itemSql = `insert into study_items (id, user_id, session_id, card_id, line_id, line_revision_id, logical_key, origin_type, attempt_number, parent_event_id, status, sort_order, base_card_json, effective_moves, settings_version, moves_per_block, srs_version)
    values (?, ?, ?, ?, 'l1', 'r1', ?, ?, 1, null, 'pending', 0, ?, 4, '1', 4, 'B03.12-v1')`;
  await run(client, itemSql, ['i1', 'u1', 's1', 'c1', 'initial-1', 'new', '{"id":"c1","lineId":"l1"}']);
  await run(client, itemSql, ['i2', 'u2', 's2', 'c2', 'initial-2', 'review', '{"id":"c2","lineId":"l1"}']);
}

const eventSql = `insert into study_events (id, user_id, device_id, payload_hash, payload_json, line_id, line_revision_id, study_date, study_timezone, started_at, completed_at, session_ref_kind, session_ref_id, item_ref_kind, item_ref_id, package_id)
  values (?, ?, ?, ?, ?, 'l1', 'r1', '2026-09-20', 'UTC', '2026-09-20T10:00:00.000Z', '2026-09-20T10:02:00.000Z', 'canonical', ?, 'canonical', ?, null)`;
const event = (id = 'e1', user = 'u1', dependsOnEventIds: string[] = [], sessionId = user === 'u1' ? 's1' : 's2', itemId = user === 'u1' ? 'i1' : 'i2') =>
  [id, user, 'device-1', 'a'.repeat(64), JSON.stringify({
    eventId: id, deviceId: 'device-1', lineId: 'l1', lineRevisionId: 'r1', studyDate: '2026-09-20',
    studyTimezone: 'UTC', startedAt: '2026-09-20T10:00:00.000Z', completedAt: '2026-09-20T10:02:00.000Z',
    sessionRef: { kind: 'canonical', id: sessionId }, itemRef: { kind: 'canonical', id: itemId }, packageId: null,
    dependsOnEventIds, attempts: [
      { ply: 1, playedSan: 'e4', elapsedMs: 1000 },
      { ply: 2, playedSan: 'Nf3', elapsedMs: 900 },
    ],
  }), sessionId, itemId];
const decisionSql = `insert into event_decisions (event_id, user_id, outcome, reason, session_id, item_id, grade, decision_json, account_revision, decided_at)
  values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
const decision = (eventId = 'e1', user = 'u1', itemId = 'i1') =>
  [eventId, user, 'applied', 'ACCEPTED', 's1', itemId, 'bad', JSON.stringify({
    eventId, outcome: 'applied', reason: 'ACCEPTED', sessionId: 's1', itemId, grade: 'bad',
    accountRevision: '2', decidedAt: '2026-09-20T10:02:01.000Z',
  }), '2', '2026-09-20T10:02:01.000Z'];

test('B04.07 migrates fresh and existing databases once; original receipt is immutable', async () => {
  const client = await database();
  await migrateLocal(client, '004_study.sql');
  await seed(client);
  await migrateLocal(client, '005_events.sql');
  await run(client, eventSql, event());
  await run(client, decisionSql, decision());
  await migrateLocal(client, '005_events.sql');
  expect((await run(client, 'select count(*) as n from schema_migrations')).rows[0]?.n).toBe(5);
  expect((await run(client, "select decision_json from event_decisions where event_id = 'e1'")).rows[0]?.decision_json).toBe(decision()[7]);
  await expect(run(client, eventSql, event())).rejects.toThrow();
  const altered = event('other'); altered[4] = JSON.stringify({ eventId: 'other', lineId: 'different', dependsOnEventIds: [], attempts: [] });
  await expect(run(client, eventSql, altered)).rejects.toThrow();
  const missingDevice = event('missing');
  const missingDeviceJson = JSON.parse(String(missingDevice[4]));
  delete missingDeviceJson.deviceId;
  missingDevice[4] = JSON.stringify(missingDeviceJson);
  await expect(run(client, eventSql, missingDevice)).rejects.toThrow();
  await run(client, eventSql, event('e-other'));
  const alteredDecision = decision('e-other'); alteredDecision[7] = JSON.stringify({ eventId: 'e-other', outcome: 'practice', reason: 'STALE_CARD' });
  await expect(run(client, decisionSql, alteredDecision)).rejects.toThrow();
  const missingReason = decision('e-other');
  const missingReasonJson = JSON.parse(String(missingReason[7]));
  delete missingReasonJson.reason;
  missingReason[7] = JSON.stringify(missingReasonJson);
  await expect(run(client, decisionSql, missingReason)).rejects.toThrow();
  await expect(run(client, "update event_decisions set grade = 'good' where event_id = 'e1'")).rejects.toThrow();
  await expect(run(client, "delete from study_events where id = 'e1'")).rejects.toThrow();
  const fresh = await database();
  await migrateLocal(fresh, '005_events.sql');
  expect((await run(fresh, "select name from sqlite_master where name = 'event_decisions'")).rows).toHaveLength(1);
});

test('dependencies allow pending parents but reject duplicates, cycles and cross-account parents', async () => {
  const client = await database();
  await migrateLocal(client, '005_events.sql');
  await seed(client);
  await run(client, eventSql, event('e1', 'u1', ['later', 'e2']));
  expect((await run(client, "select depends_on_event_id from study_event_dependencies where event_id = 'e1' order by depends_on_event_id")).rows.map((row) => row.depends_on_event_id)).toEqual(['e2', 'later']);
  await expect(run(client, eventSql, event('e2', 'u1', ['e1']))).rejects.toThrow();
  expect((await run(client, "select count(*) as n from study_events where id = 'e2'")).rows[0]?.n).toBe(0);
  await run(client, eventSql, event('e3', 'u2'));
  const dependency = 'insert into study_event_dependencies (user_id, event_id, depends_on_event_id) values (?, ?, ?)';
  await expect(run(client, dependency, ['u1', 'e1', 'e2'])).rejects.toThrow();
  await expect(run(client, dependency, ['u1', 'e1', 'undeclared'])).rejects.toThrow();
  await expect(run(client, dependency, ['u1', 'e1', 'e3'])).rejects.toThrow();
  await expect(run(client, dependency, ['u2', 'e1', 'e3'])).rejects.toThrow();
  await expect(run(client, eventSql, event('e4', 'u1', ['e3']))).rejects.toThrow();
  await expect(run(client, eventSql, event('e5', 'u1', ['e2', 'e2']))).rejects.toThrow();
  await expect(run(client, eventSql, event('later', 'u2'))).rejects.toThrow();
  await expect(run(client, eventSql, event('cross', 'u1', [], 's2', 'i2'))).rejects.toThrow();
});

test('practice and invalid decisions retain distinct reasons without consuming the applied item key', async () => {
  const client = await database();
  await migrateLocal(client, '005_events.sql');
  await seed(client);
  await run(client, eventSql, event('p1'));
  await run(client, eventSql, event('p2'));
  const result = (id: string, outcome: string, reason: string) => [id, 'u1', outcome, reason, 's1', 'i1', null,
    JSON.stringify({ eventId: id, outcome, reason, sessionId: 's1', itemId: 'i1', grade: null, accountRevision: '2', decidedAt: '2026-09-20T10:02:01.000Z' }),
    '2', '2026-09-20T10:02:01.000Z'];
  await run(client, decisionSql, result('p1', 'practice', 'STALE_CARD'));
  await run(client, decisionSql, result('p2', 'invalid', 'INVALID_ATTEMPTS'));
  await expect(run(client, decisionSql, result('p2', 'invalid', 'STALE_CARD'))).rejects.toThrow();
  await run(client, eventSql, event('e1'));
  await run(client, decisionSql, decision());
  expect((await run(client, "select count(*) as n from event_decisions where item_id = 'i1'")).rows[0]?.n).toBe(3);
});

test('verified move attempts retain one immutable result per ply and owner', async () => {
  const client = await database();
  await migrateLocal(client, '005_events.sql');
  await seed(client);
  await run(client, eventSql, event());
  const attempt = 'insert into move_attempts (user_id, event_id, ply, played_san, elapsed_ms, expected_san, is_correct) values (?, ?, ?, ?, ?, ?, ?)';
  await run(client, attempt, ['u1', 'e1', 1, 'e4', 1000, 'e4', 1]);
  await expect(run(client, attempt, ['u1', 'e1', 2, 'Nc3', 900, 'Nc3', 1])).rejects.toThrow();
  await run(client, attempt, ['u1', 'e1', 2, 'Nf3', 900, 'Nc3', 0]);
  await expect(run(client, attempt, ['u1', 'e1', 1, 'e4', 1000, 'e4', 1])).rejects.toThrow();
  await expect(run(client, attempt, ['u2', 'e1', 3, 'd4', 900, 'd4', 1])).rejects.toThrow();
  await expect(run(client, attempt, ['u1', 'e1', 3, 'd4', -1, 'd4', 1])).rejects.toThrow();
  await expect(run(client, attempt, ['u1', 'e1', 3, 'd4', 900, 'd4', 1])).rejects.toThrow();
  await expect(run(client, "update move_attempts set is_correct = 1 where ply = 2")).rejects.toThrow();
  expect((await run(client, "select count(*) as n from move_attempts where event_id = 'e1'")).rows[0]?.n).toBe(2);
});

test('local reference mappings are stable and constrained to one account', async () => {
  const client = await database();
  await migrateLocal(client, '005_events.sql');
  await seed(client);
  await run(client, "insert into study_session_mappings (user_id, device_id, local_id, session_id) values ('u1', 'd1', 'local-s', 's1')");
  await run(client, "insert into study_item_mappings (user_id, device_id, local_id, local_session_id, session_id, item_id) values ('u1', 'd1', 'local-i', 'local-s', 's1', 'i1')");
  await expect(run(client, "insert into study_session_mappings (user_id, device_id, local_id, session_id) values ('u1', 'd1', 'local-s', 's2')")).rejects.toThrow();
  await expect(run(client, "insert into study_item_mappings (user_id, device_id, local_id, local_session_id, session_id, item_id) values ('u1', 'd1', 'other', 'local-s', 's2', 'i2')")).rejects.toThrow();
  await expect(run(client, "update study_item_mappings set item_id = 'i2' where local_id = 'local-i'")).rejects.toThrow();
});

test('one applied decision per item; repeat keeps parent origin and sequence', async () => {
  const client = await database();
  await migrateLocal(client, '005_events.sql');
  await seed(client);
  await run(client, eventSql, event('e1'));
  await run(client, decisionSql, decision());
  await run(client, eventSql, event('e2'));
  await expect(run(client, decisionSql, decision('e2'))).rejects.toThrow();
  await expect(run(client, decisionSql, decision('e2', 'u1', 'i2'))).rejects.toThrow();
  const repeatSql = `insert into study_items (id, user_id, session_id, card_id, line_id, line_revision_id, logical_key, origin_type, attempt_number, parent_event_id, status, sort_order, base_card_json, effective_moves, settings_version, moves_per_block, srs_version)
    values (?, 'u1', 's1', 'c1', 'l1', 'r1', ?, ?, ?, 'e1', 'pending', 1, '{"id":"c1","lineId":"l1"}', 4, '1', 4, 'B03.12-v1')`;
  await expect(run(client, repeatSql, ['i3', 'repeat-bad', 'review', 2])).rejects.toThrow();
  await expect(run(client, repeatSql, ['i3', 'repeat-bad', 'new', 3])).rejects.toThrow();
  await run(client, repeatSql, ['i3', 'repeat-good', 'new', 2]);
  expect((await run(client, "select origin_type, attempt_number from study_items where id = 'i3'")).rows[0])
    .toMatchObject({ origin_type: 'new', attempt_number: 2 });
});

test('failed event decision transaction leaves neither event nor decision', async () => {
  const client = await database();
  await migrateLocal(client, '005_events.sql');
  await seed(client);
  const tx = await client.transaction('write');
  await tx.execute({ sql: eventSql, args: event() });
  await expect(tx.execute({ sql: decisionSql, args: decision('e1', 'u1', 'i2') })).rejects.toThrow();
  await tx.rollback();
  expect((await run(client, 'select count(*) as n from study_events')).rows[0]?.n).toBe(0);
});
