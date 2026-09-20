import { randomUUID } from 'node:crypto';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';

// All remote objects are synthetic and uniquely named for one B04.02 run.
export async function openRemoteProbe({ url, authToken }) {
  if (!url || !authToken || !url.startsWith('libsql://')) {
    throw new Error('B04.02 requires a remote libsql URL and DB token');
  }

  const prefix = `b04_probe_${randomUUID().replaceAll('-', '')}`;
  const names = {
    writes: `${prefix}_writes`,
    users: `${prefix}_user`,
    revisions: `${prefix}_revision`,
  };
  const writes = sqliteTable(names.writes, {
    id: text('id').primaryKey(),
    value: integer('value').notNull(),
  });
  const users = sqliteTable(names.users, {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: integer('email_verified', { mode: 'boolean' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  });

  const writerA = createClient({ url, authToken });
  const writerB = createClient({ url, authToken });
  const cleanup = async () => {
    try {
      const errors = [];
      for (const name of Object.values(names).reverse()) {
        try {
          await writerA.execute(`drop table if exists ${name}`);
        } catch (error) {
          errors.push(error);
        }
      }
      const remaining = await writerB.execute({
        sql: "select name from sqlite_master where type = 'table' and name in (?, ?, ?)",
        args: Object.values(names),
      });
      if (remaining.rows.length > 0) errors.push(new Error('B04.02 synthetic tables remain after cleanup'));
      if (errors.length > 0) throw new AggregateError(errors, 'B04.02 synthetic cleanup failed');
    } finally {
      writerA.close();
      writerB.close();
    }
  };

  try {
    await writerA.execute(`create table ${names.writes} (id text primary key, value integer not null)`);
    await writerA.execute(`create table ${names.users} (
      id text primary key,
      name text not null,
      email text not null unique,
      email_verified integer not null,
      created_at integer not null,
      updated_at integer not null
    )`);
    await writerA.execute(`create table ${names.revisions} (id integer primary key, revision integer not null)`);
    await writerA.execute(`insert into ${names.revisions} (id, revision) values (1, 0)`);

    const db = drizzle({ client: writerA, schema: { writes, users } });
    const authAdapter = drizzleAdapter(db, {
      provider: 'sqlite',
      schema: { user: users },
      transaction: true,
    })({});
    return { writerA, writerB, db, writes, users, authAdapter, names, cleanup };
  } catch (error) {
    try {
      await cleanup();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'remote probe setup and cleanup both failed');
    }
    throw error;
  }
}
