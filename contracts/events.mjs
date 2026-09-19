import * as z from 'zod';
import { CardSchema, StudyItemSchema } from './study.mjs';
import { TimezoneSchema } from './account.mjs';
import {
  CivilDateSchema, IdSchema, InstantSchema, IntervalDaysSchema, RevisionSchema,
} from './primitives.mjs';

const OpaqueIdSchema = z.string().min(1).max(256).refine((id) => id.trim().length > 0);
const NonnegativeIntegerSchema = z.number().int().nonnegative();
const GradeSchema = z.enum(['bad', 'mid', 'good']);

export const StudyReferenceSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('canonical'), id: IdSchema }),
  z.strictObject({ kind: z.literal('local'), id: OpaqueIdSchema }),
]);

/** Points to a server-issued snapshot without conflating zone and pedagogy. */
export const StudyZoneEvidenceRefSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('account-snapshot'),
    accountRevision: RevisionSchema,
    settingsVersion: RevisionSchema,
  }),
  z.strictObject({
    kind: z.literal('issued-package'),
    packageId: IdSchema,
    settingsVersion: RevisionSchema,
  }),
]);

/** A raw attempt is preserved for later domain verification; it is not a grade. */
export const RawStudyAttemptSchema = z.strictObject({
  ply: z.number().int().positive(),
  playedSan: z.string().min(1),
  elapsedMs: z.number().refine((value) => Number.isSafeInteger(value) && value >= 0,
    'Elapsed time must be a nonnegative safe integer'),
});

export const StudyEventBaseSchema = z.strictObject({
  cardVersion: RevisionSchema,
  generation: z.string().min(1),
  contentGeneration: z.string().min(1),
});

export const StudyEventSchema = z.strictObject({
  eventId: IdSchema,
  deviceId: IdSchema,
  sessionRef: StudyReferenceSchema,
  itemRef: StudyReferenceSchema,
  packageId: IdSchema.nullable(),
  lineId: IdSchema,
  lineRevisionId: IdSchema,
  srsVersion: z.string().min(1),
  pedagogicalSettingsVersion: RevisionSchema,
  base: StudyEventBaseSchema,
  dependsOnEventIds: z.array(IdSchema).refine((ids) => new Set(ids).size === ids.length,
    'Dependencies must not repeat'),
  startedAt: InstantSchema,
  completedAt: InstantSchema,
  studyDate: CivilDateSchema,
  studyTimezone: TimezoneSchema,
  zoneEvidenceRef: StudyZoneEvidenceRefSchema,
  attempts: z.array(RawStudyAttemptSchema),
}).superRefine((event, context) => {
  if (event.dependsOnEventIds.includes(event.eventId)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dependsOnEventIds'],
      message: 'An event cannot depend on itself',
    });
  }
  if (Date.parse(event.completedAt) < Date.parse(event.startedAt)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['completedAt'],
      message: 'completedAt must not precede startedAt',
    });
  }
  if (event.zoneEvidenceRef.kind === 'issued-package' &&
      event.zoneEvidenceRef.packageId !== event.packageId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['zoneEvidenceRef', 'packageId'],
      message: 'Zone evidence must refer to the event package',
    });
  }
});

function hasDependencyCycle(events) {
  const byId = new Map(events.map((event) => [event.eventId, event]));
  const visiting = new Set();
  const visited = new Set();

  function visit(eventId) {
    if (visiting.has(eventId)) return true;
    if (visited.has(eventId)) return false;
    const event = byId.get(eventId);
    if (event === undefined) return false;
    visiting.add(eventId);
    for (const dependencyId of event.dependsOnEventIds) {
      if (visit(dependencyId)) return true;
    }
    visiting.delete(eventId);
    visited.add(eventId);
    return false;
  }

  return events.some((event) => visit(event.eventId));
}

export const StudyEventsRequestSchema = z.strictObject({
  events: z.array(StudyEventSchema).min(1).max(20),
}).superRefine((request, context) => {
  const ids = request.events.map((event) => event.eventId);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['events'],
      message: 'Event IDs must be unique within a batch',
    });
  }
  if (hasDependencyCycle(request.events)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['events'],
      message: 'Study event dependency cycle',
    });
  }
});

