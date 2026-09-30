// B05.11 measurement: cost of the scrypt hashing Better Auth runs on sign-up/login/reset.
// Synthetic password only; prints timings, never stores them.
import { availableParallelism, cpus } from 'node:os';
import { hashPassword, verifyPassword } from 'better-auth/crypto';

const rounds = Number(process.argv[2] ?? 20);
const password = 'synthetic-password-for-hash-cost';
const median = (values) => values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)];
const time = async (callback) => { const start = performance.now(); await callback(); return performance.now() - start; };

const hash = await hashPassword(password);
const hashes = [];
const verifies = [];
for (let i = 0; i < rounds; i++) {
  hashes.push(await time(() => hashPassword(password)));
  verifies.push(await time(() => verifyPassword({ hash, password })));
}
const parallel = await time(() => Promise.all(Array.from({ length: 30 }, () => verifyPassword({ hash, password }))));
console.log(JSON.stringify({
  node: process.version, cpu: cpus()[0]?.model, threads: availableParallelism(),
  uvThreadpool: process.env.UV_THREADPOOL_SIZE ?? '4 (default)', rounds,
  hashMedianMs: Math.round(median(hashes)), verifyMedianMs: Math.round(median(verifies)),
  thirtyConcurrentVerifiesMs: Math.round(parallel),
}, null, 2));
