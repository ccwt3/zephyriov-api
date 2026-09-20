import { sql } from 'drizzle-orm';
import { check, foreignKey, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth-schema.js';
import { cards } from './cards-schema.js';
import { lineRevisions } from './catalog-schema.js';

const timestamp = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export const studySessions = sqliteTable('study_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  studyDate: text('study_date').notNull(),
  settingsVersion: text('settings_version').notNull(),
  timezone: text('timezone').notNull(),
  newLinesPerDay: integer('new_lines_per_day').notNull(),
  movesPerBlock: integer('moves_per_block').notNull(),
  planSeed: text('plan_seed').notNull(),
  status: text('status', { enum: ['in_progress', 'completed'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(timestamp),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(timestamp),
}, (table) => [
  uniqueIndex('study_sessions_user_date_idx').on(table.userId, table.studyDate),
  uniqueIndex('study_sessions_user_id_idx').on(table.userId, table.id),
  check('study_sessions_new_lines_range', sql`${table.newLinesPerDay} between 1 and 12`),
  check('study_sessions_moves_range', sql`${table.movesPerBlock} between 2 and 10`),
]);

export const studyItems = sqliteTable('study_items', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  sessionId: text('session_id').notNull(),
  cardId: text('card_id').notNull(),
  lineId: text('line_id').notNull(),
  lineRevisionId: text('line_revision_id').notNull(),
  logicalKey: text('logical_key').notNull(),
  originType: text('origin_type', { enum: ['new', 'review'] }).notNull(),
  attemptNumber: integer('attempt_number').notNull(),
  parentEventId: text('parent_event_id'),
  status: text('status', { enum: ['pending', 'graded', 'cancelled'] }).notNull(),
  sortOrder: integer('sort_order').notNull(),
  baseCardJson: text('base_card_json').notNull(),
  effectiveMoves: integer('effective_moves').notNull(),
  settingsVersion: text('settings_version').notNull(),
  movesPerBlock: integer('moves_per_block').notNull(),
  srsVersion: text('srs_version').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(timestamp),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(timestamp),
}, (table) => [
  uniqueIndex('study_items_user_id_idx').on(table.userId, table.id),
  uniqueIndex('study_items_user_session_id_idx').on(table.userId, table.sessionId, table.id),
  uniqueIndex('study_items_logical_idx').on(table.userId, table.sessionId, table.logicalKey),
  uniqueIndex('study_items_order_idx').on(table.userId, table.sessionId, table.sortOrder),
  uniqueIndex('study_items_line_attempt_idx').on(table.userId, table.sessionId, table.lineId, table.attemptNumber),
  index('study_items_pending_idx').on(table.userId, table.sessionId, table.status, table.sortOrder),
  foreignKey({ columns: [table.userId, table.sessionId], foreignColumns: [studySessions.userId, studySessions.id] }),
  foreignKey({ columns: [table.userId, table.cardId, table.lineId], foreignColumns: [cards.userId, cards.id, cards.lineId] }),
  foreignKey({ columns: [table.lineId, table.lineRevisionId], foreignColumns: [lineRevisions.lineId, lineRevisions.revisionId] }),
  check('study_items_attempt_positive', sql`${table.attemptNumber} > 0`),
  check('study_items_order_nonnegative', sql`${table.sortOrder} >= 0`),
  check('study_items_moves_positive', sql`${table.effectiveMoves} > 0`),
]);
