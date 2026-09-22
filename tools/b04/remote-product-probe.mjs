import { createClient } from '@libsql/client';
import { migrateLocal } from '../../src/persistence/migrate.js';

const productTablesInDropOrder = [
  'realtime_tickets',
  'rate_limit_buckets',
  'activity_days',
  'offline_packages',
  'event_decisions',
  'study_item_mappings',
  'study_session_mappings',
  'study_event_dependencies',
  'move_attempts',
  'study_events',
  'study_items',
  'study_sessions',
  'cards',
  'user_openings',
  'catalog_head',
  'manifest_lines',
  'catalog_manifests',
  'line_revisions',
  'lines',
  'openings',
  'account_revisions',
  'settings_revisions',
  'profiles',
  'verification',
  'account',
  'session',
  'user',
  'schema_migrations',
];

const listObjects = (client) => client.execute({
  sql: "select type, name from sqlite_master where type in ('table', 'view', 'trigger') and name not like 'sqlite_%' order by type, name",
  args: [],
});

async function cleanupProductSchema(client) {
  const errors = [];
  for (const table of productTablesInDropOrder) {
    try {
      await client.execute(`drop table if exists ${table}`);
    } catch (error) {
      errors.push(error);
    }
  }
  const remaining = await listObjects(client);
  if (remaining.rows.length > 0) {
    errors.push(new Error(`B04.10 cleanup left objects: ${remaining.rows.map((row) => row.name).join(', ')}`));
  }
  if (errors.length > 0) throw new AggregateError(errors, 'B04.10 product cleanup failed');
}

async function seedProduct(client) {
  await client.execute("insert into user (id, name, email, email_verified) values ('u1', 'One', 'one@example.invalid', 1), ('u2', 'Two', 'two@example.invalid', 1)");
  await client.execute("insert into session (id, expires_at, token, user_id, updated_at) values ('auth1', 9999999999999, 'token-1', 'u1', 1), ('auth2', 9999999999999, 'token-2', 'u2', 1)");
  await client.execute("insert into profiles (user_id, settings_version, timezone, new_lines_per_day, moves_per_block) values ('u1', '1', 'UTC', 6, 4), ('u2', '1', 'UTC', 6, 4)");
  await client.execute("insert into settings_revisions (user_id, version, timezone, new_lines_per_day, moves_per_block) values ('u1', '1', 'UTC', 6, 4), ('u2', '1', 'UTC', 6, 4)");
  await client.execute("insert into account_revisions (user_id, revision) values ('u1', '0'), ('u2', '0')");
  await client.execute("insert into openings (id, slug, name, eco, playable_white, playable_black) values ('o1', 'remote-probe', 'Remote probe', 'A00', 1, 1)");
  await client.execute("insert into lines (id, opening_id, name) values ('l1', 'o1', 'Remote line')");
  await client.execute({
    sql: 'insert into line_revisions (revision_id, line_id, moves_json, references_json, moves_hash, content_hash, sequence_generation, white_moves, black_moves) values (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    args: ['r1', 'l1', '[]', '[]', 'a'.repeat(64), 'b'.repeat(64), 1, 1, 1],
  });
  await client.execute("insert into catalog_manifests (id, expected_line_count, status) values ('m1', 1, 'staging')");
  await client.execute("insert into manifest_lines (manifest_id, line_id, revision_id, opening_sort_order, sort_order, active) values ('m1', 'l1', 'r1', 0, 0, 1)");
  await client.execute("update catalog_manifests set status = 'validated' where id = 'm1'");
  await client.execute("insert into catalog_head (singleton, manifest_id) values (1, 'm1')");
  await client.execute("update catalog_manifests set status = 'active' where id = 'm1'");
  await client.execute("insert into user_openings (user_id, opening_id, color, active, version) values ('u1', 'o1', 'white', 1, '1'), ('u2', 'o1', 'black', 1, '1')");
  const cardSql = 'insert into cards (id, user_id, opening_id, line_id, color, generation, content_generation, version, state, unlocked_moves, interval_days, due_date, reps, lapses) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  await client.execute({ sql: cardSql, args: ['c1', 'u1', 'o1', 'l1', 'white', 'g1', 'cg1', '0', 'new', 1, '0.00', '2026-09-22', 0, 0] });
  await client.execute({ sql: cardSql, args: ['c2', 'u2', 'o1', 'l1', 'black', 'g2', 'cg1', '0', 'new', 1, '0.00', '2026-09-22', 0, 0] });
  await client.execute("insert into study_sessions (id, user_id, study_date, settings_version, timezone, new_lines_per_day, moves_per_block, plan_seed, status) values ('s1', 'u1', '2026-09-22', '1', 'UTC', 6, 4, 'seed-1', 'in_progress'), ('s2', 'u2', '2026-09-22', '1', 'UTC', 6, 4, 'seed-2', 'in_progress')");
  const itemSql = `insert into study_items
    (id, user_id, session_id, card_id, line_id, line_revision_id, logical_key, origin_type, attempt_number, parent_event_id, status, sort_order, base_card_json, effective_moves, settings_version, moves_per_block, srs_version)
    values (?, ?, ?, ?, 'l1', 'r1', ?, 'new', 1, null, 'pending', 0, ?, 1, '1', 4, 'B03.12-v1')`;
  await client.execute({ sql: itemSql, args: ['i1', 'u1', 's1', 'c1', 'initial-u1', JSON.stringify({ id: 'c1', lineId: 'l1' })] });
  await client.execute({ sql: itemSql, args: ['i2', 'u2', 's2', 'c2', 'initial-u2', JSON.stringify({ id: 'c2', lineId: 'l1' })] });
}

