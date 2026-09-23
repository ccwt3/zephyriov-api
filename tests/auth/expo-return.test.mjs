import { expect, test } from 'vitest';
import { createReturnGate } from '../../tools/auth-expo/return-gate.mjs';

test('browser return is exact, one-use and only while the app awaits it', () => {
  const target = 'zephyriov-auth-probe://verified';
  const gate = createReturnGate(target);
  expect(gate.accept(target)).toBe(false);
  gate.begin();
  for (const url of ['foreign://verified', `${target}/`, `${target}?cookie=injected`,
    `${target}#x`, 'zephyriov-auth-probe://other']) expect(gate.accept(url)).toBe(false);
  expect(gate.accept(target)).toBe(true);
  expect(gate.accept(target)).toBe(false);
  gate.begin();
  gate.cancel();
  expect(gate.accept(target)).toBe(false);
});
