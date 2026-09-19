import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { projectPendingEvents, type PendingProjectionEvent,
  type PendingProjectionInput } from './project-pending-events.js';

const retryItem = { id: 'i2', lineId: 'line', originType: 'review' as const,
  attemptNumber: 2, parentItemId: 'i1', status: 'pending' as const };

function base(): PendingProjectionInput {
  return {
    cards: [{ lineId: 'line', card: { state: 'review', unlockedMoves: 2,
      intervalDays: '1.00', dueDate: '2026-09-19', reps: 1, lapses: 0 } }],
    activity: { accountId: 'A', sessionId: 's1', newLineIds: [], activityDays: [],
      items: [{ id: 'i1', lineId: 'line', originType: 'review', attemptNumber: 1,
        parentItemId: null, status: 'pending' }] },
    resolvedDependencies: {}, events: [],
  };
}

function event(overrides: Partial<PendingProjectionEvent> = {}): PendingProjectionEvent {
  return { eventId: 'e1', itemId: 'i1', lineId: 'line', dependsOnEventIds: [],
    outcome: 'applied', grade: 'bad', studyDate: '2026-09-19',
    originType: 'review', attemptNumber: 1, movesPerBlock: 2,
    totalStudentMoves: 8, retry: retryItem, ...overrides };
}

describe('B03.09 projectPendingEvents', () => {
  it('projects a dependent pedagogical retry, preserving review origin and all complete events', () => {
    const input = { ...base(), events: [event(), event({ eventId: 'e2', itemId: 'i2',
      dependsOnEventIds: ['e1'], grade: 'good', attemptNumber: 2, retry: null })] };
    const before = JSON.stringify(input);
    const result = projectPendingEvents(input);
    expect(result.confirmed).toBe(false);
    expect(result.appliedEventIds).toEqual(['e1', 'e2']);
    expect(result.retainedEvents).toEqual(input.events);
    expect(result.retainedEvents[0]).not.toBe(input.events[0]);
    expect(result.activity.items.map(({ status, originType }) => ({ status, originType })))
      .toEqual([{ status: 'graded', originType: 'review' },
        { status: 'graded', originType: 'review' }]);
    expect(result.cards[0]?.card).toEqual({ state: 'review', unlockedMoves: 4,
      intervalDays: '1.00', dueDate: '2026-09-20', reps: 2, lapses: 1 });
    expect(result.activity.activityDays).toEqual([{ accountId: 'A', studyDate: '2026-09-19' }]);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('replays the same input deterministically, while a new attempt advances once', () => {
    const input = { ...base(), events: [event({ grade: 'good', retry: null })] };
    const first = projectPendingEvents(input);
    expect(projectPendingEvents(input)).toEqual(first);
    expect(first.appliedEventIds).toEqual(['e1']);
    expect(() => projectPendingEvents({ ...input, events: [input.events[0]!, input.events[0]!] }))
      .toThrow('Duplicate pending event ID');
  });

  it('rejects missing, practice and invalid dependencies without applying the child', () => {
    const child = event({ eventId: 'e2', itemId: 'i2', dependsOnEventIds: ['e1'],
      attemptNumber: 2, grade: 'good', retry: null });
    for (const resolvedDependencies of [{}, { e1: 'practice' as const },
      { e1: 'invalid' as const }]) {
      expect(() => projectPendingEvents({ ...base(), resolvedDependencies,
        events: [child] })).toThrow('Unsatisfied dependency');
    }
    const skipped = projectPendingEvents({ ...base(), events: [event({
      outcome: 'practice', grade: null, retry: null })] });
    expect(skipped.skippedEventIds).toEqual(['e1']);
    expect(skipped.cards).toEqual(base().cards);
    expect(skipped.retainedEvents).toHaveLength(1);
  });

  it('rejects two same-line applications without a causal edge or an inconsistent retry', () => {
    const first = event({ grade: 'good', retry: null });
    const second = event({ eventId: 'e2', itemId: 'i2', grade: 'good', retry: null });
    expect(() => projectPendingEvents({ ...base(), events: [first, second] }))
      .toThrow('causal dependency');
    expect(() => projectPendingEvents({ ...base(), events: [event({ retry: null })] }))
      .toThrow('Retry does not match');
  });

  it('keeps the two committed R18 complete reports in every declarative closure scenario', () => {
    const fixtures = JSON.parse(readFileSync(new URL('./fixtures/R18.json', import.meta.url), 'utf8'))
      .fixtures as Array<{ id: string; initialState: { durableEvents: Array<{
        eventId: string; payloadRef: string; owner: string; localState: string;
        decision: unknown;
      }> }; expected: { retainedEvents: unknown[] } }>;
    expect(fixtures).toHaveLength(24);
    for (const fixture of fixtures) {
      const events = fixture.initialState.durableEvents.map((saved) => ({
        ...event({ eventId: saved.eventId, itemId: saved.eventId,
          outcome: 'unresolved', grade: null, retry: null }),
        payloadRef: saved.payloadRef, owner: saved.owner, localState: saved.localState,
        decision: saved.decision,
      }));
      const projected = projectPendingEvents({ ...base(), events });
      expect(projected.retainedEvents.map((projectedEvent) => {
        const { eventId, owner, payloadRef, localState, decision } = projectedEvent as
          PendingProjectionEvent & typeof fixture.initialState.durableEvents[number];
        return { eventId, owner, payloadRef, localState, decision };
      }), fixture.id).toEqual(fixture.expected.retainedEvents);
      expect(projected.appliedEventIds, fixture.id).toEqual([]);
    }
  });

  it('matches the R22 dependency outcome categories and does not create transport IDs', () => {
    const fixtures = JSON.parse(readFileSync(new URL('./fixtures/R22.json', import.meta.url), 'utf8'))
      .fixtures as Array<{ id: string; initialState: { parentDecision?: { outcome: string } | null };
        expected: { responseCode?: string; outcome?: string | null } }>;
    for (const fixture of fixtures.filter((item) => item.id.includes('parent-'))) {
      const parent = fixture.initialState.parentDecision?.outcome;
      const child = event({ eventId: 'e2', itemId: 'i2',
        dependsOnEventIds: ['e1'], grade: 'good', retry: null });
      expect(() => projectPendingEvents({ ...base(),
        resolvedDependencies: parent ? { e1: parent as 'practice' | 'invalid' } : {},
        events: [child] }), fixture.id).toThrow('Unsatisfied dependency');
      expect(fixture.expected.responseCode, fixture.id)
        .toBe(parent === 'practice' ? 'DEPENDENCY_PRACTICE'
          : parent === 'invalid' ? 'DEPENDENCY_INVALID' : 'DEPENDENCY_PENDING');
    }
  });
});
