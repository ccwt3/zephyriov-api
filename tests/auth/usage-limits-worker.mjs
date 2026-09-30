// Local process-restart acceptance. No provider, credentials or product database.
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import { createUsageLimits } from '../../src/auth/usage-limits.ts';

const [url, phase] = process.argv.slice(2);
assert.ok(url?.startsWith('file:'));
assert.ok(['first', 'restarted'].includes(phase));
Date.now = () => Date.parse('2026-09-28T12:00:01Z');
const client = createClient({ url });
const limits = createUsageLimits(client, 'restart-test-secret', {
  businessRead: { limit: 2, windowMs: 60_000 },
  emailGlobal: { limit: 1, windowMs: 86_400_000 },
});
const message = {
  user: { id: 'restart-user', name: 'Restart', email: 'restart@example.invalid' },
  url: 'https://api.invalid/verify', token: 'test-only',
};
try {
  await limits.consumeBusiness('restart-user', 'read');
  if (phase === 'first') {
    await limits.sendEmail('verification', message, async () => {});
  } else {
    await assert.rejects(limits.consumeBusiness('restart-user', 'read'), { statusCode: 429 });
    await assert.rejects(limits.sendEmail('reset', message, async () => {
      assert.fail('Exhausted mail budget must not reach the transport');
    }), { statusCode: 429 });
  }
} finally { client.close(); }
