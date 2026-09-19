export type CivilDate = string;
export type UtcInstant = string;
export type Clock = () => UtcInstant;

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const instantPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const millisecondsPerDay = 86_400_000;

function parseCivilDate(value: CivilDate): Date {
  const match = datePattern.exec(value);
  if (!match) throw new RangeError(`Invalid civil date: ${value}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1) throw new RangeError(`Invalid civil date: ${value}`);

  // setUTCFullYear avoids Date.UTC's special treatment of years 00–99.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  if (date.toISOString().slice(0, 10) !== value) {
    throw new RangeError(`Invalid civil date: ${value}`);
  }
  return date;
}

function parseUtcInstant(value: UtcInstant): number {
  if (!instantPattern.test(value)) throw new RangeError(`Invalid UTC instant: ${value}`);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    throw new RangeError(`Invalid UTC instant: ${value}`);
  }
  return timestamp;
}

/** Calendar arithmetic uses UTC only as a representation of the civil date. */
export function addCivilDays(value: CivilDate, days: number): CivilDate {
  if (!Number.isSafeInteger(days)) throw new RangeError('Days must be a safe integer');
  const timestamp = parseCivilDate(value).getTime() + days * millisecondsPerDay;
  if (!Number.isFinite(timestamp)) throw new RangeError('Civil date is outside the supported range');
  const result = new Date(timestamp);
  if (Number.isNaN(result.getTime()) || result.getUTCFullYear() < 1 || result.getUTCFullYear() > 9999) {
    throw new RangeError('Civil date is outside the supported range');
  }
  return result.toISOString().slice(0, 10);
}

/** Resolve a canonical UTC instant in the known IANA time zone. */
export function civilDateAt(instant: UtcInstant, timezone: string): CivilDate {
  const timestamp = parseUtcInstant(instant);
  const formatter = new Intl.DateTimeFormat('en-US-u-ca-gregory', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const parts = Object.fromEntries(formatter.formatToParts(timestamp).map(({ type, value }) => [type, value]));
  const date = `${parts.year?.padStart(4, '0')}-${parts.month}-${parts.day}`;
  parseCivilDate(date);
  return date;
}

/** Capture the injected clock once; the caller supplies its known zone. */
export function currentCivilDate(timezone: string, clock: Clock): CivilDate {
  return civilDateAt(clock(), timezone);
}

/** UTC package/event windows are half open: [start, end). */
export function isWithinUtcWindow(instant: UtcInstant, start: UtcInstant, end: UtcInstant): boolean {
  const at = parseUtcInstant(instant);
  const from = parseUtcInstant(start);
  const until = parseUtcInstant(end);
  if (from >= until) throw new RangeError('UTC window must have positive duration');
  return at >= from && at < until;
}
