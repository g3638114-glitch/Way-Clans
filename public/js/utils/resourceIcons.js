export const RESOURCE_META = {
  gold: { key: 'gold', name: 'Jamcoin', iconPath: '/resources/Jamcoin.png' },
  jamcoin: { key: 'gold', name: 'Jamcoin', iconPath: '/resources/Jamcoin.png' },
  wood: { key: 'wood', name: 'Дерево', iconPath: '/resources/Tree.png' },
  stone: { key: 'stone', name: 'Камень', iconPath: '/resources/Stone.png' },
  meat: { key: 'meat', name: 'Мясо', iconPath: '/resources/Meat.png' },
  jabcoin: { key: 'jabcoins', name: 'Jabcoin', iconPath: '/resources/Jabcoin.png' },
  jabcoins: { key: 'jabcoins', name: 'Jabcoin', iconPath: '/resources/Jabcoin.png' },
};

export function getResourceMeta(resourceType) {
  return RESOURCE_META[resourceType] || RESOURCE_META.gold;
}

export function getResourceIconPath(resourceType) {
  return getResourceMeta(resourceType).iconPath;
}

export function getResourceLabel(resourceType) {
  return getResourceMeta(resourceType).name;
}

export function getResourceIconHtml(resourceType, className = 'resource-inline-icon', alt = '') {
  const meta = getResourceMeta(resourceType);
  const src = meta.iconPath;
  const safeAlt = alt || meta.name;
  return `<img class="${className}" src="${src}" alt="${safeAlt}">`;
}
