// Global application state
export const appState = {
  // User data
  currentUser: null,
  userId: null,
  userInfo: null, // Telegram user info (username, first_name, etc.)
  startParam: null,

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

  // Operation lock to prevent multiple simultaneous clicks
  operationsInProgress: new Set(),
};

/**
 * Check if an operation is currently in progress
 */
export function isOperationInProgress(operationKey) {
  return appState.operationsInProgress.has(operationKey);
}

/**
 * Mark an operation as in progress
 */
export function startOperation(operationKey) {
  appState.operationsInProgress.add(operationKey);
}

/**
 * Mark an operation as complete
 */
export function endOperation(operationKey) {
  appState.operationsInProgress.delete(operationKey);
}

/**
 * Wrapper to prevent multiple simultaneous executions
 */
export async function withOperationLock(operationKey, asyncFn) {
  if (isOperationInProgress(operationKey)) {
    console.warn(`⚠️ Operation "${operationKey}" is already in progress`);
    return;
  }

  startOperation(operationKey);
  try {
    return await asyncFn();
  } finally {
    endOperation(operationKey);
  }
}

// Initialize user ID from URL or Telegram WebApp
export async function initializeUserId() {
  // First try to get from URL parameters (direct link with userId)
  const params = new URLSearchParams(window.location.search);
  const urlUserId = params.get('userId');
  const urlStartParam = params.get('startapp') || params.get('tgWebAppStartParam');

  if (urlStartParam) {
    appState.startParam = urlStartParam;
  }

  if (urlUserId) {
    console.log(`📌 Got userId from URL: ${urlUserId}`);
    appState.userId = urlUserId;
    return urlUserId;
  }

  // If no userId in URL, try to get from Telegram WebApp
  try {
    // Check if running inside Telegram Web App
    if (!window.Telegram || !window.Telegram.WebApp) {
      console.warn('⚠️ Not running inside Telegram Web App');
      return null;
    }

    const tg = window.Telegram.WebApp;

    if (tg.initDataUnsafe?.start_param) {
      appState.startParam = tg.initDataUnsafe.start_param;
    }

    // Try method 1: initDataUnsafe (available immediately, not verified)
    if (tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) {
      console.log(`📌 Got userId from initDataUnsafe: ${tg.initDataUnsafe.user.id}`);
      appState.userId = tg.initDataUnsafe.user.id;
      // Save user info for later use (username, first_name, etc.)
      appState.userInfo = tg.initDataUnsafe.user;
      return tg.initDataUnsafe.user.id;
    }

    // Try method 2: Verify initData on server (more secure)
    if (tg.initData) {
      console.log('🔐 Verifying initData on server...');
      try {
        const response = await fetch('/api/user/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Server verified userId: ${data.userId}`);
          appState.userId = data.userId;
          // Save user info from initDataUnsafe if available
          if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            appState.userInfo = tg.initDataUnsafe.user;
          }
          return data.userId;
        } else {
          console.warn('⚠️ Server could not verify initData:', await response.json());
        }
      } catch (fetchError) {
        console.warn('⚠️ Failed to verify initData on server:', fetchError.message);
      }
    }

    console.warn('⚠️ Could not get userId from Telegram WebApp');
    return null;
  } catch (error) {
    console.warn('⚠️ Error initializing userId:', error.message);
    return null;
  }
}
