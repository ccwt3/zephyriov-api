// The same adapter runs in Node and in the Android WebView. B01 expectations
// remain independent inputs; this file only selects the pure domain slices.
function normalized(value) {
  if (Array.isArray(value)) return value.map(normalized);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalized(value[key])]));
  }
  return value;
}

function same(id, actual, expected) {
  if (JSON.stringify(normalized(actual)) !== JSON.stringify(normalized(expected))) {
    throw new Error(`${id}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function rejection(action) {
  try { action(); } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return { name: error.name, message: error.message };
  }
  throw new Error('Expected structural rejection');
}

export function runParity(fixtures, domain) {
  const results = {};
  const counts = {};
  function record(id, result) { results[id] = normalized(result); }
  for (const [rule, family] of Object.entries(fixtures).sort()) {
    counts[rule] = family.fixtures.length;
    for (const f of family.fixtures) {
      if (['R01', 'R02', 'R03', 'R04'].includes(rule)) {
        const actual = domain.gradeBlock({ ...f.initialState,
          movesPerBlock: f.initialState.pedagogicalSnapshot.movesPerBlock,
          verifiedAttempts: f.input.verifiedAttempts });
        same(f.id, actual, { grade: f.expected.grade, legalErrorCount: f.expected.legalErrorCount,
          slowCorrectCount: f.expected.slowCorrectCount,
          reportedAttemptPlies: f.expected.reportedAttemptPlies });
        record(f.id, actual);
      } else if (['R05', 'R06', 'R07', 'R08', 'R09', 'R10'].includes(rule)) {
        let card = f.initialState.card;
        const steps = [];
        for (const [index, expected] of f.expected.steps.entries()) {
          const result = domain.applyGrade({ card, grade: f.input.verifiedGrades[index],
            movesPerBlock: f.input.pedagogicalSnapshot.movesPerBlock,
            totalStudentMoves: f.input.totalStudentMoves,
            studyDate: f.clock.studyDates?.[index] ?? f.clock.studyDate,
            originType: f.initialState.originType,
            attemptNumber: f.input.attemptNumbers?.[index] ?? f.initialState.attemptNumber + index,
            blockComplete: f.input.blockComplete });
          same(`${f.id}/${index}`, result, { cardAfter: expected.cardAfter,
            itemStatus: expected.itemStatus, repeatRequired: expected.repeatRequired,
            nextDue: expected.nextDue, retry: expected.retry });
          steps.push(result);
          card = result.cardAfter;
        }
        record(f.id, steps);
      } else if (rule === 'R11') {
        const { color, card: partial } = f.initialState;
        const card = { ...partial, intervalDays: '0.00', dueDate: '2026-09-15', reps: 0, lapses: 0 };
        const result = domain.applyGrade({ card, grade: f.input.verifiedGrade,
          movesPerBlock: f.input.movesPerBlock,
          totalStudentMoves: f.input.validatedLine.totalStudentMovesByColor[color],
          studyDate: f.clock.studyDate, originType: partial.state,
          attemptNumber: 1, blockComplete: f.input.blockComplete });
        same(f.id, result.cardAfter.unlockedMoves, f.expected.depthAfterGood);
        record(f.id, result);
      } else if (rule === 'R12' || rule === 'R13') {
        const result = domain.buildDailyPlan({ ...f.initialState, ...f.input,
          studyDate: f.clock.studyDate, seed: f.seed.value, fixtureDraws: f.seed.draws });
        same(f.id, { ...result, items: result.items.map(({ lineId, originType,
          effectiveMoves, studentPlies }) => ({ lineId, originType, effectiveMoves, studentPlies })) },
        f.expected);
        record(f.id, result);
      } else if (['R14', 'R15', 'R16'].includes(rule)) {
        let state = f.initialState;
        const steps = [];
        for (const [index, operation] of f.input.operations.entries()) {
          const result = domain.deriveActivity(state, operation, f.clock.studyDate);
          const { state: nextState, ...actual } = result;
          same(`${f.id}/${index}`, actual, f.expected.steps[index]);
          steps.push(result);
          state = nextState;
        }
        same(f.id, state.activityDays, f.expected.activityDaysAfter);
        record(f.id, steps);
      } else if (rule === 'R20') {
        if (f.input.operation === 'complete_then_continue') {
          const zone = f.initialState.activeBlock.studyTimezone;
          const actual = { eventStudyDate: domain.civilDateAt(f.initialState.activeBlock.startedAt, zone),
            dueDate: domain.addCivilDays(f.expected.eventStudyDate, 1),
            continueDate: domain.civilDateAt(f.input.continueAt, zone) };
          same(f.id, actual, { eventStudyDate: f.expected.eventStudyDate,
            dueDate: f.expected.dueDate, continueDate: f.expected.continueDate });
          record(f.id, actual);
        } else if (f.input.operation === 'expired-suspended') {
          const { issuedAt, expiresAt } = f.input.package;
          const canStudy = domain.isWithinUtcWindow(f.clock.now, issuedAt, expiresAt);
          same(f.id, canStudy, f.expected.canStudy);
          record(f.id, { canStudy });
        }
      } else if (rule === 'R21') {
        if (f.input.arrivals) {
          const dates = [...f.initialState.eligibleDates];
          const steps = [];
          for (const [index, arrival] of f.input.arrivals.entries()) {
            if (arrival) dates.push(arrival);
            const actual = { arrival, ...domain.deriveStreak(dates, f.clock.asOfDate) };
            same(`${f.id}/${index}`, actual, f.expected.steps[index]);
            steps.push(actual);
          }
          record(f.id, steps);
        } else if (f.input.operation === 'zone_change_between_blocks') {
          const actual = { completedBlockDate: domain.civilDateAt(
            f.initialState.activeBlock.startedAt, f.initialState.activeBlock.studyTimezone),
          nextBlockDate: domain.civilDateAt(f.input.continueAt, f.expected.nextBlockTimezone) };
          same(f.id, actual, { completedBlockDate: f.expected.completedBlockDate,
            nextBlockDate: f.expected.nextBlockDate });
          record(f.id, actual);
        }
      }
    }
  }

  const chess = [
    { id: 'castle', theorySan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O'],
      color: 'white', attempts: ['e4', 'Nf3', 'Bc4', 'O-O'] },
    { id: 'en-passant', theorySan: ['e4', 'a6', 'e5', 'd5', 'exd6'],
      color: 'white', attempts: ['e4', 'e5', 'exd6'] },
    { id: 'promotion', theorySan: ['a4', 'h5', 'a5', 'h4', 'a6', 'h3', 'axb7', 'hxg2', 'bxa8=Q'],
      color: 'white', attempts: ['a4', 'a5', 'a6', 'axb7', 'bxa8=Q'] },
  ];
  for (const item of chess) {
    const input = { theorySan: item.theorySan, color: item.color,
      effectiveMoves: item.attempts.length,
      attempts: item.attempts.map((playedSan, index) => ({ ply: index * 2 + 1,
        playedSan, elapsedMs: index === 0 ? 120000 : 120001 })) };
    const verified = domain.verifyAttempts(input);
    same(item.id, verified.map(({ correct }) => correct), item.attempts.map(() => true));
    record(`chess/${item.id}`, verified);
    record(`reject/${item.id}/missing`, rejection(() => domain.verifyAttempts({ ...input,
      attempts: input.attempts.slice(0, -1) })));
    record(`reject/${item.id}/duplicate`, rejection(() => domain.verifyAttempts({ ...input,
      attempts: [input.attempts[0], input.attempts[0], ...input.attempts.slice(2)] })));
  }
  record('reject/chess/illegal', rejection(() => domain.verifyAttempts({
    theorySan: ['e4', 'e5'], color: 'white', effectiveMoves: 1,
    attempts: [{ ply: 1, playedSan: 'e5', elapsedMs: 1 }] })));
  record('reject/chess/time', rejection(() => domain.verifyAttempts({
    theorySan: ['e4', 'e5'], color: 'white', effectiveMoves: 1,
    attempts: [{ ply: 1, playedSan: 'e4', elapsedMs: Number.NaN }] })));
  record('reject/chess/wrong-ply', rejection(() => domain.verifyAttempts({
    theorySan: ['e4', 'e5'], color: 'white', effectiveMoves: 1,
    attempts: [{ ply: 2, playedSan: 'e4', elapsedMs: 1 }] })));
  record('reject/chess/underpromotion', rejection(() => domain.verifyAttempts({
    theorySan: chess[2].theorySan, color: 'white', effectiveMoves: 5,
    attempts: chess[2].attempts.map((playedSan, index) => ({ ply: index * 2 + 1,
      playedSan: index === 4 ? 'bxa8=N' : playedSan, elapsedMs: 1 })) })));
  record('reject/date/invalid', rejection(() => domain.addCivilDays('2026-02-29', 1)));
  record('reject/decimal/invalid', rejection(() => domain.calculateReviewInterval('1.001', '2026-09-19')));

  for (const [id, date, delta, expected] of [
    ['leap-2000', '2000-02-28', 1, '2000-02-29'],
    ['non-leap-2100', '2100-02-28', 1, '2100-03-01'],
    ['dst-spring', '2024-03-10', 1, '2024-03-11'],
    ['dst-fall', '2024-11-03', 1, '2024-11-04'],
  ]) {
    const actual = domain.addCivilDays(date, delta);
    same(id, actual, expected);
    record(`date/${id}`, actual);
  }
  for (const [id, instant, zone, expected] of [
    ['spring-before', '2024-03-10T04:59:59.999Z', 'America/New_York', '2024-03-09'],
    ['spring-after', '2024-03-10T05:00:00.000Z', 'America/New_York', '2024-03-10'],
    ['fall-repeat-one', '2024-11-03T05:30:00.000Z', 'America/New_York', '2024-11-03'],
    ['fall-repeat-two', '2024-11-03T06:30:00.000Z', 'America/New_York', '2024-11-03'],
  ]) {
    const actual = domain.civilDateAt(instant, zone);
    same(id, actual, expected);
    record(`zone/${id}`, actual);
  }
  for (const [id, previous, expected] of [
    ['first-review', '1.00', { rawInterval: '3.000', intervalDays: '3.00',
      dateOffsetDays: 3, dueDate: '2026-09-22' }],
    ['half-cent', '2.59', { rawInterval: '6.475', intervalDays: '6.48',
      dateOffsetDays: 6, dueDate: '2026-09-25' }],
  ]) {
    const actual = domain.calculateReviewInterval(previous, '2026-09-19');
    same(id, actual, expected);
    record(`decimal/${id}`, actual);
  }
  const seedFixture = fixtures.R13.fixtures.find((f) => f.id === 'R13-uneven-white');
  const seedInput = { ...seedFixture.initialState, ...seedFixture.input,
    studyDate: seedFixture.clock.studyDate, seed: 'account-A/2026-09-15',
    generatorVersion: domain.PLAN_GENERATOR_VERSION };
  const plan = domain.buildDailyPlan(seedInput);
  same('seed-order', plan.newLineIds, ['C2', 'A2', 'B1', 'C1', 'A3', 'A1']);
  same('seed-repeat', plan, domain.buildDailyPlan(seedInput));
  same('seed-reorder', plan, domain.buildDailyPlan({ ...seedInput,
    candidates: [...seedInput.candidates].reverse() }));
  record('seed/repeat', plan);

  return normalized({ counts, results });
}

export { normalized };
