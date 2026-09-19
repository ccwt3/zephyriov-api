import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync,
  writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const sourceDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(sourceDir, '../..');
const sdk = process.env.ANDROID_SDK_ROOT ?? process.env.ANDROID_HOME;
if (!sdk) throw new Error('Set ANDROID_SDK_ROOT to an installed Android SDK');
const platform = join(sdk, 'platforms', 'android-34', 'android.jar');
const buildTools = join(sdk, 'build-tools', '36.0.0');
if (!existsSync(platform) || !existsSync(join(buildTools, 'aapt'))) {
  throw new Error('Android platform 34 and build-tools 36.0.0 are required');
}

function run(command, args, options = {}) {
  try {
    return execFileSync(command, args, { cwd: root, encoding: 'utf8', ...options }).trim();
  } catch (error) {
    process.stderr.write(error.stderr?.toString() ?? '');
    throw error;
  }
}

const work = mkdtempSync(join(tmpdir(), 'zephyriov-b03-10-'));
const archive = run('pnpm', ['pack', '--pack-destination', work]).split('\n').at(-1);
if (!archive) throw new Error('pnpm pack did not return an archive');
run('tar', ['-xzf', join(work, basename(archive)), '-C', work]);
const packed = join(work, 'package');
const domain = join(packed, 'dist', 'domain');
if (!existsSync(join(domain, 'verify-attempts.js'))) {
  throw new Error('The built domain was not included in the local package');
}
symlinkSync(join(root, 'node_modules'), join(packed, 'node_modules'));

const assets = join(work, 'assets');
await build({ configFile: false, root,
  resolve: { alias: { 'zephyriov-domain': domain } },
  build: { outDir: assets, emptyOutDir: true, target: 'es2020', minify: false,
    lib: { entry: join(sourceDir, 'entry.mjs'), name: 'ZephyriovDomainProbe',
      formats: ['iife'], fileName: () => 'bundle.js' } },
  logLevel: 'warn' });
writeFileSync(join(assets, 'index.html'),
  '<!doctype html><html><meta charset="utf-8"><body>Zephyriov B03.10 probe<script src="bundle.js"></script></body></html>\n');

const unsigned = join(work, 'unsigned.apk');
const aligned = join(work, 'aligned.apk');
const apk = join(work, 'probe.apk');
run(join(buildTools, 'aapt'), ['package', '-f', '-M', join(sourceDir, 'AndroidManifest.xml'),
  '-I', platform, '-F', unsigned, '-A', assets]);
const classes = join(work, 'classes');
mkdirSync(classes);
run('javac', ['--release', '8', '-cp', platform, '-d', classes,
  join(sourceDir, 'ProbeActivity.java')]);
const javaPackage = join(classes, 'dev', 'zephyriov', 'domainprobe');
const classFiles = readdirSync(javaPackage).filter((name) => name.endsWith('.class'))
  .map((name) => join(javaPackage, name));
const dex = join(work, 'dex');
mkdirSync(dex);
run(join(buildTools, 'd8'), ['--min-api', '23', '--lib', platform,
  '--output', dex, ...classFiles]);
run('zip', ['-q', '-j', unsigned, join(dex, 'classes.dex')]);
run(join(buildTools, 'zipalign'), ['-f', '4', unsigned, aligned]);
const key = join(work, 'probe.keystore');
run('keytool', ['-genkeypair', '-alias', 'probe', '-keyalg', 'RSA', '-keysize', '2048',
  '-validity', '1', '-keystore', key, '-storepass', 'probe-only',
  '-keypass', 'probe-only', '-dname', 'CN=Zephyriov Domain Probe', '-noprompt']);
run(join(buildTools, 'apksigner'), ['sign', '--ks', key,
  '--ks-pass', 'pass:probe-only', '--key-pass', 'pass:probe-only', '--out', apk, aligned]);
run(join(buildTools, 'apksigner'), ['verify', '--verbose', apk]);

const bundleHash = createHash('sha256').update(readFileSync(join(assets, 'bundle.js')))
  .digest('hex');
process.stdout.write(JSON.stringify({ apk, archive: join(work, basename(archive)),
  bundleSha256: bundleHash }) + '\n');
