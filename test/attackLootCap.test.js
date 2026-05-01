import test from 'node:test';
import assert from 'node:assert/strict';

import { getAttackableResources } from '../src/domain/attackResources.js';

test('getAttackableResources returns only half of each resource', () => {
  assert.deepEqual(
    getAttackableResources({ gold: 100000, wood: 100000, stone: 50000, meat: 20000 }),
    { gold: 50000, wood: 50000, stone: 25000, meat: 10000 }
  );
});

test('getAttackableResources floors odd values', () => {
  assert.deepEqual(
    getAttackableResources({ gold: 1, wood: 3, stone: 5, meat: 7 }),
    { gold: 0, wood: 1, stone: 2, meat: 3 }
  );
});
