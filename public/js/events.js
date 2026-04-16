import { appState, withOperationLock } from './utils/state.js';
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
  setMaxWarehouseWood,
  setMaxWarehouseStone,
  setMaxWarehouseMeat,
  sellWarehouseResources,
  upgradeWarehouseToLevel,
  setupModalHandlers,
} from './ui/modals/index.js';
import { renderBuildings } from './ui/builders.js';
import * as market from './game/market.js';
import { setBarracksTab } from './ui/modals/barracks.js';

// Register all event listeners
export function setupEventListeners() {
  // ... существующие слушатели ...
  document.getElementById('storage-btn').addEventListener('click', openWarehouseModal);
  document.getElementById('exchange-btn').addEventListener('click', openExchangeModal);
  document.getElementById('gold-input').addEventListener('input', updateExchangeResult);
  document.getElementById('treasury-btn').addEventListener('click', openTreasuryModal);
  document.getElementById('market-btn').addEventListener('click', () => showPage('market'));
  document.getElementById('quests-btn').addEventListener('click', openQuestsModal);
  document.getElementById('attack-btn').addEventListener('click', () => tg.showAlert('🔧 Функция "Атаковать" скоро будет доступна!'));

  document.getElementById('coin-btn').addEventListener('click', async () => {
    const coinBtn = document.getElementById('coin-btn');
    await withOperationLock('clickCoin', async () => {
      try {
        coinBtn.classList.add('coin-click');
        const result = await apiClient.clickCoin(appState.userId);
        if (result.user) {
          appState.currentUser = result.user;
          updateUI(appState.currentUser);
        }
      } catch (error) {
        if (error.message.includes('Treasury is full')) {
          tg.showAlert('🏦 Казна переполнена!');
        } else {
          tg.showAlert('❌ Ошибка при добавлении Jamcoin');
        }
      } finally {
        setTimeout(() => coinBtn.classList.remove('coin-click'), 500);
      }
    });
  });

  // Navigation
  document.getElementById('nav-main').addEventListener('click', () => showPage('main'));
  document.getElementById('nav-mining').addEventListener('click', () => showPage('mining'));
  document.getElementById('nav-coin-mining').addEventListener('click', () => showPage('coin-mining'));
  document.getElementById('nav-barracks').addEventListener('click', () => showPage('barracks'));
  document.getElementById('nav-market-back').addEventListener('click', () => showPage('main'));

  // Barracks Tabs
  document.querySelectorAll('[data-barracks-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('[data-barracks-tab]').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      setBarracksTab(e.target.dataset.barracksTab);
    });
  });

  // ... остальные слушатели ...
  setupModalHandlers();
}