import * as z from 'zod';
import { InstantSchema } from './primitives.mjs';

export const ErrorCodeSchema = z.enum([
  'AUTH_REQUIRED', 'EMAIL_UNVERIFIED', 'ORIGIN_DENIED', 'NOT_FOUND',
  'VERSION_CONFLICT', 'EVENT_ID_REUSED', 'RECONCILIATION_REQUIRED',
  'PAYLOAD_TOO_LARGE', 'VALIDATION_ERROR', 'RATE_LIMITED',
  'SERVICE_UNAVAILABLE', 'REVISION_NOT_READY',
]);

/** Details identify invalid fields only; request values and secrets stay out. */
export const ErrorEnvelopeSchema = z.strictObject({
  error: z.strictObject({
    code: ErrorCodeSchema,
    message: z.string().min(1),
    requestId: z.string().min(1).max(128),
    retryable: z.boolean(),
    details: z.array(z.strictObject({
      field: z.string().min(1),
      issue: z.string().min(1),
    })).optional(),
  }),
  serverNow: InstantSchema,
});

export const ERROR_STATUS = Object.freeze({
  AUTH_REQUIRED: 401,
  EMAIL_UNVERIFIED: 403,
  ORIGIN_DENIED: 403,
  NOT_FOUND: 404,
  VERSION_CONFLICT: 409,
  EVENT_ID_REUSED: 409,
  RECONCILIATION_REQUIRED: 409,
  PAYLOAD_TOO_LARGE: 413,
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,
  SERVICE_UNAVAILABLE: 503,
  REVISION_NOT_READY: 503,
});

