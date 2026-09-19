import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import * as contract from './index.mjs';

const document = JSON.parse(readFileSync(new URL('./openapi.json', import.meta.url)));
const files = [
  JSON.parse(readFileSync(new URL('./examples.json', import.meta.url))),
  JSON.parse(readFileSync(new URL('./examples-B02.03-B02.04.json', import.meta.url))),
  JSON.parse(readFileSync(new URL('./examples-B02.05-B02.06.json', import.meta.url))),
  JSON.parse(readFileSync(new URL('./examples-B02.07-B02.08.json', import.meta.url))),
];
const valid = [
  [0, 'catalogPage', 'CatalogPage'], [0, 'lineRevision', 'LineRevision'],
  [0, 'authRequired', 'ErrorEnvelope'], [0, 'emailUnverified', 'ErrorEnvelope'],
  [0, 'notFound', 'ErrorEnvelope'],
  [1, 'profileBeforeOnboarding', 'Profile'], [1, 'settingsPatchRequest', 'SettingsPatchRequest'],
  [1, 'settingsPatchResponse', 'SettingsPatchResponse'], [1, 'repertoirePutRequest', 'RepertoirePutRequest'],
  [1, 'repertoirePutResponse', 'RepertoireMutationResponse'], [1, 'repertoireDeleteHeaders', 'RepertoireDeleteHeaders'],
  [1, 'settingsConflict', 'SettingsVersionConflict'], [1, 'onboardingRequest', 'OnboardingRequest'],
  [1, 'onboardingResponse', 'OnboardingResponse'], [1, 'sessionCreateRequest', 'StudySessionCreateRequest'],
  [1, 'sessionResponse', 'StudySessionResponse'],
  [2, 'studyEvent', 'StudyEvent'], [2, 'knownStudyZone', 'KnownStudyZone'],
  [2, 'request', 'StudyEventsRequest'], [2, 'appliedDecision', 'EventDecision'],
  [2, 'response', 'StudyEventsResponse'],
  [3, 'offlinePackage', 'OfflinePackage'], [3, 'renewalRequest', 'OfflineRenewalRequest'],
  [3, 'renewalReconciliationRequired', 'OfflineRenewalConflict'],
  [3, 'renewalVersionConflict', 'OfflineRenewalConflict'],
  [3, 'stateRead', 'AccountStateReadExchange'], [3, 'sessionRead', 'StudySessionReadExchange'],
  [3, 'revisionNotReady', 'RevisionNotReady'], [3, 'ticketResponse', 'RealtimeTicketResponse'],
  [3, 'authenticate', 'RealtimeAuthenticate'], [3, 'hello', 'RealtimeNotice'],
  [3, 'stateChanged', 'RealtimeNotice'], [3, 'healthReady', 'HealthReadyStatus'],
  [3, 'healthUnavailable', 'HealthReadyStatus'],
];
const generated = (name) => z.fromJSONSchema(document.components.schemas[`${name}Schema`]);

describe('generated B02.09 artifacts', () => {
  it('exposes every exported schema', () => {
    for (const name of Object.keys(contract).filter((key) => key.endsWith('Schema'))) {
      expect(document.components.schemas).toHaveProperty(name);
    }
    expect(document.openapi).toBe('3.1.0');
  });

  it('accepts examples in both Zod and generated JSON Schema', () => {
    for (const [file, key, name] of valid) {
      const value = files[file][key];
      expect(contract[`${name}Schema`].safeParse(value).success, `${key} Zod`).toBe(true);
      expect(generated(name).safeParse(value).success, `${key} OpenAPI`).toBe(true);
    }
  });

  it('preserves structural rejection, decimals, nullables and result unions', () => {
    const cases = [
      ['Id', 'not-an-id'], ['Revision', '01'], ['IntervalDays', '1.0'],
      ['EventResult', { eventId: files[2].studyEvent.eventId, retryable: true, code: 'EVENT_ID_REUSED' }],
      ['Profile', { ...files[1].profileBeforeOnboarding, onboardedAt: false }],
      ['ErrorEnvelope', { ...files[0].authRequired, secret: 'must fail' }],
    ];
    for (const [name, value] of cases) {
      expect(contract[`${name}Schema`].safeParse(value).success, `${name} Zod`).toBe(false);
      expect(generated(name).safeParse(value).success, `${name} OpenAPI`).toBe(false);
    }
    const large = '900719925474099300001';
    expect(generated('Revision').safeParse(large).success).toBe(true);
    expect(generated('Profile').safeParse(files[1].profileBeforeOnboarding).success).toBe(true);
    expect(document.components.schemas.ProfileSchema.properties.onboardedAt.anyOf).toContainEqual({ type: 'null' });
    expect(document.components.schemas.EventResultSchema.anyOf).toHaveLength(3);
    // JSON Schema cannot carry the calendar refinement; runtime Zod remains normative.
    expect(contract.CivilDateSchema.safeParse('2026-02-31').success).toBe(false);
    expect(generated('CivilDate').safeParse('2026-02-31').success).toBe(true);
  });

  it('declares business routes and errors without asserting Better Auth paths', () => {
    const expected = [
      '/v1/catalog', '/v1/catalog/lines/{id}', '/v1/me/state',
      '/v1/me/repertoire/{openingId}', '/v1/me/settings', '/v1/me/onboarding',
      '/v1/study-sessions', '/v1/study-sessions/{id}', '/v1/me/study-events',
      '/v1/me/study-events/{eventId}', '/v1/me/offline-packages',
      '/v1/me/realtime-ticket', '/health/ready',
    ];
    expect(Object.keys(document.paths)).toEqual(expected);
    expect(document['x-websocket'].path).toBe('/v1/updates');
    expect(Object.keys(document.paths).some((path) => path.startsWith('/api/auth/'))).toBe(false);
    for (const [path, methods] of Object.entries(document.paths)) {
      if (path === '/health/ready') continue;
      for (const operation of Object.values(methods)) {
        expect(operation['x-business-auth-required']).toBe(true);
        for (const status of [401, 403, 404, 409, 413, 422, 429, 503]) {
          expect(operation.responses[status].content['application/json'].schema).toEqual({ $ref: '#/components/schemas/ErrorEnvelopeSchema' });
        }
      }
    }
  });
});
