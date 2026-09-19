import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import * as contract from './index.mjs';

const read = (name) => JSON.parse(readFileSync(new URL(name, import.meta.url)));
const openapi = read('./openapi.json');
const account = read('./examples-B02.03-B02.04.json');
const events = read('./examples-B02.05-B02.06.json');
const realtime = read('./examples-B02.07-B02.08.json');
const { errors } = read('./examples-B02.10.json');
const schemaFor = ({ $ref }) => {
  const name = $ref.split('/').at(-1);
  return {
    zod: contract[name],
    documented: z.fromJSONSchema(openapi.components.schemas[name]),
  };
};

describe('B02.10 business contract audit', () => {
  it('provides schema-valid success and authorization examples for every business route', () => {
    const operations = Object.values(openapi.paths).flatMap((methods) => Object.values(methods));
    expect(operations).toHaveLength(14);
    for (const operation of operations) {
      if (operation.operationId === 'healthReady') continue;
      const success = operation.responses[200].content['application/json'];
      const successSchema = schemaFor(success.schema);
      expect(successSchema.zod.safeParse(success.example).success, operation.operationId).toBe(true);
      expect(successSchema.documented.safeParse(success.example).success, operation.operationId).toBe(true);
      for (const [status, code] of [[401, 'AUTH_REQUIRED'], [403, 'EMAIL_UNVERIFIED']]) {
        const failure = operation.responses[status].content['application/json'];
        expect(failure.example).toEqual(errors[code]);
        expect(schemaFor(failure.schema).zod.safeParse(failure.example).success).toBe(true);
      }
      if (operation.requestBody) {
        const request = operation.requestBody.content['application/json'];
        expect(schemaFor(request.schema).zod.safeParse(request.example).success, operation.operationId).toBe(true);
      }
    }
  });

  it('covers every transport error code with a consumable fixture and stable status', () => {
    expect(Object.keys(errors).sort()).toEqual(Object.keys(contract.ERROR_STATUS).sort());
    for (const [code, value] of Object.entries(errors)) {
      expect(contract.ErrorEnvelopeSchema.safeParse(value).success, code).toBe(true);
      expect(schemaFor({ $ref: '#/components/schemas/ErrorEnvelopeSchema' }).documented.safeParse(value).success, code).toBe(true);
      expect(contract.ERROR_STATUS[code]).toBeGreaterThanOrEqual(400);
    }
    expect(contract.ERROR_STATUS.AUTH_REQUIRED).toBe(401);
    expect(contract.ERROR_STATUS.EMAIL_UNVERIFIED).toBe(403);
    expect(contract.ERROR_STATUS.EVENT_ID_REUSED).toBe(409);
    expect(contract.ERROR_STATUS.REVISION_NOT_READY).toBe(503);
    expect(openapi.paths['/v1/me/state'].get.responses[429].headers['Retry-After'].schema)
      .toEqual({ type: 'integer', minimum: 0 });
    const line = openapi.paths['/v1/catalog/lines/{id}'].get;
    expect(line.responses[200].headers.ETag).toEqual(line.responses[304].headers.ETag);
    expect(line.responses[304].content).toBeUndefined();
  });

  it('can join verified account, onboarding, session, event, decision and fresh state by public IDs', () => {
    expect(account.onboardingResponse.profile.emailVerified).toBe(true);
    expect(contract.OnboardingExchangeSchema.safeParse({
      request: account.onboardingRequest,
      response: account.onboardingResponse,
    }).success).toBe(true);
    expect(account.sessionResponse.session.items).toContainEqual(expect.objectContaining({
      id: events.studyEvent.itemRef.id,
      lineId: events.studyEvent.lineId,
      lineRevisionId: events.studyEvent.lineRevisionId,
    }));
    expect(events.studyEvent.sessionRef.id).toBe(account.sessionResponse.session.id);
    expect(contract.StudyEventsExchangeSchema.safeParse({
      request: events.request,
      response: events.response,
    }).success).toBe(true);
    const applied = events.response.results.find((result) => result.eventId === events.studyEvent.eventId);
    expect(applied.decision).toEqual(events.appliedDecision);
    expect(applied.decision.sessionId).toBe(account.sessionResponse.session.id);
    expect(applied.decision.itemId).toBe(events.studyEvent.itemRef.id);
    const replay = openapi.paths['/v1/me/study-events/{eventId}'].get.responses[200]
      .content['application/json'].example;
    expect(replay.decision).toEqual(applied.decision);
    expect(replay.replayed).toBe(true);
    const freshState = { ...realtime.stateRead.response,
      accountRevision: events.response.accountRevision,
      cards: [applied.decision.cardAfter] };
    expect(contract.AccountStateReadExchangeSchema.safeParse({
      query: { minRevision: applied.decision.accountRevision },
      response: freshState,
    }).success).toBe(true);
  });

  it('keeps state collections complete in a measured synthetic large response', () => {
    const base = realtime.stateRead.response;
    const card = base.cards[0];
    const cards = Array.from({ length: 1000 }, (_, index) => ({ ...card,
      id: `aaaaaaaa-aaaa-4aaa-8aaa-${index.toString(16).padStart(12, '0')}` }));
    const eligibleDates = Array.from({ length: 365 }, (_, index) =>
      new Date(Date.UTC(2025, 0, 1 + index)).toISOString().slice(0, 10));
    const state = { ...base, cards, activity: { ...base.activity, eligibleDates } };
    const parsed = contract.AccountStateSchema.parse(state);
    expect(parsed.cards).toHaveLength(1000);
    expect(parsed.activity.eligibleDates).toHaveLength(365);
    expect(Buffer.byteLength(JSON.stringify(parsed), 'utf8')).toBeGreaterThan(300_000);
  });
});
