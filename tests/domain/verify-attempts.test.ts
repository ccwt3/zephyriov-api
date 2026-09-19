import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { verifyAttempts, type VerifyAttemptsInput } from '../../src/domain/verify-attempts.js';

const white: VerifyAttemptsInput = {
  theorySan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O'],
  color: 'white', effectiveMoves: 4,
  attempts: [
    { ply: 1, playedSan: 'e4', elapsedMs: 120000 },
    { ply: 3, playedSan: 'Nc3', elapsedMs: 120001 },
    { ply: 5, playedSan: 'Bc4', elapsedMs: 0 },
    { ply: 7, playedSan: 'O-O', elapsedMs: 42 },
  ],
};

describe('B03.04 SAN and attempt verification', () => {
  it('replays from theory after a legal error and preserves the input', () => {
    const before = JSON.stringify(white);
    expect(verifyAttempts(white)).toEqual([
      { ...white.attempts[0], legal: true, correct: true },
      { ...white.attempts[1], legal: true, correct: false },
      { ...white.attempts[2], legal: true, correct: true },
      { ...white.attempts[3], legal: true, correct: true },
    ]);
    expect(JSON.stringify(white)).toBe(before);
  });

  it('checks black plies, castling, en passant, and queen promotion', () => {
    expect(verifyAttempts({ theorySan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O'],
      color: 'black', effectiveMoves: 3,
      attempts: [{ ply: 2, playedSan: 'e5', elapsedMs: 1 },
        { ply: 4, playedSan: 'Nc6', elapsedMs: 2 },
        { ply: 6, playedSan: 'Bc5', elapsedMs: 3 }] }).map((a) => a.correct))
      .toEqual([true, true, true]);
    expect(verifyAttempts({ theorySan: ['e4', 'a6', 'e5', 'd5', 'exd6'],
      color: 'white', effectiveMoves: 3,
      attempts: [{ ply: 1, playedSan: 'e4', elapsedMs: 1 },
        { ply: 3, playedSan: 'e5', elapsedMs: 1 },
        { ply: 5, playedSan: 'exd6', elapsedMs: 1 }] })[2]?.correct).toBe(true);
    expect(verifyAttempts({ theorySan: ['a4', 'h5', 'a5', 'h4', 'a6', 'h3', 'axb7', 'hxg2', 'bxa8=Q'],
      color: 'white', effectiveMoves: 5,
      attempts: [1, 3, 5, 7, 9].map((ply, i) => ({ ply,
        playedSan: ['a4', 'a5', 'a6', 'axb7', 'bxa8=Q'][i]!, elapsedMs: 1 })) })[4]?.correct)
      .toBe(true);
  });

  it('rejects missing, duplicate, wrong-color, illegal and malformed attempts', () => {
    const attempts = white.attempts;
    expect(() => verifyAttempts({ ...white, attempts: attempts.slice(0, 3) })).toThrow(RangeError);
    expect(() => verifyAttempts({ ...white, attempts: [attempts[0]!, attempts[0]!, ...attempts.slice(2)] }))
      .toThrow(RangeError);
    expect(() => verifyAttempts({ ...white, attempts: [{ ...attempts[0]!, ply: 2 }, ...attempts.slice(1)] }))
      .toThrow(RangeError);
    expect(() => verifyAttempts({ ...white, attempts: [{ ...attempts[0]!, playedSan: 'e5' }, ...attempts.slice(1)] }))
      .toThrow(RangeError);
    expect(() => verifyAttempts({ ...white, attempts: [{ ...attempts[0]!, playedSan: 'e2e4' }, ...attempts.slice(1)] }))
      .toThrow(RangeError);
    for (const elapsedMs of [NaN, Infinity, -1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => verifyAttempts({ ...white, attempts: [{ ...attempts[0]!, elapsedMs }, ...attempts.slice(1)] }))
        .toThrow(RangeError);
    }
    expect(() => verifyAttempts({ ...white, theorySan: ['e4', 'e5', 'Nf3'] })).toThrow(RangeError);
    expect(() => verifyAttempts({ ...white, theorySan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'e2e4'] }))
      .toThrow(RangeError);
  });

  it('rejects underpromotion in a report or in the theoretical line', () => {
    const theorySan = ['a4', 'h5', 'a5', 'h4', 'a6', 'h3', 'axb7', 'hxg2', 'bxa8=Q'];
    const attempts = [1, 3, 5, 7, 9].map((ply, i) => ({ ply,
      playedSan: ['a4', 'a5', 'a6', 'axb7', 'bxa8=Q'][i]!, elapsedMs: 1 }));
    expect(() => verifyAttempts({ theorySan, color: 'white', effectiveMoves: 5,
      attempts: [...attempts.slice(0, 4), { ...attempts[4]!, playedSan: 'bxa8=N' }] }))
      .toThrow(RangeError);
    expect(() => verifyAttempts({ theorySan: [...theorySan.slice(0, 8), 'bxa8=N'],
      color: 'white', effectiveMoves: 5, attempts })).toThrow(RangeError);
  });

  it('checks B01 R01–R04 ply coverage and timing without treating declarative flags as authority', () => {
    type Case = { id: string; initialState: { color: 'white' | 'black'; effectiveMoves: number };
      input: { verifiedAttempts: { ply: number; correct: boolean; elapsedMs: number }[] };
      expected: { reportedAttemptPlies: number[]; slowCorrectCount: number } };
    let checked = 0;
    for (const rule of ['R01', 'R02', 'R03', 'R04']) {
      const cases = JSON.parse(readFileSync(new URL(`../../src/domain/fixtures/${rule}.json`, import.meta.url), 'utf8'))
        .fixtures as Case[];
      for (const fixture of cases) {
        const start = fixture.initialState.color === 'white' ? 1 : 2;
        const plies = Array.from({ length: fixture.initialState.effectiveMoves }, (_, i) => start + 2 * i);
        expect(fixture.input.verifiedAttempts.map((a) => a.ply), fixture.id).toEqual(plies);
        expect(plies, fixture.id).toEqual(fixture.expected.reportedAttemptPlies);
        expect(fixture.input.verifiedAttempts.filter((a) => a.correct && a.elapsedMs > 120000).length,
          fixture.id).toBe(fixture.expected.slowCorrectCount);
        checked++;
      }
    }
    expect(checked).toBe(40);
  });
});
