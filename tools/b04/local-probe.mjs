import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';

// Synthetic tables only. The product and generated Better Auth schema belong to B04.03.
const writes = sqliteTable('probe_writes', {
  id: text('id').primaryKey(),
  value: integer('value').notNull(),
});

const users = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export async function openLocalProbe() {
  const client = createClient({ url: ':memory:' });
  try {
    await client.execute('create table probe_writes (id text primary key, value integer not null)');
    await client.execute(`create table user (
      id text primary key,
      name text not null,
      email text not null unique,
      email_verified integer not null,
      created_at integer not null,
      updated_at integer not null
    )`);

    const db = drizzle({ client, schema: { writes, users } });
    const authAdapter = drizzleAdapter(db, {
      provider: 'sqlite',
      schema: { user: users },
      transaction: true,
    })({});
    return { client, db, writes, users, authAdapter, close: () => client.close() };
  } catch (error) {
    client.close();
    throw error;
  }
}
