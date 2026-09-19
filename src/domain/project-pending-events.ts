import { applyGrade, type SrsCard } from './apply-grade.js';
import { deriveActivity, type ActivityItem, type ActivityState } from './derive-activity.js';
import type { CivilDate } from './civil-time.js';
import type { Grade } from './grade-block.js';

export interface ProjectedCard {
  readonly lineId: string;
  readonly card: SrsCard;
}

/** A complete local event with a decision already classified by the caller. */
export interface PendingProjectionEvent {
  readonly eventId: string;
  readonly itemId: string;
  readonly lineId: string;
  readonly dependsOnEventIds: readonly string[];
  readonly outcome: 'applied' | 'practice' | 'invalid' | 'unresolved';
  readonly grade: Grade | null;
  readonly studyDate: CivilDate;
  readonly originType: 'new' | 'review';
  readonly attemptNumber: number;
  readonly movesPerBlock: number;
  readonly totalStudentMoves: number;
  readonly retry: ActivityItem | null;
}

export interface PendingProjectionInput<TEvent extends PendingProjectionEvent = PendingProjectionEvent> {
  readonly cards: readonly ProjectedCard[];
  readonly activity: ActivityState;
  /** Decisions already confirmed outside this local queue. */
  readonly resolvedDependencies: Readonly<Record<string, 'applied' | 'practice' | 'invalid'>>;
  /** Causal order: a local parent precedes its child. */
  readonly events: readonly TEvent[];
}

export interface PendingProjection<TEvent extends PendingProjectionEvent = PendingProjectionEvent> {
  readonly confirmed: false;
  readonly cards: readonly ProjectedCard[];
  readonly activity: ActivityState;
  readonly retainedEvents: readonly TEvent[];
  readonly appliedEventIds: readonly string[];
  readonly skippedEventIds: readonly string[];
}

function copyEvent<TEvent extends PendingProjectionEvent>(event: TEvent): TEvent {
  return { ...event, dependsOnEventIds: [...event.dependsOnEventIds],
    retry: event.retry ? { ...event.retry } : null };
}

/** Local, provisional replay over a confirmed base; no transport or durable writes. */
export function projectPendingEvents<TEvent extends PendingProjectionEvent>(
  input: PendingProjectionInput<TEvent>): PendingProjection<TEvent> {
  const cards = input.cards.map(({ lineId, card }) => ({ lineId, card: { ...card } }));
  const cardByLine = new Map(cards.map((entry) => [entry.lineId, entry]));
  if (cardByLine.size !== cards.length) throw new RangeError('Duplicate projected card line');
  let activity: ActivityState = { ...input.activity,
    newLineIds: [...input.activity.newLineIds],
    items: input.activity.items.map((item) => ({ ...item })),
    activityDays: input.activity.activityDays.map((day) => ({ ...day })) };
  const outcomes = new Map(Object.entries(input.resolvedDependencies));
  const seen = new Set<string>();
  const lastAppliedByLine = new Map<string, string>();
  const appliedEventIds: string[] = [];
  const skippedEventIds: string[] = [];

  for (const event of input.events) {
    if (!event.eventId || seen.has(event.eventId) || outcomes.has(event.eventId)) {
      throw new RangeError('Duplicate pending event ID');
    }
    seen.add(event.eventId);
    if (!event.itemId || !event.lineId || !Array.isArray(event.dependsOnEventIds)
      || new Set(event.dependsOnEventIds).size !== event.dependsOnEventIds.length
      || event.dependsOnEventIds.includes(event.eventId)) {
      throw new RangeError('Invalid pending event identity or dependencies');
    }
    if (event.outcome !== 'applied') {
      if (event.outcome !== 'practice' && event.outcome !== 'invalid'
        && event.outcome !== 'unresolved') {
        throw new RangeError('Unclassified pending event');
      }
      if (event.retry) throw new RangeError('Only applied events can create retries');
      if (event.outcome !== 'unresolved') outcomes.set(event.eventId, event.outcome);
      skippedEventIds.push(event.eventId);
      continue;
    }
    if (event.grade === null) throw new RangeError('Applied event needs a verified grade');
    for (const dependencyId of event.dependsOnEventIds) {
      if (outcomes.get(dependencyId) !== 'applied') {
        throw new RangeError(`Unsatisfied dependency: ${dependencyId}`);
      }
    }
    const previous = lastAppliedByLine.get(event.lineId);
    if (previous && !event.dependsOnEventIds.includes(previous)) {
      throw new RangeError('Same-line events need a causal dependency');
    }
    const target = cardByLine.get(event.lineId);
    if (!target) throw new RangeError(`Missing projected card: ${event.lineId}`);
    const item = activity.items.find((candidate) => candidate.id === event.itemId);
    if (!item || item.lineId !== event.lineId || item.originType !== event.originType
      || item.attemptNumber !== event.attemptNumber) {
      throw new RangeError('Event does not match its pending study item');
    }
    const transition = applyGrade({ card: target.card, grade: event.grade,
      movesPerBlock: event.movesPerBlock, totalStudentMoves: event.totalStudentMoves,
      studyDate: event.studyDate, originType: event.originType,
      attemptNumber: event.attemptNumber, blockComplete: true });
    if (transition.repeatRequired !== (event.retry !== null)) {
      throw new RangeError('Retry does not match the grade transition');
    }
    activity = deriveActivity(activity, { kind: 'applied', itemId: event.itemId,
      blockComplete: true, decision: 'applied', retry: event.retry }, event.studyDate).state;
    target.card = transition.cardAfter;
    outcomes.set(event.eventId, 'applied');
    lastAppliedByLine.set(event.lineId, event.eventId);
    appliedEventIds.push(event.eventId);
  }

  return { confirmed: false, cards, activity,
    retainedEvents: input.events.map(copyEvent), appliedEventIds, skippedEventIds };
}
