import { sql } from 'drizzle-orm';
import { check, foreignKey, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const timestamp = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export const openings = sqliteTable('openings', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  eco: text('eco').notNull(),
  playableWhite: integer('playable_white', { mode: 'boolean' }).notNull(),
  playableBlack: integer('playable_black', { mode: 'boolean' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(timestamp),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(timestamp),
}, (table) => [check('openings_has_color', sql`${table.playableWhite} + ${table.playableBlack} > 0`)]);

export const lines = sqliteTable('lines', {
  id: text('id').primaryKey(),
  openingId: text('opening_id').notNull().references(() => openings.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(timestamp),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(timestamp),
}, (table) => [
  index('lines_opening_idx').on(table.openingId),
  uniqueIndex('lines_id_opening_idx').on(table.id, table.openingId),
]);

export const lineRevisions = sqliteTable('line_revisions', {
  revisionId: text('revision_id').primaryKey(),
  lineId: text('line_id').notNull().references(() => lines.id, { onDelete: 'restrict' }),
  movesJson: text('moves_json').notNull(),
  referencesJson: text('references_json').notNull(),
  movesHash: text('moves_hash').notNull(),
  contentHash: text('content_hash').notNull(),
  sequenceGeneration: integer('sequence_generation').notNull(),
  whiteMoves: integer('white_moves').notNull(),
  blackMoves: integer('black_moves').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(timestamp),
}, (table) => [
  uniqueIndex('line_revisions_line_revision_idx').on(table.lineId, table.revisionId),
  index('line_revisions_line_hash_idx').on(table.lineId, table.contentHash),
]);

export const catalogManifests = sqliteTable('catalog_manifests', {
  id: text('id').primaryKey(),
  status: text('status', { enum: ['staging', 'validated', 'active', 'superseded'] }).notNull().default('staging'),
  expectedLineCount: integer('expected_line_count').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(timestamp),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(timestamp),
});

export const manifestLines = sqliteTable('manifest_lines', {
  manifestId: text('manifest_id').notNull().references(() => catalogManifests.id, { onDelete: 'restrict' }),
  lineId: text('line_id').notNull().references(() => lines.id, { onDelete: 'restrict' }),
  revisionId: text('revision_id').notNull(),
  openingSortOrder: integer('opening_sort_order').notNull().default(0),
  sortOrder: integer('sort_order').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.manifestId, table.lineId] }),
  foreignKey({ columns: [table.lineId, table.revisionId], foreignColumns: [lineRevisions.lineId, lineRevisions.revisionId] }),
  index('manifest_lines_order_idx').on(table.manifestId, table.openingSortOrder, table.sortOrder, table.lineId),
]);

export const catalogHead = sqliteTable('catalog_head', {
  singleton: integer('singleton').primaryKey(),
  manifestId: text('manifest_id').notNull().references(() => catalogManifests.id, { onDelete: 'restrict' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(timestamp),
}, (table) => [check('catalog_head_singleton', sql`${table.singleton} = 1`)]);
