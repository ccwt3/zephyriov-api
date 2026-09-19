import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AccountStateSchema, CardSchema, checkExpectedVersion, decideRepertoireDelete,
  decideRepertoirePut, decideSettingsPatch, OnboardingExchangeSchema, OnboardingRequestSchema,
  OnboardingResponseSchema, OnboardingWithCatalogSchema, ProfileSchema,
  RepertoireDeleteHeadersSchema, RepertoireMutationResponseSchema,
  RepertoirePutForOpeningSchema, RepertoirePutRequestSchema,
  SettingsPatchRequestSchema, SettingsPatchResponseSchema, SettingsSchema,
  SettingsVersionConflictSchema, StudyItemSchema, StudySessionCreateRequestSchema,
  StudySessionResponseSchema, StudySessionSchema, versionFromIfMatch,
} from './index.mjs';

const examples = JSON.parse(readFileSync(new URL('./examples-B02.03-B02.04.json', import.meta.url)));
const catalog = JSON.parse(readFileSync(new URL('./examples.json', import.meta.url)));

describe('B02.03 profile, settings and repertoire', () => {
  it('keeps nullable onboarding and immutable settings versions', () => {
    expect(ProfileSchema.parse(examples.profileBeforeOnboarding)).toEqual(examples.profileBeforeOnboarding);
    expect(examples.profileBeforeOnboarding.onboardedAt).toBeNull();
    expect(SettingsSchema.parse(examples.profileBeforeOnboarding.settings).version).toBe('1');
    expect(SettingsSchema.parse(examples.settingsPatchResponse.settings).version).toBe('2');
    expect(ProfileSchema.safeParse({ ...examples.profileBeforeOnboarding,
      credentials: 'secret' }).success).toBe(false);
  });

  it('validates settings changes and states when they take effect', () => {
    expect(SettingsPatchRequestSchema.parse(examples.settingsPatchRequest))
      .toEqual(examples.settingsPatchRequest);
    expect(SettingsPatchResponseSchema.parse(examples.settingsPatchResponse))
      .toEqual(examples.settingsPatchResponse);
    for (const change of [
      { newLinesPerDay: 0 }, { newLinesPerDay: 13 }, { movesPerBlock: 1 },
      { movesPerBlock: 11 }, { timezone: 'Mars/Olympus' },
    ]) {
      expect(SettingsPatchRequestSchema.safeParse({ expectedVersion: '1', ...change }).success)
        .toBe(false);
    }
    expect(SettingsPatchRequestSchema.safeParse({ expectedVersion: '1' }).success).toBe(false);
    expect(SettingsPatchRequestSchema.safeParse({ expectedVersion: '1', timezone: 'UTC',
      unexpected: true }).success).toBe(false);
    expect(SettingsVersionConflictSchema.parse(examples.settingsConflict).currentSettings.version)
      .toBe('2');
  });

  it('requires playable color and versioned repertoire requests', () => {
    expect(RepertoirePutRequestSchema.parse(examples.repertoirePutRequest))
      .toEqual(examples.repertoirePutRequest);
    expect(RepertoireMutationResponseSchema.parse(examples.repertoirePutResponse))
      .toEqual(examples.repertoirePutResponse);
    expect(RepertoireDeleteHeadersSchema.parse(examples.repertoireDeleteHeaders))
      .toEqual(examples.repertoireDeleteHeaders);
    expect(versionFromIfMatch(examples.repertoireDeleteHeaders)).toBe('1');
    expect(RepertoirePutForOpeningSchema.safeParse({
      openingId: catalog.catalogPage.openings[0].id,
      opening: { ...catalog.catalogPage.openings[0], playableColors: ['white'] },
      request: { color: 'black', expectedVersion: '0' },
    }).success).toBe(false);
    expect(RepertoirePutForOpeningSchema.safeParse({
      openingId: catalog.catalogPage.openings[0].id,
      opening: catalog.catalogPage.openings[0],
      request: examples.repertoirePutRequest,
    }).success).toBe(true);
    expect(RepertoireDeleteHeadersSchema.safeParse({ ifMatch: '1' }).success).toBe(false);
  });

  it('distinguishes a valid write, idempotent desired state and real conflict', () => {
    expect(checkExpectedVersion('0', '0', false)).toBe('apply');
    expect(checkExpectedVersion('0', '1', true)).toBe('unchanged');
    expect(checkExpectedVersion('0', '1', false)).toBe('conflict');
    expect(checkExpectedVersion('18446744073709551616', '18446744073709551616', false))
      .toBe('apply');
    expect(() => checkExpectedVersion('01', '1', false)).toThrow();
    const opening = catalog.catalogPage.openings[0];
    const entry = examples.repertoirePutResponse.entry;
    expect(decideRepertoirePut(null, opening.id, opening, examples.repertoirePutRequest))
      .toBe('apply');
    expect(decideRepertoirePut(entry, opening.id, opening, examples.repertoirePutRequest))
      .toBe('unchanged');
    expect(decideRepertoirePut({ ...entry, color: 'black' }, opening.id, opening,
      examples.repertoirePutRequest)).toBe('conflict');
    expect(decideRepertoireDelete(entry, examples.repertoireDeleteHeaders)).toBe('apply');
    expect(decideRepertoireDelete({ ...entry, active: false }, { ifMatch: '"0"' }))
      .toBe('unchanged');
    expect(decideRepertoireDelete(entry, { ifMatch: '"0"' })).toBe('conflict');
    const currentSettings = examples.settingsPatchResponse.settings;
    expect(decideSettingsPatch(examples.profileBeforeOnboarding.settings,
      examples.settingsPatchRequest)).toBe('apply');
    expect(decideSettingsPatch(currentSettings, examples.settingsPatchRequest))
      .toBe('unchanged');
    expect(decideSettingsPatch(currentSettings, { expectedVersion: '1',
      movesPerBlock: 8 })).toBe('conflict');
  });
});

