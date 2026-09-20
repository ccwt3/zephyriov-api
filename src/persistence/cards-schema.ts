import { sql } from 'drizzle-orm';
import { check, foreignKey, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth-schema.js';
import { openings, lines } from './catalog-schema.js';

const timestamp = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export const userOpenings = sqliteTable('user_openings', {
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  openingId: text('opening_id').notNull().references(() => openings.id, { onDelete: 'restrict' }),
  color: text('color', { enum: ['white', 'black'] }).notNull(),
  active: integer('active', { mode: 'boolean' }).notNull(),
  version: text('version').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(timestamp),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(timestamp),
}, (table) => [
  primaryKey({ columns: [table.userId, table.openingId] }),
  uniqueIndex('user_openings_color_idx').on(table.userId, table.openingId, table.color),
  index('user_openings_active_idx').on(table.userId, table.active),
]);

export const cards = sqliteTable('cards', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  openingId: text('opening_id').notNull(),
  lineId: text('line_id').notNull(),
  color: text('color', { enum: ['white', 'black'] }).notNull(),
  generation: text('generation').notNull(),
  contentGeneration: text('content_generation').notNull(),
  version: text('version').notNull(),
  state: text('state', { enum: ['new', 'review'] }).notNull(),
  unlockedMoves: integer('unlocked_moves').notNull(),
  intervalDays: text('interval_days').notNull(),
  dueDate: text('due_date').notNull(),
  reps: integer('reps').notNull(),
  lapses: integer('lapses').notNull(),
  lastGrade: text('last_grade', { enum: ['bad', 'mid', 'good'] }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(timestamp),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(timestamp),
}, (table) => [
  uniqueIndex('cards_user_line_idx').on(table.userId, table.lineId),
  uniqueIndex('cards_user_id_idx').on(table.userId, table.id),
  foreignKey({ columns: [table.lineId, table.openingId], foreignColumns: [lines.id, lines.openingId] }),
  foreignKey({ columns: [table.userId, table.openingId, table.color],
    foreignColumns: [userOpenings.userId, userOpenings.openingId, userOpenings.color] }),
  index('cards_due_idx').on(table.userId, table.state, table.dueDate),
  check('cards_unlocked_positive', sql`${table.unlockedMoves} > 0`),
  check('cards_reps_nonnegative', sql`${table.reps} >= 0`),
  check('cards_lapses_nonnegative', sql`${table.lapses} >= 0`),
]);
