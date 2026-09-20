import { expect, test } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import { migrateLocal } from '../../src/persistence/migrate.js';
import { openings, lines, lineRevisions, catalogManifests, manifestLines, catalogHead } from '../../src/persistence/catalog-schema.js';
import { userOpenings, cards } from '../../src/persistence/cards-schema.js';

test('Drizzle mappings read the versioned catalog and card schema', async () => {
  const client = createClient({ url: ':memory:' });
  try {
    await migrateLocal(client);
    const db = drizzle({ client, schema: { openings, lines, lineRevisions, catalogManifests, manifestLines, catalogHead, userOpenings, cards } });
    await client.execute("insert into openings (id, slug, name, eco, playable_white, playable_black) values ('o1', 'one', 'One', 'A00', 1, 0)");
    expect((await db.select().from(openings).where(eq(openings.id, 'o1')))[0]).toMatchObject({ slug: 'one', playableWhite: true });
    expect(await db.select().from(cards)).toEqual([]);
  } finally {
    client.close();
  }
});