function b06Writes(eventId) {
  const completedAt = '2026-09-22T10:01:00.000Z';
  const eventPayload = JSON.stringify({
    eventId,
    deviceId: 'remote-device',
    lineId: 'l1',
    lineRevisionId: 'r1',
    studyDate: '2026-09-22',
    studyTimezone: 'UTC',
    startedAt: '2026-09-22T10:00:00.000Z',
    completedAt,
    sessionRef: { kind: 'canonical', id: 's1' },
    itemRef: { kind: 'canonical', id: 'i1' },
    packageId: null,
    dependsOnEventIds: [],
    attempts: [{ ply: 1, playedSan: 'e4', elapsedMs: 600 }],
  });
  const decision = JSON.stringify({
    eventId,
    outcome: 'applied',
    reason: 'ACCEPTED',
    sessionId: 's1',
    itemId: 'i1',
    grade: 'good',
    accountRevision: '1',
    decidedAt: completedAt,
  });
  return [
    {
      sql: `insert into study_events
        (id, user_id, device_id, payload_hash, payload_json, line_id, line_revision_id, study_date, study_timezone, started_at, completed_at, session_ref_kind, session_ref_id, item_ref_kind, item_ref_id, package_id)
        values (?, 'u1', 'remote-device', ?, ?, 'l1', 'r1', '2026-09-22', 'UTC', '2026-09-22T10:00:00.000Z', ?, 'canonical', 's1', 'canonical', 'i1', null)`,
      args: [eventId, 'c'.repeat(64), eventPayload, completedAt],
    },
    {
      sql: "insert into move_attempts (user_id, event_id, ply, played_san, elapsed_ms, expected_san, is_correct) values ('u1', ?, 1, 'e4', 600, 'e4', 1)",
      args: [eventId],
    },
    {
      sql: `insert into event_decisions
        (event_id, user_id, outcome, reason, session_id, item_id, grade, decision_json, account_revision, decided_at)
        values (?, 'u1', 'applied', 'ACCEPTED', 's1', 'i1', 'good', ?, '1', ?)`,
      args: [eventId, decision, completedAt],
    },
    { sql: "update cards set state = 'review', interval_days = '3.00', due_date = '2026-09-25', reps = 1, last_grade = 'good', version = '1' where user_id = 'u1' and id = 'c1' and version = '0'", args: [] },
    { sql: "update study_items set status = 'graded' where user_id = 'u1' and id = 'i1' and status = 'pending'", args: [] },
    { sql: "update account_revisions set revision = '1' where user_id = 'u1' and revision = '0'", args: [] },
  ];
}

export async function openRemoteProductProbe({ url, authToken }) {
  if (!url || !authToken || !url.startsWith('libsql://')) {
    throw new Error('B04.10 requires a remote libsql URL and DB token');
  }

  const writerA = createClient({ url, authToken });
  const writerB = createClient({ url, authToken });
  let ownsSchema = false;
  const cleanup = async () => {
    try {
      if (ownsSchema) await cleanupProductSchema(writerA);
    } finally {
      writerA.close();
      writerB.close();
    }
  };

  try {
    const existing = await listObjects(writerA);
    if (existing.rows.length > 0) {
      throw new Error(`B04.10 refuses a non-empty database (${existing.rows.length} objects)`);
    }
    ownsSchema = true;
    await migrateLocal(writerA);

    return {
      writerA,
      writerB,
      b06WriteCount: b06Writes('rollback-count').length,
      seedProduct: () => seedProduct(writerA),
      schemaSnapshot: async () => {
        const objects = await listObjects(writerA);
        const migrations = await writerA.execute('select count(*) as total from schema_migrations');
        return {
          migrations: Number(migrations.rows[0]?.total),
          tables: objects.rows.filter((row) => row.type === 'table').map((row) => String(row.name)),
          triggers: objects.rows.filter((row) => row.type === 'trigger').map((row) => String(row.name)),
        };
      },
      expectB06Rollback: async (failureAfter) => {
        const eventId = `rollback-${failureAfter}`;
        const writes = b06Writes(eventId);
        if (!Number.isInteger(failureAfter) || failureAfter < 1 || failureAfter > writes.length) {
          throw new RangeError('failureAfter must identify a B06 write');
        }
        const tx = await writerA.transaction('write');
        try {
          for (const [index, statement] of writes.entries()) {
            await tx.execute(statement);
            if (index + 1 === failureAfter) throw new Error(`injected after B06 write ${failureAfter}`);
          }
          throw new Error('B04.10 did not inject the requested failure');
        } catch (error) {
          await tx.rollback();
          if (!(error instanceof Error) || error.message !== `injected after B06 write ${failureAfter}`) throw error;
        }
        const state = await writerB.execute({
          sql: `select
            (select count(*) from study_events where id = ?) as events,
            (select count(*) from move_attempts where event_id = ?) as attempts,
            (select count(*) from event_decisions where event_id = ?) as decisions,
            (select status from study_items where id = 'i1') as item_status,
            (select version from cards where id = 'c1') as card_version,
            (select revision from account_revisions where user_id = 'u1') as account_revision`,
          args: [eventId, eventId, eventId],
        });
        const row = state.rows[0];
        if (row?.events !== 0 || row?.attempts !== 0 || row?.decisions !== 0 ||
            row?.item_status !== 'pending' || row?.card_version !== '0' || row?.account_revision !== '0') {
          throw new Error(`B04.10 observed a partial B06 write after failure ${failureAfter}`);
        }
      },
      cleanup,
    };
  } catch (error) {
    try {
      await cleanup();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'B04.10 setup and cleanup both failed');
    }
    throw error;
  }
}
