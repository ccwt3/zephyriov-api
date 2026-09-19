import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { gradeBlock, type GradeBlockInput } from './grade-block.js';
import { verifyAttempts } from './verify-attempts.js';

interface GradingFixture {
  id: string;
  initialState: { color: 'white' | 'black'; effectiveMoves: number;
    pedagogicalSnapshot: { movesPerBlock: number }; blockComplete: true };
  input: { verifiedAttempts: GradeBlockInput['verifiedAttempts']; priorInteractions: unknown[] };
  expected: { grade: string; legalErrorCount: number; slowCorrectCount: number;
    reportedAttemptPlies: number[]; ignoredIllegalInteractions: number };
}

function fixtures(rule: string): GradingFixture[] {
  return JSON.parse(readFileSync(new URL(`./fixtures/${rule}.json`, import.meta.url), 'utf8')).fixtures;
}

describe('B03.05 gradeBlock', () => {
  it('matches all 40 independent R01–R04 expectations', () => {
    const cases = ['R01', 'R02', 'R03', 'R04'].flatMap(fixtures);
    expect(cases).toHaveLength(40);
    for (const fixture of cases) {
      const before = JSON.stringify(fixture);
      const result = gradeBlock({ ...fixture.initialState,
        movesPerBlock: fixture.initialState.pedagogicalSnapshot.movesPerBlock,
        verifiedAttempts: fixture.input.verifiedAttempts });
      expect(result, fixture.id).toEqual({ grade: fixture.expected.grade,
        legalErrorCount: fixture.expected.legalErrorCount,
        slowCorrectCount: fixture.expected.slowCorrectCount,
        reportedAttemptPlies: fixture.expected.reportedAttemptPlies });
      expect(fixture.input.priorInteractions, fixture.id).toHaveLength(
        fixture.expected.ignoredIllegalInteractions);
      expect(JSON.stringify(fixture), fixture.id).toBe(before);
    }
  });

  it('counts only correct moves slower than 120000 ms and gives errors priority', () => {
    const correct = (elapsedMs: number) => ({ ply: 1, playedSan: 'e4', legal: true as const,
      correct: true, elapsedMs });
    const base = { color: 'white' as const, effectiveMoves: 1, movesPerBlock: 1,
      blockComplete: true as const };
    expect(gradeBlock({ ...base, verifiedAttempts: [correct(120_000)] }).grade).toBe('good');
    expect(gradeBlock({ ...base, verifiedAttempts: [correct(120_001)] }).grade).toBe('mid');
    expect(gradeBlock({ ...base, verifiedAttempts: [{ ...correct(120_001), correct: false }] }))
      .toMatchObject({ grade: 'bad', legalErrorCount: 1, slowCorrectCount: 0 });
  });

  it('grades SAN-derived correctness after a legal error', () => {
    const verifiedAttempts = verifyAttempts({
      theorySan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O'],
      color: 'white', effectiveMoves: 4,
      attempts: [{ ply: 1, playedSan: 'e4', elapsedMs: 120_000 },
        { ply: 3, playedSan: 'Nc3', elapsedMs: 120_001 },
        { ply: 5, playedSan: 'Bc4', elapsedMs: 1 },
        { ply: 7, playedSan: 'O-O', elapsedMs: 1 }],
    });
    expect(gradeBlock({ color: 'white', effectiveMoves: 4, movesPerBlock: 4,
      blockComplete: true, verifiedAttempts }))
      .toMatchObject({ grade: 'bad', legalErrorCount: 1, slowCorrectCount: 0 });
  });

  it('rejects incomplete, wrong-color, illegal and invalid-time reports', () => {
    const base = { color: 'black' as const, effectiveMoves: 1, movesPerBlock: 1,
      blockComplete: true as const, verifiedAttempts: [{ ply: 2, playedSan: 'e5',
        legal: true as const, correct: true, elapsedMs: 1 }] };
    expect(() => gradeBlock({ ...base, verifiedAttempts: [] })).toThrow();
    expect(() => gradeBlock({ ...base, color: 'white' })).toThrow();
    expect(() => gradeBlock({ ...base, verifiedAttempts: [{ ...base.verifiedAttempts[0]!,
      legal: false as true }] })).toThrow();
    expect(() => gradeBlock({ ...base, verifiedAttempts: [{ ...base.verifiedAttempts[0]!,
      elapsedMs: Number.NaN }] })).toThrow();
  });
});
