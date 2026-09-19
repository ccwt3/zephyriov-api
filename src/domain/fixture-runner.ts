/** Declarative B01 cases. The runner deliberately knows no SRS algorithm. */
export interface SrsFixture {
  readonly id: string;
  readonly rule: string;
  readonly sources: readonly unknown[];
  readonly initialState: unknown;
  readonly input: unknown;
  readonly clock: unknown;
  readonly seed: unknown;
  readonly expected: unknown;
  readonly forbiddenEffects: readonly string[];
}

export interface FixtureFamily {
  readonly fixtureVersion: string;
  readonly scope: string;
  readonly fixtures: readonly SrsFixture[];
}

export interface FixtureEntry {
  readonly family: string;
  readonly fixture: SrsFixture;
}

/** Validate the transferred inventory and visit each original case once. */
export function runFixtures(
  families: Readonly<Record<string, FixtureFamily>>,
  visit: (entry: FixtureEntry) => void,
): number {
  const ids = new Set<string>();
  let count = 0;

  for (const [family, suite] of Object.entries(families).sort(([a], [b]) => a.localeCompare(b))) {
    if (!/^R(?:0[1-9]|1[0-9]|2[0-2])$/.test(family) || !suite.fixtures.length) {
      throw new Error(`Invalid or empty fixture family: ${family}`);
    }
    for (const fixture of suite.fixtures) {
      if (fixture.rule !== family || !fixture.id.startsWith(`${family}-`) || ids.has(fixture.id)) {
        throw new Error(`Invalid or duplicate fixture ID: ${fixture.id}`);
      }
      ids.add(fixture.id);
      visit({ family, fixture });
      count += 1;
    }
  }
  return count;
}
