import { Chess } from 'chess.js';

export interface RawAttempt {
  readonly ply: number;
  readonly playedSan: string;
  readonly elapsedMs: number;
}

export interface VerifiedAttempt extends RawAttempt {
  readonly legal: true;
  readonly correct: boolean;
}

export interface VerifyAttemptsInput {
  readonly theorySan: readonly string[];
  readonly color: 'white' | 'black';
  readonly effectiveMoves: number;
  readonly attempts: readonly RawAttempt[];
}

/** Replay legal canonical SAN on the theoretical path; an incorrect legal move never changes that path. */
export function verifyAttempts(input: VerifyAttemptsInput): readonly VerifiedAttempt[] {
  const { theorySan, color, effectiveMoves, attempts } = input;
  if (color !== 'white' && color !== 'black') throw new RangeError('Invalid student color');
  if (!Number.isSafeInteger(effectiveMoves) || effectiveMoves < 1) {
    throw new RangeError('Effective moves must be a positive safe integer');
  }
  const lastPly = 2 * effectiveMoves - (color === 'white' ? 1 : 0);
  if (!Number.isSafeInteger(lastPly) || theorySan.length < lastPly || attempts.length !== effectiveMoves) {
    throw new RangeError('Incomplete theoretical line or attempt sequence');
  }

  const board = new Chess();
  const verified: VerifiedAttempt[] = [];
  for (let index = 0; index < lastPly; index++) {
    const ply = index + 1;
    const theoreticalSan = theorySan[index];
    if (typeof theoreticalSan !== 'string' || !theoreticalSan) {
      throw new RangeError(`Missing theoretical SAN at ply ${ply}`);
    }
    if ((color === 'white') === (ply % 2 === 1)) {
      const attempt = attempts[verified.length];
      if (!attempt || attempt.ply !== ply || !Number.isSafeInteger(attempt.elapsedMs)
        || attempt.elapsedMs < 0 || typeof attempt.playedSan !== 'string' || !attempt.playedSan) {
        throw new RangeError(`Invalid attempt at ply ${ply}`);
      }
      let played;
      try {
        played = board.move(attempt.playedSan, { strict: true });
      } catch {
        throw new RangeError(`Illegal or noncanonical attempt at ply ${ply}`);
      }
      if (played.san !== attempt.playedSan || (played.promotion && played.promotion !== 'q')) {
        throw new RangeError(`Noncanonical SAN or underpromotion at ply ${ply}`);
      }
      board.undo();
      verified.push({ ply, playedSan: attempt.playedSan, elapsedMs: attempt.elapsedMs,
        legal: true, correct: played.san === theoreticalSan });
    }
    try {
      const move = board.move(theoreticalSan, { strict: true });
      if (move.san !== theoreticalSan || (move.promotion && move.promotion !== 'q')) {
        throw new Error('Noncanonical SAN or underpromotion');
      }
    } catch {
      throw new RangeError(`Invalid theoretical SAN at ply ${ply}`);
    }
  }
  return verified;
}
