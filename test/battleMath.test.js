import test from 'node:test';
import assert from 'node:assert/strict';

import { computeLootFromSurvivors, simulateBattle } from '../src/domain/battleMath.js';

test('simulateBattle removes lowest level troops first and keeps simultaneous damage', () => {
  const attackerTroops = [{ level: 1, count: 10 }];
  const defenderTroops = [{ level: 1, count: 6 }];

  const result = simulateBattle(attackerTroops, defenderTroops);

  assert.equal(result.attackerKills, 3);
  assert.equal(result.defenderKills, 6);
  assert.equal(result.attackersRemaining, 7);
  assert.equal(result.defendersRemaining, 0);
  assert.deepEqual(result.attackerLossesByLevel, { 1: 3, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });
});

test('computeLootFromSurvivors sums loot by surviving attacker levels', () => {
  const loot = computeLootFromSurvivors({ 1: 5, 2: 7, 3: 6, 4: 0, 5: 0, 6: 0 });

  assert.deepEqual(loot, {
    gold: 1339,
    wood: 645,
    stone: 645,
    meat: 43,
  });
});
