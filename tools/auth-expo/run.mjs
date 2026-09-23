// Loopback fixture only. Never deploy the synthetic inbox with the product API.
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createClient } from '@libsql/client';
import { toNodeHandler } from 'better-auth/node';
import { createZephyriovAuth } from '../../dist/auth/auth.js';
import { migrateLocal } from '../../dist/persistence/migrate.js';

const baseURL = 'http://localhost:3402';
const directory = await mkdtemp(join(tmpdir(), 'zephyriov-auth-expo-'));
const client = createClient({ url: `file:${join(directory, 'probe.db')}` });
const mail = new Map();
let server;
try {
  await migrateLocal(client);
  const auth = createZephyriovAuth(client, {
    baseURL, webOrigins: [], nativeOrigins: ['zephyriov-auth-probe://'],
    allowedReturnURLs: ['zephyriov-auth-probe://verified'],
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
      if (request.url === '/probe/wait' && request.method === 'GET') {
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
  console.log(`Expo Auth fixture: ${baseURL}; synthetic accounts only`);
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
