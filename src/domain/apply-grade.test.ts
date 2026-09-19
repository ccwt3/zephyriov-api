import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyGrade, type SrsCard } from './apply-grade.js';
import type { Grade } from './grade-block.js';

interface TransitionFixture {
  id: string;
  initialState: { color: 'white' | 'black'; card: SrsCard; originType: 'new' | 'review';
    attemptNumber: number; remainingQueue: string[] };
  input: { blockComplete: true; verifiedGrades: Grade[];
    pedagogicalSnapshot: { movesPerBlock: number }; totalStudentMoves: number;
    attemptNumbers?: number[] };
  clock: { studyDate?: string; studyDates?: string[] };
  expected: { steps: Array<{ grade: Grade; cardAfter: SrsCard; gradedAttemptNumber: number;
    itemStatus: 'graded'; repeatRequired: boolean; nextDue: string | null;
    pendingQueue: string[]; retry: { position: 'end'; attemptNumber: number;
      originType: 'new' | 'review'; sameLine: true; sameSession: true } | null }> };
}

function fixtures(rule: string): TransitionFixture[] {
  return JSON.parse(readFileSync(new URL(`./fixtures/${rule}.json`, import.meta.url), 'utf8')).fixtures;
}

describe('B03.06 applyGrade', () => {
  it('matches every R05–R10 card, counter, due date and retry transition', () => {
    const cases = ['R05', 'R06', 'R07', 'R08', 'R09', 'R10'].flatMap(fixtures);
    expect(cases).toHaveLength(46);
    let steps = 0;
    for (const fixture of cases) {
      const before = JSON.stringify(fixture);
      let card = fixture.initialState.card;
      let queue = fixture.initialState.remainingQueue;
      for (const [index, expected] of fixture.expected.steps.entries()) {
        const attemptNumber = fixture.input.attemptNumbers?.[index]
          ?? fixture.initialState.attemptNumber + index;
        const result = applyGrade({ card, grade: fixture.input.verifiedGrades[index]!,
          movesPerBlock: fixture.input.pedagogicalSnapshot.movesPerBlock,
          totalStudentMoves: fixture.input.totalStudentMoves,
          studyDate: fixture.clock.studyDates?.[index] ?? fixture.clock.studyDate!,
          originType: fixture.initialState.originType, attemptNumber,
          blockComplete: fixture.input.blockComplete });
        expect(expected.gradedAttemptNumber, fixture.id).toBe(attemptNumber);
        expect(expected.grade, fixture.id).toBe(fixture.input.verifiedGrades[index]);
        expect(result, `${fixture.id} step ${index + 1}`).toEqual({
          cardAfter: expected.cardAfter, itemStatus: expected.itemStatus,
          repeatRequired: expected.repeatRequired, nextDue: expected.nextDue,
          retry: expected.retry });
        if (result.retry) queue = [...queue, `subject-attempt-${result.retry.attemptNumber}`];
        expect(queue, `${fixture.id} queue step ${index + 1}`).toEqual(expected.pendingQueue);
        if (result.retry) queue = queue.filter((entry) => entry !== `subject-attempt-${result.retry!.attemptNumber}`);
        card = result.cardAfter;
        steps++;
      }
      expect(JSON.stringify(fixture), fixture.id).toBe(before);
    }
    expect(steps).toBe(60);
  });

  it('caps good depth at each color’s validated line length in all R11 cases', () => {
    const cases = JSON.parse(readFileSync(new URL('./fixtures/R11.json', import.meta.url), 'utf8')).fixtures;
    expect(cases).toHaveLength(16);
    for (const fixture of cases) {
      const { color, card: partial } = fixture.initialState;
      const totalStudentMoves = fixture.input.validatedLine.totalStudentMovesByColor[color];
      const card: SrsCard = { ...partial, intervalDays: '0.00', dueDate: '2026-09-15',
        reps: 0, lapses: 0 };
      const result = applyGrade({ card, grade: fixture.input.verifiedGrade,
        movesPerBlock: fixture.input.movesPerBlock, totalStudentMoves,
        studyDate: fixture.clock.studyDate, originType: partial.state,
        attemptNumber: 1, blockComplete: fixture.input.blockComplete });
      expect(Math.min(partial.unlockedMoves, totalStudentMoves), fixture.id)
        .toBe(fixture.expected.effectiveMovesBefore);
      expect(result.cardAfter.unlockedMoves, fixture.id).toBe(fixture.expected.depthAfterGood);
      const plies = (count: number) => Array.from({ length: count }, (_, index) =>
        2 * (index + 1) - (color === 'white' ? 1 : 0));
      expect(plies(fixture.expected.effectiveMovesBefore), fixture.id)
        .toEqual(fixture.expected.studentPliesBefore);
      expect(plies(result.cardAfter.unlockedMoves), fixture.id)
        .toEqual(fixture.expected.studentPliesAfter);
    }
  });

  it('rejects invalid state and counter overflow without mutating its input', () => {
    const card: SrsCard = { state: 'review', unlockedMoves: 4,
      intervalDays: '1.00', dueDate: '2026-09-10', reps: 2, lapses: 0 };
    const base = { card, grade: 'good' as const, movesPerBlock: 4,
      totalStudentMoves: 10, studyDate: '2026-09-15', originType: 'review' as const,
      attemptNumber: 1, blockComplete: true as const };
    const before = JSON.stringify(base);
    expect(() => applyGrade({ ...base, card: { ...card, unlockedMoves: 11 } })).toThrow();
    expect(() => applyGrade({ ...base, card: { ...card, reps: Number.MAX_SAFE_INTEGER } })).toThrow();
    expect(() => applyGrade({ ...base, blockComplete: false as true })).toThrow();
    applyGrade(base);
    expect(JSON.stringify(base)).toBe(before);
  });
});
