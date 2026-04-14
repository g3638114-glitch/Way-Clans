import { appState } from './utils/state.js';
import { showPage } from './ui/pages.js';
import { updateUI } from './ui/dom.js';
import { apiClient } from './api/client.js';
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
  openTreasuryModal,
  closeTreasuryModal,
  upgradeTreasuryToLevel,
  openWarehouseModal,
  closeWarehouseModal,
  openWarehouseSellModal,
  closeWarehouseSellModal,
  upgradeWarehouseToLevel,
  openMarketModal,
  closeMarketModal,
  openSellPriceModal,
  closeSellPriceModal,
  incrementSellQuantity,
  decrementSellQuantity,
  setSellMaxQuantity,
  confirmSellPrice,
  filterMarketByResource,
  cancelMarketListing,
  openMarketBuyModal,
  closeMarketBuyModal,
  incrementBuyQuantity,
  decrementBuyQuantity,
  setMaxBuyQuantity,
  confirmBuyFromMarket,
  updateWarehouseSellDisplay,
  openMarketEditModal,
  closeMarketEditModal,
  incrementEditQuantity,
  decrementEditQuantity,
  setMaxEditQuantity,
  confirmEditMarketListing,
  setupModalHandlers,
} from './ui/modals/index.js';
import { renderBuildings } from './ui/builders.js';

// Register all event listeners
export function setupEventListeners() {
  // Warehouse modal buttons
  document.getElementById('storage-btn').addEventListener('click', openWarehouseModal);

  // Exchange modal buttons
  document.getElementById('exchange-btn').addEventListener('click', openExchangeModal);
  document.getElementById('gold-input').addEventListener('input', updateExchangeResult);

  // Treasury modal buttons
  document.getElementById('treasury-btn').addEventListener('click', openTreasuryModal);

  // Market button - navigate to market page
  document.getElementById('market-btn').addEventListener('click', () => showPage('market'));

  // Quests modal buttons
  document.getElementById('quests-btn').addEventListener('click', openQuestsModal);

  // Attack button (not implemented yet)
  document.getElementById('attack-btn').addEventListener('click', () => {
    tg.showAlert('🔧 Функция "Атаковать" скоро будет доступна!');
  });

  // Coin button click handler
  document.getElementById('coin-btn').addEventListener('click', async () => {
    const coinBtn = document.getElementById('coin-btn');

    try {
      // Add animation
      coinBtn.classList.add('coin-click');

      // Send request to add gold
      const result = await apiClient.clickCoin(appState.userId);

      // Update UI with new user data
      if (result.user) {
        appState.currentUser = result.user;
        updateUI(appState.currentUser);
      }
    } catch (error) {
      console.error('Error clicking coin:', error);

      // Handle treasury full error separately - show as notification, not error
      if (error.message.includes('Treasury is full')) {
        tg.showAlert('🏦 Казна переполнена! Обменяйте Jamcoin на Jabcoins или потратьте его, чтобы продолжить сбор.');
      } else {
        tg.showAlert('❌ Ошибка при добавлении Jamcoin');
      }
    } finally {
      // Remove animation class after animation completes
      setTimeout(() => {
        coinBtn.classList.remove('coin-click');
      }, 500);
    }
  });

  // Navigation buttons
  document.getElementById('nav-main').addEventListener('click', () => showPage('main'));
  document.getElementById('nav-mining').addEventListener('click', () => showPage('mining'));
  document.getElementById('nav-coin-mining').addEventListener('click', () => showPage('coin-mining'));
  document.getElementById('nav-market').addEventListener('click', () => showPage('market'));

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

  window.openTreasuryModal = openTreasuryModal;
  window.closeTreasuryModal = closeTreasuryModal;
  window.upgradeTreasuryToLevel = upgradeTreasuryToLevel;

  window.openWarehouseModal = openWarehouseModal;
  window.closeWarehouseModal = closeWarehouseModal;
  window.openWarehouseSellModal = openWarehouseSellModal;
  window.closeWarehouseSellModal = closeWarehouseSellModal;
  window.upgradeWarehouseToLevel = upgradeWarehouseToLevel;

  window.openMarketModal = openMarketModal;
  window.closeMarketModal = closeMarketModal;
  window.openSellPriceModal = openSellPriceModal;
  window.closeSellPriceModal = closeSellPriceModal;
  window.incrementSellQuantity = incrementSellQuantity;
  window.decrementSellQuantity = decrementSellQuantity;
  window.setSellMaxQuantity = setSellMaxQuantity;
  window.confirmSellPrice = confirmSellPrice;
  window.filterMarketByResource = filterMarketByResource;
  window.cancelMarketListing = cancelMarketListing;
  window.openMarketBuyModal = openMarketBuyModal;
  window.closeMarketBuyModal = closeMarketBuyModal;
  window.incrementBuyQuantity = incrementBuyQuantity;
  window.decrementBuyQuantity = decrementBuyQuantity;
  window.setMaxBuyQuantity = setMaxBuyQuantity;
  window.confirmBuyFromMarket = confirmBuyFromMarket;
  window.updateWarehouseSellDisplay = updateWarehouseSellDisplay;

  window.openMarketEditModal = openMarketEditModal;
  window.closeMarketEditModal = closeMarketEditModal;
  window.incrementEditQuantity = incrementEditQuantity;
  window.decrementEditQuantity = decrementEditQuantity;
  window.setMaxEditQuantity = setMaxEditQuantity;
  window.confirmEditMarketListing = confirmEditMarketListing;
}
