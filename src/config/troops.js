/**
 * Server-side troop configuration
 */

export const TROOP_STATS = {
  defender: {
    1: { damage: 100, health: 200 },
    2: { damage: 200, health: 400, cost: { gold: 10000, meat: 100 } },
    3: { damage: 400, health: 800, cost: { gold: 100000, meat: 200 } },
    4: { damage: 1200, health: 1600, cost: { gold: 500000, meat: 500 } },
    5: { damage: 2400, health: 3200, cost: { gold: 1000000, meat: 1000 } },
    6: { damage: 5000, health: 10000, cost: { jabcoins: 10, meat: 10000 } },
  },
  attacker: {
    1: { damage: 200, health: 200, loot: { gold: 31, wood: 15, stone: 15, meat: 1 } },
    2: { damage: 400, health: 400, cost: { gold: 20000, meat: 200 }, loot: { gold: 62, wood: 30, stone: 30, meat: 2 } },
    3: { damage: 1600, health: 1600, cost: { gold: 200000, meat: 400 }, loot: { gold: 125, wood: 60, stone: 60, meat: 4 } },
    4: { damage: 3200, health: 3200, cost: { gold: 1000000, meat: 1000 }, loot: { gold: 400, wood: 150, stone: 150, meat: 10 } },
    5: { damage: 6400, health: 6400, cost: { jabcoins: 1, meat: 5000 }, loot: { gold: 800, wood: 300, stone: 300, meat: 20 } },
    6: { damage: 20000, health: 20000, cost: { jabcoins: 10, gold: 5000000, meat: 10000 }, loot: { gold: 2000, wood: 500, stone: 500, meat: 30 } },
  }
};

export const HIRE_COSTS = {
  attacker: { gold: 250, wood: 65, stone: 65, meat: 10 },
  defender: { gold: 1000, wood: 500, stone: 500, meat: 100 }
};