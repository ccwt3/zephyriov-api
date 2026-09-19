import * as z from 'zod';
import { CivilDateSchema, ColorSchema, IdSchema } from './primitives.mjs';

export const ContentHashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const NonnegativeIntegerSchema = z.number().int().nonnegative();
const PositiveIntegerSchema = z.number().int().positive();
const DisplayTextSchema = z.string().min(1);

export const OpeningSummarySchema = z.strictObject({
  id: IdSchema,
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: DisplayTextSchema,
  eco: z.string().regex(/^[A-E][0-9]{2}$/),
  playableColors: z.array(ColorSchema).min(1).max(2)
    .refine((colors) => new Set(colors).size === colors.length),
  lineCount: NonnegativeIntegerSchema,
  manifestId: IdSchema,
  sortOrder: NonnegativeIntegerSchema,
});

export const LineSummarySchema = z.strictObject({
  id: IdSchema,
  openingId: IdSchema,
  name: DisplayTextSchema,
  sortOrder: NonnegativeIntegerSchema,
  revisionId: IdSchema,
  movesHash: ContentHashSchema,
  contentHash: ContentHashSchema,
  totalStudentMovesByColor: z.strictObject({
    white: NonnegativeIntegerSchema,
    black: NonnegativeIntegerSchema,
  }),
});

export const LineRevisionSchema = LineSummarySchema.extend({
  moves: z.array(z.strictObject({
    ply: PositiveIntegerSchema,
    san: DisplayTextSchema,
    explanation: z.string(),
  })),
  references: z.array(z.strictObject({
    title: DisplayTextSchema,
    url: z.url().optional(),
    citation: DisplayTextSchema,
    consultedAt: CivilDateSchema,
    coverage: DisplayTextSchema,
    limitations: z.string(),
  })),
});

export const CatalogOpeningSchema = OpeningSummarySchema.extend({
  lines: z.array(LineSummarySchema),
}).refine((opening) => opening.lines.length === opening.lineCount &&
  opening.lines.every((line) => line.openingId === opening.id));

export const CatalogPageSchema = z.strictObject({
  manifestId: IdSchema,
  openings: z.array(CatalogOpeningSchema),
  nextCursor: z.string().min(1).nullable(),
}).refine((page) => page.openings.every((opening) => opening.manifestId === page.manifestId) &&
  new Set(page.openings.map((opening) => opening.id)).size === page.openings.length &&
  (page.nextCursor === null || cursorMatchesManifest(page.nextCursor, page.manifestId)));

function cursorMatchesManifest(cursor, manifestId) {
  try {
    return decodeCatalogCursor(cursor).manifestId === manifestId;
  } catch {
    return false;
  }
}

const CursorPayloadSchema = z.strictObject({
  manifestId: IdSchema,
  sortOrder: NonnegativeIntegerSchema,
  id: IdSchema,
});

export function encodeCatalogCursor(payload) {
  const valid = CursorPayloadSchema.parse(payload);
  return encodeURIComponent(JSON.stringify(valid));
}

export function decodeCatalogCursor(cursor) {
  if (typeof cursor !== 'string' || cursor.length < 1 || cursor.length > 2048) {
    throw new Error('Invalid catalog cursor');
  }
  try {
    const decoded = decodeURIComponent(cursor);
    if (encodeURIComponent(decoded) !== cursor) throw new Error('Noncanonical cursor');
    return CursorPayloadSchema.parse(JSON.parse(decoded));
  } catch {
    throw new Error('Invalid catalog cursor');
  }
}

export const CatalogQuerySchema = z.strictObject({
  cursor: z.string().min(1).max(2048).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  manifestId: IdSchema.optional(),
});

export const LineRevisionQuerySchema = z.strictObject({
  revisionId: IdSchema.optional(),
  ifNoneMatch: z.string().optional(),
});

export function lineRevisionEtag(contentHash) {
  return `"${ContentHashSchema.parse(contentHash)}"`;
}

export const LineRevisionResponseSchema = z.discriminatedUnion('status', [
  z.strictObject({
    status: z.literal(200),
    etag: z.string().regex(/^"[a-f0-9]{64}"$/),
    body: LineRevisionSchema,
  }).refine((response) => response.etag === lineRevisionEtag(response.body.contentHash)),
  z.strictObject({
    status: z.literal(304),
    etag: z.string().regex(/^"[a-f0-9]{64}"$/),
    body: z.null(),
  }),
]);

/** Reference page ordering; a cursor belongs to exactly one manifest. */
export function paginateCatalog(openings, manifestId, query = {}) {
  IdSchema.parse(manifestId);
  const { cursor, limit, manifestId: requestedManifest } = CatalogQuerySchema.parse(query);
  if (requestedManifest !== undefined && requestedManifest !== manifestId) {
    throw new Error('Catalog manifest changed');
  }
  const after = cursor === undefined ? null : decodeCatalogCursor(cursor);
  if (after !== null && after.manifestId !== manifestId) {
    throw new Error('Catalog manifest changed');
  }
  const sorted = openings.map((opening) => CatalogOpeningSchema.parse(opening))
    .sort((a, b) => a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (sorted.some((opening) => opening.manifestId !== manifestId)) {
    throw new Error('Catalog manifest changed');
  }
  if (new Set(sorted.map((opening) => opening.id)).size !== sorted.length) {
    throw new Error('Duplicate catalog opening');
  }
  const remaining = after === null ? sorted : sorted.filter((opening) =>
    opening.sortOrder > after.sortOrder ||
    (opening.sortOrder === after.sortOrder && opening.id > after.id));
  const page = remaining.slice(0, limit);
  const last = page.at(-1);
  const nextCursor = remaining.length > page.length && last !== undefined
    ? encodeCatalogCursor({ manifestId, sortOrder: last.sortOrder, id: last.id })
    : null;
  return CatalogPageSchema.parse({ manifestId, openings: page, nextCursor });
}
