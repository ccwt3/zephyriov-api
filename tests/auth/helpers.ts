import { createClient } from '@libsql/client';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateLocal } from '../../src/persistence/migrate.js';
import { createZephyriovAuth, type AuthEmail, type AuthOptions } from '../../src/auth/auth.js';

export const baseURL = 'http://localhost:3000';
export const credentials = {
  name: 'Local test', email: 'local@example.invalid', password: 'local-test-password-123',
};

export async function authFixture(options: {
  baseURL?: string; webOrigins?: string[]; allowedReturnURLs?: string[]; nativeOrigins?: string[];
  google?: AuthOptions['google'];
  onSessionInvalidated?: AuthOptions['onSessionInvalidated'];
  limits?: AuthOptions['limits'];
  sendVerificationEmail?: AuthOptions['sendVerificationEmail'];
  sendResetPassword?: AuthOptions['sendResetPassword'];
} = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'zephyriov-auth-flow-'));
  const client = createClient({ url: `file:${join(directory, 'test.db')}` });
  await migrateLocal(client);
  const verificationEmails: AuthEmail[] = [];
  const resetEmails: AuthEmail[] = [];
  const auth = createZephyriovAuth(client, {
    baseURL,
    webOrigins: [],
    allowedReturnURLs: [`${baseURL}/`, `${baseURL}/reset`],
    secret: 'test-secret-that-is-at-least-thirty-two-characters',
    sendVerificationEmail: async (message) => { verificationEmails.push(message); },
    sendResetPassword: async (message) => { resetEmails.push(message); },
    ...options,
  });

  return {
    client, auth, verificationEmails, resetEmails, databaseURL: `file:${join(directory, 'test.db')}`,
    async post(path: string, body: unknown, cookie?: string) {
      return auth.handler(new Request(`${options.baseURL ?? baseURL}/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: options.baseURL ?? baseURL, ...(cookie ? { cookie } : {}) },
        body: JSON.stringify(body),
      }));
    },
    async close() {
      client.close();
      await rm(directory, { recursive: true, force: true });
    },
  };
}

export function sessionHeaders(response: Response) {
  const cookies = response.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ');
  return new Headers({ cookie: cookies });
}
