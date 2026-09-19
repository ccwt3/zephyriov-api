import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  EventDecisionSchema, EventResultSchema, freezeStudyEvent,
  KnownStudyZoneSchema, parseStudyEventsBody, ReplayedDecisionResponseSchema,
  STUDY_EVENTS_MAX_BYTES, StudyEventSchema, StudyEventsExchangeSchema,
  StudyEventsRequestSchema, StudyEventsResponseSchema,
  validateStudyEventDependencies, validateStudyEventZoneEvidence,
} from './index.mjs';

const examples = JSON.parse(readFileSync(new URL('./examples-B02.05-B02.06.json', import.meta.url)));
const previous = JSON.parse(readFileSync(new URL('./examples-B02.03-B02.04.json', import.meta.url)));

describe('B02.05 immutable raw study events', () => {
  it('accepts raw attempts and rejects client grading, false IDs and false revisions', () => {
    expect(StudyEventSchema.parse(examples.studyEvent)).toEqual(examples.studyEvent);
    expect(StudyEventSchema.safeParse({ ...examples.studyEvent, grade: 'good' }).success)
      .toBe(false);
    expect(StudyEventSchema.safeParse({
      ...examples.studyEvent,
      attempts: [{ ply: 1, playedSan: 'e4', elapsedMs: -1 }],
    }).success).toBe(false);
    expect(StudyEventSchema.safeParse({
      ...examples.studyEvent,
      dependsOnEventIds: [examples.studyEvent.eventId],
    }).success).toBe(false);
    for (const changed of [
      { sessionRef: { kind: 'canonical', id: 'not-a-uuid' } },
      { itemRef: { kind: 'local', id: '   ' } },
      { base: { ...examples.studyEvent.base, cardVersion: 'bogus' } },
      { pedagogicalSettingsVersion: 'bogus' },
      { zoneEvidenceRef: undefined },
    ]) {
      expect(StudyEventSchema.safeParse({ ...examples.studyEvent, ...changed }).success)
        .toBe(false);
    }
    expect(StudyEventSchema.safeParse({ ...examples.studyEvent,
      packageId: null,
      zoneEvidenceRef: { kind: 'issued-package',
        packageId: '77777777-7777-4777-8777-777777777777', settingsVersion: '1' },
    }).success).toBe(false);
  });

  it('freezes a detached event snapshot', () => {
    const source = structuredClone(examples.studyEvent);
    const frozen = freezeStudyEvent(source);
    expect(frozen).not.toBe(source);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.attempts[0])).toBe(true);
    source.attempts[0].playedSan = 'd4';
    expect(frozen.attempts[0].playedSan).toBe('e4');
  });

  it('matches zone evidence to source, device, version and starting date', () => {
    expect(KnownStudyZoneSchema.parse(examples.knownStudyZone)).toEqual(examples.knownStudyZone);
    expect(validateStudyEventZoneEvidence(examples.studyEvent, examples.knownStudyZone))
      .toEqual(examples.studyEvent);
    for (const changed of [
      { reference: { ...examples.knownStudyZone.reference, settingsVersion: '999' } },
      { reference: { ...examples.knownStudyZone.reference, accountRevision: '999' } },
      { deviceId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' },
      { knownAt: '2026-09-18T12:02:00.000Z' },
      { timezone: 'America/Mexico_City' },
    ]) {
      expect(() => validateStudyEventZoneEvidence(examples.studyEvent, {
        ...examples.knownStudyZone, ...changed,
      })).toThrow();
    }
    expect(KnownStudyZoneSchema.safeParse({ ...examples.knownStudyZone,
      provenance: 'client-claim' }).success).toBe(false);
    expect(() => validateStudyEventZoneEvidence(examples.studyEvent, {
      ...examples.knownStudyZone, timezone: 'America/Mexico_City',
    })).toThrow();
  });

  it('keeps the old known zone during a remote change and uses the new one next block', () => {
    const { oldBlock, nextBlock, serverChangedAt, serverCurrentTimezone } = examples.remoteZoneChange;
    const oldEvent = { ...examples.studyEvent, ...oldBlock.eventOverrides };
    const nextEvent = { ...examples.studyEvent, ...nextBlock.eventOverrides };
    expect(Date.parse(oldEvent.startedAt)).toBeLessThan(Date.parse(serverChangedAt));
    expect(Date.parse(serverChangedAt)).toBeLessThan(Date.parse(oldEvent.completedAt));
    expect(serverCurrentTimezone).toBe('Asia/Tokyo');
    expect(validateStudyEventZoneEvidence(oldEvent, oldBlock.resolvedEvidence)).toEqual(oldEvent);
    expect(validateStudyEventZoneEvidence(nextEvent, nextBlock.resolvedEvidence)).toEqual(nextEvent);
    expect(oldEvent.studyDate).toBe('2026-09-16');
    expect(nextEvent.studyDate).toBe('2026-09-17');
    expect(nextEvent.pedagogicalSettingsVersion).toBe('1');
    expect(nextEvent.zoneEvidenceRef.settingsVersion).toBe('2');
    expect(() => validateStudyEventZoneEvidence(oldEvent, nextBlock.resolvedEvidence)).toThrow();
    expect(() => validateStudyEventZoneEvidence(nextEvent, oldBlock.resolvedEvidence)).toThrow();
    const packageEvent = examples.request.events[1];
    expect(validateStudyEventZoneEvidence(packageEvent, {
      reference: packageEvent.zoneEvidenceRef,
      deviceId: packageEvent.deviceId,
      timezone: 'UTC',
      knownAt: '2026-09-18T11:59:00.000Z',
    })).toEqual(packageEvent);
  });

  it('allows a parent outside the batch but rejects repeated IDs and cycles in the batch', () => {
    const child = { ...examples.studyEvent,
      eventId: '67676767-6767-4676-8676-676767676767',
      dependsOnEventIds: ['78787878-7878-4787-8787-787878787878'] };
    expect(validateStudyEventDependencies({ events: [child] }).events).toHaveLength(1);
    const first = { ...examples.studyEvent,
      eventId: '89898989-8989-4898-8898-898989898989',
      dependsOnEventIds: ['90909090-9090-4090-8090-909090909090'] };
    const second = { ...examples.studyEvent,
      eventId: '90909090-9090-4090-8090-909090909090',
      dependsOnEventIds: [first.eventId] };
    expect(StudyEventsRequestSchema.safeParse({ events: [first, second] }).success).toBe(false);
    expect(StudyEventsRequestSchema.safeParse({ events: [examples.studyEvent, examples.studyEvent] })
      .success).toBe(false);
    expect(StudyEventsRequestSchema.parse(examples.request)).toEqual(examples.request);
    expect(examples.request.events[0]).toEqual(examples.studyEvent);
  });

  it('enforces 256 KiB on the original UTF-8 body, including whitespace', () => {
    const body = JSON.stringify({ events: [examples.studyEvent] });
    expect(parseStudyEventsBody(body).events[0]).toEqual(examples.studyEvent);
    expect(parseStudyEventsBody(new TextEncoder().encode(body)).events[0])
      .toEqual(examples.studyEvent);
    expect(parseStudyEventsBody(body + ' '.repeat(STUDY_EVENTS_MAX_BYTES - body.length)))
      .toEqual({ events: [examples.studyEvent] });
    expect(() => parseStudyEventsBody(body + ' '.repeat(STUDY_EVENTS_MAX_BYTES - body.length + 1)))
      .toThrow(/256 KiB/);
  });

  it('keeps the applied example consistent with its item and immutable line revision', () => {
    const event = examples.studyEvent;
    const item = previous.sessionResponse.session.items.find((entry) =>
      entry.id === event.itemRef.id);
    const line = previous.sessionResponse.lines.find((entry) =>
      entry.revisionId === event.lineRevisionId);
    expect(item.status).toBe('pending');
    expect(event.sessionRef.id).toBe(item.sessionId);
    expect(event.dependsOnEventIds).toContain(item.parentEventId);
    expect(event.base).toEqual({
      cardVersion: item.baseCard.version,
      generation: item.baseCard.generation,
      contentGeneration: item.baseCard.contentGeneration,
    });
    expect(event.pedagogicalSettingsVersion).toBe(item.pedagogicalSettingsVersion);
    expect(event.attempts.map((attempt) => attempt.ply)).toEqual(line.moves.map((move) => move.ply));
    expect(event.attempts.map((attempt) => attempt.playedSan))
      .toEqual(line.moves.map((move) => move.san));
    expect(examples.appliedDecision.itemId).toBe(item.id);
    expect(examples.appliedDecision.cardAfter.unlockedMoves)
      .toBeLessThanOrEqual(line.totalStudentMovesByColor.white);
    expect(examples.appliedDecision.sessionCompleted).toBe(true);
  });
});

