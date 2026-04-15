// Import all modules
import { appState, initializeUserId } from './utils/state.js';
import { apiClient } from './api/client.js';
import { updateUI } from './ui/dom.js';
import { showPage } from './ui/pages.js';
import { renderBuildings } from './ui/builders.js';
import { setupEventListeners } from './events.js';
import * as market from './game/market.js';
import { WARRIOR_TYPES } from './game/warriors.js';

// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.ready();

// Make tg available globally for other modules
window.tg = tg;

// Load user data
async function loadUserData() {
  try {
    if (!appState.userId) {
      console.error('No userId provided');
      return;
    }

    appState.currentUser = await apiClient.getUser(appState.userId, appState.userInfo);
    updateUI(appState.currentUser);

    // If user doesn't have a profile photo, try to fetch it from Telegram
    if (!appState.currentUser.photo_url) {
      console.log('📸 User has no photo, fetching from Telegram...');
      try {
        const response = await fetch(`/api/user/${appState.userId}/fetch-photo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user && data.user.photo_url) {
            appState.currentUser = data.user;
            updateUI(appState.currentUser);
            console.log('✅ Profile photo fetched and updated');
          }
        }
      } catch (error) {
        console.warn('⚠️ Error fetching profile photo:', error);
        // Continue anyway, the app will work fine without the photo
      }
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

// Load buildings data
async function loadBuildings() {
  try {
    console.log('Loading buildings for userId:', appState.userId);
    const response = await apiClient.getBuildings(appState.userId);

    // Handle response format from backend
    appState.allBuildings = response.buildings || response;

    console.log('Buildings loaded:', appState.allBuildings.length, 'buildings');
  } catch (error) {
    console.error('Error loading buildings:', error);
  }
}

// Initialize app
async function initializeApp() {
  try {
    // Initialize user ID (now async - may verify on server)
    const userId = await initializeUserId();

    if (!userId) {
      console.error('❌ Failed to get userId - user cannot be identified');
      // Show error message to user
      const pagesContainer = document.querySelector('.pages-container');
      if (pagesContainer) {
        pagesContainer.innerHTML = `
          <div style="padding: 20px; color: #ff6b6b; text-align: center;">
            <h2>⚠️ Ошибка загрузки</h2>
            <p>Не удалось загрузить данные игрока.</p>
            <p>Пожалуйста, откройте приложение через кнопку бота в Telegram.</p>
          </div>
        `;
      }
      return;
    }

    console.log(`✅ User ID initialized: ${userId}`);

    // Load initial data
    await loadUserData();

    // Load buildings data
    await loadBuildings();

    // Setup all event listeners
    setupEventListeners();

    // Show main page
    showPage('main');
  } catch (error) {
    console.error('❌ Fatal error during app initialization:', error);
  }
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

// Export for global access if needed
window.appState = appState;
window.loadBuildings = loadBuildings;
