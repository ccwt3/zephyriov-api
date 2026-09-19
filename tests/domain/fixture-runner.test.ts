import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { runFixtures, type FixtureFamily } from '../../src/domain/fixture-runner.js';

const domainDirectory = fileURLToPath(new URL('../../src/domain/', import.meta.url));
const fixtureDirectory = fileURLToPath(new URL('../../src/domain/fixtures/', import.meta.url));

function loadFamilies(): Record<string, FixtureFamily> {
  return Object.fromEntries(readdirSync(fixtureDirectory)
    .filter((name) => /^R\d{2}\.json$/.test(name))
    .map((name) => [name.slice(0, 3), JSON.parse(readFileSync(`${fixtureDirectory}/${name}`, 'utf8'))]));
}

describe('B01 declarative fixture runner', () => {
  it('visits all 22 families and 352 unique cases without altering source data', () => {
    const families = loadFamilies();
    const before = JSON.stringify(families);
    const visited = new Set<string>();

    const count = runFixtures(families, ({ family, fixture }) => {
      expect(fixture.rule).toBe(family);
      expect(fixture.sources.length).toBeGreaterThan(0);
      expect(fixture).toHaveProperty('initialState');
      expect(fixture).toHaveProperty('input');
      expect(fixture).toHaveProperty('clock');
      expect(fixture).toHaveProperty('seed');
      expect(fixture).toHaveProperty('expected');
      expect(fixture.forbiddenEffects.length).toBeGreaterThan(0);
      visited.add(fixture.id);
    });

    expect(Object.keys(families)).toHaveLength(22);
    expect(count).toBe(352);
    expect(visited.size).toBe(352);
    expect(JSON.stringify(families)).toBe(before);
  });

  it('rejects a duplicate case ID', () => {
    const first = loadFamilies().R01;
    if (!first) throw new Error('R01 fixture missing');
    expect(() => runFixtures({ R01: { ...first, fixtures: [first.fixtures[0]!, first.fixtures[0]!] } }, () => {}))
      .toThrow('duplicate fixture ID');
  });

  it('keeps production domain imports inside the domain and free of runtime services', () => {
    for (const name of readdirSync(domainDirectory).filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))) {
      const source = readFileSync(`${domainDirectory}/${name}`, 'utf8');
      const imports = [...source.matchAll(/(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g)];
      for (const [, specifier] of imports) {
        expect(specifier === 'chess.js' || specifier.startsWith('./'),
          `${name} imports outside src/domain or chess.js`).toBe(true);
      }
      expect(source, `${name} uses dynamic import`).not.toMatch(/\bimport\s*\(/);
    }
  });
});
