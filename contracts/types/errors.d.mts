export const ErrorCodeSchema: z.ZodEnum<{
    AUTH_REQUIRED: "AUTH_REQUIRED";
    EMAIL_UNVERIFIED: "EMAIL_UNVERIFIED";
    ORIGIN_DENIED: "ORIGIN_DENIED";
    NOT_FOUND: "NOT_FOUND";
    VERSION_CONFLICT: "VERSION_CONFLICT";
    EVENT_ID_REUSED: "EVENT_ID_REUSED";
    RECONCILIATION_REQUIRED: "RECONCILIATION_REQUIRED";
    PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE";
    VALIDATION_ERROR: "VALIDATION_ERROR";
    RATE_LIMITED: "RATE_LIMITED";
    SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
    REVISION_NOT_READY: "REVISION_NOT_READY";
}>;
/** Details identify invalid fields only; request values and secrets stay out. */
export const ErrorEnvelopeSchema: z.ZodObject<{
    error: z.ZodObject<{
        code: z.ZodEnum<{
            AUTH_REQUIRED: "AUTH_REQUIRED";
            EMAIL_UNVERIFIED: "EMAIL_UNVERIFIED";
            ORIGIN_DENIED: "ORIGIN_DENIED";
            NOT_FOUND: "NOT_FOUND";
            VERSION_CONFLICT: "VERSION_CONFLICT";
            EVENT_ID_REUSED: "EVENT_ID_REUSED";
            RECONCILIATION_REQUIRED: "RECONCILIATION_REQUIRED";
            PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE";
            VALIDATION_ERROR: "VALIDATION_ERROR";
            RATE_LIMITED: "RATE_LIMITED";
            SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
            REVISION_NOT_READY: "REVISION_NOT_READY";
        }>;
        message: z.ZodString;
        requestId: z.ZodString;
        retryable: z.ZodBoolean;
        details: z.ZodOptional<z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            issue: z.ZodString;
        }, z.core.$strict>>>;
    }, z.core.$strict>;
    serverNow: z.ZodString;
}, z.core.$strict>;
export const ERROR_STATUS: Readonly<{
    AUTH_REQUIRED: 401;
    EMAIL_UNVERIFIED: 403;
    ORIGIN_DENIED: 403;
    NOT_FOUND: 404;
    VERSION_CONFLICT: 409;
    EVENT_ID_REUSED: 409;
    RECONCILIATION_REQUIRED: 409;
    PAYLOAD_TOO_LARGE: 413;
    VALIDATION_ERROR: 422;
    RATE_LIMITED: 429;
    SERVICE_UNAVAILABLE: 503;
    REVISION_NOT_READY: 503;
}>;
import * as z from 'zod';
