import { check, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth-schema.js';

const timestamp = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export const profiles = sqliteTable('profiles', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'restrict' }),
  settingsVersion: text('settings_version').notNull(),
  timezone: text('timezone').notNull(),
  newLinesPerDay: integer('new_lines_per_day').notNull(),
  movesPerBlock: integer('moves_per_block').notNull(),
  onboardedAt: integer('onboarded_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(timestamp).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(timestamp).notNull(),
}, (table) => [
  check('profiles_new_lines_range', sql`${table.newLinesPerDay} between 1 and 12`),
  check('profiles_moves_range', sql`${table.movesPerBlock} between 2 and 10`),
  check('profiles_timezone_nonempty', sql`length(${table.timezone}) > 0`),
  check('profiles_settings_version_decimal', sql`length(${table.settingsVersion}) > 0 and ${table.settingsVersion} not glob '*[^0-9]*' and (${table.settingsVersion} = '0' or substr(${table.settingsVersion}, 1, 1) <> '0')`),
]);

export const settingsRevisions = sqliteTable('settings_revisions', {
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  version: text('version').notNull(),
  timezone: text('timezone').notNull(),
  newLinesPerDay: integer('new_lines_per_day').notNull(),
  movesPerBlock: integer('moves_per_block').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(timestamp).notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.version] }),
  check('settings_revisions_new_lines_range', sql`${table.newLinesPerDay} between 1 and 12`),
  check('settings_revisions_moves_range', sql`${table.movesPerBlock} between 2 and 10`),
  check('settings_revisions_timezone_nonempty', sql`length(${table.timezone}) > 0`),
  check('settings_revisions_version_decimal', sql`length(${table.version}) > 0 and ${table.version} not glob '*[^0-9]*' and (${table.version} = '0' or substr(${table.version}, 1, 1) <> '0')`),
]);

export const accountRevisions = sqliteTable('account_revisions', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'restrict' }),
  revision: text('revision').notNull().default('0'),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(timestamp).notNull(),
}, (table) => [
  check('account_revisions_decimal', sql`length(${table.revision}) > 0 and ${table.revision} not glob '*[^0-9]*' and (${table.revision} = '0' or substr(${table.revision}, 1, 1) <> '0')`),
]);
