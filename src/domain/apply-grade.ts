import { addCivilDays, type CivilDate } from './civil-time.js';
import type { Grade } from './grade-block.js';
import { calculateReviewInterval } from './review-interval.js';

export interface SrsCard {
  readonly state: 'new' | 'review';
  readonly unlockedMoves: number;
  readonly intervalDays: string;
  readonly dueDate: CivilDate;
  readonly reps: number;
  readonly lapses: number;
}

export interface ApplyGradeInput {
  readonly card: SrsCard;
  /** Trusted gradeBlock result; this function is internal domain scheduling. */
  readonly grade: Grade;
  readonly movesPerBlock: number;
  readonly totalStudentMoves: number;
  readonly studyDate: CivilDate;
  readonly originType: 'new' | 'review';
  readonly attemptNumber: number;
  readonly blockComplete: true;
}

export interface RetryDirective {
  readonly position: 'end';
  readonly attemptNumber: number;
  readonly originType: 'new' | 'review';
  readonly sameLine: true;
  readonly sameSession: true;
}

export interface GradeTransition {
  readonly cardAfter: SrsCard;
  readonly itemStatus: 'graded';
  readonly repeatRequired: boolean;
  readonly nextDue: CivilDate | null;
  readonly retry: RetryDirective | null;
}

/** Apply a trusted complete-block grade without changing the input snapshot. */
export function applyGrade(input: ApplyGradeInput): GradeTransition {
  const { card, grade, movesPerBlock, totalStudentMoves, studyDate,
    originType, attemptNumber, blockComplete } = input;
  if ((card.state !== 'new' && card.state !== 'review')
    || (grade !== 'good' && grade !== 'mid' && grade !== 'bad')
    || (originType !== 'new' && originType !== 'review') || blockComplete !== true
    || !Number.isSafeInteger(movesPerBlock) || movesPerBlock < 1
    || !Number.isSafeInteger(totalStudentMoves) || totalStudentMoves < 1
    || !Number.isSafeInteger(card.unlockedMoves) || card.unlockedMoves < 1
    || card.unlockedMoves > totalStudentMoves
    || !Number.isSafeInteger(card.reps) || card.reps < 0
    || !Number.isSafeInteger(card.lapses) || card.lapses < 0
    || !Number.isSafeInteger(attemptNumber) || attemptNumber < 1) {
    throw new RangeError('Invalid grade transition');
  }
  if (card.unlockedMoves + movesPerBlock > Number.MAX_SAFE_INTEGER) {
    throw new RangeError('Depth exceeds safe integer range');
  }

  let cardAfter: SrsCard;
  let repeatRequired = false;
  let nextDue: CivilDate | null = null;
  if (card.state === 'new') {
    if (grade === 'good') {
      if (card.reps === Number.MAX_SAFE_INTEGER) throw new RangeError('Reps exceed safe integer range');
      nextDue = addCivilDays(studyDate, 1);
      cardAfter = { ...card, state: 'review', unlockedMoves: Math.min(card.unlockedMoves + movesPerBlock,
        totalStudentMoves), intervalDays: '1.00', dueDate: nextDue, reps: card.reps + 1 };
    } else {
      cardAfter = { ...card };
      repeatRequired = true;
    }
  } else if (grade === 'good') {
    if (card.reps === Number.MAX_SAFE_INTEGER) throw new RangeError('Reps exceed safe integer range');
    const interval = calculateReviewInterval(card.intervalDays, studyDate);
    nextDue = interval.dueDate;
    cardAfter = { ...card, unlockedMoves: Math.min(card.unlockedMoves + movesPerBlock,
      totalStudentMoves), intervalDays: interval.intervalDays, dueDate: nextDue, reps: card.reps + 1 };
  } else if (grade === 'mid') {
    if (card.reps === Number.MAX_SAFE_INTEGER) throw new RangeError('Reps exceed safe integer range');
    nextDue = addCivilDays(studyDate, 1);
    cardAfter = { ...card, dueDate: nextDue, reps: card.reps + 1 };
  } else {
    if (card.lapses === Number.MAX_SAFE_INTEGER) throw new RangeError('Lapses exceed safe integer range');
    cardAfter = { ...card, state: 'new', intervalDays: '0.00', lapses: card.lapses + 1 };
    repeatRequired = true;
  }

  if (repeatRequired && attemptNumber === Number.MAX_SAFE_INTEGER) {
    throw new RangeError('Attempt number exceeds safe integer range');
  }
  return { cardAfter, itemStatus: 'graded', repeatRequired, nextDue,
    retry: repeatRequired ? { position: 'end', attemptNumber: attemptNumber + 1,
      originType, sameLine: true, sameSession: true } : null };
}
