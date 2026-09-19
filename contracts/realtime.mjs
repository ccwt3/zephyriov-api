import * as z from 'zod';
import { ErrorEnvelopeSchema } from './errors.mjs';
import { InstantSchema, RevisionSchema } from './primitives.mjs';
import { AccountStateSchema, StudySessionResponseSchema } from './study.mjs';

export const RevisionReadQuerySchema = z.strictObject({
  minRevision: RevisionSchema.optional(),
});

/** Decimal revisions compare as integers, never as JS numbers or strings. */
export function revisionSatisfiesMinimum(actualRevision, minRevision) {
  RevisionSchema.parse(actualRevision);
  if (minRevision === undefined) return true;
  RevisionSchema.parse(minRevision);
  return BigInt(actualRevision) >= BigInt(minRevision);
}

export const AccountStateReadExchangeSchema = z.strictObject({
  query: RevisionReadQuerySchema,
  response: AccountStateSchema,
}).refine(({ query, response }) =>
  revisionSatisfiesMinimum(response.accountRevision, query.minRevision),
{ message: 'State response does not satisfy minRevision' });

export const StudySessionReadExchangeSchema = z.strictObject({
  query: RevisionReadQuerySchema,
  response: StudySessionResponseSchema,
}).refine(({ query, response }) =>
  revisionSatisfiesMinimum(response.accountRevision, query.minRevision),
{ message: 'Session response does not satisfy minRevision' });

export const RevisionNotReadySchema = ErrorEnvelopeSchema.refine(({ error }) =>
  error.code === 'REVISION_NOT_READY' && error.retryable === true);

/** A short lived opaque bearer for one WebSocket connection. */
export const RealtimeTicketResponseSchema = z.strictObject({
  ticket: z.string().min(1),
  expiresAt: InstantSchema,
});

export function realtimeTicketHasThirtySecondLifetime(issuedAt, response) {
  InstantSchema.parse(issuedAt);
  const parsed = RealtimeTicketResponseSchema.parse(response);
  return Date.parse(parsed.expiresAt) - Date.parse(issuedAt) === 30_000;
}

export const RealtimeAuthenticateSchema = z.strictObject({
  type: z.literal('authenticate'),
  ticket: RealtimeTicketResponseSchema.shape.ticket,
});

export const RealtimeNoticeSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('hello'), accountRevision: RevisionSchema }),
  z.strictObject({ type: z.literal('state_changed'), accountRevision: RevisionSchema }),
]);

/** Health is only an HTTP status; it carries no account or provider data. */
export const HealthReadyStatusSchema = z.union([z.literal(200), z.literal(503)]);
