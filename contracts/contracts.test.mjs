import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CatalogPageSchema, CatalogQuerySchema, CivilDateSchema, ContentHashSchema,
  decodeCatalogCursor, encodeCatalogCursor, ErrorEnvelopeSchema, ERROR_STATUS,
  IdSchema, InstantSchema, IntervalDaysSchema, LineRevisionSchema,
  LineRevisionResponseSchema, lineRevisionEtag, paginateCatalog, RevisionSchema,
} from './index.mjs';

const examples = JSON.parse(readFileSync(new URL('./examples.json', import.meta.url), 'utf8'));

describe('B02.01 transport primitives and error envelope', () => {
  it('accepts opaque UUIDs and rejects malformed identifiers', () => {
    expect(IdSchema.parse(examples.primitives.id)).toBe(examples.primitives.id);
    for (const value of ['123', '22222222-2222-4222-2222-222222222222', 42]) {
      expect(IdSchema.safeParse(value).success).toBe(false);
    }
  });

  it('checks real Gregorian days and canonical millisecond UTC instants', () => {
    expect(CivilDateSchema.parse(examples.primitives.civilDate)).toBe('2024-02-29');
    for (const value of ['2023-02-29', '1900-02-29', '2024-04-31', '2024-13-01', '0000-01-01']) {
      expect(CivilDateSchema.safeParse(value).success).toBe(false);
    }
    expect(CivilDateSchema.safeParse('2000-02-29').success).toBe(true);
    expect(InstantSchema.parse(examples.primitives.instant)).toBe(examples.primitives.instant);
    for (const value of ['2026-02-30T12:00:00.000Z', '2026-09-18T12:00:00Z',
      '2026-09-18T12:00:00.000+00:00']) {
      expect(InstantSchema.safeParse(value).success).toBe(false);
    }
  });

  it('preserves revisions beyond Number.MAX_SAFE_INTEGER and exact decimal strings', () => {
    expect(RevisionSchema.parse(examples.primitives.revision)).toBe('18446744073709551616');
    expect(IntervalDaysSchema.parse(examples.primitives.intervalDays)).toBe('999999999999999999.99');
    for (const value of [9007199254740992, '-1', '01', '1.0', '1e3']) {
      expect(RevisionSchema.safeParse(value).success).toBe(false);
    }
    for (const value of ['1.2', '-1.00', '01.00', 1.25]) {
      expect(IntervalDaysSchema.safeParse(value).success).toBe(false);
    }
  });

  it('validates the stable error envelope without accepting extra data', () => {
    expect(ErrorEnvelopeSchema.parse(examples.authRequired)).toEqual(examples.authRequired);
    expect(ERROR_STATUS.AUTH_REQUIRED).toBe(401);
    expect(ERROR_STATUS.RATE_LIMITED).toBe(429);
    expect(ErrorEnvelopeSchema.safeParse({
      ...examples.authRequired,
      error: { ...examples.authRequired.error, token: 'secret' },
    }).success).toBe(false);
    expect(ErrorEnvelopeSchema.safeParse({
      ...examples.authRequired,
      error: { ...examples.authRequired.error, code: 'UNKNOWN' },
    }).success).toBe(false);
  });
});

describe('B02.02 catalog and immutable revisions', () => {
  it('validates catalog, revision and authorization examples', () => {
    expect(CatalogPageSchema.parse(examples.catalogPage)).toEqual(examples.catalogPage);
    expect(LineRevisionSchema.parse(examples.lineRevision)).toEqual(examples.lineRevision);
    expect(ErrorEnvelopeSchema.parse(examples.emailUnverified)).toEqual(examples.emailUnverified);
    expect(ErrorEnvelopeSchema.parse(examples.notFound)).toEqual(examples.notFound);
    expect(ERROR_STATUS.EMAIL_UNVERIFIED).toBe(403);
    expect(ERROR_STATUS.NOT_FOUND).toBe(404);
    expect(CatalogPageSchema.safeParse({
      ...examples.catalogPage,
      openings: [{ ...examples.catalogPage.openings[0], lineCount: 2 }],
    }).success).toBe(false);
    expect(LineRevisionSchema.safeParse({
      ...examples.lineRevision, contentHash: 'not-a-hash',
    }).success).toBe(false);
  });

  it('uses a quoted content hash ETag for a conditional revision read', () => {
    const hash = ContentHashSchema.parse(examples.lineRevision.contentHash);
    const etag = lineRevisionEtag(hash);
    expect(etag).toBe(`"${hash}"`);
    expect(lineRevisionEtag(examples.lineRevision.movesHash)).not.toBe(etag);
    expect(() => lineRevisionEtag('invalid')).toThrow();
    expect(LineRevisionResponseSchema.safeParse({
      status: 200, etag, body: examples.lineRevision,
    }).success).toBe(true);
    expect(LineRevisionResponseSchema.safeParse({ status: 304, etag, body: null }).success).toBe(true);
    expect(LineRevisionResponseSchema.safeParse({ status: 304, etag, body: examples.lineRevision }).success).toBe(false);
  });

  it('enforces limits and a cursor bound to the manifest across first and last pages', () => {
    const first = examples.catalogPage.openings[0];
    const second = { ...first, id: '55555555-5555-4555-8555-555555555555',
      slug: 'second', name: 'Second', sortOrder: 1, lineCount: 0, lines: [] };
    const manifest = examples.catalogPage.manifestId;
    const page1 = paginateCatalog([second, first], manifest, { limit: '1' });
    expect(page1.openings.map((opening) => opening.id)).toEqual([first.id]);
    expect(decodeCatalogCursor(page1.nextCursor)).toEqual({
      manifestId: manifest, sortOrder: 0, id: first.id,
    });
    const page2 = paginateCatalog([second, first], manifest,
      { limit: 1, cursor: page1.nextCursor });
    expect(page2.openings.map((opening) => opening.id)).toEqual([second.id]);
    expect(page2.nextCursor).toBeNull();
    expect(() => paginateCatalog([second, first],
      '66666666-6666-4666-8666-666666666666', { cursor: page1.nextCursor })).toThrow();
    expect(() => decodeCatalogCursor('not a cursor')).toThrow();
    expect(() => encodeCatalogCursor({ manifestId: manifest, sortOrder: -1, id: first.id })).toThrow();
    expect(CatalogQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
    expect(CatalogQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(CatalogQuerySchema.parse({}).limit).toBe(50);
  });
});
