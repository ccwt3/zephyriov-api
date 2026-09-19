/* eslint-disable @typescript-eslint/no-explicit-any -- Generated TypeScript declarations. */
/** Enforces the wire limit before JSON parsing discards whitespace/escapes. */
export function parseStudyEventsBody(body: any): {
    events: {
        eventId: string;
        deviceId: string;
        lineId: string;
        lineRevisionId: string;
        srsVersion: string;
        pedagogicalSettingsVersion: string;
        base: {
            cardVersion: string;
            generation: string;
            contentGeneration: string;
        };
        dependsOnEventIds: string[];
        startedAt: string;
        completedAt: string;
        studyDate: string;
        studyTimezone: string;
        attempts: {
            ply: number;
            playedSan: string;
            elapsedMs: number;
        }[];
        sessionRef?: {
            kind: "canonical";
            id: string;
        } | {
            kind: "local";
            id: string;
        };
        itemRef?: {
            kind: "canonical";
            id: string;
        } | {
            kind: "local";
            id: string;
        };
        packageId?: string;
        zoneEvidenceRef?: {
            kind: "account-snapshot";
            accountRevision: string;
            settingsVersion: string;
        } | {
            kind: "issued-package";
            packageId: string;
            settingsVersion: string;
        };
    }[];
};
/**
 * A missing parent can be an earlier or later delivery; the schema rejects
 * only cycles among events present in this batch.
 */
export function validateStudyEventDependencies(request: any): {
    events: {
        eventId: string;
        deviceId: string;
        lineId: string;
        lineRevisionId: string;
        srsVersion: string;
        pedagogicalSettingsVersion: string;
        base: {
            cardVersion: string;
            generation: string;
            contentGeneration: string;
        };
        dependsOnEventIds: string[];
        startedAt: string;
        completedAt: string;
        studyDate: string;
        studyTimezone: string;
        attempts: {
            ply: number;
            playedSan: string;
            elapsedMs: number;
        }[];
        sessionRef?: {
            kind: "canonical";
            id: string;
        } | {
            kind: "local";
            id: string;
        };
        itemRef?: {
            kind: "canonical";
            id: string;
        } | {
            kind: "local";
            id: string;
        };
        packageId?: string;
        zoneEvidenceRef?: {
            kind: "account-snapshot";
            accountRevision: string;
            settingsVersion: string;
        } | {
            kind: "issued-package";
            packageId: string;
            settingsVersion: string;
        };
    }[];
};
/** Parses a transport event into a detached, recursively frozen snapshot. */
export function freezeStudyEvent(event: any): any;
/**
 * Validates the client report against the zone known when the block started.
 * It deliberately does not treat the event's declared zone as authoritative.
 */
