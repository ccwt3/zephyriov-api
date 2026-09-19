/* eslint-disable @typescript-eslint/no-explicit-any -- Generated TypeScript declarations. */
export function versionFromIfMatch(headers: any): string;
/** A repeat of an already reached desired state must not run its effects again. */
export function checkExpectedVersion(expectedVersion: any, currentVersion: any, alreadyDesired: any): "unchanged" | "apply" | "conflict";
export function decideRepertoirePut(currentEntry: any, openingId: any, opening: any, request: any): "unchanged" | "apply" | "conflict";
export function decideRepertoireDelete(currentEntry: any, headers: any): "unchanged" | "apply" | "conflict";
export function decideSettingsPatch(currentSettings: any, request: any): "unchanged" | "apply" | "conflict";
export const TimezoneSchema: z.ZodString;
export const SettingsSchema: z.ZodObject<{
    version: z.ZodString;
    newLinesPerDay: z.ZodNumber;
    movesPerBlock: z.ZodNumber;
    timezone: z.ZodString;
}, z.core.$strict>;
export const ProfileSchema: z.ZodObject<{
    id: z.ZodUUID;
    emailVerified: z.ZodBoolean;
    onboardedAt: z.ZodNullable<z.ZodString>;
    settings: z.ZodObject<{
        version: z.ZodString;
        newLinesPerDay: z.ZodNumber;
        movesPerBlock: z.ZodNumber;
        timezone: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>;
export const RepertoireEntrySchema: z.ZodObject<{
    openingId: z.ZodUUID;
    color: z.ZodEnum<{
        white: "white";
        black: "black";
    }>;
    active: z.ZodBoolean;
    version: z.ZodString;
}, z.core.$strict>;
export const RepertoirePutRequestSchema: z.ZodObject<{
    color: z.ZodEnum<{
        white: "white";
        black: "black";
    }>;
    expectedVersion: z.ZodString;
}, z.core.$strict>;
/** If-Match carries the decimal entry version as an HTTP entity tag. */
export const RepertoireDeleteHeadersSchema: z.ZodObject<{
    ifMatch: z.ZodString;
}, z.core.$strict>;
/** Catalog membership is checked with the request, before a versioned write. */
export const RepertoirePutForOpeningSchema: z.ZodObject<{
    openingId: z.ZodUUID;
    opening: z.ZodObject<{
        id: z.ZodUUID;
        slug: z.ZodString;
        name: z.ZodString;
        eco: z.ZodString;
        playableColors: z.ZodArray<z.ZodEnum<{
            white: "white";
            black: "black";
        }>>;
        lineCount: z.ZodNumber;
        manifestId: z.ZodUUID;
        sortOrder: z.ZodNumber;
        lines: z.ZodArray<z.ZodObject<{
            id: z.ZodUUID;
            openingId: z.ZodUUID;
            name: z.ZodString;
            sortOrder: z.ZodNumber;
            revisionId: z.ZodUUID;
            movesHash: z.ZodString;
            contentHash: z.ZodString;
            totalStudentMovesByColor: z.ZodObject<{
                white: z.ZodNumber;
                black: z.ZodNumber;
            }, z.core.$strict>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    request: z.ZodObject<{
        color: z.ZodEnum<{
            white: "white";
            black: "black";
        }>;
        expectedVersion: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>;
export const RepertoireMutationResponseSchema: z.ZodObject<{
    entry: z.ZodObject<{
        openingId: z.ZodUUID;
        color: z.ZodEnum<{
            white: "white";
            black: "black";
        }>;
        active: z.ZodBoolean;
        version: z.ZodString;
    }, z.core.$strict>;
    accountRevision: z.ZodString;
}, z.core.$strict>;
export const SettingsPatchRequestSchema: z.ZodObject<{
    expectedVersion: z.ZodString;
    newLinesPerDay: z.ZodOptional<z.ZodNumber>;
    movesPerBlock: z.ZodOptional<z.ZodNumber>;
    timezone: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export const SettingsPatchResponseSchema: z.ZodObject<{
    settings: z.ZodObject<{
        version: z.ZodString;
        newLinesPerDay: z.ZodNumber;
        movesPerBlock: z.ZodNumber;
        timezone: z.ZodString;
    }, z.core.$strict>;
    effect: z.ZodObject<{
        pedagogy: z.ZodLiteral<"next_sessions_and_packages">;
        timezone: z.ZodLiteral<"next_block">;
    }, z.core.$strict>;
    activeSessionSettingsVersion: z.ZodNullable<z.ZodString>;
    activePackageIds: z.ZodArray<z.ZodUUID>;
    accountRevision: z.ZodString;
}, z.core.$strict>;
/** Route-specific 409 adds the current state to the standard error envelope. */
export const SettingsVersionConflictSchema: z.ZodObject<{
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
    currentSettings: z.ZodObject<{
        version: z.ZodString;
        newLinesPerDay: z.ZodNumber;
        movesPerBlock: z.ZodNumber;
        timezone: z.ZodString;
    }, z.core.$strict>;
    accountRevision: z.ZodString;
}, z.core.$strict>;
export const RepertoireVersionConflictSchema: z.ZodObject<{
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
    currentEntry: z.ZodNullable<z.ZodObject<{
        openingId: z.ZodUUID;
        color: z.ZodEnum<{
            white: "white";
            black: "black";
        }>;
        active: z.ZodBoolean;
        version: z.ZodString;
    }, z.core.$strict>>;
    accountRevision: z.ZodString;
}, z.core.$strict>;
import * as z from 'zod';
