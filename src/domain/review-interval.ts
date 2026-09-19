import { addCivilDays, type CivilDate } from './civil-time.js';

export interface ReviewInterval {
  readonly rawInterval: string;
  readonly intervalDays: string;
  readonly dateOffsetDays: number;
  readonly dueDate: CivilDate;
}

const intervalPattern = /^(0|[1-9]\d*)\.(\d{2})$/;

/** Review/good: 1.00 -> 3.00 first, then exact ×2.5 with separate rounding. */
export function calculateReviewInterval(previous: string, studyDate: CivilDate): ReviewInterval {
  const match = intervalPattern.exec(previous);
  if (!match) throw new RangeError('Interval must be a nonnegative canonical decimal with two places');

  const cents = BigInt(match[1]!) * 100n + BigInt(match[2]!);
  const rawThousandths = cents * (previous === '1.00' ? 30n : 25n);
  const days = (rawThousandths + 500n) / 1000n;
  if (days > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Date offset is too large');

  const storedCents = (rawThousandths + 5n) / 10n;
  const dateOffsetDays = Number(days);
  return {
    rawInterval: `${rawThousandths / 1000n}.${(rawThousandths % 1000n).toString().padStart(3, '0')}`,
    intervalDays: `${storedCents / 100n}.${(storedCents % 100n).toString().padStart(2, '0')}`,
    dateOffsetDays,
    dueDate: addCivilDays(studyDate, dateOffsetDays),
  };
}