/** Alias named after the transport-level batch used by the REST route. */
export const StudyEventBatchSchema = StudyEventsRequestSchema;
export const STUDY_EVENTS_MAX_BYTES = 256 * 1024;

/** Enforces the wire limit before JSON parsing discards whitespace/escapes. */
export function parseStudyEventsBody(body) {
  const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body;
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError('Study events body must be UTF-8 text or bytes');
  }
  if (bytes.byteLength > STUDY_EVENTS_MAX_BYTES) {
    throw new RangeError('Study events body exceeds 256 KiB');
  }
  const json = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return StudyEventsRequestSchema.parse(JSON.parse(json));
}

/**
 * A missing parent can be an earlier or later delivery; the schema rejects
 * only cycles among events present in this batch.
 */
export function validateStudyEventDependencies(request) {
  return StudyEventsRequestSchema.parse(request);
}

function deepFreeze(value) {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/** Parses a transport event into a detached, recursively frozen snapshot. */
export function freezeStudyEvent(event) {
  const parsed = StudyEventSchema.parse(event);
  return deepFreeze(parsed);
}

/** Resolved from the server's delivery/issuance record, not the client body. */
export const KnownStudyZoneSchema = z.strictObject({
  reference: StudyZoneEvidenceRefSchema,
  deviceId: IdSchema,
  timezone: TimezoneSchema,
  knownAt: InstantSchema,
});

function sameZoneEvidenceRef(left, right) {
  return left.kind === right.kind && left.settingsVersion === right.settingsVersion &&
    (left.kind === 'account-snapshot'
      ? left.accountRevision === right.accountRevision
      : left.packageId === right.packageId);
}

function civilDateAt(instant, timezone) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instant));
  const values = Object.fromEntries(parts
    .filter((part) => part.type === 'year' || part.type === 'month' || part.type === 'day')
    .map((part) => [part.type, part.value]));
  return `${values.year.padStart(4, '0')}-${values.month}-${values.day}`;
}

/**
 * Validates the client report against the zone known when the block started.
 * It deliberately does not treat the event's declared zone as authoritative.
 */
export function validateStudyEventZoneEvidence(event, evidence) {
  const parsedEvent = StudyEventSchema.parse(event);
  const parsedEvidence = KnownStudyZoneSchema.parse(evidence);
  const startedAt = Date.parse(parsedEvent.startedAt);
  if (parsedEvidence.deviceId !== parsedEvent.deviceId ||
      !sameZoneEvidenceRef(parsedEvent.zoneEvidenceRef, parsedEvidence.reference)) {
    throw new Error('Zone evidence reference does not match this event and device');
  }
  if (startedAt < Date.parse(parsedEvidence.knownAt)) {
    throw new Error('Zone evidence was not known when the block started');
  }
  if (parsedEvent.studyTimezone !== parsedEvidence.timezone) {
    throw new Error('Study event timezone differs from the known starting zone');
  }
  if (parsedEvent.studyDate !== civilDateAt(parsedEvent.startedAt, parsedEvidence.timezone)) {
    throw new Error('Study date does not match the known starting zone');
  }
  return parsedEvent;
}

export const EventDecisionReasonSchema = z.enum([
  'ACCEPTED', 'STALE_CARD', 'RESET_GENERATION', 'CONTENT_CHANGED',
  'CONTENT_RETIRED', 'REPERTOIRE_INACTIVE', 'DEPENDENCY_PRACTICE',
  'DEPENDENCY_INVALID', 'OUTSIDE_DAILY_PLAN', 'DELIVERY_EXPIRED',
  'OUTSIDE_PACKAGE_WINDOW', 'INVALID_ATTEMPTS', 'INVALID_DATE',
  'UNSUPPORTED_VERSION',
]);

const PRACTICE_REASONS = new Set([
  'STALE_CARD', 'RESET_GENERATION', 'CONTENT_CHANGED', 'CONTENT_RETIRED',
  'REPERTOIRE_INACTIVE', 'DEPENDENCY_PRACTICE', 'OUTSIDE_DAILY_PLAN',
  'DELIVERY_EXPIRED', 'OUTSIDE_PACKAGE_WINDOW',
]);
const INVALID_REASONS = new Set([
  'DEPENDENCY_INVALID', 'INVALID_ATTEMPTS', 'INVALID_DATE', 'UNSUPPORTED_VERSION',
]);

