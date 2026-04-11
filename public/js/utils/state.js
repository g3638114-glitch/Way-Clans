// Global application state
export const appState = {
  // User data
  currentUser: null,
  userId: null,

  // Game data
  allBuildings: [],
  selectedBuildingType: 'mine',
  currentPage: 'main',

  // Modal data
  upgradeModalData: {
    buildingId: null,
    currentLevel: null,
  },

  // Production refresh interval
  productionRefreshInterval: null,
};

// Initialize user ID from URL or Telegram WebApp
export function initializeUserId() {
  // First try to get from URL parameters
  const params = new URLSearchParams(window.location.search);
  const urlUserId = params.get('userId');

  if (urlUserId) {
    appState.userId = urlUserId;
    return urlUserId;
  }

  // If no userId in URL, try to get from Telegram WebApp
  try {
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) {
      appState.userId = tg.initDataUnsafe.user.id;
      return tg.initDataUnsafe.user.id;
    }
  } catch (error) {
    console.warn('Could not get userId from Telegram WebApp:', error);
  }

  return null;
}
