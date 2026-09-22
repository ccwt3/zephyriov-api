import type { Client } from '@libsql/client';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { drizzle } from 'drizzle-orm/libsql';
import { betterAuth } from 'better-auth';
import * as authSchema from '../persistence/auth-schema.js';
import { authHTTPPolicy, secureAuthHandler, type AuthHTTPOptions } from './http-security.js';

export const INITIAL_PROFILE = Object.freeze({
  settingsVersion: '1',
  timezone: 'UTC',
  newLinesPerDay: 6,
  movesPerBlock: 4,
  accountRevision: '1',
});

const profileInitializations = new WeakMap<Client, Map<string, Promise<void>>>();

/** Ensure the product rows for one Better Auth user exist without replacing established state. */
export function ensureAccountProfile(client: Client, userId: string): Promise<void> {
  if (userId.length === 0) throw new TypeError('userId must not be empty');
  let byUser = profileInitializations.get(client);
  if (!byUser) {
    byUser = new Map();
    profileInitializations.set(client, byUser);
  }
  const pending = byUser.get(userId);
  if (pending) return pending;

  const initialization = initializeAccountProfile(client, userId).finally(() => {
    byUser?.delete(userId);
  });
  byUser.set(userId, initialization);
  return initialization;
}

async function initializeAccountProfile(client: Client, userId: string): Promise<void> {
  const transaction = await client.transaction('write');
  try {
    await transaction.execute({
      sql: `insert into profiles
        (user_id, settings_version, timezone, new_lines_per_day, moves_per_block)
        values (?, ?, ?, ?, ?) on conflict(user_id) do nothing`,
      args: [userId, INITIAL_PROFILE.settingsVersion, INITIAL_PROFILE.timezone,
        INITIAL_PROFILE.newLinesPerDay, INITIAL_PROFILE.movesPerBlock],
    });
    await transaction.execute({
      sql: `insert into settings_revisions
        (user_id, version, timezone, new_lines_per_day, moves_per_block)
        values (?, ?, ?, ?, ?) on conflict(user_id, version) do nothing`,
      args: [userId, INITIAL_PROFILE.settingsVersion, INITIAL_PROFILE.timezone,
        INITIAL_PROFILE.newLinesPerDay, INITIAL_PROFILE.movesPerBlock],
    });
    await transaction.execute({
      sql: 'insert into account_revisions (user_id, revision) values (?, ?) on conflict(user_id) do nothing',
      args: [userId, INITIAL_PROFILE.accountRevision],
    });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/** Sensitive delivery data: capture only in tests; never write URLs or tokens to logs. */
export interface AuthEmail {
  user: { id: string; email: string; name: string };
  url: string;
  token: string;
}

export interface AuthOptions extends AuthHTTPOptions {
  secret: string;
  sendVerificationEmail: (message: AuthEmail) => Promise<void>;
  sendResetPassword: (message: AuthEmail) => Promise<void>;
}

export function createZephyriovAuth(client: Client, options: AuthOptions) {
  const policy = authHTTPPolicy(options);
  const db = drizzle({ client, schema: authSchema });
  const auth = betterAuth({
    appName: 'Zephyriov',
    baseURL: options.baseURL,
    secret: options.secret,
    trustedOrigins: [...policy.origins],
    advanced: {
      useSecureCookies: options.baseURL.startsWith('https://'),
      crossSubDomainCookies: { enabled: false },
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', path: '/' },
      disableOriginCheck: false,
      disableCSRFCheck: false,
    },
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: authSchema,
      transaction: true,
    }),
    emailAndPassword: {
      enabled: true,
      // Auth sessions can manage verification; business access has a separate gate.
      requireEmailVerification: false,
      resetPasswordTokenExpiresIn: 3600,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: options.sendResetPassword,
    },
    emailVerification: {
      sendOnSignUp: true,
      expiresIn: 3600,
      autoSignInAfterVerification: false,
      sendVerificationEmail: options.sendVerificationEmail,
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => ensureAccountProfile(client, user.id),
        },
      },
    },
  });
  auth.handler = secureAuthHandler(auth.handler, policy);
  return auth;
}
