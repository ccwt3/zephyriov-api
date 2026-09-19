import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AccountStateReadExchangeSchema, assessOfflineRenewal, canRequestOfflineRenewal,
  ErrorEnvelopeSchema, HealthReadyStatusSchema, offlinePackageContentHash,
  OfflinePackageSchema, OfflineRenewalConflictSchema, OfflineRenewalExchangeSchema,
  OfflineRenewalRequestSchema, offlinePackageWindow, RealtimeAuthenticateSchema,
  RealtimeNoticeSchema, RealtimeTicketResponseSchema, realtimeTicketHasThirtySecondLifetime,
  RevisionNotReadySchema, RevisionReadQuerySchema, revisionSatisfiesMinimum,
  StudySessionReadExchangeSchema, verifyOfflinePackageContentHash,
} from './index.mjs';

const examples = JSON.parse(readFileSync(new URL('./examples-B02.07-B02.08.json', import.meta.url)));
const previous = JSON.parse(readFileSync(new URL('./examples.json', import.meta.url)));

describe('B02.07 offline package and renewal', () => {
  it('carries a complete local training snapshot with exact seven plus seven day windows', async () => {
    const pkg = examples.offlinePackage;
    expect(OfflinePackageSchema.parse(pkg)).toEqual(pkg);
    expect(OfflineRenewalExchangeSchema.parse({ request: examples.renewalRequest, response: pkg })
      .response.id).toBe(pkg.id);
    expect(pkg.seedMaterial.activeLines).toEqual([{
      lineId: pkg.baseState.cards[0].lineId,
      revisionId: pkg.lineRevisions[0].revisionId,
    }]);
    expect(pkg.lineRevisions[0].revisionId)
      .toBe(pkg.existingSessions[0].items[0].lineRevisionId);
    expect(pkg.settings.version).toBe(pkg.existingSessions[0].pedagogicalSettings.version);
    expect(pkg).not.toHaveProperty('accessToken');
    expect(await offlinePackageContentHash(pkg)).toBe(pkg.contentHash);
    expect(await verifyOfflinePackageContentHash(pkg)).toBe(true);
    expect(await verifyOfflinePackageContentHash({ ...pkg, seedMaterial: {
      ...pkg.seedMaterial, seed: 'tampered-seed' } })).toBe(false);
    expect(await offlinePackageContentHash(Object.fromEntries(Object.entries(pkg).reverse())))
      .toBe(pkg.contentHash);
  });

  it('rejects missing line material, mismatched snapshots, credentials and invalid windows', () => {
    const pkg = examples.offlinePackage;
    const invalid = [
      { ...pkg, expiresAt: '2026-09-25T11:59:59.999Z' },
      { ...pkg, submitUntil: '2026-10-02T12:00:00.001Z' },
      { ...pkg, deviceId: 'not-uuid' },
      { ...pkg, baseAccountRevision: '4' },
      { ...pkg, settings: { ...pkg.settings, movesPerBlock: 6 } },
      { ...pkg, seedMaterial: { ...pkg.seedMaterial, activeLines: [{
        ...pkg.seedMaterial.activeLines[0],
        revisionId: 'd4d4d4d4-d4d4-44d4-84d4-d4d4d4d4d4d4',
      }] } },
      { ...pkg, lineRevisions: [] },
      { ...pkg, lineRevisions: [...pkg.lineRevisions, {
        ...pkg.lineRevisions[0],
        id: 'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1',
        revisionId: 'b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2',
        openingId: 'c3c3c3c3-c3c3-43c3-83c3-c3c3c3c3c3c3',
      }] },
      { ...pkg, existingSessions: [] },
      { ...pkg, accessToken: 'secret' },
    ];
    for (const candidate of invalid) {
      expect(OfflinePackageSchema.safeParse(candidate).success).toBe(false);
    }
    // Completeness against the source manifest is a server obligation, not
    // something the package can prove about its own declared active list.
    expect(OfflinePackageSchema.safeParse({ ...pkg, seedMaterial: {
      ...pkg.seedMaterial, activeLines: [] } }).success).toBe(true);
    expect(OfflineRenewalExchangeSchema.safeParse({ request: {
      ...examples.renewalRequest, deviceId: '99999999-9999-4999-8999-999999999999',
    }, response: pkg }).success).toBe(false);
  });

  it('separates study expiry from submission grace at the exact boundaries', () => {
    const pkg = examples.offlinePackage;
    const start = '2026-09-25T11:59:59.998Z';
    expect(offlinePackageWindow(pkg, { startedAt: start,
      completedAt: '2026-09-25T11:59:59.999Z',
      receivedAt: '2026-10-02T11:59:59.999Z' })).toEqual({
      studyAllowed: true, submissionAllowed: true,
    });
    expect(offlinePackageWindow(pkg, { startedAt: start,
      completedAt: pkg.expiresAt, receivedAt: pkg.expiresAt }).studyAllowed).toBe(false);
    expect(offlinePackageWindow(pkg, { startedAt: pkg.expiresAt,
      completedAt: pkg.expiresAt, receivedAt: pkg.expiresAt }).studyAllowed).toBe(false);
    expect(offlinePackageWindow(pkg, { startedAt: start,
      completedAt: '2026-09-25T11:59:59.999Z',
      receivedAt: pkg.submitUntil }).submissionAllowed).toBe(false);
    expect(offlinePackageWindow(pkg, { startedAt: start,
      completedAt: '2026-09-25T11:59:59.999Z',
      receivedAt: start }).submissionAllowed).toBe(false);
  });

  it('requires a resolved outbox and a current server revision before renewal', () => {
    const request = examples.renewalRequest;
    const eventId = '12121212-1212-4212-8212-121212121212';
    expect(OfflineRenewalRequestSchema.parse(request)).toEqual(request);
    expect(canRequestOfflineRenewal([])).toBe(true);
    expect(canRequestOfflineRenewal([eventId])).toBe(false);
    expect(assessOfflineRenewal(request, { currentAccountRevision: '3',
      decidedEventIds: [] })).toBe('ready');
    const claimed = { ...request, resolvedEventIds: [eventId] };
    expect(assessOfflineRenewal(claimed, { currentAccountRevision: '3',
      decidedEventIds: [] })).toBe('reconciliation_required');
    expect(assessOfflineRenewal(claimed, { currentAccountRevision: '4',
      decidedEventIds: [eventId] })).toBe('version_conflict');
    expect(OfflineRenewalRequestSchema.safeParse({ ...request,
      resolvedEventIds: [eventId, eventId] }).success).toBe(false);
    expect(OfflineRenewalConflictSchema.parse(examples.renewalReconciliationRequired)
      .error.code).toBe('RECONCILIATION_REQUIRED');
    expect(OfflineRenewalConflictSchema.parse(examples.renewalVersionConflict)
      .error.code).toBe('VERSION_CONFLICT');
  });
});

