import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as domain from '../../dist/domain/index.js';
import { runParity } from './parity-cases.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const directory = resolve(root, 'src/domain/fixtures');
const fixtures = Object.fromEntries(readdirSync(directory).filter((name) => /^R\d{2}\.json$/.test(name))
  .map((name) => [name.slice(0, 3), JSON.parse(readFileSync(resolve(directory, name), 'utf8'))]));
process.stdout.write(JSON.stringify(runParity(fixtures, domain)) + '\n');
