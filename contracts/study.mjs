import * as z from 'zod';
import { LineRevisionSchema } from './catalog.mjs';
import { ProfileSchema, RepertoireEntrySchema, SettingsSchema } from './account.mjs';
import {
  CivilDateSchema, ColorSchema, IdSchema, InstantSchema,
  IntervalDaysSchema, RevisionSchema,
} from './primitives.mjs';

const NonnegativeIntegerSchema = z.number().int().nonnegative();
const PositiveIntegerSchema = z.number().int().positive();

export const CardSchema = z.strictObject({
  id: IdSchema,
  lineId: IdSchema,
  color: ColorSchema,
  generation: z.string().min(1),
  contentGeneration: z.string().min(1),
  version: RevisionSchema,
  state: z.enum(['new', 'review']),
  unlockedMoves: PositiveIntegerSchema,
  intervalDays: IntervalDaysSchema,
  dueDate: CivilDateSchema,
  reps: NonnegativeIntegerSchema,
  lapses: NonnegativeIntegerSchema,
  lastGrade: z.enum(['bad', 'mid', 'good']).nullable(),
});

export const StudyItemSchema = z.strictObject({
  id: IdSchema,
  sessionId: IdSchema,
  lineId: IdSchema,
  lineRevisionId: IdSchema,
  originType: z.enum(['new', 'review']),
  attemptNumber: PositiveIntegerSchema,
  parentEventId: IdSchema.nullable(),
  status: z.enum(['pending', 'graded', 'cancelled']),
  sortOrder: NonnegativeIntegerSchema,
  baseCard: CardSchema,
  effectiveMoves: PositiveIntegerSchema,
  pedagogicalSettingsVersion: RevisionSchema,
  movesPerBlock: z.number().int().min(2).max(10),
  srsVersion: z.string().min(1),
}).refine((item) => item.baseCard.lineId === item.lineId &&
  (item.attemptNumber === 1) === (item.parentEventId === null),
{ message: 'Item base or repeat parent is inconsistent' });

export const StudySessionSchema = z.strictObject({
  id: IdSchema,
  studyDate: CivilDateSchema,
  pedagogicalSettings: SettingsSchema,
  planSeed: z.string().min(1),
  status: z.enum(['in_progress', 'completed']),
  items: z.array(StudyItemSchema),
  newLineIds: z.array(IdSchema),
  completedCount: NonnegativeIntegerSchema,
  pendingCount: NonnegativeIntegerSchema,
  cancelledCount: NonnegativeIntegerSchema,
}).refine((session) => {
  const counts = { pending: 0, graded: 0, cancelled: 0 };
  for (const item of session.items) counts[item.status] += 1;
  const ids = session.items.map((item) => item.id);
  const orders = session.items.map((item) => item.sortOrder);
  const newLines = new Set(session.items.filter((item) => item.originType === 'new')
    .map((item) => item.lineId));
  return session.items.every((item) => item.sessionId === session.id) &&
    new Set(ids).size === ids.length && new Set(orders).size === orders.length &&
    new Set(session.newLineIds).size === session.newLineIds.length &&
    newLines.size === session.newLineIds.length &&
    session.newLineIds.every((id) => newLines.has(id)) &&
    session.completedCount === counts.graded &&
    session.pendingCount === counts.pending &&
    session.cancelledCount === counts.cancelled &&
    (session.status === 'completed') === (counts.pending === 0);
}, { message: 'Session items, counts or status are inconsistent' });

export const StudySessionCreateRequestSchema = z.strictObject({ deviceId: IdSchema });

export const StudySessionResponseSchema = z.strictObject({
  session: StudySessionSchema,
  lines: z.array(LineRevisionSchema),
  accountRevision: RevisionSchema,
  serverNow: InstantSchema,
}).refine(({ session, lines }) => {
  const revisionIds = lines.map((line) => line.revisionId);
  return new Set(revisionIds).size === revisionIds.length &&
    session.items.every((item) => lines.some((line) =>
      line.id === item.lineId && line.revisionId === item.lineRevisionId));
}, { message: 'Session line revisions are missing' });

export const OnboardingRequestSchema = z.strictObject({
  selections: z.array(z.strictObject({ openingId: IdSchema, color: ColorSchema })).min(1),
  expectedAccountRevision: RevisionSchema,
}).refine(({ selections }) =>
  new Set(selections.map((selection) => selection.openingId)).size === selections.length,
{ message: 'Each opening may be selected once' });

/** The selected colors must be validated against the same catalog snapshot. */
export const OnboardingWithCatalogSchema = z.strictObject({
  request: OnboardingRequestSchema,
  openings: z.array(z.object({
    id: IdSchema,
    playableColors: z.array(ColorSchema).min(1),
  })),
}).refine(({ request, openings }) => request.selections.every((selection) =>
  openings.some((opening) => opening.id === selection.openingId &&
    opening.playableColors.includes(selection.color))),
{ message: 'Selection is not playable in this catalog' });

export const ActivitySchema = z.strictObject({
  eligibleDates: z.array(CivilDateSchema),
  currentStreak: NonnegativeIntegerSchema,
  bestStreak: NonnegativeIntegerSchema,
  lastActiveDate: CivilDateSchema.nullable(),
  asOfDate: CivilDateSchema,
});

export const AccountStateSchema = z.strictObject({
  profile: ProfileSchema,
  repertoire: z.array(RepertoireEntrySchema),
  cards: z.array(CardSchema),
  activity: ActivitySchema,
  currentSession: StudySessionSchema.nullable(),
  manifestId: IdSchema,
  accountRevision: RevisionSchema,
  serverNow: InstantSchema,
});

/** Onboarding replies only after selection and timestamp commit together. */
export const OnboardingResponseSchema = AccountStateSchema.refine((state) =>
  state.profile.onboardedAt !== null && state.repertoire.some((entry) => entry.active),
{ message: 'Onboarding requires a timestamp and an active selection' });

/** The response must include every accepted selection, never a partial set. */
export const OnboardingExchangeSchema = z.strictObject({
  request: OnboardingRequestSchema,
  response: OnboardingResponseSchema,
}).refine(({ request, response }) => request.selections.every((selection) =>
  response.repertoire.some((entry) => entry.openingId === selection.openingId &&
    entry.color === selection.color && entry.active)),
{ message: 'Onboarding response omits an accepted selection' });
