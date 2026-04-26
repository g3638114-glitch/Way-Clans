import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CAPACITY_PER_LEVEL as serverCapacityPerLevel,
  PRODUCTION_PER_LEVEL as serverProductionPerLevel,
  TREASURY_CAPACITY_PER_LEVEL as serverTreasuryCapacityPerLevel,
  TREASURY_UPGRADE_COSTS as serverTreasuryUpgradeCosts,
} from '../src/config/buildings.js';
import {
  CAPACITY_PER_LEVEL as clientCapacityPerLevel,
  HIRE_COSTS as clientHireCosts,
  PRODUCTION_PER_LEVEL as clientProductionPerLevel,
  TREASURY_CAPACITY_PER_LEVEL as clientTreasuryCapacityPerLevel,
  TREASURY_UPGRADE_COSTS as clientTreasuryUpgradeCosts,
} from '../public/js/game/config.js';
import { HIRE_COSTS as serverHireCosts } from '../src/config/troops.js';

test('farm and mine capacities match new limits on client and server', () => {
  assert.deepEqual(serverCapacityPerLevel.farm, [2000, 2000, 2000, 2000, 2000, 2000]);
  assert.deepEqual(serverCapacityPerLevel.mine, [120000, 120000, 120000, 120000, 120000, 120000]);
  assert.deepEqual(clientCapacityPerLevel.farm, serverCapacityPerLevel.farm);
  assert.deepEqual(clientCapacityPerLevel.mine, serverCapacityPerLevel.mine);
});

test('farm production matches requested values on client and server', () => {
  assert.deepEqual(serverProductionPerLevel.farm, [31, 62, 125, 250, 500, 1000]);
  assert.deepEqual(clientProductionPerLevel.farm, serverProductionPerLevel.farm);
});

test('treasury supports levels 7 and 8 on client and server', () => {
  assert.deepEqual(serverTreasuryCapacityPerLevel, [31250, 62500, 125000, 250000, 500000, 1000000, 5000000, 10000000]);
  assert.deepEqual(clientTreasuryCapacityPerLevel, serverTreasuryCapacityPerLevel);
  assert.deepEqual(serverTreasuryUpgradeCosts[7], [20000, 20000, 20000]);
  assert.deepEqual(serverTreasuryUpgradeCosts[8], [40000, 40000, 40000]);
  assert.deepEqual(clientTreasuryUpgradeCosts[7], serverTreasuryUpgradeCosts[7]);
  assert.deepEqual(clientTreasuryUpgradeCosts[8], serverTreasuryUpgradeCosts[8]);
});

test('defender hire cost matches on client and server', () => {
  assert.deepEqual(serverHireCosts.defender, { gold: 100, wood: 30, stone: 30, meat: 5 });
  assert.deepEqual(clientHireCosts.defender, serverHireCosts.defender);
});
