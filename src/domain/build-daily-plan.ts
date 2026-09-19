import { addCivilDays, type CivilDate } from './civil-time.js';

export const PLAN_GENERATOR_VERSION = 'fnv1a-xorshift32-v1';

export interface PlanCandidate {
  readonly lineId: string;
  readonly openingId: string;
  readonly color: 'white' | 'black';
  readonly state: 'new' | 'review';
  readonly dueDate: CivilDate;
  readonly unlockedMoves: number;
  readonly active: boolean;
  readonly movesValid: boolean;
  readonly linePlies: number;
  readonly generation: string;
  readonly contentGeneration: string;
  readonly lineRevisionId: string;
}

export interface DailyPlanInput {
  readonly color: 'white' | 'black';
  readonly candidates: readonly PlanCandidate[];
  readonly studyDate: CivilDate;
  readonly newLinesPerDay: number;
  readonly movesPerBlock: number;
  readonly seed: string;
  readonly generatorVersion: string;
  /** Test adapter only: B01's finite fixture tape. */
  readonly fixtureDraws?: readonly (number | '65535/65536')[];
}

export interface PlannedItem {
  readonly logicalId: string;
  readonly lineId: string;
  readonly lineRevisionId: string;
  readonly generation: string;
  readonly contentGeneration: string;
  readonly originType: 'new' | 'review';
  readonly effectiveMoves: number;
  readonly studentPlies: readonly number[];
}

export interface DailyPlan {
  readonly newLineIds: readonly string[];
  readonly reviewLineIds: readonly string[];
  readonly orderedLineIds: readonly string[];
  readonly items: readonly PlannedItem[];
  readonly shuffleTrace: {
    readonly canonicalGroups: Readonly<Record<string, readonly string[]>>;
    readonly shuffledGroups: Readonly<Record<string, readonly string[]>>;
    readonly groupOrder: readonly string[];
    readonly drawCount: number;
  };
}

const compareId = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;

function randomDraws(input: DailyPlanInput): { next: () => number; finish: () => void } {
  if (input.generatorVersion === 'fixture-tape-v1') {
    if (!input.fixtureDraws || (input.seed !== 'zero' && input.seed !== 'keep')) {
      throw new RangeError('Fixture tape requires its declared seed and draws');
    }
    let index = 0;
    return {
      next: () => {
        if (index >= input.fixtureDraws!.length) throw new RangeError('Fixture tape exhausted');
        const draw = input.fixtureDraws![index++];
        if (draw !== (input.seed === 'zero' ? 0 : '65535/65536')) {
          throw new RangeError('Fixture tape differs from declared seed');
        }
        return draw === 0 ? 0 : 65535 / 65536;
      },
      finish: () => {
        if (index !== input.fixtureDraws!.length) throw new RangeError('Unused fixture draws');
      },
    };
  }
  if (input.generatorVersion !== PLAN_GENERATOR_VERSION || input.fixtureDraws !== undefined) {
    throw new RangeError('Unknown plan generator version');
  }
  // FNV-1a on UTF-8 bytes followed by xorshift32. Zero is remapped to a
  // nonzero state because xorshift32 would otherwise remain at zero forever.
  let state = 2166136261;
  for (const byte of new TextEncoder().encode(input.seed)) {
    state = Math.imul(state ^ byte, 16777619) >>> 0;
  }
  if (state === 0) state = 0x9e3779b9;
  return {
    next: () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      return state / 0x100000000;
    },
    finish: () => {},
  };
}

