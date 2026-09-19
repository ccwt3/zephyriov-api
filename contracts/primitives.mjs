import * as z from 'zod';

export const IdSchema = z.uuid();
export const ColorSchema = z.enum(['white', 'black']);

const dateShape = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;

/** A calendar date, independent of the server's timezone. */
export const CivilDateSchema = z.string().regex(dateShape).refine((value) => {
  const [, yearText, monthText, dayText] = dateShape.exec(value) ?? [];
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}, 'Invalid Gregorian date');

/** UTC RFC 3339 instant with exactly millisecond precision. */
export const InstantSchema = z.string()
  .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/)
  .refine((value) => {
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
  }, 'Invalid UTC instant');

/** Canonical nonnegative integers; never convert revisions to JS numbers. */
export const RevisionSchema = z.string().regex(/^(?:0|[1-9][0-9]*)$/);
export const IntervalDaysSchema = z.string().regex(/^(?:0|[1-9][0-9]*)\.[0-9]{2}$/);

