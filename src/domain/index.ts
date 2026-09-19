/** Version of the immutable local domain behavior and its public API. */
export const DOMAIN_VERSION = 'B03.12-v1';

export { addCivilDays, civilDateAt, currentCivilDate, isWithinUtcWindow } from './civil-time.js';
export type { CivilDate, UtcInstant, Clock } from './civil-time.js';
export { calculateReviewInterval } from './review-interval.js';
export type { ReviewInterval } from './review-interval.js';
export { verifyAttempts } from './verify-attempts.js';
export type { RawAttempt, VerifiedAttempt, VerifyAttemptsInput } from './verify-attempts.js';
export { gradeBlock } from './grade-block.js';
export type { Grade, GradeBlockInput, BlockGrade } from './grade-block.js';
export { applyGrade } from './apply-grade.js';
export type { SrsCard, ApplyGradeInput, GradeTransition } from './apply-grade.js';
export { buildDailyPlan, PLAN_GENERATOR_VERSION } from './build-daily-plan.js';
export type { PlanCandidate, DailyPlanInput, PlannedItem, DailyPlan } from './build-daily-plan.js';
export { deriveActivity, deriveStreak } from './derive-activity.js';
export type { ActivityItem, ActivityDay, ActivityState, ActivityOperation,
  ActivityStep, Streak } from './derive-activity.js';
export { projectPendingEvents } from './project-pending-events.js';
export type { ProjectedCard, PendingProjectionEvent, PendingProjectionInput,
  PendingProjection } from './project-pending-events.js';
