/* eslint-disable @typescript-eslint/no-explicit-any -- Generated TypeScript declarations. */
/** Decimal revisions compare as integers, never as JS numbers or strings. */
export function revisionSatisfiesMinimum(actualRevision: any, minRevision: any): boolean;
export function realtimeTicketHasThirtySecondLifetime(issuedAt: any, response: any): boolean;
export const RevisionReadQuerySchema: z.ZodObject<{
    minRevision: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export const AccountStateReadExchangeSchema: z.ZodObject<{
    query: z.ZodObject<{
        minRevision: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
    response: z.ZodObject<{
        profile: z.ZodObject<{
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
        repertoire: z.ZodArray<z.ZodObject<{
            openingId: z.ZodUUID;
            color: z.ZodEnum<{
                white: "white";
                black: "black";
            }>;
            active: z.ZodBoolean;
            version: z.ZodString;
        }, z.core.$strict>>;
        cards: z.ZodArray<z.ZodObject<{
            id: z.ZodUUID;
            lineId: z.ZodUUID;
            color: z.ZodEnum<{
                white: "white";
                black: "black";
            }>;
            generation: z.ZodString;
            contentGeneration: z.ZodString;
            version: z.ZodString;
            state: z.ZodEnum<{
                new: "new";
                review: "review";
            }>;
            unlockedMoves: z.ZodNumber;
            intervalDays: z.ZodString;
            dueDate: z.ZodString;
            reps: z.ZodNumber;
            lapses: z.ZodNumber;
            lastGrade: z.ZodNullable<z.ZodEnum<{
                bad: "bad";
                mid: "mid";
                good: "good";
            }>>;
        }, z.core.$strict>>;
        activity: z.ZodObject<{
            eligibleDates: z.ZodArray<z.ZodString>;
            currentStreak: z.ZodNumber;
            bestStreak: z.ZodNumber;
            lastActiveDate: z.ZodNullable<z.ZodString>;
            asOfDate: z.ZodString;
        }, z.core.$strict>;
        currentSession: z.ZodNullable<z.ZodObject<{
            id: z.ZodUUID;
            studyDate: z.ZodString;
            pedagogicalSettings: z.ZodObject<{
                version: z.ZodString;
                newLinesPerDay: z.ZodNumber;
                movesPerBlock: z.ZodNumber;
                timezone: z.ZodString;
            }, z.core.$strict>;
            planSeed: z.ZodString;
            status: z.ZodEnum<{
                in_progress: "in_progress";
                completed: "completed";
            }>;
            items: z.ZodArray<z.ZodObject<{
                id: z.ZodUUID;
                sessionId: z.ZodUUID;
                lineId: z.ZodUUID;
                lineRevisionId: z.ZodUUID;
                originType: z.ZodEnum<{
                    new: "new";
                    review: "review";
                }>;
                attemptNumber: z.ZodNumber;
                parentEventId: z.ZodNullable<z.ZodUUID>;
                status: z.ZodEnum<{
                    pending: "pending";
                    graded: "graded";
                    cancelled: "cancelled";
                }>;
                sortOrder: z.ZodNumber;
                baseCard: z.ZodObject<{
                    id: z.ZodUUID;
                    lineId: z.ZodUUID;
                    color: z.ZodEnum<{
                        white: "white";
                        black: "black";
                    }>;
                    generation: z.ZodString;
                    contentGeneration: z.ZodString;
                    version: z.ZodString;
                    state: z.ZodEnum<{
                        new: "new";
                        review: "review";
                    }>;
                    unlockedMoves: z.ZodNumber;
                    intervalDays: z.ZodString;
                    dueDate: z.ZodString;
                    reps: z.ZodNumber;
                    lapses: z.ZodNumber;
                    lastGrade: z.ZodNullable<z.ZodEnum<{
                        bad: "bad";
                        mid: "mid";
                        good: "good";
                    }>>;
                }, z.core.$strict>;
                effectiveMoves: z.ZodNumber;
                pedagogicalSettingsVersion: z.ZodString;
                movesPerBlock: z.ZodNumber;
                srsVersion: z.ZodString;
            }, z.core.$strict>>;
            newLineIds: z.ZodArray<z.ZodUUID>;
            completedCount: z.ZodNumber;
            pendingCount: z.ZodNumber;
            cancelledCount: z.ZodNumber;
        }, z.core.$strict>>;
        manifestId: z.ZodUUID;
        accountRevision: z.ZodString;
        serverNow: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>;
export const StudySessionReadExchangeSchema: z.ZodObject<{
    query: z.ZodObject<{
        minRevision: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
    response: z.ZodObject<{
        session: z.ZodObject<{
            id: z.ZodUUID;
            studyDate: z.ZodString;
            pedagogicalSettings: z.ZodObject<{
                version: z.ZodString;
                newLinesPerDay: z.ZodNumber;
                movesPerBlock: z.ZodNumber;
                timezone: z.ZodString;
            }, z.core.$strict>;
            planSeed: z.ZodString;
            status: z.ZodEnum<{
                in_progress: "in_progress";
                completed: "completed";
            }>;
            items: z.ZodArray<z.ZodObject<{
                id: z.ZodUUID;
                sessionId: z.ZodUUID;
                lineId: z.ZodUUID;
                lineRevisionId: z.ZodUUID;
                originType: z.ZodEnum<{
                    new: "new";
                    review: "review";
                }>;
                attemptNumber: z.ZodNumber;
                parentEventId: z.ZodNullable<z.ZodUUID>;
                status: z.ZodEnum<{
                    pending: "pending";
                    graded: "graded";
                    cancelled: "cancelled";
                }>;
                sortOrder: z.ZodNumber;
                baseCard: z.ZodObject<{
                    id: z.ZodUUID;
                    lineId: z.ZodUUID;
                    color: z.ZodEnum<{
                        white: "white";
                        black: "black";
                    }>;
                    generation: z.ZodString;
                    contentGeneration: z.ZodString;
                    version: z.ZodString;
                    state: z.ZodEnum<{
                        new: "new";
                        review: "review";
                    }>;
                    unlockedMoves: z.ZodNumber;
                    intervalDays: z.ZodString;
                    dueDate: z.ZodString;
                    reps: z.ZodNumber;
                    lapses: z.ZodNumber;
                    lastGrade: z.ZodNullable<z.ZodEnum<{
                        bad: "bad";
                        mid: "mid";
                        good: "good";
                    }>>;
                }, z.core.$strict>;
                effectiveMoves: z.ZodNumber;
                pedagogicalSettingsVersion: z.ZodString;
                movesPerBlock: z.ZodNumber;
                srsVersion: z.ZodString;
            }, z.core.$strict>>;
            newLineIds: z.ZodArray<z.ZodUUID>;
            completedCount: z.ZodNumber;
            pendingCount: z.ZodNumber;
            cancelledCount: z.ZodNumber;
        }, z.core.$strict>;
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
            moves: z.ZodArray<z.ZodObject<{
                ply: z.ZodNumber;
                san: z.ZodString;
                explanation: z.ZodString;
            }, z.core.$strict>>;
            references: z.ZodArray<z.ZodObject<{
                title: z.ZodString;
                url: z.ZodOptional<z.ZodURL>;
                citation: z.ZodString;
                consultedAt: z.ZodString;
                coverage: z.ZodString;
                limitations: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        accountRevision: z.ZodString;
        serverNow: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>;
export const RevisionNotReadySchema: z.ZodObject<{
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
/** A short lived opaque bearer for one WebSocket connection. */
export const RealtimeTicketResponseSchema: z.ZodObject<{
    ticket: z.ZodString;
    expiresAt: z.ZodString;
}, z.core.$strict>;
export const RealtimeAuthenticateSchema: z.ZodObject<{
    type: z.ZodLiteral<"authenticate">;
    ticket: z.ZodString;
}, z.core.$strict>;
export const RealtimeNoticeSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"hello">;
    accountRevision: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"state_changed">;
    accountRevision: z.ZodString;
}, z.core.$strict>], "type">;
/** Health is only an HTTP status; it carries no account or provider data. */
export const HealthReadyStatusSchema: z.ZodUnion<readonly [z.ZodLiteral<200>, z.ZodLiteral<503>]>;
import * as z from 'zod';
