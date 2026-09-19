import * as z from 'zod';
import { CatalogOpeningSchema } from './catalog.mjs';
import { ColorSchema, IdSchema, InstantSchema, RevisionSchema } from './primitives.mjs';
import { ErrorEnvelopeSchema } from './errors.mjs';

export const TimezoneSchema = z.string().min(1).refine((timezone) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}, 'Invalid time zone');

export const SettingsSchema = z.strictObject({
  version: RevisionSchema,
  newLinesPerDay: z.number().int().min(1).max(12),
  movesPerBlock: z.number().int().min(2).max(10),
  timezone: TimezoneSchema,
});

export const ProfileSchema = z.strictObject({
  id: IdSchema,
  emailVerified: z.boolean(),
  onboardedAt: InstantSchema.nullable(),
  settings: SettingsSchema,
});

export const RepertoireEntrySchema = z.strictObject({
  openingId: IdSchema,
  color: ColorSchema,
  active: z.boolean(),
  version: RevisionSchema,
});

export const RepertoirePutRequestSchema = z.strictObject({
  color: ColorSchema,
  expectedVersion: RevisionSchema,
});

/** If-Match carries the decimal entry version as an HTTP entity tag. */
export const RepertoireDeleteHeadersSchema = z.strictObject({
  ifMatch: z.string().regex(/^"(?:0|[1-9][0-9]*)"$/),
});

export function versionFromIfMatch(headers) {
  return RepertoireDeleteHeadersSchema.parse(headers).ifMatch.slice(1, -1);
}

/** Catalog membership is checked with the request, before a versioned write. */
export const RepertoirePutForOpeningSchema = z.strictObject({
  openingId: IdSchema,
  opening: CatalogOpeningSchema,
  request: RepertoirePutRequestSchema,
}).refine(({ openingId, opening, request }) =>
  openingId === opening.id && opening.playableColors.includes(request.color),
{ message: 'Opening does not allow this color' });

export const RepertoireMutationResponseSchema = z.strictObject({
  entry: RepertoireEntrySchema,
  accountRevision: RevisionSchema,
});

export const SettingsPatchRequestSchema = z.strictObject({
  expectedVersion: RevisionSchema,
  newLinesPerDay: z.number().int().min(1).max(12).optional(),
  movesPerBlock: z.number().int().min(2).max(10).optional(),
  timezone: TimezoneSchema.optional(),
}).refine(({ newLinesPerDay, movesPerBlock, timezone }) =>
  newLinesPerDay !== undefined || movesPerBlock !== undefined || timezone !== undefined,
{ message: 'At least one setting must change' });

export const SettingsPatchResponseSchema = z.strictObject({
  settings: SettingsSchema,
  effect: z.strictObject({
    pedagogy: z.literal('next_sessions_and_packages'),
    timezone: z.literal('next_block'),
  }),
  activeSessionSettingsVersion: RevisionSchema.nullable(),
  activePackageIds: z.array(IdSchema),
  accountRevision: RevisionSchema,
});

/** Route-specific 409 adds the current state to the standard error envelope. */
export const SettingsVersionConflictSchema = ErrorEnvelopeSchema.extend({
  currentSettings: SettingsSchema,
  accountRevision: RevisionSchema,
}).refine(({ error }) => error.code === 'VERSION_CONFLICT');

export const RepertoireVersionConflictSchema = ErrorEnvelopeSchema.extend({
  currentEntry: RepertoireEntrySchema.nullable(),
  accountRevision: RevisionSchema,
}).refine(({ error }) => error.code === 'VERSION_CONFLICT');

/** A repeat of an already reached desired state must not run its effects again. */
export function checkExpectedVersion(expectedVersion, currentVersion, alreadyDesired) {
  RevisionSchema.parse(expectedVersion);
  RevisionSchema.parse(currentVersion);
  if (typeof alreadyDesired !== 'boolean') throw new TypeError('alreadyDesired must be boolean');
  if (alreadyDesired) return 'unchanged';
  return expectedVersion === currentVersion ? 'apply' : 'conflict';
}

export function decideRepertoirePut(currentEntry, openingId, opening, request) {
  RepertoirePutForOpeningSchema.parse({ openingId, opening, request });
  if (currentEntry !== null) {
    RepertoireEntrySchema.parse(currentEntry);
    if (currentEntry.openingId !== openingId) throw new Error('Wrong repertoire entry');
  }
  return checkExpectedVersion(request.expectedVersion, currentEntry?.version ?? '0',
    currentEntry?.active === true && currentEntry.color === request.color);
}

export function decideRepertoireDelete(currentEntry, headers) {
  RepertoireEntrySchema.parse(currentEntry);
  return checkExpectedVersion(versionFromIfMatch(headers), currentEntry.version,
    currentEntry.active === false);
}

export function decideSettingsPatch(currentSettings, request) {
  SettingsSchema.parse(currentSettings);
  SettingsPatchRequestSchema.parse(request);
  const alreadyDesired = ['newLinesPerDay', 'movesPerBlock', 'timezone']
    .every((field) => request[field] === undefined || request[field] === currentSettings[field]);
  return checkExpectedVersion(request.expectedVersion, currentSettings.version, alreadyDesired);
}
