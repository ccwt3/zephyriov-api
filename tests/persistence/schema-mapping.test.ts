import { expect, test } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import { migrateLocal } from '../../src/persistence/migrate.js';
import { openings, lines, lineRevisions, catalogManifests, manifestLines, catalogHead } from '../../src/persistence/catalog-schema.js';
import { userOpenings, cards } from '../../src/persistence/cards-schema.js';
import { studySessions, studyItems } from '../../src/persistence/study-schema.js';
import { studyEvents, moveAttempts, studyEventDependencies, studySessionMappings, studyItemMappings, eventDecisions } from '../../src/persistence/events-schema.js';
import { offlinePackages, activityDays, rateLimitBuckets, realtimeTickets } from '../../src/persistence/operational-schema.js';

test('Drizzle mappings read the versioned catalog and card schema', async () => {
  const client = createClient({ url: ':memory:' });
  try {
    await migrateLocal(client);
    const db = drizzle({ client, schema: { openings, lines, lineRevisions, catalogManifests, manifestLines, catalogHead, userOpenings, cards,
      studySessions, studyItems, studyEvents, moveAttempts, studyEventDependencies, studySessionMappings, studyItemMappings, eventDecisions,
      offlinePackages, activityDays, rateLimitBuckets, realtimeTickets } });
    await client.execute("insert into openings (id, slug, name, eco, playable_white, playable_black) values ('o1', 'one', 'One', 'A00', 1, 0)");
    expect((await db.select().from(openings).where(eq(openings.id, 'o1')))[0]).toMatchObject({ slug: 'one', playableWhite: true });
    expect(await db.select().from(cards)).toEqual([]);
    expect(await db.select().from(studySessions)).toEqual([]);
    expect(await db.select().from(studyItems)).toEqual([]);
    expect(await db.select().from(studyEvents)).toEqual([]);
    expect(await db.select().from(moveAttempts)).toEqual([]);
    expect(await db.select().from(eventDecisions)).toEqual([]);
    expect(await db.select().from(offlinePackages)).toEqual([]);
    expect(await db.select().from(activityDays)).toEqual([]);
    expect(await db.select().from(rateLimitBuckets)).toEqual([]);
    expect(await db.select().from(realtimeTickets)).toEqual([]);
  } finally {
    client.close();
  }
});
