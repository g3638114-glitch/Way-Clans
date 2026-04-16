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
  // Main page buttons
  const storageBtn = document.getElementById('storage-btn');
  if (storageBtn) storageBtn.addEventListener('click', openWarehouseModal);
  
  const exchangeBtn = document.getElementById('exchange-btn');
  if (exchangeBtn) exchangeBtn.addEventListener('click', openExchangeModal);
  
  const goldInput = document.getElementById('gold-input');
  if (goldInput) goldInput.addEventListener('input', updateExchangeResult);
  
  const treasuryBtn = document.getElementById('treasury-btn');
  if (treasuryBtn) treasuryBtn.addEventListener('click', openTreasuryModal);
  
  const marketBtn = document.getElementById('market-btn');
  if (marketBtn) marketBtn.addEventListener('click', () => showPage('market'));
  
  const questsBtn = document.getElementById('quests-btn');
  if (questsBtn) questsBtn.addEventListener('click', openQuestsModal);
  
  const attackBtn = document.getElementById('attack-btn');
  if (attackBtn) attackBtn.addEventListener('click', openAttackMenu);

  // Coin button
  const coinBtn = document.getElementById('coin-btn');
  if (coinBtn) {
    coinBtn.addEventListener('click', async () => {
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
  }

  // Navigation
  const navMain = document.getElementById('nav-main');
  if (navMain) navMain.addEventListener('click', () => showPage('main'));
  
  const navMining = document.getElementById('nav-mining');
  if (navMining) navMining.addEventListener('click', () => showPage('mining'));
  
  const navCoinMining = document.getElementById('nav-coin-mining');
  if (navCoinMining) navCoinMining.addEventListener('click', () => showPage('coin-mining'));
  
  const navBarracks = document.getElementById('nav-barracks');
  if (navBarracks) navBarracks.addEventListener('click', () => showPage('barracks'));
  
  const navMarketBack = document.getElementById('nav-market-back');
  if (navMarketBack) navMarketBack.addEventListener('click', () => showPage('main'));

  // Market tabs
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

  // Mining tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      appState.selectedBuildingType = e.target.dataset.type;
      renderBuildings();
    });
  });

  setupModalHandlers();

  // Global window functions
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