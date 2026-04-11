import { appState } from './utils/state.js';
import { showPage } from './ui/pages.js';
import {
  openStorageModal,
  closeStorageModal,
  setMaxWood,
  setMaxStone,
  setMaxMeat,
  sellResources,
  openExchangeModal,
  closeExchangeModal,
  updateExchangeResult,
  exchangeGold,
  closeUpgradeModal,
  confirmUpgrade,
  openQuestsModal,
  closeQuestsModal,
  setupModalHandlers,
} from './ui/modals.js';
import { renderBuildings } from './ui/builders.js';

// Register all event listeners
export function setupEventListeners() {
  // Storage modal buttons
  document.getElementById('storage-btn').addEventListener('click', openStorageModal);

  // Exchange modal buttons
  document.getElementById('exchange-btn').addEventListener('click', openExchangeModal);
  document.getElementById('gold-input').addEventListener('input', updateExchangeResult);

  // Quests modal buttons
  document.getElementById('quests-btn').addEventListener('click', openQuestsModal);

  // Attack button (not implemented yet)
  document.getElementById('attack-btn').addEventListener('click', () => {
    tg.showAlert('🔧 Функция "Атаковать" скоро будет доступна!');
  });

  // Navigation buttons
  document.getElementById('nav-main').addEventListener('click', () => showPage('main'));
  document.getElementById('nav-mining').addEventListener('click', () => showPage('mining'));

  document.getElementById('nav-barracks').addEventListener('click', () => {
    tg.showAlert('🔧 Раздел "Казарма" скоро будет доступна!');
  });

  // Building type tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      appState.selectedBuildingType = e.target.dataset.type;
      renderBuildings();
    });
  });

  // Setup modal background click handlers
  setupModalHandlers();

  // Make functions available globally for onclick handlers
  window.openStorageModal = openStorageModal;
  window.closeStorageModal = closeStorageModal;
  window.setMaxWood = setMaxWood;
  window.setMaxStone = setMaxStone;
  window.setMaxMeat = setMaxMeat;
  window.sellResources = sellResources;

  window.openExchangeModal = openExchangeModal;
  window.closeExchangeModal = closeExchangeModal;
  window.exchangeGold = exchangeGold;

  window.closeUpgradeModal = closeUpgradeModal;
  window.confirmUpgrade = confirmUpgrade;

  window.closeQuestsModal = closeQuestsModal;
}
