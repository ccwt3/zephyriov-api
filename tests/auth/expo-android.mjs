// Opt-in acceptance on the dedicated synthetic APK, with tools/auth-expo/run.mjs running.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const adb = process.env.ADB;
const apk = process.env.AUTH_PROBE_APK;
assert(adb && apk && existsSync(apk), 'Set ADB and AUTH_PROBE_APK to the built test APK');
const app = 'dev.zephyriov.authprobe';
const run = (...args) => execFileSync(adb, args, { encoding: 'utf8', timeout: 20000 });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function screen() {
  run('shell', 'uiautomator', 'dump', '/data/local/tmp/zephyriov-auth-probe.xml');
  return run('shell', 'cat', '/data/local/tmp/zephyriov-auth-probe.xml');
}
async function waitFor(text) {
  let lastScreen = '';
  for (let i = 0; i < 20; i++) {
    const xml = screen();
    lastScreen = xml;
    if (xml.includes(text)) return xml;
    await pause(500);
  }
  // Only fixed status labels from our probe; never print browser URLs or tokens.
  console.error([...lastScreen.matchAll(/text="((?:Session:|Browser:|Secure cookie:)[^"]*)"/g)].map((match) => match[1]));
  console.error('Visible packages:', [...new Set([...lastScreen.matchAll(/package="([^"]+)"/g)].map((match) => match[1]))]);
  throw new Error(`Android did not show: ${text}`);
}
async function tap(text) {
  const xml = await waitFor(text);
  const node = [...xml.matchAll(/<node\b[^>]*>/g)].map(([value]) => value)
    .find((value) => value.includes(`text="${text}"`) || value.includes(`content-desc="${text}"`));
  assert(node, `Missing button: ${text}`);
  const bounds = node.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  assert(bounds);
  const [x1, y1, x2, y2] = bounds.slice(1).map(Number);
  run('shell', 'input', 'tap', String(Math.round((x1 + x2) / 2)), String(Math.round((y1 + y2) / 2)));
}
function start() { run('shell', 'am', 'start', '-n', `${app}/.MainActivity`); }
function link(url) { run('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url, app); }

assert(!run('shell', 'pm', 'list', 'packages', app).includes(`package:${app}`), 'Refuse to replace an existing probe installation');
run('reverse', 'tcp:3402', 'tcp:3402');
try {
  assert(run('install', apk).includes('Success'));
  start();
  await waitFor('Session: none');
  await tap('Register');
  await waitFor('Session: pending');
  await waitFor('Secure cookie: yes');
  run('shell', 'am', 'force-stop', app);
  start();
  await waitFor('Session: pending');
  await waitFor('Secure cookie: yes');
  console.log('PASS real Auth and SecureStore survive process restart');
  await tap('Cancel browser test');
  await pause(1500);
  run('shell', 'input', 'keyevent', '4');
  await waitFor('Browser: cancelled');
  await waitFor('Session: pending');
  console.log('PASS system browser cancellation preserves pending session');
  await tap('Verify in browser');
  await waitFor('Session: verified');
  await waitFor('Browser: accepted');
  console.log('PASS browser verification, exact deep link and real verified session');
  link('zephyriov-auth-probe://foreign');
  await waitFor('Browser: rejected return');
  run('shell', 'am', 'force-stop', app);
  start();
  await waitFor('Session: verified');
  await waitFor('Browser: idle');
  link('zephyriov-auth-probe://verified');
  await waitFor('Browser: rejected return');
  await waitFor('Session: verified');
  console.log('PASS foreign and duplicate deep links cannot replace the session');
  await tap('Sign out');
  await waitFor('Session: none');
  await waitFor('Secure cookie: no');
  run('shell', 'am', 'force-stop', app);
  start();
  await waitFor('Session: none');
  console.log('PASS sign-out clears secure session across restart');
} finally {
  run('uninstall', app);
  run('reverse', '--remove', 'tcp:3402');
  run('shell', 'rm', '-f', '/data/local/tmp/zephyriov-auth-probe.xml');
  assert(!run('shell', 'pm', 'list', 'packages', app).includes(`package:${app}`));
}