describe('B02.06 event decisions, replay and mixed batches', () => {
  it('requires reasons and effects coherent with each decision outcome', () => {
    expect(EventDecisionSchema.parse(examples.appliedDecision)).toEqual(examples.appliedDecision);
    for (const changed of [
      { reason: 'STALE_CARD' },
      { grade: null },
      { cardAfter: null },
      { itemId: null },
      { sessionId: null },
      { outcome: 'practice', reason: 'ACCEPTED', cardAfter: null, nextDue: null },
      { outcome: 'invalid', reason: 'ACCEPTED', grade: null, cardAfter: null, nextDue: null },
    ]) {
      expect(EventDecisionSchema.safeParse({ ...examples.appliedDecision, ...changed }).success)
        .toBe(false);
    }
    const practice = { ...examples.appliedDecision, outcome: 'practice', reason: 'STALE_CARD',
      cardAfter: null, repeatItem: null, nextDue: null };
    expect(EventDecisionSchema.parse(practice)).toEqual(practice);
    const invalid = { ...practice, outcome: 'invalid', reason: 'INVALID_ATTEMPTS', grade: null };
    expect(EventDecisionSchema.parse(invalid)).toEqual(invalid);
    expect(EventDecisionSchema.safeParse({ ...invalid, grade: 'good' }).success).toBe(false);
  });

  it('binds a repeat item to the original event and session', () => {
    const repeatItem = { ...previous.sessionResponse.session.items[1],
      parentEventId: examples.appliedDecision.eventId };
    const decision = { ...examples.appliedDecision, grade: 'bad',
      repeatItem, nextDue: null };
    expect(EventDecisionSchema.parse(decision)).toEqual(decision);
    expect(EventDecisionSchema.safeParse({ ...decision,
      repeatItem: { ...repeatItem, parentEventId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' },
    }).success).toBe(false);
  });

  it('distinguishes replayed decisions from retryable and terminal results', () => {
    const result = examples.response.results[0];
    expect(EventResultSchema.parse(result)).toEqual(result);
    expect(ReplayedDecisionResponseSchema.safeParse({ ...result, replayed: true }).success)
      .toBe(true);
    expect(EventResultSchema.parse(examples.response.results[1]).retryable).toBe(true);
    expect(EventResultSchema.parse(examples.response.results[2]).code).toBe('EVENT_ID_REUSED');
    expect(StudyEventsResponseSchema.parse(examples.response)).toEqual(examples.response);
    expect(StudyEventsExchangeSchema.parse({ request: examples.request,
      response: examples.response }).response).toEqual(examples.response);
    expect(StudyEventsResponseSchema.safeParse({ ...examples.response,
      results: [result, result] }).success).toBe(false);
    expect(StudyEventsExchangeSchema.safeParse({ request: examples.request,
      response: { ...examples.response, results: examples.response.results.slice(1) },
    }).success).toBe(false);
    expect(StudyEventsExchangeSchema.safeParse({ request: examples.request,
      response: { ...examples.response, results: [...examples.response.results,
        { eventId: 'abababab-abab-4aba-8aba-abababababab', retryable: true,
          code: 'DEPENDENCY_PENDING' }] },
    }).success).toBe(false);
    expect(StudyEventsExchangeSchema.safeParse({ request: examples.request,
      response: { ...examples.response, results: [...examples.response.results.slice(0, 2),
        { eventId: 'abababab-abab-4aba-8aba-abababababab', retryable: false,
          code: 'EVENT_ID_REUSED' }] },
    }).success).toBe(false);
    const laterResponse = { ...examples.response, accountRevision: '6',
      results: [{ ...result, replayed: true }, ...examples.response.results.slice(1)] };
    expect(StudyEventsExchangeSchema.parse({ request: examples.request,
      response: laterResponse }).response.results[0].decision.accountRevision).toBe('5');
  });
});
