import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { authRouteGroup } from '../../src/auth/usage-limits.js';
import { authFixture } from './helpers.js';

let f: Awaited<ReturnType<typeof authFixture>>;
let routes: Array<{ method: string; path: string }>;
beforeAll(async () => {
  // Full production surface: Google and the Expo plugin enabled, as in the consumer trials.
  f = await authFixture({ google: { clientId: 'client', clientSecret: 'secret' }, nativeOrigins: ['zephyriov-auth-probe://'] });
  routes = Object.values(f.auth.api as Record<string, { path?: string; options?: { method?: string | string[] } }>)
    .filter((endpoint) => typeof endpoint?.path === 'string')
    .map((endpoint) => ({
      method: [endpoint.options?.method ?? ''].flat().join('|'),
      path: endpoint.path!,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
});
afterAll(async () => f.close());

const concrete = (path: string) => path.replace(':token', 'sample-token').replace(':id', 'google');

async function inventory() {
  const markdown = await readFile(new URL('../../contracts/auth-routes.md', import.meta.url), 'utf8');
  return [...markdown.matchAll(/^\| `(GET|POST|GET\\\|POST)` \| `\/api\/auth(\/[^`]+)` \| `([a-z]+)` \|/gm)]
    .map(([, method, path, group]) => ({ method: method!.replaceAll('\\', ''), path: path!, group: group! }));
}

test('the contract inventories exactly the Auth routes exported by the installed Better Auth', async () => {
  const documented = await inventory();
  expect(routes.length).toBeGreaterThan(25);
  expect(documented.map(({ method, path }) => ({ method, path })).sort((a, b) => a.path.localeCompare(b.path))).toEqual(routes);
});

test('every exported Auth route has an explicit limit group that matches the contract', async () => {
  const documented = new Map((await inventory()).map((route) => [route.path, route.group]));
  for (const { path } of routes) {
    const group = authRouteGroup(concrete(path));
    expect(group, path).toBeDefined();
    expect(documented.get(path), path).toBe(group);
  }
  expect(authRouteGroup('/verify-password')).toBe('password');
  expect(authRouteGroup('/change-email')).toBe('mail');
  expect(authRouteGroup('/not-a-route')).toBeUndefined();
});