export const EventDecisionSchema = z.strictObject({
  eventId: IdSchema,
  outcome: z.enum(['applied', 'practice', 'invalid']),
  reason: EventDecisionReasonSchema,
  sessionId: IdSchema.nullable(),
  itemId: IdSchema.nullable(),
  grade: GradeSchema.nullable(),
  cardAfter: CardSchema.nullable(),
  repeatItem: StudyItemSchema.nullable(),
  nextDue: z.strictObject({
    date: CivilDateSchema,
    inDays: IntervalDaysSchema,
  }).nullable(),
  sessionCompleted: z.boolean(),
  accountRevision: RevisionSchema,
  decidedAt: InstantSchema,
}).superRefine((decision, context) => {
  const reasonMatchesOutcome = decision.outcome === 'applied'
    ? decision.reason === 'ACCEPTED'
    : decision.outcome === 'practice'
      ? PRACTICE_REASONS.has(decision.reason)
      : INVALID_REASONS.has(decision.reason);
  if (!reasonMatchesOutcome) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reason'],
      message: 'Reason is incompatible with the decision outcome',
    });
  }
  if (decision.outcome === 'applied' &&
      (decision.sessionId === null || decision.itemId === null ||
       decision.grade === null || decision.cardAfter === null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['outcome'],
      message: 'Applied decisions require canonical IDs, grade and card',
    });
  }
  if (decision.outcome === 'invalid') {
    for (const field of ['grade', 'cardAfter', 'repeatItem', 'nextDue']) {
      if (decision[field] !== null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: 'Invalid decisions cannot carry SRS effects',
        });
      }
    }
  }
  if (decision.outcome === 'practice' &&
      (decision.cardAfter !== null || decision.repeatItem !== null || decision.nextDue !== null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['outcome'],
      message: 'Practice decisions cannot carry SRS effects',
    });
  }
  if (decision.repeatItem !== null &&
      (decision.repeatItem.parentEventId !== decision.eventId ||
       decision.repeatItem.sessionId !== decision.sessionId ||
       decision.nextDue !== null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['repeatItem'],
      message: 'Repeat item must depend on this event in the same session',
    });
  }
});

export const EventResultDecisionSchema = z.strictObject({
  eventId: IdSchema,
  replayed: z.boolean(),
  decision: EventDecisionSchema,
}).refine((result) => result.eventId === result.decision.eventId,
  { message: 'Result and decision event IDs must match' });

export const RetryableEventResultSchema = z.strictObject({
  eventId: IdSchema,
  retryable: z.literal(true),
  code: z.enum(['DEPENDENCY_PENDING', 'RATE_LIMITED', 'SERVICE_UNAVAILABLE']),
  retryAfterSeconds: NonnegativeIntegerSchema.optional(),
});

export const EventIdReusedResultSchema = z.strictObject({
  eventId: IdSchema,
  retryable: z.literal(false),
  code: z.literal('EVENT_ID_REUSED'),
});

export const EventResultSchema = z.union([
  EventResultDecisionSchema,
  RetryableEventResultSchema,
  EventIdReusedResultSchema,
]);

export const StudyEventsResponseSchema = z.strictObject({
  results: z.array(EventResultSchema).min(1).max(20),
  accountRevision: RevisionSchema,
}).refine((response) => {
  const ids = response.results.map((result) => result.eventId);
  return new Set(ids).size === ids.length;
}, { message: 'Event result IDs must be unique within a batch' });

/** Validates the one-result-per-submitted-event relationship across the route. */
export const StudyEventsExchangeSchema = z.strictObject({
  request: StudyEventsRequestSchema,
  response: StudyEventsResponseSchema,
}).refine(({ request, response }) => {
  const submitted = new Set(request.events.map((event) => event.eventId));
  return submitted.size === response.results.length &&
    response.results.every((result) => submitted.has(result.eventId));
}, { message: 'Each submitted event must have exactly one result' });

/** The decision lookup/replay response never substitutes a current snapshot. */
export const ReplayedDecisionResponseSchema = z.strictObject({
  eventId: IdSchema,
  replayed: z.literal(true),
  decision: EventDecisionSchema,
}).refine((result) => result.eventId === result.decision.eventId,
  { message: 'Result and decision event IDs must match' });
