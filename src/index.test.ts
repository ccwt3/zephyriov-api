import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { SRS_SPECIFICATION_VERSION } from './index.js';

describe('package specification marker', () => {
  it('matches the transferred fixture manifest', () => {
    const manifestPath = fileURLToPath(
      new URL('../docs/evidencia/T01-transfer.json', import.meta.url),
    );
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      srsSpecificationVersion: string;
    };
    expect(SRS_SPECIFICATION_VERSION).toBe(manifest.srsSpecificationVersion);
  });
});
