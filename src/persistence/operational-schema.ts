import { sql } from 'drizzle-orm';
import { check, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth-schema.js';
import { catalogManifests } from './catalog-schema.js';

export const offlinePackages = sqliteTable('offline_packages', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  deviceId: text('device_id').notNull(),
  issuedAt: integer('issued_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
  submitUntil: integer('submit_until').notNull(),
  baseAccountRevision: text('base_account_revision').notNull(),
  manifestId: text('manifest_id').notNull().references(() => catalogManifests.id, { onDelete: 'restrict' }),
  srsVersion: text('srs_version').notNull(),
  contentHash: text('content_hash').notNull(),
  payloadJson: text('payload_json').notNull(),
}, (table) => [
  uniqueIndex('offline_packages_user_id_idx').on(table.userId, table.id),
  index('offline_packages_user_device_issued_idx').on(table.userId, table.deviceId, table.issuedAt),
  check('offline_packages_study_window', sql`${table.expiresAt} = ${table.issuedAt} + 604800000`),
  check('offline_packages_submit_window', sql`${table.submitUntil} = ${table.expiresAt} + 604800000`),
]);

export const activityDays = sqliteTable('activity_days', {
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  studyDate: text('study_date').notNull(),
  completedBlocks: integer('completed_blocks').notNull(),
  distinctLines: integer('distinct_lines').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.studyDate] }),
  index('activity_days_user_date_idx').on(table.userId, table.studyDate),
  check('activity_days_blocks_positive', sql`${table.completedBlocks} > 0`),
  check('activity_days_lines_range', sql`${table.distinctLines} > 0 and ${table.distinctLines} <= ${table.completedBlocks}`),
]);

export const rateLimitBuckets = sqliteTable('rate_limit_buckets', {
  scope: text('scope').notNull(),
  subjectKey: text('subject_key').notNull(),
  userId: text('user_id').references(() => user.id, { onDelete: 'restrict' }),
  windowStart: integer('window_start').notNull(),
  windowEnd: integer('window_end').notNull(),
  used: integer('used').notNull(),
  limitCount: integer('limit_count').notNull(),
}, (table) => [
  primaryKey({ columns: [table.scope, table.subjectKey, table.windowStart] }),
  index('rate_limit_buckets_user_window_idx').on(table.userId, table.windowEnd),
  check('rate_limit_buckets_window', sql`${table.windowEnd} > ${table.windowStart}`),
  check('rate_limit_buckets_used', sql`${table.used} >= 0 and ${table.used} <= ${table.limitCount}`),
]);

export const realtimeTickets = sqliteTable('realtime_tickets', {
  ticketHash: text('ticket_hash').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  authSessionId: text('auth_session_id').notNull(),
  issuedAt: integer('issued_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
  consumedAt: integer('consumed_at'),
}, (table) => [
  index('realtime_tickets_user_expiry_idx').on(table.userId, table.expiresAt),
  check('realtime_tickets_thirty_seconds', sql`${table.expiresAt} = ${table.issuedAt} + 30000`),
]);
