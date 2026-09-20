import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Client } from '@libsql/client';

const migrationNames = ['001_identity_profile.sql', '002_catalog.sql', '003_cards_repertoire.sql'] as const;
type MigrationName = typeof migrationNames[number];

/** Apply versioned migrations through the named point, each atomically. */
export async function migrateLocal(client: Client, through: MigrationName = '003_cards_repertoire.sql'): Promise<void> {
  await client.execute('pragma foreign_keys = on');
  for (const migrationName of migrationNames) {
    const source = await readFile(new URL(`../../migrations/${migrationName}`, import.meta.url), 'utf8');
    const checksum = createHash('sha256').update(source).digest('hex');
    const statements = source.split('--> statement-breakpoint').map((statement) => statement.trim()).filter(Boolean);
    await applyMigration(client, migrationName, checksum, statements);
    if (migrationName === through) break;
  }
}

async function applyMigration(client: Client, migrationName: MigrationName, checksum: string, statements: string[]) {
  const transaction = await client.transaction('write');
  try {
    await transaction.execute('create table if not exists schema_migrations (name text primary key, checksum text not null, applied_at integer not null default (cast(unixepoch(\'subsecond\') * 1000 as integer)))');
    const existing = await transaction.execute({ sql: 'select checksum from schema_migrations where name = ?', args: [migrationName] });
    if (existing.rows.length) {
      if (existing.rows[0]?.checksum !== checksum) throw new Error(`Migration ${migrationName} changed after application`);
    } else {
      for (const statement of statements) await transaction.execute(statement);
      await transaction.execute({ sql: 'insert into schema_migrations (name, checksum) values (?, ?)', args: [migrationName, checksum] });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