describe('B02.04 study session, item snapshots and onboarding', () => {
  it('preserves initial origin on a retry and validates the base snapshot', () => {
    const { session } = examples.sessionResponse;
    expect(StudySessionSchema.parse(session)).toEqual(session);
    expect(StudyItemSchema.parse(session.items[1]).originType).toBe('new');
    expect(session.items[1].attemptNumber).toBe(2);
    expect(session.items[1].parentEventId).not.toBeNull();
    expect(CardSchema.parse(session.items[0].baseCard)).toEqual(session.items[0].baseCard);
    expect(StudyItemSchema.safeParse({ ...session.items[1], parentEventId: null }).success)
      .toBe(false);
    expect(StudyItemSchema.safeParse({ ...session.items[0], originType: 'retry' }).success)
      .toBe(false);
    expect(StudyItemSchema.safeParse({ ...session.items[1], originType: 'review',
      baseCard: { ...session.items[1].baseCard, state: 'new' } }).success).toBe(true);
  });

  it('checks separate counts, snapshot and accompanying line revisions', () => {
    expect(StudySessionCreateRequestSchema.parse(examples.sessionCreateRequest))
      .toEqual(examples.sessionCreateRequest);
    expect(StudySessionResponseSchema.parse(examples.sessionResponse))
      .toEqual(examples.sessionResponse);
    const { session } = examples.sessionResponse;
    expect(StudySessionSchema.safeParse({ ...session, completedCount: 2 }).success).toBe(false);
    expect(StudySessionSchema.safeParse({ ...session, status: 'completed' }).success).toBe(false);
    expect(StudySessionSchema.safeParse({ ...session, newLineIds: [] }).success).toBe(false);
    expect(StudySessionSchema.safeParse({ ...session, status: 'completed',
      items: [session.items[0], { ...session.items[1], status: 'cancelled' }],
      pendingCount: 0, cancelledCount: 1 }).success).toBe(true);
    expect(StudySessionResponseSchema.safeParse({ ...examples.sessionResponse, lines: [] }).success)
      .toBe(false);
    expect(session.pedagogicalSettings.version).toBe('1');
    expect(examples.settingsPatchResponse.settings.version).toBe('2');
  });

  it('requires a nonempty, unique, playable onboarding selection', () => {
    expect(OnboardingRequestSchema.parse(examples.onboardingRequest))
      .toEqual(examples.onboardingRequest);
    expect(OnboardingResponseSchema.parse(examples.onboardingResponse))
      .toEqual(examples.onboardingResponse);
    expect(OnboardingExchangeSchema.safeParse({ request: examples.onboardingRequest,
      response: examples.onboardingResponse }).success).toBe(true);
    expect(AccountStateSchema.parse(examples.onboardingResponse))
      .toEqual(examples.onboardingResponse);
    expect(OnboardingRequestSchema.safeParse({ selections: [],
      expectedAccountRevision: '0' }).success).toBe(false);
    const selection = examples.onboardingRequest.selections[0];
    expect(OnboardingRequestSchema.safeParse({ selections: [selection, selection],
      expectedAccountRevision: '0' }).success).toBe(false);
    expect(OnboardingWithCatalogSchema.safeParse({ request: examples.onboardingRequest,
      openings: [{ id: selection.openingId, playableColors: ['black'] }] }).success)
      .toBe(false);
    expect(OnboardingWithCatalogSchema.safeParse({ request: examples.onboardingRequest,
      openings: [catalog.catalogPage.openings[0]] }).success).toBe(true);
    expect(OnboardingResponseSchema.safeParse({ ...examples.onboardingResponse,
      profile: examples.profileBeforeOnboarding }).success).toBe(false);
    expect(OnboardingExchangeSchema.safeParse({
      request: { ...examples.onboardingRequest, selections: [selection, {
        openingId: '55555555-5555-4555-8555-555555555555', color: 'black',
      }] },
      response: examples.onboardingResponse,
    }).success).toBe(false);
  });
});
