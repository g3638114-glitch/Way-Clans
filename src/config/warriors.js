/**
 * Конфигурация воинов для Казармы
 */

export const WARRIOR_TYPES = {
  ATTACKER: 'attacker',
  DEFENDER: 'defender'
};

export const HIRE_COSTS = {
  [WARRIOR_TYPES.ATTACKER]: {
    gold: 250,
    wood: 65,
    stone: 65,
    meat: 10
  },
  [WARRIOR_TYPES.DEFENDER]: {
    gold: 1000,
    wood: 500,
    stone: 500,
    meat: 100
  }
};

export const ATTACKER_STATS = {
  1: { damage: 200, health: 200, prod: { gold: 31, wood: 15, stone: 15, meat: 1 } },
  2: { damage: 400, health: 400, prod: { gold: 62, wood: 30, stone: 30, meat: 2 }, upgrade: { gold: 20000, meat: 200 } },
  3: { damage: 1600, health: 1600, prod: { gold: 125, wood: 60, stone: 60, meat: 4 }, upgrade: { gold: 200000, meat: 400 } },
  4: { damage: 3200, health: 3200, prod: { gold: 400, wood: 150, stone: 150, meat: 10 }, upgrade: { gold: 1000000, meat: 1000 } },
  5: { damage: 6400, health: 6400, prod: { gold: 800, wood: 300, stone: 300, meat: 20 }, upgrade: { jabcoins: 1, meat: 5000 } },
  6: { damage: 20000, health: 20000, prod: { gold: 2000, wood: 500, stone: 500, meat: 30 }, upgrade: { jabcoins: 10, gold: 5000000, meat: 10000 } }
};

export const DEFENDER_STATS = {
  1: { damage: 100, health: 200 },
  2: { damage: 200, health: 400, upgrade: { gold: 10000, meat: 100 } },
  3: { damage: 400, health: 800, upgrade: { gold: 100000, meat: 200 } },
  4: { damage: 1200, health: 1600, upgrade: { gold: 500000, meat: 500 } },
  5: { damage: 2400, health: 3200, upgrade: { gold: 1000000, meat: 1000 } },
  6: { damage: 5000, health: 10000, upgrade: { jabcoins: 10, meat: 10000 } }
};

export function getWarriorStats(type, level) {
  return type === WARRIOR_TYPES.ATTACKER ? ATTACKER_STATS[level] : DEFENDER_STATS[level];
}

export function getMaxLevel(type) {
  return type === WARRIOR_TYPES.ATTACKER ? Object.keys(ATTACKER_STATS).length : Object.keys(DEFENDER_STATS).length;
}