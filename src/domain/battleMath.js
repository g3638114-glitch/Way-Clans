import { TROOP_STATS } from '../config/troops.js';

export const LOOT_PER_LEVEL = {
  1: { gold: 31, wood: 15, stone: 15, meat: 1 },
  2: { gold: 62, wood: 30, stone: 30, meat: 2 },
  3: { gold: 125, wood: 60, stone: 60, meat: 4 },
  4: { gold: 400, wood: 150, stone: 150, meat: 10 },
  5: { gold: 800, wood: 300, stone: 300, meat: 20 },
  6: { gold: 2000, wood: 500, stone: 500, meat: 30 },
};

export function buildLevelCountMap(troops) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  for (const troop of troops) {
    counts[troop.level] += Number(troop.count);
  }

  return counts;
}

export function applyLossesByLowestLevel(levelCounts, totalKills) {
  const losses = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  let remainingKills = totalKills;

  for (let level = 1; level <= 6; level++) {
    if (remainingKills <= 0) break;
    const killed = Math.min(levelCounts[level], remainingKills);
    levelCounts[level] -= killed;
    losses[level] = killed;
    remainingKills -= killed;
  }

  return losses;
}

export function sumLevelCounts(levelCounts) {
  return Object.values(levelCounts).reduce((sum, count) => sum + Number(count), 0);
}

export function calculateArmyDamage(troops, troopType) {
  return troops.reduce((sum, troop) => sum + TROOP_STATS[troopType][troop.level].damage * Number(troop.count), 0);
}

export function computeLootFromSurvivors(levelCounts) {
  const loot = { gold: 0, wood: 0, stone: 0, meat: 0 };

  for (let level = 1; level <= 6; level++) {
    const count = Number(levelCounts[level] || 0);
    if (!count) continue;
    const perUnit = LOOT_PER_LEVEL[level];
    loot.gold += perUnit.gold * count;
    loot.wood += perUnit.wood * count;
    loot.stone += perUnit.stone * count;
    loot.meat += perUnit.meat * count;
  }

  return loot;
}

export function simulateBattle(attackerTroops, defenderTroops) {
  const attackerCount = attackerTroops.reduce((sum, troop) => sum + Number(troop.count), 0);
  const defenderCount = defenderTroops.reduce((sum, troop) => sum + Number(troop.count), 0);
  const totalAttackerDamage = calculateArmyDamage(attackerTroops, 'attacker');
  const totalDefenderDamage = calculateArmyDamage(defenderTroops, 'defender');

  const attackerKills = defenderCount > 0
    ? Math.min(attackerCount, Math.floor(totalDefenderDamage / TROOP_STATS.attacker[1].health))
    : 0;
  const defenderKills = attackerCount > 0
    ? Math.min(defenderCount, Math.floor(totalAttackerDamage / TROOP_STATS.defender[1].health))
    : defenderCount;

  const attackersByLevel = buildLevelCountMap(attackerTroops);
  const defendersByLevel = buildLevelCountMap(defenderTroops);
  const attackerLossesByLevel = applyLossesByLowestLevel(attackersByLevel, attackerKills);
  const defenderLossesByLevel = applyLossesByLowestLevel(defendersByLevel, defenderKills);

  return {
    attackerCount,
    defenderCount,
    attackerKills,
    defenderKills,
    attackersByLevel,
    defendersByLevel,
    attackerLossesByLevel,
    defenderLossesByLevel,
    attackersRemaining: sumLevelCounts(attackersByLevel),
    defendersRemaining: sumLevelCounts(defendersByLevel),
  };
}
