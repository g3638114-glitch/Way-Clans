import { appState } from './utils/state.js';
import { showPage } from './ui/pages.js';
import { updateUI } from './ui/dom.js';
import { apiClient } from './api/client.js';
import {
  showWarriorCard,
  showMyWarriors,
  closeWarriorCardModal,
  performWarriorAction
} from './ui/warriors.js';
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
  setMaxWarehouseWood,
  setMaxWarehouseStone,
  setMaxWarehouseMeat,
  sellWarehouseResources,
  upgradeWarehouseToLevel,
  setupModalHandlers,
} from './ui/modals/index.js';
import { renderBuildings } from './ui/builders.js';
import * as market from './game/market.js';

// Register all event listeners
export function setupEventListeners() {
  // Warehouse modal buttons
  document.getElementById('storage-btn').addEventListener('click', openWarehouseModal);

  // Exchange modal buttons
  document.getElementById('exchange-btn').addEventListener('click', openExchangeModal);
  document.getElementById('gold-input').addEventListener('input', updateExchangeResult);

  // Treasury modal buttons
  document.getElementById('treasury-btn').addEventListener('click', openTreasuryModal);

  // Market button
  document.getElementById('market-btn').addEventListener('click', () => {
    showPage('market');
  });

  // Quests modal buttons
  document.getElementById('quests-btn').addEventListener('click', openQuestsModal);

  // Attack button (not implemented yet)
  document.getElementById('attack-btn').addEventListener('click', () => {
    tg.showAlert('🔧 Функция "Атаковать" скоро будет доступна!');
  });

  // Coin button click handler
  document.getElementById('coin-btn').addEventListener('click', async () => {
    const coinBtn = document.getElementById('coin-btn');

    await withOperationLock('clickCoin', async () => {
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
  });

  // Navigation buttons
  document.getElementById('nav-main').addEventListener('click', () => showPage('main'));
  document.getElementById('nav-mining').addEventListener('click', () => showPage('mining'));
  document.getElementById('nav-coin-mining').addEventListener('click', () => showPage('coin-mining'));
  document.getElementById('nav-market-back').addEventListener('click', () => showPage('main'));

  document.getElementById('nav-barracks').addEventListener('click', () => {
    showPage('barracks');
  });

  // Barracks warrior buttons
  document.getElementById('btn-attacker').addEventListener('click', () => {
    showWarriorCard('attacker');
  });

  document.getElementById('btn-defender').addEventListener('click', () => {
    showWarriorCard('defender');
  });

  document.getElementById('btn-my-warriors').addEventListener('click', () => {
    showMyWarriors();
  });

  // Market tabs
  document.querySelectorAll('.market-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.market-tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      market.loadMarketListings(e.target.dataset.resource);
    });
  });

  // Price modal input handlers
  document.getElementById('price-per-unit')?.addEventListener('input', market.updatePriceTotal);
  document.getElementById('price-quantity')?.addEventListener('input', market.updatePriceTotal);

  // Buy modal input handlers
  document.getElementById('buy-quantity')?.addEventListener('input', market.updateBuyTotal);

  // Edit listing modal input handlers
  document.getElementById('edit-price-per-unit')?.addEventListener('input', market.updateEditTotal);
  document.getElementById('edit-quantity')?.addEventListener('input', market.updateEditTotal);

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
  window.setMaxWarehouseWood = setMaxWarehouseWood;
  window.setMaxWarehouseStone = setMaxWarehouseStone;
  window.setMaxWarehouseMeat = setMaxWarehouseMeat;
  window.sellWarehouseResources = sellWarehouseResources;
  window.upgradeWarehouseToLevel = upgradeWarehouseToLevel;

  // Market functions
  window.market = market;
  window.openSetPriceModal = market.openSetPriceModal;
  window.closeSetPriceModal = market.closeSetPriceModal;
  window.setMaxPriceQuantity = market.setMaxPriceQuantity;
  window.confirmSellPrice = market.confirmSellPrice;
  window.openBuyQuantityModal = market.openBuyQuantityModal;
  window.closeBuyQuantityModal = market.closeBuyQuantityModal;
  window.setMaxBuyQuantity = market.setMaxBuyQuantity;
  window.confirmBuyQuantity = market.confirmBuyQuantity;
  window.updatePriceTotal = market.updatePriceTotal;
  window.updateBuyTotal = market.updateBuyTotal;
  window.openEditListingModal = market.openEditListingModal;
  window.closeEditListingModal = market.closeEditListingModal;
  window.setMaxEditQuantity = market.setMaxEditQuantity;
  window.confirmEditListing = market.confirmEditListing;
  window.updateEditTotal = market.updateEditTotal;

  // Warrior functions
  window.showWarriorCard = showWarriorCard;
  window.showMyWarriors = showMyWarriors;
  window.closeWarriorCardModal = closeWarriorCardModal;
  window.performWarriorAction = performWarriorAction;
}
