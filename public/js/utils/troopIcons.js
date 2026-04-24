function normalizeTroopType(type) {
  return type === 'defender' ? 'defender' : 'attacker';
}

function normalizeTroopLevel(level) {
  const numericLevel = Number(level || 1);
  return Math.max(1, Math.min(6, numericLevel));
}

export function getTroopIconPath(type, level) {
  const troopType = normalizeTroopType(type);
  const troopLevel = normalizeTroopLevel(level);
  return `/resources/troops/${troopType}/${troopLevel}.png`;
}

export function getTroopIconHtml(type, level, className = 'troop-inline-icon', alt = 'Воин') {
  return `<span class="${className}"><img class="${className}-img" src="${getTroopIconPath(type, level)}" alt="${alt}"></span>`;
}
