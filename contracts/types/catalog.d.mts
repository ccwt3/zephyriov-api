/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type -- Generated TypeScript declarations. */
export function encodeCatalogCursor(payload: any): string;
export function decodeCatalogCursor(cursor: any): {
    manifestId: string;
    sortOrder: number;
    id: string;
};
export function lineRevisionEtag(contentHash: any): string;
/** Reference page ordering; a cursor belongs to exactly one manifest. */
export function paginateCatalog(openings: any, manifestId: any, query?: {}): {
    manifestId: string;
    openings: {
        id: string;
        slug: string;
        name: string;
        eco: string;
        playableColors: ("white" | "black")[];
        lineCount: number;
        manifestId: string;
        sortOrder: number;
        lines: {
            id: string;
            openingId: string;
            name: string;
            sortOrder: number;
            revisionId: string;
            movesHash: string;
            contentHash: string;
            totalStudentMovesByColor: {
                white: number;
                black: number;
            };
        }[];
    }[];
    nextCursor?: string;
};
export const ContentHashSchema: z.ZodString;
export const OpeningSummarySchema: z.ZodObject<{
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
}, z.core.$strict>;
export const LineSummarySchema: z.ZodObject<{
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
}, z.core.$strict>;
export const LineRevisionSchema: z.ZodObject<{
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
}, z.core.$strict>;
export const CatalogOpeningSchema: z.ZodObject<{
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
export const CatalogPageSchema: z.ZodObject<{
    manifestId: z.ZodUUID;
    openings: z.ZodArray<z.ZodObject<{
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
    }, z.core.$strict>>;
    nextCursor: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
export const CatalogQuerySchema: z.ZodObject<{
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    manifestId: z.ZodOptional<z.ZodUUID>;
}, z.core.$strict>;
export const LineRevisionQuerySchema: z.ZodObject<{
    revisionId: z.ZodOptional<z.ZodUUID>;
    ifNoneMatch: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export const LineRevisionResponseSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    status: z.ZodLiteral<200>;
    etag: z.ZodString;
    body: z.ZodObject<{
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
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    status: z.ZodLiteral<304>;
    etag: z.ZodString;
    body: z.ZodNull;
}, z.core.$strict>], "status">;
import * as z from 'zod';
