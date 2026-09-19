export const IdSchema: z.ZodUUID;
export const ColorSchema: z.ZodEnum<{
    white: "white";
    black: "black";
}>;
/** A calendar date, independent of the server's timezone. */
export const CivilDateSchema: z.ZodString;
/** UTC RFC 3339 instant with exactly millisecond precision. */
export const InstantSchema: z.ZodString;
/** Canonical nonnegative integers; never convert revisions to JS numbers. */
export const RevisionSchema: z.ZodString;
export const IntervalDaysSchema: z.ZodString;
import * as z from 'zod';
