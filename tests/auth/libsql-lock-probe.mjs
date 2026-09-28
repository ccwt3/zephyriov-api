// B05.10/M18: standalone reproduction, no Auth, network, credentials or product database.
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = await mkdtemp(join(tmpdir(), 'zephyriov-b05-lock-'));
const client = createClient({ url: `file:${join(directory, 'probe.db')}` });
try {
  await client.execute('create table probe (id text unique)');
  const first = await client.transaction('write');
  await first.execute("insert into probe values ('quota1') returning *");
  await assert.rejects(client.transaction('write'), { code: 'SQLITE_BUSY' });
  await first.commit();
  const second = await client.transaction('write');
  await second.execute("insert into probe values ('quota2') returning *");
  await second.commit();
  const race = await Promise.allSettled([
    client.execute("insert into probe values ('identity') returning *"),
    client.execute("insert into probe values ('identity') returning *"),
  ]);
  assert.equal(race.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(race.find((result) => result.status === 'rejected').reason.code, 'SQLITE_CONSTRAINT');
  await client.execute('select count(*) from probe');
  const afterConflict = await client.transaction('write');
  try {
    await afterConflict.execute("insert into probe values ('quota3') returning *");
    await afterConflict.commit();
    console.log('PASS: transaction commits after contention and UNIQUE conflict');
  } finally { afterConflict.close(); }
} catch (error) {
  console.error(`FAIL: transaction after contention/UNIQUE: ${error.code ?? error.name}`);
  process.exitCode = 1;
} finally {
  client.close();
  await rm(directory, { recursive: true, force: true });
}
