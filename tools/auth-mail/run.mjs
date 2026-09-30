// B05.11 loopback trial with real Resend delivery. Never deploy /probe/* with the product API.
// Usage: node tools/auth-mail/run.mjs <trial-dir> [limits-json]
// The directory keeps the SQLite file and HMAC secret, so a restart keeps every counter.
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { once } from 'node:events';
import { createClient } from '@libsql/client';
import { toNodeHandler } from 'better-auth/node';
import { createZephyriovAuth } from '../../dist/auth/auth.js';
import { createResendTransport, resendConfigFromEnv } from '../../dist/auth/resend.js';
import { migrateLocal } from '../../dist/persistence/migrate.js';

const baseURL = 'http://localhost:3403';
const returnURL = `${baseURL}/probe/mail`;
const [directoryArg, limitsArg] = process.argv.slice(2);
if (!directoryArg) throw new Error('Usage: node tools/auth-mail/run.mjs <trial-dir> [limits-json]');
const directory = resolve(directoryArg);
process.loadEnvFile();
// Non-secret sender documented in M07 when the local .env omits it.
process.env.AUTH_EMAIL_FROM ??= 'Zephyriov <no-reply@mail.zephyriov.reicot.dev>';
const transport = createResendTransport({ ...resendConfigFromEnv(process.env), linkOrigin: baseURL });

await mkdir(directory, { recursive: true, mode: 0o700 });
const secretFile = join(directory, 'secret');
const secret = await readFile(secretFile, 'utf8').catch(async () => {
  const value = randomBytes(32).toString('hex');
  await writeFile(secretFile, value, { mode: 0o600, flag: 'wx' });
  return value;
});
const client = createClient({ url: `file:${join(directory, 'trial.db')}` });
const resetProofs = [];
let server;
try {
  await migrateLocal(client);
  const auth = createZephyriovAuth(client, {
    baseURL, webOrigins: [], allowedReturnURLs: [returnURL], secret,
    limits: limitsArg ? JSON.parse(limitsArg) : undefined,
    ...transport,
  });
  const handler = toNodeHandler(auth);
  const page = await readFile(new URL('./index.html', import.meta.url));
  const script = await readFile(new URL('./probe.js', import.meta.url));
  server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (request.headers.host !== 'localhost:3403' || (request.headers.origin && request.headers.origin !== baseURL)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const url = new URL(request.url, baseURL);
      if (!url.pathname.startsWith('/probe/')) { await handler(request, response); return; }
      if (request.method === 'GET' && (url.pathname === '/probe/mail' || url.pathname === '/probe/mail.js')) {
        const isScript = url.pathname.endsWith('.js');
        response.setHeader('Content-Type', isScript ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8');
        response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
        response.end(isScript ? script : page);
      } else if (request.method === 'POST' && url.pathname === '/probe/mail-proof' && request.headers.origin === baseURL) {
        let body = '';
        for await (const chunk of request) body += chunk;
        const { reset, reuseStatus } = JSON.parse(body);
        resetProofs.push({ reset: reset === true, reuseStatus: Number(reuseStatus) });
        response.writeHead(204).end();
      } else if (request.method === 'GET' && url.pathname === '/probe/mail-evidence' &&
        request.headers['sec-fetch-site'] === undefined) {
        // Loopback script only (no browser fetch metadata). Aggregates; never tokens or URLs.
        const email = url.searchParams.get('email') ?? '';
        const user = await client.execute({ sql: 'select email_verified from user where email = ?', args: [email.toLowerCase()] });
        const counters = await client.execute('select scope, sum(used) as used from rate_limit_buckets group by scope order by scope');
        const pendingResets = await client.execute("select count(*) as n from verification where identifier like 'reset-password:%'");
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({
          exists: user.rows.length === 1, verified: user.rows[0]?.email_verified === 1,
          counters: Object.fromEntries(counters.rows.map((row) => [row.scope, Number(row.used)])),
          pendingResets: Number(pendingResets.rows[0].n), resetProofs,
        }));
      } else response.writeHead(404).end();
    } catch { if (!response.headersSent) response.writeHead(500).end('Trial failed'); }
  });
  server.listen(3403, '127.0.0.1');
  await once(server, 'listening');
  console.log(`Resend Auth trial: ${baseURL} (state in ${directory}); real mail to developer mailboxes only`);
  await new Promise((resolveSignal) => {
    process.once('SIGINT', resolveSignal);
    process.once('SIGTERM', resolveSignal);
  });
} finally {
  if (server?.listening) {
    server.closeAllConnections();
    await new Promise((resolveClose) => server.close(resolveClose));
  }
  client.close();
}
