export const CardSchema: z.ZodObject<{
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
export const StudyItemSchema: z.ZodObject<{
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
}, z.core.$strict>;
export const StudySessionSchema: z.ZodObject<{
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
export const StudySessionCreateRequestSchema: z.ZodObject<{
    deviceId: z.ZodUUID;
}, z.core.$strict>;
export const StudySessionResponseSchema: z.ZodObject<{
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
export const OnboardingRequestSchema: z.ZodObject<{
    selections: z.ZodArray<z.ZodObject<{
        openingId: z.ZodUUID;
        color: z.ZodEnum<{
            white: "white";
            black: "black";
        }>;
    }, z.core.$strict>>;
    expectedAccountRevision: z.ZodString;
}, z.core.$strict>;
/** The selected colors must be validated against the same catalog snapshot. */
export const OnboardingWithCatalogSchema: z.ZodObject<{
    request: z.ZodObject<{
        selections: z.ZodArray<z.ZodObject<{
            openingId: z.ZodUUID;
            color: z.ZodEnum<{
                white: "white";
                black: "black";
            }>;
        }, z.core.$strict>>;
        expectedAccountRevision: z.ZodString;
    }, z.core.$strict>;
    openings: z.ZodArray<z.ZodObject<{
        id: z.ZodUUID;
        playableColors: z.ZodArray<z.ZodEnum<{
            white: "white";
            black: "black";
        }>>;
    }, z.core.$strip>>;
}, z.core.$strict>;
export const ActivitySchema: z.ZodObject<{
    eligibleDates: z.ZodArray<z.ZodString>;
    currentStreak: z.ZodNumber;
    bestStreak: z.ZodNumber;
    lastActiveDate: z.ZodNullable<z.ZodString>;
    asOfDate: z.ZodString;
}, z.core.$strict>;
export const AccountStateSchema: z.ZodObject<{
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
/** Onboarding replies only after selection and timestamp commit together. */
export const OnboardingResponseSchema: z.ZodObject<{
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
/** The response must include every accepted selection, never a partial set. */
export const OnboardingExchangeSchema: z.ZodObject<{
    request: z.ZodObject<{
        selections: z.ZodArray<z.ZodObject<{
            openingId: z.ZodUUID;
            color: z.ZodEnum<{
                white: "white";
                black: "black";
            }>;
        }, z.core.$strict>>;
        expectedAccountRevision: z.ZodString;
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
import * as z from 'zod';