function shuffle<T>(values: readonly T[], next: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const draw = next();
    if (!Number.isFinite(draw) || draw < 0 || draw >= 1) throw new RangeError('Invalid random draw');
    const j = Math.floor(draw * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

function logicalId(input: DailyPlanInput, candidate: PlanCandidate): string {
  // Length-prefixed components avoid delimiter collisions and preserve the
  // same identity across replay of a plan with the same base and seed.
  const parts = [input.generatorVersion, input.seed, input.studyDate, input.color,
    candidate.lineId, candidate.generation, candidate.contentGeneration, candidate.lineRevisionId];
  return `plan:${parts.map((part) => `${new TextEncoder().encode(part).length}:${part}`).join('')}`;
}

/** Build a fresh daily plan from a validated, current catalog snapshot. */
export function buildDailyPlan(input: DailyPlanInput): DailyPlan {
  if ((input.color !== 'white' && input.color !== 'black')
    || !Number.isSafeInteger(input.newLinesPerDay) || input.newLinesPerDay < 1 || input.newLinesPerDay > 12
    || !Number.isSafeInteger(input.movesPerBlock) || input.movesPerBlock < 2 || input.movesPerBlock > 10
    || !input.seed) throw new RangeError('Invalid plan input');
  addCivilDays(input.studyDate, 0);
  const draw = randomDraws(input);
  let drawCount = 0;
  const next = () => { drawCount++; return draw.next(); };
  const ids = new Set<string>();
  const eligible = input.candidates.filter((candidate) => {
    if (ids.has(candidate.lineId)) throw new RangeError('Duplicate line ID');
    ids.add(candidate.lineId);
    if (candidate.color !== 'white' && candidate.color !== 'black') throw new RangeError('Invalid candidate color');
    return candidate.color === input.color && candidate.active && candidate.movesValid
      && candidate.linePlies >= (input.color === 'white' ? 1 : 2)
      && candidate.dueDate <= input.studyDate;
  }).sort((a, b) => compareId(a.lineId, b.lineId));
  const groups = new Map<string, PlanCandidate[]>();
  const reviews: PlanCandidate[] = [];
  for (const candidate of eligible) {
    if (candidate.state === 'review') reviews.push(candidate);
    else if (candidate.state === 'new') {
      const group = groups.get(candidate.openingId) ?? [];
      group.push(candidate);
      groups.set(candidate.openingId, group);
    } else throw new RangeError('Invalid card state');
  }
  const openings = [...groups.keys()].sort(compareId);
  const canonicalGroups = Object.fromEntries(openings.map((opening) =>
    [opening, groups.get(opening)!.map((candidate) => candidate.lineId)]));
  for (const opening of openings) {
    const group = groups.get(opening)!;
    groups.set(opening, shuffle(group, next));
  }
  const shuffledGroups = Object.fromEntries(openings.map((opening) =>
    [opening, groups.get(opening)!.map((candidate) => candidate.lineId)]));
  const groupOrder = shuffle(openings, next);
  const selected: PlanCandidate[] = [];
  let remaining = true;
  while (remaining && selected.length < input.newLinesPerDay) {
    remaining = false;
    for (const opening of groupOrder) {
      const candidate = groups.get(opening)!.shift();
      if (candidate) {
        selected.push(candidate);
        remaining = true;
      }
      if (selected.length === input.newLinesPerDay) break;
    }
  }
  draw.finish();
  const ordered = [...selected, ...reviews];
  const items = ordered.map((candidate): PlannedItem => {
    const totalMoves = input.color === 'white'
      ? Math.ceil(candidate.linePlies / 2) : Math.floor(candidate.linePlies / 2);
    const effectiveMoves = Math.min(candidate.unlockedMoves, totalMoves);
    if (!Number.isSafeInteger(effectiveMoves) || effectiveMoves < 1) throw new RangeError('Invalid depth');
    return {
      logicalId: logicalId(input, candidate), lineId: candidate.lineId,
      lineRevisionId: candidate.lineRevisionId, generation: candidate.generation,
      contentGeneration: candidate.contentGeneration, originType: candidate.state,
      effectiveMoves,
      studentPlies: Array.from({ length: effectiveMoves }, (_, index) => 2 * index + (input.color === 'white' ? 1 : 2)),
    };
  });
  return { newLineIds: selected.map((item) => item.lineId), reviewLineIds: reviews.map((item) => item.lineId),
    orderedLineIds: ordered.map((item) => item.lineId), items,
    shuffleTrace: { canonicalGroups, shuffledGroups, groupOrder, drawCount } };
}
