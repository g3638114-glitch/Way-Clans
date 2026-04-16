import { appState } from './utils/state.js';
import { showPage } from './ui/pages.js';
import { updateUI } from './ui/dom.js';
import { apiClient } from './api/client.js';
import {
  openStorageModal, closeStorageModal, setMaxWood, setMaxStone, setMaxMeat, sellResources,
  openExchangeModal, closeExchangeModal, updateExchangeResult, exchangeGold,
  closeUpgradeModal, confirmUpgrade, openQuestsModal, closeQuestsModal,
  openTreasuryModal, closeTreasuryModal, upgradeTreasuryToLevel,
  openWarehouseModal, closeWarehouseModal, openWarehouseSellModal, closeWarehouseSellModal,
  setMaxWarehouseWood, setMaxWarehouseStone, setMaxWarehouseMeat, sellWarehouseResources,
  upgradeWarehouseToLevel, setupModalHandlers,
} from './ui/modals/index.js';
import { renderBuildings } from './ui/builders.js';
import * as market from './game/market.js';
import { renderBarracks } from './game/barracks.js';
import { openAttackMenu, closeAttackModal } from './game/attack.js';

export function setupEventListeners() {
  document.getElementById('storage-btn').addEventListener('click', openWarehouseModal);
  document.getElementById('exchange-btn').addEventListener('click', openExchangeModal);
  document.getElementById('gold-input').addEventListener('input', updateExchangeResult);
  document.getElementById('treasury-btn').addEventListener('click', openTreasuryModal);
  document.getElementById('market-btn').addEventListener('click', () => showPage('market'));
  document.getElementById('quests-btn').addEventListener('click', openQuestsModal);
  
  // Attack button
  document.getElementById('attack-btn').addEventListener('click', openAttackMenu);

  document.getElementById('coin-btn').addEventListener('click', async () => {
    const coinBtn = document.getElementById('coin-btn');
    try {
      coinBtn.classList.add('coin-click');
      const result = await apiClient.clickCoin(appState.userId);
      if (result.user) { appState.currentUser = result.user; updateUI(appState.currentUser); }
    } catch (error) {
      if (error.message.includes('Treasury is full')) { tg.showAlert('🏦 Казна переполнена!'); }
      else { tg.showAlert('❌ Ошибка'); }
    } finally {
      setTimeout(() => coinBtn.classList.remove('coin-click'), 500);
    }
  });

  document.getElementById('nav-main').addEventListener('click', () => showPage('main'));
  document.getElementById('nav-mining').addEventListener('click', () => showPage('mining'));
  document.getElementById('nav-coin-mining').addEventListener('click', () => showPage('coin-mining'));
  document.getElementById('nav-barracks').addEventListener('click', () => showPage('barracks'));
  document.getElementById('nav-market-back').addEventListener('click', () => showPage('main'));

  document.querySelectorAll('.market-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.market-tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      market.loadMarketListings(e.target.dataset.resource);
    });
  });

  // Barracks tabs
  document.querySelectorAll('.barracks-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.barracks-tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      appState.selectedBarracksTab = e.target.dataset.type;
      renderBarracks();
    });
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      appState.selectedBuildingType = e.target.dataset.type;
      renderBuildings();
    });
  });

  setupModalHandlers();

  window.closeAttackModal = closeAttackModal;
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
  window.market = market;
}