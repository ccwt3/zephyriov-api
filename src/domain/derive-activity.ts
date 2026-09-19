import { addCivilDays, type CivilDate } from './civil-time.js';

export interface ActivityItem {
  readonly id: string;
  readonly lineId: string;
  readonly originType: 'new' | 'review';
  readonly attemptNumber: number;
  readonly parentItemId: string | null;
  readonly status: 'pending' | 'graded' | 'cancelled';
}

export interface ActivityDay {
  readonly accountId: string;
  readonly studyDate: CivilDate;
}

export interface ActivityState {
  readonly accountId: string;
  readonly sessionId: string;
  readonly newLineIds: readonly string[];
  readonly items: readonly ActivityItem[];
  readonly activityDays: readonly ActivityDay[];
}

export type ActivityOperation =
  | { readonly kind: 'applied'; readonly itemId: string; readonly blockComplete: true;
      readonly decision: 'applied'; readonly retry: ActivityItem | null }
  | { readonly kind: 'cancel'; readonly itemIds: readonly string[] }
  | { readonly kind: 'inspect' | 'practice' | 'partial' | 'invalid'; readonly itemId?: string };

export interface ActivityStep {
  readonly state: ActivityState;
  readonly qualifiedNewLineIds: readonly string[];
  readonly pendingItemIds: readonly string[];
  readonly completedCount: number;
  readonly cancelledCount: number;
  readonly sessionStatus: 'in_progress' | 'completed';
  readonly activityAdded: 0 | 1;
}

/** Reduce one already classified decision; no persistence or grade is inferred here. */
export function deriveActivity(state: ActivityState, operation: ActivityOperation,
  studyDate: CivilDate): ActivityStep {
  const items = state.items.map((item) => ({ ...item }));
  const ids = new Set(items.map((item) => item.id));
  if (ids.size !== items.length) throw new RangeError('Duplicate activity item ID');
  if (operation.kind === 'applied') {
    const item = items.find((candidate) => candidate.id === operation.itemId);
    if (!item || item.status !== 'pending' || operation.blockComplete !== true
      || operation.decision !== 'applied') throw new RangeError('Applied item is not pending');
    item.status = 'graded';
    if (operation.retry) {
      const retry = operation.retry;
      if (ids.has(retry.id) || retry.parentItemId !== item.id || retry.lineId !== item.lineId
        || retry.originType !== item.originType || retry.attemptNumber !== item.attemptNumber + 1
        || retry.status !== 'pending') throw new RangeError('Invalid retry origin or identity');
      items.push({ ...retry });
    }
  } else if (operation.kind === 'cancel') {
    if (new Set(operation.itemIds).size !== operation.itemIds.length) throw new RangeError('Duplicate cancellation');
    for (const id of operation.itemIds) {
      const item = items.find((candidate) => candidate.id === id);
      if (!item || item.status !== 'pending') throw new RangeError('Cancelled item is not pending');
      item.status = 'cancelled';
    }
  }

  const qualifiedNewLineIds = state.newLineIds.filter((lineId) =>
    items.some((item) => item.lineId === lineId && item.originType === 'new' && item.status === 'graded'));
  const requiredNew = state.newLineIds.filter((lineId) =>
    items.some((item) => item.lineId === lineId && item.originType === 'new' && item.status !== 'cancelled'));
  const pendingItemIds = items.filter((item) => item.status === 'pending').map((item) => item.id);
  const completedCount = items.filter((item) => item.status === 'graded').length;
  const cancelledCount = items.filter((item) => item.status === 'cancelled').length;
  const sessionStatus = pendingItemIds.length ? 'in_progress' : 'completed';
  const hasActivity = requiredNew.length > 0
    ? qualifiedNewLineIds.length >= Math.min(3, requiredNew.length)
    : state.newLineIds.length === 0 && completedCount > 0 && cancelledCount === 0
      && sessionStatus === 'completed';
  const alreadyRecorded = state.activityDays.some((day) =>
    day.accountId === state.accountId && day.studyDate === studyDate);
  const activityAdded: 0 | 1 = operation.kind === 'applied' && hasActivity && !alreadyRecorded ? 1 : 0;
  const activityDays = state.activityDays.map((day) => ({ ...day }));
  if (activityAdded) activityDays.push({ accountId: state.accountId, studyDate });
  return { state: { accountId: state.accountId, sessionId: state.sessionId,
    newLineIds: [...state.newLineIds], items, activityDays }, qualifiedNewLineIds,
    pendingItemIds, completedCount, cancelledCount, sessionStatus, activityAdded };
}

export interface Streak {
  readonly eligibleDates: readonly CivilDate[];
  readonly currentStreak: number;
  readonly bestStreak: number;
  readonly lastActiveDate: CivilDate | null;
}

/** Recompute streaks from deduplicated civil dates; arrival order is irrelevant. */
export function deriveStreak(dates: readonly CivilDate[], asOfDate: CivilDate): Streak {
  addCivilDays(asOfDate, 0);
  const eligibleDates = [...new Set(dates)].sort();
  for (const date of eligibleDates) addCivilDays(date, 0);
  let bestStreak = 0;
  let run = 0;
  for (let i = 0; i < eligibleDates.length; i++) {
    run = i > 0 && eligibleDates[i - 1] === addCivilDays(eligibleDates[i]!, -1) ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
  }
  const lastActiveDate = eligibleDates.at(-1) ?? null;
  const currentStreak = lastActiveDate === asOfDate || lastActiveDate === addCivilDays(asOfDate, -1)
    ? run : 0;
  return { eligibleDates, currentStreak, bestStreak, lastActiveDate };
}