export function validateStudyEventZoneEvidence(event: any, evidence: any): {
    eventId: string;
    deviceId: string;
    lineId: string;
    lineRevisionId: string;
    srsVersion: string;
    pedagogicalSettingsVersion: string;
    base: {
        cardVersion: string;
        generation: string;
        contentGeneration: string;
    };
    dependsOnEventIds: string[];
    startedAt: string;
    completedAt: string;
    studyDate: string;
    studyTimezone: string;
    attempts: {
        ply: number;
        playedSan: string;
        elapsedMs: number;
    }[];
    sessionRef?: {
        kind: "canonical";
        id: string;
    } | {
        kind: "local";
        id: string;
    };
    itemRef?: {
        kind: "canonical";
        id: string;
    } | {
        kind: "local";
        id: string;
    };
    packageId?: string;
    zoneEvidenceRef?: {
        kind: "account-snapshot";
        accountRevision: string;
        settingsVersion: string;
    } | {
        kind: "issued-package";
        packageId: string;
        settingsVersion: string;
    };
};
export const StudyReferenceSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"canonical">;
    id: z.ZodUUID;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"local">;
    id: z.ZodString;
}, z.core.$strict>], "kind">;
/** Points to a server-issued snapshot without conflating zone and pedagogy. */
export const StudyZoneEvidenceRefSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"account-snapshot">;
    accountRevision: z.ZodString;
    settingsVersion: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"issued-package">;
    packageId: z.ZodUUID;
    settingsVersion: z.ZodString;
}, z.core.$strict>], "kind">;
/** A raw attempt is preserved for later domain verification; it is not a grade. */
export const RawStudyAttemptSchema: z.ZodObject<{
    ply: z.ZodNumber;
    playedSan: z.ZodString;
    elapsedMs: z.ZodNumber;
}, z.core.$strict>;
export const StudyEventBaseSchema: z.ZodObject<{
    cardVersion: z.ZodString;
    generation: z.ZodString;
    contentGeneration: z.ZodString;
}, z.core.$strict>;
export const StudyEventSchema: z.ZodObject<{
    eventId: z.ZodUUID;
    deviceId: z.ZodUUID;
    sessionRef: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"canonical">;
        id: z.ZodUUID;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"local">;
        id: z.ZodString;
    }, z.core.$strict>], "kind">;
    itemRef: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"canonical">;
        id: z.ZodUUID;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"local">;
        id: z.ZodString;
    }, z.core.$strict>], "kind">;
    packageId: z.ZodNullable<z.ZodUUID>;
    lineId: z.ZodUUID;
    lineRevisionId: z.ZodUUID;
    srsVersion: z.ZodString;
    pedagogicalSettingsVersion: z.ZodString;
    base: z.ZodObject<{
        cardVersion: z.ZodString;
        generation: z.ZodString;
        contentGeneration: z.ZodString;
    }, z.core.$strict>;
    dependsOnEventIds: z.ZodArray<z.ZodUUID>;
    startedAt: z.ZodString;
    completedAt: z.ZodString;
    studyDate: z.ZodString;
    studyTimezone: z.ZodString;
    zoneEvidenceRef: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"account-snapshot">;
        accountRevision: z.ZodString;
        settingsVersion: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"issued-package">;
        packageId: z.ZodUUID;
        settingsVersion: z.ZodString;
    }, z.core.$strict>], "kind">;
    attempts: z.ZodArray<z.ZodObject<{
        ply: z.ZodNumber;
        playedSan: z.ZodString;
        elapsedMs: z.ZodNumber;
    }, z.core.$strict>>;
}, z.core.$strict>;
export const StudyEventsRequestSchema: z.ZodObject<{
    events: z.ZodArray<z.ZodObject<{
        eventId: z.ZodUUID;
        deviceId: z.ZodUUID;
        sessionRef: z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"canonical">;
            id: z.ZodUUID;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"local">;
            id: z.ZodString;
        }, z.core.$strict>], "kind">;
        itemRef: z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"canonical">;
            id: z.ZodUUID;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"local">;
            id: z.ZodString;
        }, z.core.$strict>], "kind">;
        packageId: z.ZodNullable<z.ZodUUID>;
        lineId: z.ZodUUID;
        lineRevisionId: z.ZodUUID;
        srsVersion: z.ZodString;
        pedagogicalSettingsVersion: z.ZodString;
        base: z.ZodObject<{
            cardVersion: z.ZodString;
            generation: z.ZodString;
            contentGeneration: z.ZodString;
        }, z.core.$strict>;
        dependsOnEventIds: z.ZodArray<z.ZodUUID>;
        startedAt: z.ZodString;
        completedAt: z.ZodString;
        studyDate: z.ZodString;
        studyTimezone: z.ZodString;
        zoneEvidenceRef: z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"account-snapshot">;
            accountRevision: z.ZodString;
            settingsVersion: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"issued-package">;
            packageId: z.ZodUUID;
            settingsVersion: z.ZodString;
        }, z.core.$strict>], "kind">;
        attempts: z.ZodArray<z.ZodObject<{
            ply: z.ZodNumber;
            playedSan: z.ZodString;
            elapsedMs: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
/** Alias named after the transport-level batch used by the REST route. */
export const StudyEventBatchSchema: z.ZodObject<{
    events: z.ZodArray<z.ZodObject<{
        eventId: z.ZodUUID;
        deviceId: z.ZodUUID;
        sessionRef: z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"canonical">;
            id: z.ZodUUID;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"local">;
            id: z.ZodString;
        }, z.core.$strict>], "kind">;
        itemRef: z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"canonical">;
            id: z.ZodUUID;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"local">;
            id: z.ZodString;
        }, z.core.$strict>], "kind">;
        packageId: z.ZodNullable<z.ZodUUID>;
        lineId: z.ZodUUID;
        lineRevisionId: z.ZodUUID;
        srsVersion: z.ZodString;
        pedagogicalSettingsVersion: z.ZodString;
        base: z.ZodObject<{
            cardVersion: z.ZodString;
            generation: z.ZodString;
            contentGeneration: z.ZodString;
        }, z.core.$strict>;
        dependsOnEventIds: z.ZodArray<z.ZodUUID>;
        startedAt: z.ZodString;
        completedAt: z.ZodString;
        studyDate: z.ZodString;
        studyTimezone: z.ZodString;
        zoneEvidenceRef: z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"account-snapshot">;
            accountRevision: z.ZodString;
            settingsVersion: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"issued-package">;
            packageId: z.ZodUUID;
            settingsVersion: z.ZodString;
        }, z.core.$strict>], "kind">;
        attempts: z.ZodArray<z.ZodObject<{
            ply: z.ZodNumber;
            playedSan: z.ZodString;
            elapsedMs: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export const STUDY_EVENTS_MAX_BYTES: number;
/** Resolved from the server's delivery/issuance record, not the client body. */
export const KnownStudyZoneSchema: z.ZodObject<{
    reference: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"account-snapshot">;
        accountRevision: z.ZodString;
        settingsVersion: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"issued-package">;
        packageId: z.ZodUUID;
        settingsVersion: z.ZodString;
    }, z.core.$strict>], "kind">;
    deviceId: z.ZodUUID;
    timezone: z.ZodString;
    knownAt: z.ZodString;
}, z.core.$strict>;
export const EventDecisionReasonSchema: z.ZodEnum<{
    ACCEPTED: "ACCEPTED";
    STALE_CARD: "STALE_CARD";
    RESET_GENERATION: "RESET_GENERATION";
    CONTENT_CHANGED: "CONTENT_CHANGED";
    CONTENT_RETIRED: "CONTENT_RETIRED";
    REPERTOIRE_INACTIVE: "REPERTOIRE_INACTIVE";
    DEPENDENCY_PRACTICE: "DEPENDENCY_PRACTICE";
    DEPENDENCY_INVALID: "DEPENDENCY_INVALID";
    OUTSIDE_DAILY_PLAN: "OUTSIDE_DAILY_PLAN";
    DELIVERY_EXPIRED: "DELIVERY_EXPIRED";
    OUTSIDE_PACKAGE_WINDOW: "OUTSIDE_PACKAGE_WINDOW";
    INVALID_ATTEMPTS: "INVALID_ATTEMPTS";
    INVALID_DATE: "INVALID_DATE";
    UNSUPPORTED_VERSION: "UNSUPPORTED_VERSION";
}>;
export const EventDecisionSchema: z.ZodObject<{
    eventId: z.ZodUUID;
    outcome: z.ZodEnum<{
        applied: "applied";
        practice: "practice";
        invalid: "invalid";
    }>;
    reason: z.ZodEnum<{
        ACCEPTED: "ACCEPTED";
        STALE_CARD: "STALE_CARD";
        RESET_GENERATION: "RESET_GENERATION";
        CONTENT_CHANGED: "CONTENT_CHANGED";
        CONTENT_RETIRED: "CONTENT_RETIRED";
        REPERTOIRE_INACTIVE: "REPERTOIRE_INACTIVE";
        DEPENDENCY_PRACTICE: "DEPENDENCY_PRACTICE";
        DEPENDENCY_INVALID: "DEPENDENCY_INVALID";
        OUTSIDE_DAILY_PLAN: "OUTSIDE_DAILY_PLAN";
        DELIVERY_EXPIRED: "DELIVERY_EXPIRED";
        OUTSIDE_PACKAGE_WINDOW: "OUTSIDE_PACKAGE_WINDOW";
        INVALID_ATTEMPTS: "INVALID_ATTEMPTS";
        INVALID_DATE: "INVALID_DATE";
        UNSUPPORTED_VERSION: "UNSUPPORTED_VERSION";
    }>;
    sessionId: z.ZodNullable<z.ZodUUID>;
    itemId: z.ZodNullable<z.ZodUUID>;
    grade: z.ZodNullable<z.ZodEnum<{
        bad: "bad";
        mid: "mid";
        good: "good";
    }>>;
    cardAfter: z.ZodNullable<z.ZodObject<{
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
    repeatItem: z.ZodNullable<z.ZodObject<{
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
    nextDue: z.ZodNullable<z.ZodObject<{
        date: z.ZodString;
        inDays: z.ZodString;
    }, z.core.$strict>>;
    sessionCompleted: z.ZodBoolean;
    accountRevision: z.ZodString;
    decidedAt: z.ZodString;
}, z.core.$strict>;
export const EventResultDecisionSchema: z.ZodObject<{
    eventId: z.ZodUUID;
    replayed: z.ZodBoolean;
    decision: z.ZodObject<{
        eventId: z.ZodUUID;
        outcome: z.ZodEnum<{
            applied: "applied";
            practice: "practice";
            invalid: "invalid";
        }>;
        reason: z.ZodEnum<{
            ACCEPTED: "ACCEPTED";
            STALE_CARD: "STALE_CARD";
            RESET_GENERATION: "RESET_GENERATION";
            CONTENT_CHANGED: "CONTENT_CHANGED";
            CONTENT_RETIRED: "CONTENT_RETIRED";
            REPERTOIRE_INACTIVE: "REPERTOIRE_INACTIVE";
            DEPENDENCY_PRACTICE: "DEPENDENCY_PRACTICE";
            DEPENDENCY_INVALID: "DEPENDENCY_INVALID";
            OUTSIDE_DAILY_PLAN: "OUTSIDE_DAILY_PLAN";
            DELIVERY_EXPIRED: "DELIVERY_EXPIRED";
            OUTSIDE_PACKAGE_WINDOW: "OUTSIDE_PACKAGE_WINDOW";
            INVALID_ATTEMPTS: "INVALID_ATTEMPTS";
            INVALID_DATE: "INVALID_DATE";
            UNSUPPORTED_VERSION: "UNSUPPORTED_VERSION";
        }>;
        sessionId: z.ZodNullable<z.ZodUUID>;
        itemId: z.ZodNullable<z.ZodUUID>;
        grade: z.ZodNullable<z.ZodEnum<{
            bad: "bad";
            mid: "mid";
            good: "good";
        }>>;
        cardAfter: z.ZodNullable<z.ZodObject<{
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
        repeatItem: z.ZodNullable<z.ZodObject<{
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
        nextDue: z.ZodNullable<z.ZodObject<{
            date: z.ZodString;
            inDays: z.ZodString;
        }, z.core.$strict>>;
        sessionCompleted: z.ZodBoolean;
        accountRevision: z.ZodString;
        decidedAt: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>;
export const RetryableEventResultSchema: z.ZodObject<{
    eventId: z.ZodUUID;
    retryable: z.ZodLiteral<true>;
    code: z.ZodEnum<{
        RATE_LIMITED: "RATE_LIMITED";
        SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
        DEPENDENCY_PENDING: "DEPENDENCY_PENDING";
    }>;
    retryAfterSeconds: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
export const EventIdReusedResultSchema: z.ZodObject<{
    eventId: z.ZodUUID;
    retryable: z.ZodLiteral<false>;
    code: z.ZodLiteral<"EVENT_ID_REUSED">;
}, z.core.$strict>;
export const EventResultSchema: z.ZodUnion<readonly [z.ZodObject<{
    eventId: z.ZodUUID;
    replayed: z.ZodBoolean;
    decision: z.ZodObject<{
        eventId: z.ZodUUID;
        outcome: z.ZodEnum<{
            applied: "applied";
            practice: "practice";
            invalid: "invalid";
        }>;
        reason: z.ZodEnum<{
            ACCEPTED: "ACCEPTED";
            STALE_CARD: "STALE_CARD";
            RESET_GENERATION: "RESET_GENERATION";
            CONTENT_CHANGED: "CONTENT_CHANGED";
            CONTENT_RETIRED: "CONTENT_RETIRED";
            REPERTOIRE_INACTIVE: "REPERTOIRE_INACTIVE";
            DEPENDENCY_PRACTICE: "DEPENDENCY_PRACTICE";
            DEPENDENCY_INVALID: "DEPENDENCY_INVALID";
            OUTSIDE_DAILY_PLAN: "OUTSIDE_DAILY_PLAN";
            DELIVERY_EXPIRED: "DELIVERY_EXPIRED";
            OUTSIDE_PACKAGE_WINDOW: "OUTSIDE_PACKAGE_WINDOW";
            INVALID_ATTEMPTS: "INVALID_ATTEMPTS";
            INVALID_DATE: "INVALID_DATE";
            UNSUPPORTED_VERSION: "UNSUPPORTED_VERSION";
        }>;
        sessionId: z.ZodNullable<z.ZodUUID>;
        itemId: z.ZodNullable<z.ZodUUID>;
        grade: z.ZodNullable<z.ZodEnum<{
            bad: "bad";
            mid: "mid";
            good: "good";
        }>>;
        cardAfter: z.ZodNullable<z.ZodObject<{
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
        repeatItem: z.ZodNullable<z.ZodObject<{
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
        nextDue: z.ZodNullable<z.ZodObject<{
            date: z.ZodString;
            inDays: z.ZodString;
        }, z.core.$strict>>;
        sessionCompleted: z.ZodBoolean;
        accountRevision: z.ZodString;
        decidedAt: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    eventId: z.ZodUUID;
    retryable: z.ZodLiteral<true>;
    code: z.ZodEnum<{
        RATE_LIMITED: "RATE_LIMITED";
        SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
        DEPENDENCY_PENDING: "DEPENDENCY_PENDING";
    }>;
    retryAfterSeconds: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>, z.ZodObject<{
    eventId: z.ZodUUID;
    retryable: z.ZodLiteral<false>;
    code: z.ZodLiteral<"EVENT_ID_REUSED">;
}, z.core.$strict>]>;
export const StudyEventsResponseSchema: z.ZodObject<{
    results: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        eventId: z.ZodUUID;
        replayed: z.ZodBoolean;
        decision: z.ZodObject<{
            eventId: z.ZodUUID;
            outcome: z.ZodEnum<{
                applied: "applied";
                practice: "practice";
                invalid: "invalid";
            }>;
            reason: z.ZodEnum<{
                ACCEPTED: "ACCEPTED";
                STALE_CARD: "STALE_CARD";
                RESET_GENERATION: "RESET_GENERATION";
                CONTENT_CHANGED: "CONTENT_CHANGED";
                CONTENT_RETIRED: "CONTENT_RETIRED";
                REPERTOIRE_INACTIVE: "REPERTOIRE_INACTIVE";
                DEPENDENCY_PRACTICE: "DEPENDENCY_PRACTICE";
                DEPENDENCY_INVALID: "DEPENDENCY_INVALID";
                OUTSIDE_DAILY_PLAN: "OUTSIDE_DAILY_PLAN";
                DELIVERY_EXPIRED: "DELIVERY_EXPIRED";
                OUTSIDE_PACKAGE_WINDOW: "OUTSIDE_PACKAGE_WINDOW";
                INVALID_ATTEMPTS: "INVALID_ATTEMPTS";
                INVALID_DATE: "INVALID_DATE";
                UNSUPPORTED_VERSION: "UNSUPPORTED_VERSION";
            }>;
            sessionId: z.ZodNullable<z.ZodUUID>;
            itemId: z.ZodNullable<z.ZodUUID>;
            grade: z.ZodNullable<z.ZodEnum<{
                bad: "bad";
                mid: "mid";
                good: "good";
            }>>;
            cardAfter: z.ZodNullable<z.ZodObject<{
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
            repeatItem: z.ZodNullable<z.ZodObject<{
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
            nextDue: z.ZodNullable<z.ZodObject<{
                date: z.ZodString;
                inDays: z.ZodString;
            }, z.core.$strict>>;
            sessionCompleted: z.ZodBoolean;
            accountRevision: z.ZodString;
            decidedAt: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>, z.ZodObject<{
        eventId: z.ZodUUID;
        retryable: z.ZodLiteral<true>;
        code: z.ZodEnum<{
            RATE_LIMITED: "RATE_LIMITED";
            SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
            DEPENDENCY_PENDING: "DEPENDENCY_PENDING";
        }>;
        retryAfterSeconds: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        eventId: z.ZodUUID;
        retryable: z.ZodLiteral<false>;
        code: z.ZodLiteral<"EVENT_ID_REUSED">;
    }, z.core.$strict>]>>;
    accountRevision: z.ZodString;
}, z.core.$strict>;
/** Validates the one-result-per-submitted-event relationship across the route. */
export const StudyEventsExchangeSchema: z.ZodObject<{
    request: z.ZodObject<{
        events: z.ZodArray<z.ZodObject<{
            eventId: z.ZodUUID;
            deviceId: z.ZodUUID;
            sessionRef: z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"canonical">;
                id: z.ZodUUID;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"local">;
                id: z.ZodString;
            }, z.core.$strict>], "kind">;
            itemRef: z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"canonical">;
                id: z.ZodUUID;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"local">;
                id: z.ZodString;
            }, z.core.$strict>], "kind">;
            packageId: z.ZodNullable<z.ZodUUID>;
            lineId: z.ZodUUID;
            lineRevisionId: z.ZodUUID;
            srsVersion: z.ZodString;
            pedagogicalSettingsVersion: z.ZodString;
            base: z.ZodObject<{
                cardVersion: z.ZodString;
                generation: z.ZodString;
                contentGeneration: z.ZodString;
            }, z.core.$strict>;
            dependsOnEventIds: z.ZodArray<z.ZodUUID>;
            startedAt: z.ZodString;
            completedAt: z.ZodString;
            studyDate: z.ZodString;
            studyTimezone: z.ZodString;
            zoneEvidenceRef: z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"account-snapshot">;
                accountRevision: z.ZodString;
                settingsVersion: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"issued-package">;
                packageId: z.ZodUUID;
                settingsVersion: z.ZodString;
            }, z.core.$strict>], "kind">;
            attempts: z.ZodArray<z.ZodObject<{
                ply: z.ZodNumber;
                playedSan: z.ZodString;
                elapsedMs: z.ZodNumber;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    response: z.ZodObject<{
        results: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
            eventId: z.ZodUUID;
            replayed: z.ZodBoolean;
            decision: z.ZodObject<{
                eventId: z.ZodUUID;
                outcome: z.ZodEnum<{
                    applied: "applied";
                    practice: "practice";
                    invalid: "invalid";
                }>;
                reason: z.ZodEnum<{
                    ACCEPTED: "ACCEPTED";
                    STALE_CARD: "STALE_CARD";
                    RESET_GENERATION: "RESET_GENERATION";
                    CONTENT_CHANGED: "CONTENT_CHANGED";
                    CONTENT_RETIRED: "CONTENT_RETIRED";
                    REPERTOIRE_INACTIVE: "REPERTOIRE_INACTIVE";
                    DEPENDENCY_PRACTICE: "DEPENDENCY_PRACTICE";
                    DEPENDENCY_INVALID: "DEPENDENCY_INVALID";
                    OUTSIDE_DAILY_PLAN: "OUTSIDE_DAILY_PLAN";
                    DELIVERY_EXPIRED: "DELIVERY_EXPIRED";
                    OUTSIDE_PACKAGE_WINDOW: "OUTSIDE_PACKAGE_WINDOW";
                    INVALID_ATTEMPTS: "INVALID_ATTEMPTS";
                    INVALID_DATE: "INVALID_DATE";
                    UNSUPPORTED_VERSION: "UNSUPPORTED_VERSION";
                }>;
                sessionId: z.ZodNullable<z.ZodUUID>;
                itemId: z.ZodNullable<z.ZodUUID>;
                grade: z.ZodNullable<z.ZodEnum<{
                    bad: "bad";
                    mid: "mid";
                    good: "good";
                }>>;
                cardAfter: z.ZodNullable<z.ZodObject<{
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
                repeatItem: z.ZodNullable<z.ZodObject<{
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
                nextDue: z.ZodNullable<z.ZodObject<{
                    date: z.ZodString;
                    inDays: z.ZodString;
                }, z.core.$strict>>;
                sessionCompleted: z.ZodBoolean;
                accountRevision: z.ZodString;
                decidedAt: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            eventId: z.ZodUUID;
            retryable: z.ZodLiteral<true>;
            code: z.ZodEnum<{
                RATE_LIMITED: "RATE_LIMITED";
                SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
                DEPENDENCY_PENDING: "DEPENDENCY_PENDING";
            }>;
            retryAfterSeconds: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>, z.ZodObject<{
            eventId: z.ZodUUID;
            retryable: z.ZodLiteral<false>;
            code: z.ZodLiteral<"EVENT_ID_REUSED">;
        }, z.core.$strict>]>>;
        accountRevision: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>;
/** The decision lookup/replay response never substitutes a current snapshot. */
export const ReplayedDecisionResponseSchema: z.ZodObject<{
    eventId: z.ZodUUID;
    replayed: z.ZodLiteral<true>;
    decision: z.ZodObject<{
        eventId: z.ZodUUID;
        outcome: z.ZodEnum<{
            applied: "applied";
            practice: "practice";
            invalid: "invalid";
        }>;
        reason: z.ZodEnum<{
            ACCEPTED: "ACCEPTED";
            STALE_CARD: "STALE_CARD";
            RESET_GENERATION: "RESET_GENERATION";
            CONTENT_CHANGED: "CONTENT_CHANGED";
            CONTENT_RETIRED: "CONTENT_RETIRED";
            REPERTOIRE_INACTIVE: "REPERTOIRE_INACTIVE";
            DEPENDENCY_PRACTICE: "DEPENDENCY_PRACTICE";
            DEPENDENCY_INVALID: "DEPENDENCY_INVALID";
            OUTSIDE_DAILY_PLAN: "OUTSIDE_DAILY_PLAN";
            DELIVERY_EXPIRED: "DELIVERY_EXPIRED";
            OUTSIDE_PACKAGE_WINDOW: "OUTSIDE_PACKAGE_WINDOW";
            INVALID_ATTEMPTS: "INVALID_ATTEMPTS";
            INVALID_DATE: "INVALID_DATE";
            UNSUPPORTED_VERSION: "UNSUPPORTED_VERSION";
        }>;
        sessionId: z.ZodNullable<z.ZodUUID>;
        itemId: z.ZodNullable<z.ZodUUID>;
        grade: z.ZodNullable<z.ZodEnum<{
            bad: "bad";
            mid: "mid";
            good: "good";
        }>>;
        cardAfter: z.ZodNullable<z.ZodObject<{
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
        repeatItem: z.ZodNullable<z.ZodObject<{
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
        nextDue: z.ZodNullable<z.ZodObject<{
            date: z.ZodString;
            inDays: z.ZodString;
        }, z.core.$strict>>;
        sessionCompleted: z.ZodBoolean;
        accountRevision: z.ZodString;
        decidedAt: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>;
import * as z from 'zod';
