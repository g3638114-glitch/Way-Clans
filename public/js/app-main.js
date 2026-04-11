// Import all modules
import { appState, initializeUserId } from './utils/state.js';
import { apiClient } from './api/client.js';
import { updateUI } from './ui/dom.js';
import { showPage } from './ui/pages.js';
import { renderBuildings } from './ui/builders.js';
import { setupEventListeners } from './events.js';

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

    appState.currentUser = await apiClient.getUser(appState.userId);
    updateUI(appState.currentUser);
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

// Load buildings data
async function loadBuildings() {
  try {
    console.log('Loading buildings for userId:', appState.userId);
    appState.allBuildings = await apiClient.getBuildings(appState.userId);

    // Initialize decimal trackers for all buildings
    appState.allBuildings.forEach(building => {
      if (!building._collected_decimal) {
        building._collected_decimal = building.collected_amount || 0;
      }
    });

    console.log('Buildings loaded:', appState.allBuildings.length, 'buildings');
  } catch (error) {
    console.error('Error loading buildings:', error);
  }
}

// Initialize app
async function initializeApp() {
  // Initialize user ID
  initializeUserId();
  
  // Load initial data
  await loadUserData();
  
  // Setup all event listeners
  setupEventListeners();
  
  // Show main page
  showPage('main');
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

// Export for global access if needed
window.appState = appState;
window.loadBuildings = loadBuildings;
