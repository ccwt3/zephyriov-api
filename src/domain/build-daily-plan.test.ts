import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { buildDailyPlan, PLAN_GENERATOR_VERSION, type DailyPlanInput } from './build-daily-plan.js';

const fixtures = [12, 13].flatMap((number) =>
  (JSON.parse(readFileSync(new URL(`./fixtures/R${number}.json`, import.meta.url), 'utf8')) as {
    fixtures: Array<{
      id: string;
      initialState: Pick<DailyPlanInput, 'color' | 'candidates'>;
      input: Pick<DailyPlanInput, 'newLinesPerDay' | 'movesPerBlock' | 'generatorVersion'>;
      clock: { studyDate: string };
      seed: { value: string; draws: Array<number | '65535/65536'> };
      expected: Record<string, unknown>;
    }>;
  }).fixtures);

describe('B03.07 daily plan', () => {
  it.each(fixtures)('$id matches independent R12/R13 expectations', (fixture) => {
    const before = JSON.stringify(fixture);
    const plan = buildDailyPlan({ ...fixture.initialState, ...fixture.input,
      studyDate: fixture.clock.studyDate, seed: fixture.seed.value, fixtureDraws: fixture.seed.draws });
    expect({ ...plan, items: plan.items.map(({ lineId, originType, effectiveMoves, studentPlies }) =>
      ({ lineId, originType, effectiveMoves, studentPlies })) }).toEqual(fixture.expected);
    expect(new Set(plan.items.map((item) => item.logicalId)).size).toBe(plan.items.length);
    expect(JSON.stringify(fixture)).toBe(before);
  });

  it('rejects incomplete or surplus fixture tape', () => {
    const f = fixtures.find((fixture) => fixture.id === 'R13-uneven-white')!;
    const base = { ...f.initialState, ...f.input, studyDate: f.clock.studyDate, seed: f.seed.value };
    expect(() => buildDailyPlan({ ...base, fixtureDraws: [] })).toThrow('exhausted');
    expect(() => buildDailyPlan({ ...base, fixtureDraws: [...f.seed.draws, 0] })).toThrow('Unused');
  });

  it('uses a versioned production generator with stable independent vectors', () => {
    const f = fixtures.find((fixture) => fixture.id === 'R13-uneven-white')!;
    const input = { ...f.initialState, ...f.input, studyDate: f.clock.studyDate,
      seed: 'account-A/2026-09-15', generatorVersion: PLAN_GENERATOR_VERSION };
    const before = JSON.stringify(input);
    const first = buildDailyPlan(input);
    expect(first.newLineIds).toEqual(['C2', 'A2', 'B1', 'C1', 'A3', 'A1']);
    expect(buildDailyPlan({ ...input, candidates: [...input.candidates].reverse() })).toEqual(first);
    expect(buildDailyPlan(input)).toEqual(first);
    expect(JSON.stringify(input)).toBe(before);
    expect(() => buildDailyPlan({ ...input, generatorVersion: 'unknown' })).toThrow('version');
  });
});
