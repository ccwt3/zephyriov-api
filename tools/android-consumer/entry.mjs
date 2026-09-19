import * as domain from 'zephyriov-api/domain';
import { runParity } from './parity-cases.mjs';

const imported = import.meta.glob('../../src/domain/fixtures/R*.json', { eager: true, import: 'default' });
const fixtures = Object.fromEntries(Object.entries(imported).map(([path, value]) => [
  path.match(/(R\d{2})\.json$/)[1], value,
]));

try {
  const data = runParity(fixtures, domain);
  window.AndroidResult.report(JSON.stringify({ status: 'pass', data, engine: navigator.userAgent }));
} catch (error) {
  window.AndroidResult.report(JSON.stringify({ status: 'fail', error: String(error),
    stack: String(error.stack ?? '') }));
}
