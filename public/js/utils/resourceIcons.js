const RESOURCE_ICON_PATHS = {
  gold: '/resources/Jamcoin.png',
  jamcoin: '/resources/Jamcoin.png',
  wood: '/resources/Tree.png',
  stone: '/resources/Stone.png',
  meat: '/resources/Meat.png',
  jabcoin: '/resources/Jabcoin.png',
  jabcoins: '/resources/Jabcoin.png',
};

export function getResourceIconPath(resourceType) {
  return RESOURCE_ICON_PATHS[resourceType] || RESOURCE_ICON_PATHS.gold;
}

export function getResourceIconHtml(resourceType, className = 'resource-inline-icon', alt = '') {
  const src = getResourceIconPath(resourceType);
  const safeAlt = alt || resourceType;
  return `<img class="${className}" src="${src}" alt="${safeAlt}">`;
}
