import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { addCivilDays, civilDateAt, currentCivilDate, isWithinUtcWindow } from './civil-time.js';

describe('civil dates and UTC boundaries', () => {
  it('matches the temporal fields of the transferred R20/R21 fixtures', () => {
    type TemporalCase = {
      id: string;
      initialState: { activeBlock?: { startedAt: string; studyTimezone: string } };
      input: { operation: string; continueAt?: string; package?: { issuedAt: string; expiresAt: string } };
      clock: { now: string };
      expected: {
        eventStudyDate?: string; dueDate?: string; continueDate?: string;
        completedBlockDate?: string; nextBlockDate?: string; nextBlockTimezone?: string;
        canStudy?: boolean;
      };
    };
    const load = (rule: string): TemporalCase[] => JSON.parse(readFileSync(
      new URL(`./fixtures/${rule}.json`, import.meta.url), 'utf8',
    )).fixtures as TemporalCase[];

    for (const fixture of load('R20')) {
      if (fixture.input.operation === 'complete_then_continue') {
        const block = fixture.initialState.activeBlock!;
        expect(civilDateAt(block.startedAt, block.studyTimezone), fixture.id)
          .toBe(fixture.expected.eventStudyDate);
        expect(addCivilDays(fixture.expected.eventStudyDate!, 1), fixture.id)
          .toBe(fixture.expected.dueDate);
        expect(civilDateAt(fixture.input.continueAt!, block.studyTimezone), fixture.id)
          .toBe(fixture.expected.continueDate);
      }
      if (fixture.input.operation === 'expired-suspended') {
        const window = fixture.input.package!;
        expect(isWithinUtcWindow(fixture.clock.now, window.issuedAt, window.expiresAt), fixture.id)
          .toBe(fixture.expected.canStudy);
      }
    }
    for (const fixture of load('R21')) {
      if (fixture.input.operation !== 'zone_change_between_blocks') continue;
      const block = fixture.initialState.activeBlock!;
      expect(civilDateAt(block.startedAt, block.studyTimezone), fixture.id)
        .toBe(fixture.expected.completedBlockDate);
      expect(civilDateAt(fixture.input.continueAt!, fixture.expected.nextBlockTimezone!), fixture.id)
        .toBe(fixture.expected.nextBlockDate);
    }
  });

  it('uses Gregorian days across leap centuries, month and year boundaries', () => {
    expect(addCivilDays('2000-02-28', 1)).toBe('2000-02-29');
    expect(addCivilDays('2100-02-28', 1)).toBe('2100-03-01');
    expect(addCivilDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(addCivilDays('2024-01-01', -1)).toBe('2023-12-31');
    expect(addCivilDays('0001-01-01', 1)).toBe('0001-01-02');
    expect(() => addCivilDays('2026-02-29', 1)).toThrow(RangeError);
    expect(() => addCivilDays('9999-12-31', 1)).toThrow(RangeError);
    expect(() => addCivilDays('2024-01-01', 0.5)).toThrow(RangeError);
  });

  it('resolves midnight and repeated DST hours from UTC instants', () => {
    expect(civilDateAt('2024-03-10T04:59:59.999Z', 'America/New_York')).toBe('2024-03-09');
    expect(civilDateAt('2024-03-10T05:00:00.000Z', 'America/New_York')).toBe('2024-03-10');
    expect(civilDateAt('2024-03-11T03:59:59.999Z', 'America/New_York')).toBe('2024-03-10');
    expect(civilDateAt('2024-03-11T04:00:00.000Z', 'America/New_York')).toBe('2024-03-11');
    expect(civilDateAt('2024-11-03T05:30:00.000Z', 'America/New_York')).toBe('2024-11-03');
    expect(civilDateAt('2024-11-03T06:30:00.000Z', 'America/New_York')).toBe('2024-11-03');
    expect(civilDateAt('2024-11-04T04:59:59.999Z', 'America/New_York')).toBe('2024-11-03');
    expect(civilDateAt('2024-11-04T05:00:00.000Z', 'America/New_York')).toBe('2024-11-04');
    expect(addCivilDays('2024-03-10', 1)).toBe('2024-03-11');
    expect(addCivilDays('2024-11-03', 1)).toBe('2024-11-04');
  });

  it('uses the known zone and captures the injected clock exactly once', () => {
    let calls = 0;
    const clock = () => { calls++; return '2026-09-17T01:00:00.000Z'; };
    expect(currentCivilDate('America/Mexico_City', clock)).toBe('2026-09-16');
    expect(calls).toBe(1);
    expect(civilDateAt('2026-09-17T01:00:00.000Z', 'Asia/Tokyo')).toBe('2026-09-17');
    expect(() => civilDateAt('2026-09-17T01:00:00.000Z', 'Mars/Olympus')).toThrow(RangeError);
  });

  it('treats UTC window endpoints exactly and rejects invalid instants', () => {
    const start = '2026-09-17T00:00:00.000Z';
    const end = '2026-09-24T00:00:00.000Z';
    expect(isWithinUtcWindow(start, start, end)).toBe(true);
    expect(isWithinUtcWindow('2026-09-23T23:59:59.999Z', start, end)).toBe(true);
    expect(isWithinUtcWindow(end, start, end)).toBe(false);
    expect(isWithinUtcWindow('2026-09-16T23:59:59.999Z', start, end)).toBe(false);
    expect(() => isWithinUtcWindow(start, end, end)).toThrow(RangeError);
    expect(() => civilDateAt('2026-02-30T00:00:00.000Z', 'UTC')).toThrow(RangeError);
    expect(() => civilDateAt('2026-09-17T01:00:00Z', 'UTC')).toThrow(RangeError);
  });
});
