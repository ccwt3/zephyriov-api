import { addCivilDays, civilDateAt } from 'zephyriov-domain/civil-time.js';
import { calculateReviewInterval } from 'zephyriov-domain/review-interval.js';
import { verifyAttempts } from 'zephyriov-domain/verify-attempts.js';
import { gradeBlock } from 'zephyriov-domain/grade-block.js';
import { applyGrade } from 'zephyriov-domain/apply-grade.js';
import { buildDailyPlan, PLAN_GENERATOR_VERSION } from 'zephyriov-domain/build-daily-plan.js';
import { projectPendingEvents } from 'zephyriov-domain/project-pending-events.js';

const checks = [];
function equal(name, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
  checks.push(name);
}

try {
  equal('leap-day', addCivilDays('2024-02-28', 1), '2024-02-29');
  equal('iana-date', civilDateAt('2026-09-19T02:00:00.000Z', 'America/Mexico_City'), '2026-09-18');
  const interval = calculateReviewInterval('1.00', '2026-09-19');
  equal('decimal-interval', [interval.intervalDays, interval.dueDate], ['3.00', '2026-09-22']);

  const verified = verifyAttempts({ theorySan: ['e4', 'e5', 'Nf3'], color: 'white',
    effectiveMoves: 2, attempts: [{ ply: 1, playedSan: 'e4', elapsedMs: 1000 },
      { ply: 3, playedSan: 'Nf3', elapsedMs: 1200 }] });
  equal('chess-san', verified.map(({ correct }) => correct), [true, true]);
  const grade = gradeBlock({ color: 'white', effectiveMoves: 2, movesPerBlock: 2,
    blockComplete: true, verifiedAttempts: verified });
  equal('grade', grade.grade, 'good');

  const card = { state: 'new', unlockedMoves: 2, intervalDays: '0.00',
    dueDate: '2026-09-19', reps: 0, lapses: 0 };
  const transition = applyGrade({ card, grade: grade.grade, movesPerBlock: 2,
    totalStudentMoves: 5, studyDate: '2026-09-19', originType: 'new',
    attemptNumber: 1, blockComplete: true });
  equal('apply-grade', [transition.cardAfter.state, transition.cardAfter.unlockedMoves,
    transition.cardAfter.dueDate], ['review', 4, '2026-09-20']);

  const plan = buildDailyPlan({ color: 'white', studyDate: '2026-09-19',
    newLinesPerDay: 1, movesPerBlock: 2, seed: 'android-probe',
    generatorVersion: PLAN_GENERATOR_VERSION,
    candidates: [{ lineId: 'line-1', openingId: 'opening-1', color: 'white',
      state: 'new', dueDate: '2026-09-19', unlockedMoves: 2, active: true,
      movesValid: true, linePlies: 9, generation: 'g1', contentGeneration: 'c1',
      lineRevisionId: 'r1' }] });
  equal('daily-plan', plan.orderedLineIds, ['line-1']);

  const projected = projectPendingEvents({ cards: [{ lineId: 'line-1', card }],
    activity: { accountId: 'probe', sessionId: 'session', newLineIds: ['line-1'],
      activityDays: [], items: [{ id: 'item-1', lineId: 'line-1', originType: 'new',
        attemptNumber: 1, parentItemId: null, status: 'pending' }] },
    resolvedDependencies: {}, events: [{ eventId: 'event-1', itemId: 'item-1',
      lineId: 'line-1', dependsOnEventIds: [], outcome: 'applied', grade: 'good',
      studyDate: '2026-09-19', originType: 'new', attemptNumber: 1,
      movesPerBlock: 2, totalStudentMoves: 5, retry: null }] });
  equal('pending-projection', [projected.confirmed, projected.cards[0].card.state,
    projected.appliedEventIds[0]], [false, 'review', 'event-1']);

  window.AndroidResult.report(JSON.stringify({ status: 'pass', checks,
    engine: navigator.userAgent }));
} catch (error) {
  window.AndroidResult.report(JSON.stringify({ status: 'fail', checks,
    error: String(error) }));
}
