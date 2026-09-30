import { createClient } from '@libsql/client';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from 'vitest';

const exec = promisify(execFile);

test.each(['esm', 'cjs'])('local driver recovers after contention and UNIQUE (%s)', async (mode) => {
  // The standalone assertions and exit code are the contract; Vitest can capture
  // child console output separately on Node 24.
  await exec(process.execPath, ['tests/auth/libsql-lock-probe.mjs', mode]);
});

test('local client preserves memory, rollback, values, errors and connection lifecycle', async () => {
  const client = createClient({ url: ':memory:', intMode: 'bigint' });
  try {
    await expect(client.sync()).rejects.toMatchObject({ code: 'LOCAL_SQLITE_UNSUPPORTED' });
    await client.execute('create table probe (id integer primary key, value blob)');
    const tx = await client.transaction('write');
    try {
      await tx.execute({ sql: 'insert into probe values (?, ?)', args: [1, new Uint8Array([0, 255])] });
      await tx.rollback();
    } finally { tx.close(); }
    expect((await client.execute('select * from probe')).rows).toEqual([]);
    await client.execute({ sql: 'insert into probe values (?, ?)', args: [9007199254740993n, new Uint8Array([0, 255])] });
    await expect(client.execute('insert into probe (id) values (9007199254740993)')).rejects.toMatchObject({
      code: 'SQLITE_CONSTRAINT', extendedCode: 'SQLITE_CONSTRAINT_PRIMARYKEY',
    });
    const read = await client.transaction('read');
    try {
      const row = (await read.execute('select * from probe')).rows[0]!;
      expect(row.id).toBe(9007199254740993n);
      expect(new Uint8Array(row.value as ArrayBuffer)).toEqual(new Uint8Array([0, 255]));
      await read.commit();
    } finally { read.close(); }
    client.close();
    await expect(client.execute('select 1')).rejects.toMatchObject({ code: 'CLIENT_CLOSED' });
    await client.reconnect();
    expect((await client.execute('select count(*) n from sqlite_master')).rows[0]?.n).toBe(0n);
  } finally { client.close(); }
});

test('local SQLite rejects libSQL-only options instead of silently ignoring them', async () => {
  expect(() => createClient({ url: 'file::memory:?cache=shared' })).toThrow(/LOCAL_SQLITE_UNSUPPORTED/);
  const directory = await mkdtemp(join(tmpdir(), 'zephyriov-driver-options-'));
  try {
    for (const extra of [{ encryptionKey: 'not-a-secret' }, { syncUrl: 'https://replica.invalid' },
      { remoteEncryptionKey: 'not-a-secret' }, { offline: true }]) {
      expect(() => createClient({ url: `file:${join(directory, 'unused.db')}`, ...extra })).toThrow(/LOCAL_SQLITE_UNSUPPORTED/);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