describe('B02.08 revision barrier, notices and service boundary', () => {
  it('keeps large decimal revisions monotonic in both state and session reads', () => {
    expect(AccountStateReadExchangeSchema.parse(examples.stateRead)).toEqual(examples.stateRead);
    expect(StudySessionReadExchangeSchema.parse(examples.sessionRead)).toEqual(examples.sessionRead);
    expect(revisionSatisfiesMinimum('18446744073709551616',
      '18446744073709551615')).toBe(true);
    expect(revisionSatisfiesMinimum('18446744073709551615',
      '18446744073709551616')).toBe(false);
    expect(RevisionReadQuerySchema.safeParse({ minRevision: '03' }).success).toBe(false);
    expect(AccountStateReadExchangeSchema.safeParse({ ...examples.stateRead,
      query: { minRevision: '4' } }).success).toBe(false);
    expect(StudySessionReadExchangeSchema.safeParse({ ...examples.sessionRead,
      query: { minRevision: '4' } }).success).toBe(false);
    expect(RevisionNotReadySchema.parse(examples.revisionNotReady).error.retryable).toBe(true);
    expect(RevisionNotReadySchema.safeParse({ ...examples.revisionNotReady,
      error: { ...examples.revisionNotReady.error, retryable: false } }).success).toBe(false);
  });

  it('uses a thirty second ticket and revision-only WebSocket notices', () => {
    expect(RealtimeTicketResponseSchema.parse(examples.ticketResponse))
      .toEqual(examples.ticketResponse);
    expect(realtimeTicketHasThirtySecondLifetime(examples.offlinePackage.issuedAt,
      examples.ticketResponse)).toBe(true);
    expect(RealtimeAuthenticateSchema.parse(examples.authenticate)).toEqual(examples.authenticate);
    expect(RealtimeNoticeSchema.parse(examples.hello)).toEqual(examples.hello);
    expect(RealtimeNoticeSchema.parse(examples.stateChanged)).toEqual(examples.stateChanged);
    expect(RealtimeNoticeSchema.safeParse({ ...examples.stateChanged,
      email: 'someone@example.test' }).success).toBe(false);
    expect(RealtimeNoticeSchema.safeParse({ ...examples.stateChanged,
      grade: 'good' }).success).toBe(false);
    expect(RealtimeAuthenticateSchema.safeParse({ type: 'authenticate',
      ticket: '' }).success).toBe(false);
  });

  it('keeps readiness and business authorization distinct from provider secrets', () => {
    expect(HealthReadyStatusSchema.parse(examples.healthReady)).toBe(200);
    expect(HealthReadyStatusSchema.parse(examples.healthUnavailable)).toBe(503);
    expect(HealthReadyStatusSchema.safeParse({ databaseUrl: 'secret' }).success).toBe(false);
    expect(ErrorEnvelopeSchema.parse(previous.authRequired).error.code).toBe('AUTH_REQUIRED');
    expect(ErrorEnvelopeSchema.parse(previous.emailUnverified).error.code)
      .toBe('EMAIL_UNVERIFIED');
  });
});
