import * as z from 'zod';
import { ContentHashSchema, LineRevisionSchema } from './catalog.mjs';
import { ErrorEnvelopeSchema } from './errors.mjs';
import { IdSchema, InstantSchema, RevisionSchema } from './primitives.mjs';
import { AccountStateSchema, StudySessionSchema } from './study.mjs';
import { SettingsSchema } from './account.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;
const UniqueIdsSchema = z.array(IdSchema).refine((ids) => new Set(ids).size === ids.length,
  'IDs must be unique');

/** The seed is planning material, never an access credential. */
export const OfflineSeedMaterialSchema = z.strictObject({
  generatorVersion: z.string().min(1),
  seed: z.string().min(1),
  activeLines: z.array(z.strictObject({ lineId: IdSchema, revisionId: IdSchema })),
}).refine(({ activeLines }) =>
  new Set(activeLines.map((line) => line.lineId)).size === activeLines.length &&
  new Set(activeLines.map((line) => line.revisionId)).size === activeLines.length,
{ message: 'Active lines and their current revisions must be unique' });

export const OfflinePackageSchema = z.strictObject({
  id: IdSchema,
  deviceId: IdSchema,
  issuedAt: InstantSchema,
  expiresAt: InstantSchema,
  submitUntil: InstantSchema,
  baseAccountRevision: RevisionSchema,
  manifestId: IdSchema,
  srsVersion: z.string().min(1),
  settings: SettingsSchema,
  seedMaterial: OfflineSeedMaterialSchema,
  baseState: AccountStateSchema,
  lineRevisions: z.array(LineRevisionSchema),
  existingSessions: z.array(StudySessionSchema),
  contentHash: ContentHashSchema,
}).superRefine((pkg, context) => {
  const issue = (path, message) => context.addIssue({ code: z.ZodIssueCode.custom, path, message });
  if (Date.parse(pkg.expiresAt) - Date.parse(pkg.issuedAt) !== 7 * DAY_MS ||
      Date.parse(pkg.submitUntil) - Date.parse(pkg.expiresAt) !== 7 * DAY_MS) {
    issue(['expiresAt'], 'Package windows must be exactly seven days each');
  }
  if (pkg.baseAccountRevision !== pkg.baseState.accountRevision ||
      pkg.manifestId !== pkg.baseState.manifestId) {
    issue(['baseState'], 'Base state must match package revision and manifest');
  }
  if (Object.keys(pkg.settings).some((key) =>
    pkg.settings[key] !== pkg.baseState.profile.settings[key])) {
    issue(['settings'], 'Package settings must be the frozen base settings');
  }
  if (new Set(pkg.lineRevisions.map((line) => line.revisionId)).size !== pkg.lineRevisions.length) {
    issue(['lineRevisions'], 'Line revisions must be unique');
  }
  if (new Set(pkg.existingSessions.map((session) => session.id)).size !== pkg.existingSessions.length) {
    issue(['existingSessions'], 'Sessions must be unique');
  }
  const lines = new Map(pkg.lineRevisions.map((line) => [line.revisionId, line]));
  const activeEntries = new Map(pkg.baseState.repertoire.filter((entry) => entry.active)
    .map((entry) => [entry.openingId, entry]));
  const sessionRevisionIds = new Set(pkg.existingSessions.flatMap((session) =>
    session.items.map((item) => item.lineRevisionId)));
  for (const { lineId, revisionId } of pkg.seedMaterial.activeLines) {
    const line = lines.get(revisionId);
    if (line === undefined || line.id !== lineId || !activeEntries.has(line.openingId)) {
      issue(['seedMaterial', 'activeLines'], 'Current active revision is missing');
      continue;
    }
    if (!pkg.baseState.cards.some((card) =>
      card.lineId === lineId && card.color === activeEntries.get(line.openingId).color)) {
      issue(['seedMaterial', 'activeLines'], 'Each active line needs a card');
    }
  }
  const activeRevisionIds = new Set(pkg.seedMaterial.activeLines.map((line) => line.revisionId));
  if (pkg.lineRevisions.some((line) => !activeRevisionIds.has(line.revisionId) &&
      !sessionRevisionIds.has(line.revisionId))) {
    issue(['lineRevisions'], 'Unneeded catalog lines must not be packaged');
  }
  for (const session of pkg.existingSessions) {
    if (session.items.some((item) => !lines.has(item.lineRevisionId) ||
        lines.get(item.lineRevisionId).id !== item.lineId)) {
      issue(['existingSessions'], 'Existing sessions need their exact line revisions');
    }
  }
  if (pkg.baseState.currentSession !== null &&
      !pkg.existingSessions.some((session) => session.id === pkg.baseState.currentSession.id &&
        canonicalJson(session) === canonicalJson(pkg.baseState.currentSession))) {
    issue(['existingSessions'], 'Current session must be included');
  }
});

/** Stable JSON bytes, excluding contentHash, are the package digest input. */
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export async function offlinePackageContentHash(pkg) {
  const body = { ...OfflinePackageSchema.parse(pkg) };
  delete body.contentHash;
  const bytes = new TextEncoder().encode(canonicalJson(JSON.parse(JSON.stringify(body))));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function verifyOfflinePackageContentHash(pkg) {
  return await offlinePackageContentHash(pkg) === pkg.contentHash;
}

export const OfflineRenewalRequestSchema = z.strictObject({
  deviceId: IdSchema,
  lastKnownRevision: RevisionSchema,
  resolvedEventIds: UniqueIdsSchema,
});

export const OfflineRenewalExchangeSchema = z.strictObject({
  request: OfflineRenewalRequestSchema,
  response: OfflinePackageSchema,
}).refine(({ request, response }) => response.deviceId === request.deviceId &&
  BigInt(response.baseAccountRevision) >= BigInt(request.lastKnownRevision),
{ message: 'Renewal package must belong to the device and a current revision' });

export const OfflineRenewalConflictSchema = ErrorEnvelopeSchema.refine(({ error }) =>
  error.retryable === true &&
  (error.code === 'VERSION_CONFLICT' || error.code === 'RECONCILIATION_REQUIRED'));

/** The client must durably resolve its own outbox before making this request. */
export function canRequestOfflineRenewal(pendingEventIds) {
  return UniqueIdsSchema.parse(pendingEventIds).length === 0;
}

/** The server can check reported decisions and its own revision, not a hidden client outbox. */
export function assessOfflineRenewal(request, { currentAccountRevision, decidedEventIds }) {
  const parsed = OfflineRenewalRequestSchema.parse(request);
  RevisionSchema.parse(currentAccountRevision);
  const decided = new Set(UniqueIdsSchema.parse(decidedEventIds));
  if (parsed.resolvedEventIds.some((id) => !decided.has(id))) return 'reconciliation_required';
  if (parsed.lastKnownRevision !== currentAccountRevision) return 'version_conflict';
  return 'ready';
}

/** The grace window permits submission, never another study block. */
export function offlinePackageWindow(pkg, { startedAt, completedAt, receivedAt }) {
  const parsed = OfflinePackageSchema.parse(pkg);
  const start = Date.parse(InstantSchema.parse(startedAt));
  const end = Date.parse(InstantSchema.parse(completedAt));
  const received = Date.parse(InstantSchema.parse(receivedAt));
  const issued = Date.parse(parsed.issuedAt);
  const expires = Date.parse(parsed.expiresAt);
  const submit = Date.parse(parsed.submitUntil);
  return {
    studyAllowed: start >= issued && end >= start && end < expires,
    submissionAllowed: received >= issued && received >= end && received < submit,
  };
}
