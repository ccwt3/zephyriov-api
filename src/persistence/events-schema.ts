import { sql } from 'drizzle-orm';
import { check, foreignKey, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth-schema.js';
import { lineRevisions } from './catalog-schema.js';
import { studyItems, studySessions } from './study-schema.js';

const timestamp = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export const studyEvents = sqliteTable('study_events', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  deviceId: text('device_id').notNull(),
  payloadHash: text('payload_hash').notNull(),
  payloadJson: text('payload_json').notNull(),
  lineId: text('line_id').notNull(),
  lineRevisionId: text('line_revision_id').notNull(),
  studyDate: text('study_date').notNull(),
  studyTimezone: text('study_timezone').notNull(),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at').notNull(),
  sessionRefKind: text('session_ref_kind', { enum: ['canonical', 'local'] }).notNull(),
  sessionRefId: text('session_ref_id').notNull(),
  itemRefKind: text('item_ref_kind', { enum: ['canonical', 'local'] }).notNull(),
  itemRefId: text('item_ref_id').notNull(),
  packageId: text('package_id'),
  receivedAt: integer('received_at', { mode: 'timestamp_ms' }).notNull().default(timestamp),
}, (table) => [
  uniqueIndex('study_events_user_id_idx').on(table.userId, table.id),
  index('study_events_user_received_idx').on(table.userId, table.receivedAt),
  foreignKey({ columns: [table.lineId, table.lineRevisionId], foreignColumns: [lineRevisions.lineId, lineRevisions.revisionId] }),
  check('study_events_hash_length', sql`length(${table.payloadHash}) = 64`),
]);

export const moveAttempts = sqliteTable('move_attempts', {
  userId: text('user_id').notNull(),
  eventId: text('event_id').notNull(),
  ply: integer('ply').notNull(),
  playedSan: text('played_san').notNull(),
  elapsedMs: integer('elapsed_ms').notNull(),
  expectedSan: text('expected_san'),
  isCorrect: integer('is_correct', { mode: 'boolean' }),
}, (table) => [
  primaryKey({ columns: [table.userId, table.eventId, table.ply] }),
  foreignKey({ columns: [table.userId, table.eventId], foreignColumns: [studyEvents.userId, studyEvents.id] }),
  check('move_attempts_ply_positive', sql`${table.ply} > 0`),
  check('move_attempts_elapsed_nonnegative', sql`${table.elapsedMs} >= 0`),
]);

export const studyEventDependencies = sqliteTable('study_event_dependencies', {
  userId: text('user_id').notNull(),
  eventId: text('event_id').notNull(),
  dependsOnEventId: text('depends_on_event_id').notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.eventId, table.dependsOnEventId] }),
  foreignKey({ columns: [table.userId, table.eventId], foreignColumns: [studyEvents.userId, studyEvents.id] }),
  index('study_event_dependencies_parent_idx').on(table.userId, table.dependsOnEventId),
  check('study_event_dependencies_not_self', sql`${table.eventId} <> ${table.dependsOnEventId}`),
]);

export const studySessionMappings = sqliteTable('study_session_mappings', {
  userId: text('user_id').notNull(),
  deviceId: text('device_id').notNull(),
  localId: text('local_id').notNull(),
  sessionId: text('session_id').notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.deviceId, table.localId] }),
  uniqueIndex('study_session_mappings_target_idx').on(table.userId, table.deviceId, table.localId, table.sessionId),
  foreignKey({ columns: [table.userId, table.sessionId], foreignColumns: [studySessions.userId, studySessions.id] }),
]);

export const studyItemMappings = sqliteTable('study_item_mappings', {
  userId: text('user_id').notNull(),
  deviceId: text('device_id').notNull(),
  localId: text('local_id').notNull(),
  localSessionId: text('local_session_id').notNull(),
  sessionId: text('session_id').notNull(),
  itemId: text('item_id').notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.deviceId, table.localId] }),
  foreignKey({ columns: [table.userId, table.deviceId, table.localSessionId, table.sessionId],
    foreignColumns: [studySessionMappings.userId, studySessionMappings.deviceId, studySessionMappings.localId, studySessionMappings.sessionId] }),
  foreignKey({ columns: [table.userId, table.sessionId, table.itemId],
    foreignColumns: [studyItems.userId, studyItems.sessionId, studyItems.id] }),
]);

export const eventDecisions = sqliteTable('event_decisions', {
  eventId: text('event_id').primaryKey(),
  userId: text('user_id').notNull(),
  outcome: text('outcome', { enum: ['applied', 'practice', 'invalid'] }).notNull(),
  reason: text('reason').notNull(),
  sessionId: text('session_id'),
  itemId: text('item_id'),
  grade: text('grade', { enum: ['bad', 'mid', 'good'] }),
  decisionJson: text('decision_json').notNull(),
  accountRevision: text('account_revision').notNull(),
  decidedAt: text('decided_at').notNull(),
}, (table) => [
  uniqueIndex('event_decisions_applied_item_idx').on(table.userId, table.itemId).where(sql`${table.outcome} = 'applied'`),
  foreignKey({ columns: [table.userId, table.eventId], foreignColumns: [studyEvents.userId, studyEvents.id] }),
  foreignKey({ columns: [table.userId, table.sessionId], foreignColumns: [studySessions.userId, studySessions.id] }),
  foreignKey({ columns: [table.userId, table.sessionId, table.itemId], foreignColumns: [studyItems.userId, studyItems.sessionId, studyItems.id] }),
]);
