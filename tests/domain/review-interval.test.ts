import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { calculateReviewInterval } from '../../src/domain/review-interval.js';

type ReviewCase = {
  id: string;
  initialState: { card: { intervalDays: string } };
  clock: { studyDates: string[] };
  expected: { steps: { grade: string; arithmetic: { rawInterval: string | null;
    dateOffsetDays: number | null }; cardAfter: { intervalDays: string; dueDate: string } }[] };
};

const load = (rule: string): ReviewCase[] => JSON.parse(readFileSync(
  new URL(`../../src/domain/fixtures/${rule}.json`, import.meta.url), 'utf8',
)).fixtures as ReviewCase[];

describe('B03.03 exact review intervals', () => {
  it('matches independent B01 R07/R08 review/good expectations', () => {
    let checked = 0;
    for (const fixture of [...load('R07'), ...load('R08')]) {
      const before = JSON.stringify(fixture);
      let previous = fixture.initialState.card.intervalDays;
      fixture.expected.steps.forEach((step, index) => {
        if (step.grade !== 'good') return;
        const result = calculateReviewInterval(previous, fixture.clock.studyDates[index]!);
        expect(result.rawInterval, fixture.id).toBe(step.arithmetic.rawInterval!.padEnd(
          step.arithmetic.rawInterval!.indexOf('.') + 4, '0',
        ));
        expect(result.intervalDays, fixture.id).toBe(step.cardAfter.intervalDays);
        expect(result.dateOffsetDays, fixture.id).toBe(step.arithmetic.dateOffsetDays);
        expect(result.dueDate, fixture.id).toBe(step.cardAfter.dueDate);
        previous = result.intervalDays;
        checked++;
      });
      expect(JSON.stringify(fixture), fixture.id).toBe(before);
    }
    expect(checked).toBe(20);
  });

  it('rounds persisted cents and due-date days from the same unrounded product', () => {
    expect(calculateReviewInterval('2.59', '2026-09-15')).toEqual({
      rawInterval: '6.475', intervalDays: '6.48', dateOffsetDays: 6, dueDate: '2026-09-21',
    });
    expect(calculateReviewInterval('2.60', '2026-09-15').dateOffsetDays).toBe(7);
    expect(calculateReviewInterval('2.61', '2026-09-15').intervalDays).toBe('6.53');
    expect(calculateReviewInterval('400000.00', '2026-09-15').dueDate).toBe('4764-08-12');
  });

  it('rejects malformed inputs and dates outside the supported calendar', () => {
    for (const value of ['-1.00', '1', '1.0', '01.00', '1.001', 'Infinity']) {
      expect(() => calculateReviewInterval(value, '2026-09-15')).toThrow(RangeError);
    }
    expect(() => calculateReviewInterval('1.00', '2026-02-30')).toThrow(RangeError);
    expect(() => calculateReviewInterval('1.00', '9999-12-31')).toThrow(RangeError);
    expect(() => calculateReviewInterval('999999999999999999999.00', '2026-09-15'))
      .toThrow(RangeError);
  });
});
