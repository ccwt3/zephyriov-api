import type { VerifiedAttempt } from './verify-attempts.js';

export type Grade = 'good' | 'mid' | 'bad';

export interface GradeBlockInput {
  readonly color: 'white' | 'black';
  readonly effectiveMoves: number;
  readonly movesPerBlock: number;
  readonly blockComplete: true;
  /** Trusted output of verifyAttempts, never a client-supplied correctness flag. */
  readonly verifiedAttempts: readonly VerifiedAttempt[];
}

export interface BlockGrade {
  readonly grade: Grade;
  readonly legalErrorCount: number;
  readonly slowCorrectCount: number;
  readonly reportedAttemptPlies: readonly number[];
}

/** Grade one complete block after SAN verification. */
export function gradeBlock(input: GradeBlockInput): BlockGrade {
  const { color, effectiveMoves, movesPerBlock, blockComplete, verifiedAttempts } = input;
  if (color !== 'white' && color !== 'black'
    || !Number.isSafeInteger(effectiveMoves) || effectiveMoves < 1
    || !Number.isSafeInteger(movesPerBlock) || movesPerBlock < 1
    || blockComplete !== true || verifiedAttempts.length !== effectiveMoves) {
    throw new RangeError('Invalid or incomplete block');
  }

  let legalErrorCount = 0;
  let slowCorrectCount = 0;
  const reportedAttemptPlies: number[] = [];
  for (let index = 0; index < verifiedAttempts.length; index++) {
    const attempt = verifiedAttempts[index]!;
    const expectedPly = 2 * (index + 1) - (color === 'white' ? 1 : 0);
    if (!Number.isSafeInteger(expectedPly) || attempt.ply !== expectedPly
      || attempt.legal !== true || typeof attempt.correct !== 'boolean'
      || !Number.isSafeInteger(attempt.elapsedMs) || attempt.elapsedMs < 0) {
      throw new RangeError(`Invalid verified attempt at ply ${expectedPly}`);
    }
    reportedAttemptPlies.push(expectedPly);
    if (!attempt.correct) legalErrorCount++;
    else if (attempt.elapsedMs > 120_000) slowCorrectCount++;
  }

  const badThreshold = effectiveMoves <= movesPerBlock ? 1 : 2;
  const grade: Grade = legalErrorCount >= badThreshold ? 'bad'
    : legalErrorCount > 0 || slowCorrectCount > 0 ? 'mid' : 'good';
  return { grade, legalErrorCount, slowCorrectCount, reportedAttemptPlies };
}
