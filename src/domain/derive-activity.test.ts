import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { deriveActivity, deriveStreak, type ActivityOperation, type ActivityState } from './derive-activity.js';

interface ActivityFixture {
  id: string;
  initialState: ActivityState & { color: string };
  input: { operations: ActivityOperation[] };
  clock: { studyDate: string };
  expected: { steps: Array<Record<string, unknown>>; activityDaysAfter: unknown };
}

const activityFixtures = [14, 15, 16].flatMap((number) =>
  (JSON.parse(readFileSync(new URL(`./fixtures/R${number}.json`, import.meta.url), 'utf8')) as {
    fixtures: ActivityFixture[];
  }).fixtures);

const streakFixtures = (JSON.parse(readFileSync(new URL('./fixtures/R21.json', import.meta.url), 'utf8')) as {
  fixtures: Array<{
    id: string;
    initialState: { eligibleDates?: string[] };
    input: { arrivals?: Array<string | null> };
    clock: { asOfDate: string };
    expected: { steps: Array<Record<string, unknown>> };
  }>;
}).fixtures.filter((fixture) => fixture.input.arrivals);

describe('B03.08 activity and streak', () => {
  it.each(activityFixtures)('$id matches independent R14–R16 steps', (fixture) => {
    const before = JSON.stringify(fixture);
    let state: ActivityState = fixture.initialState;
    fixture.input.operations.forEach((operation, index) => {
      const result = deriveActivity(state, operation, fixture.clock.studyDate);
      const { state: nextState, ...actual } = result;
      expect(actual).toEqual(fixture.expected.steps[index]);
      state = nextState;
    });
    expect(state.activityDays).toEqual(fixture.expected.activityDaysAfter);
    expect(JSON.stringify(fixture)).toBe(before);
  });

  it.each(streakFixtures)('$id recomputes R21 streaks from eligible dates', (fixture) => {
    const dates = [...fixture.initialState.eligibleDates!];
    fixture.input.arrivals!.forEach((arrival, index) => {
      if (arrival) dates.push(arrival);
      expect({ arrival, ...deriveStreak(dates, fixture.clock.asOfDate) })
        .toEqual(fixture.expected.steps[index]);
    });
  });

  it('rejects a retry that changes the original review classification', () => {
    const fixture = activityFixtures.find((value) => value.id === 'R15-review-lapse-retries-white')!;
    const operation = fixture.input.operations[0]!;
    if (operation.kind !== 'applied' || !operation.retry) throw new Error('Missing retry fixture');
    expect(() => deriveActivity(fixture.initialState,
      { ...operation, retry: { ...operation.retry, originType: 'new' } }, fixture.clock.studyDate))
      .toThrow('origin');
  });
});
