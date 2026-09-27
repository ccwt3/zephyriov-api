// Loopback fixture only. Never deploy the synthetic inbox with the product API.
import { createServer } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createClient } from '@libsql/client';
import { toNodeHandler } from 'better-auth/node';
import { createZephyriovAuth } from '../../dist/auth/auth.js';
import { migrateLocal } from '../../dist/persistence/migrate.js';

const baseURL = 'http://localhost:3402';
const googleMode = process.argv.includes('--google');
let google;
if (googleMode) {
  process.loadEnvFile();
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId?.trim() || !clientSecret?.trim()) throw new Error('Set Google credentials in the backend .env');
  google = { clientId, clientSecret };
}
const observed = new Map();
const directory = await mkdtemp(join(tmpdir(), 'zephyriov-auth-expo-'));
const client = createClient({ url: `file:${join(directory, 'probe.db')}` });
const mail = new Map();
let server;
try {
  await migrateLocal(client);
  const auth = createZephyriovAuth(client, {
    baseURL, webOrigins: [], nativeOrigins: ['zephyriov-auth-probe://'],
    allowedReturnURLs: ['zephyriov-auth-probe://verified', ...(googleMode ? [`${baseURL}/probe/google`] : [])],
    google,
    secret: randomBytes(32).toString('hex'),
    sendVerificationEmail: async (message) => { mail.set(message.user.id, message.url); },
    sendResetPassword: async () => { throw new Error('Reset is outside this fixture'); },
  });
  const handler = toNodeHandler(auth);
  server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (request.headers.host !== 'localhost:3402') { response.writeHead(403).end(); return; }
    try {
      const url = new URL(request.url, baseURL);
      if (googleMode && url.pathname.startsWith('/probe/google') && request.method === 'GET') {
        if (url.pathname !== '/probe/google' &&
          ((request.headers.origin && request.headers.origin !== baseURL) ||
          request.headers['sec-fetch-site'] === 'cross-site')) { response.writeHead(403).end(); return; }
        if (url.pathname === '/probe/google' || url.pathname === '/probe/google.js') {
          const script = url.pathname.endsWith('.js');
          response.setHeader('Content-Type', script ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8');
          response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
          response.end(await readFile(new URL(script ? '../auth-web/google.js' : '../auth-web/google.html', import.meta.url)));
        } else if (url.pathname === '/probe/google-proof') {
          const session = await auth.api.getSession({ headers: new Headers({ cookie: request.headers.cookie ?? '' }) });
          const consumer = url.searchParams.get('consumer');
          const linked = session && await client.execute({ sql: "select count(*) as n from account where user_id = ? and provider_id = 'google'", args: [session.user.id] });
          const verified = !!(session?.user.emailVerified && linked.rows[0].n === 1);
          if (verified && ['web', 'android'].includes(consumer)) observed.set(consumer, session.user.id);
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ verified, profile: verified ? createHash('sha256').update(session.user.id).digest('hex').slice(0, 12) : null }));
        } else if (url.pathname === '/probe/google-evidence') {
          const profiles = await client.execute('select count(*) as n from profiles');
          const accounts = await client.execute("select count(*) as n from account where provider_id = 'google'");
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ web: observed.has('web'), android: observed.has('android'),
            sameIdentity: observed.has('web') && observed.get('web') === observed.get('android'),
            profiles: profiles.rows[0].n, googleAccounts: accounts.rows[0].n }));
        } else response.writeHead(404).end();
      } else if (request.url === '/probe/wait' && request.method === 'GET') {
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
        response.end('<!doctype html><title>Auth cancellation probe</title><p>Use Back to cancel this test.</p>');
      } else if (request.url === '/probe/verification-link' && request.method === 'GET') {
        if (request.headers.origin || request.headers['expo-origin'] !== 'zephyriov-auth-probe://' ||
          Object.keys(request.headers).some((key) => key.startsWith('sec-fetch-'))) {
          response.writeHead(403).end(); return;
        }
        const session = await auth.api.getSession({ headers: new Headers({ cookie: request.headers.cookie ?? '' }) });
        const url = session && mail.get(session.user.id);
        if (!url) { response.writeHead(401).end(); return; }
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ url }));
      } else await handler(request, response);
    } catch { response.writeHead(500).end('Probe failed'); }
  });
  server.listen(3402, '127.0.0.1');
  await once(server, 'listening');
  console.log(googleMode ? `Google Auth probe: ${baseURL}/probe/google; developer login required` : `Expo Auth fixture: ${baseURL}; synthetic accounts only`);
  await new Promise((resolve) => {
    process.once('SIGINT', resolve);
    process.once('SIGTERM', resolve);
  });
} finally {
  if (server?.listening) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  client.close();
  await rm(directory, { recursive: true, force: true });
}
