// Local-only B05.05 consumer. Never mount this inbox on the product server.
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createClient } from '@libsql/client';
import { toNodeHandler } from 'better-auth/node';
import { createZephyriovAuth } from '../../dist/auth/auth.js';
import { migrateLocal } from '../../dist/persistence/migrate.js';

const apiOrigin = 'http://localhost:3400';
const webOrigin = 'http://localhost:3401';
const directory = await mkdtemp(join(tmpdir(), 'zephyriov-auth-web-'));
const client = createClient({ url: `file:${join(directory, 'probe.db')}` });
const servers = [];
const mail = [];
async function close() {
  for (const server of servers) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  client.close();
  await rm(directory, { recursive: true, force: true });
}
try {
  await migrateLocal(client);
  const capture = (kind) => async (message) => {
    mail.unshift({ kind, email: message.user.email, url: message.url });
  };
  const auth = createZephyriovAuth(client, {
    baseURL: apiOrigin,
    webOrigins: [webOrigin],
    allowedReturnURLs: [`${webOrigin}/`],
    secret: randomBytes(32).toString('hex'),
    sendVerificationEmail: capture('verify'),
    sendResetPassword: capture('reset'),
  });
  const authHandler = toNodeHandler(auth);
  const page = await readFile(new URL('./index.html', import.meta.url));
  const script = await readFile(new URL('./probe.js', import.meta.url));
  const guard = (host, handler) => async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (request.headers.host !== host || (request.headers.origin && ![apiOrigin, webOrigin].includes(request.headers.origin))) {
      response.writeHead(403).end();
      return;
    }
    try { await handler(request, response); } catch {
      response.writeHead(500).end('Local probe failed');
    }
  };
  const api = createServer(guard('localhost:3400', authHandler));
  const web = createServer(guard('localhost:3401', (request, response) => {
    if (request.method !== 'GET') { response.writeHead(405).end(); return; }
    const path = new URL(request.url, webOrigin).pathname;
    if (path === '/__mail') {
      if (request.headers['sec-fetch-site'] !== 'same-origin') { response.writeHead(403).end(); return; }
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(mail));
    } else if (path === '/') {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'self'; connect-src 'self' ${apiOrigin}; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`);
      response.end(page);
    } else if (path === '/probe.js') {
      response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      response.end(script);
    } else response.writeHead(404).end();
  }));
  servers.push(api, web);
  api.listen(3400, '127.0.0.1');
  await once(api, 'listening');
  web.listen(3401, '127.0.0.1');
  await once(web, 'listening');
  console.log(`Local Auth probe: ${webOrigin} (API ${apiOrigin}); synthetic accounts only`);
  await new Promise((resolve) => {
    process.once('SIGINT', resolve);
    process.once('SIGTERM', resolve);
  });
} finally {
  await close();
}
