import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const sdk = process.env.ANDROID_SDK_ROOT ?? process.env.ANDROID_HOME;
const adb = sdk && join(sdk, 'platform-tools', 'adb');
const apk = process.argv[2];
if (!adb || !existsSync(adb) || !apk || !existsSync(apk)) {
  throw new Error('Set ANDROID_SDK_ROOT and pass the built probe.apk path');
}
const packageName = 'dev.zephyriov.domainprobe';
const run = (args) => execFileSync(adb, args, { encoding: 'utf8', timeout: 30000 }).trim();
const installed = () => {
  try { return run(['shell', 'pm', 'path', packageName]); }
  catch (error) {
    if (error.status === 1 && !error.stdout?.toString().trim()
      && !error.stderr?.toString().trim()) return '';
    throw error;
  }
};
const devices = run(['devices']).split('\n').slice(1).filter(Boolean);
if (devices.length !== 1 || !devices[0].endsWith('\tdevice')) {
  throw new Error('Exactly one authorized Android device must be connected');
}
if (installed()) throw new Error('Probe package already installed; refusing to modify it');

let installedHere = false;
try {
  run(['install', apk]);
  installedHere = true;
  const runId = randomUUID();
  run(['shell', 'am', 'start', '-n', `${packageName}/.ProbeActivity`, '--es', 'run', runId]);
  const expected = JSON.parse(execFileSync(process.execPath,
    [new URL('./node-parity.mjs', import.meta.url).pathname], { encoding: 'utf8' }));
  let reported;
  for (let attempt = 0; attempt < 30; attempt++) {
    const log = run(['logcat', '-d', '-s', 'ZephyriovDomainProbe:I', '*:S']);
    const marker = log.lastIndexOf(`RUN:${runId}`);
    const chunks = marker < 0 ? [] : [...log.slice(marker).matchAll(/PARITY:(\d+):(\d+):([A-Za-z0-9+/=]+)/g)];
    const starts = chunks.map((match, index) => match[1] === '0' ? index : -1).filter((index) => index >= 0);
    const start = starts.at(-1);
    if (start !== undefined) {
      const total = Number(chunks[start][2]);
      const batch = chunks.slice(start, start + total);
      if (batch.length === total && batch.every((chunk, index) => Number(chunk[1]) === index
        && Number(chunk[2]) === total)) {
        reported = JSON.parse(Buffer.from(batch.map((chunk) => chunk[3]).join(''), 'base64').toString('utf8'));
        break;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!reported) throw new Error('Android did not report a complete parity result');
  if (reported.status !== 'pass') throw new Error(`Android parity failed: ${reported.error}\n${reported.stack}`);
  if (JSON.stringify(reported.data) !== JSON.stringify(expected)) {
    const differing = Object.keys(expected.results).filter((id) => JSON.stringify(expected.results[id])
      !== JSON.stringify(reported.data.results[id]));
    throw new Error(`Node/Android JSON differs: ${differing.map((id) =>
      `${id}: Node=${JSON.stringify(expected.results[id])}, Android=${JSON.stringify(reported.data.results[id])}`)
      .join('; ')}`);
  }
  const sha256 = createHash('sha256').update(JSON.stringify(expected)).digest('hex');
  process.stdout.write(JSON.stringify({ status: 'pass', cases: Object.keys(expected.results).length,
    fixtureCounts: expected.counts, sha256, engine: reported.engine }) + '\n');
} finally {
  if (installedHere) {
    run(['uninstall', packageName]);
    if (installed()) throw new Error('Probe package remained installed after cleanup');
  }
}
