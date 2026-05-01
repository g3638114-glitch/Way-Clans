export function getAttackableResources(resources) {
  return {
    gold: Math.floor(Number(resources.gold || 0) / 2),
    wood: Math.floor(Number(resources.wood || 0) / 2),
    stone: Math.floor(Number(resources.stone || 0) / 2),
    meat: Math.floor(Number(resources.meat || 0) / 2),
  };
}
