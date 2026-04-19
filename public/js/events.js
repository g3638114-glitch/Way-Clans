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

const COIN_VALUE = 100;
const MAX_SIMULTANEOUS_TOUCHES = 3;
const CLICK_FLUSH_DELAY_MS = 120;
const MINING_UI_UPDATE_DELAY_MS = 80;

let queuedCoinClicks = 0;
let pendingOptimisticCoinClicks = 0;
let coinFlushTimer = null;
let coinRequestInFlight = false;
let ignoreSyntheticClickUntil = 0;
let miningUiUpdateTimer = null;

function scheduleMiningUiUpdate() {
  if (miningUiUpdateTimer) return;

  miningUiUpdateTimer = setTimeout(() => {
    miningUiUpdateTimer = null;
    updateUI(appState.currentUser);
  }, MINING_UI_UPDATE_DELAY_MS);
}

function showFloatingCoinReward(totalAmount, touchCount = 1) {
  const wrapper = document.querySelector('.coin-wrapper');
  if (!wrapper || totalAmount <= 0) return;

  const reward = document.createElement('div');
  reward.className = 'coin-floating-reward';
  reward.textContent = `+${totalAmount}`;

  const spread = Math.min(28, 10 + ((touchCount - 1) * 8));
  const offsetX = Math.round((Math.random() * spread * 2) - spread);
  reward.style.setProperty('--float-x', `${offsetX}px`);

  wrapper.appendChild(reward);
  setTimeout(() => reward.remove(), 900);
}

function applyOptimisticCoinClicks(clickCount) {
  if (!appState.currentUser || clickCount <= 0) return;

  const amount = clickCount * COIN_VALUE;
  pendingOptimisticCoinClicks += clickCount;
  appState.currentUser = {
    ...appState.currentUser,
    gold: Number(appState.currentUser.gold || 0) + amount,
    jamcoins_from_clicks: Number(appState.currentUser.jamcoins_from_clicks || 0) + amount,
  };
  showFloatingCoinReward(amount, clickCount);
  scheduleMiningUiUpdate();
}

async function rollbackCoinClicksAndReload() {
  pendingOptimisticCoinClicks = 0;
  queuedCoinClicks = 0;

  try {
    appState.currentUser = await apiClient.getUser(appState.userId, appState.userInfo);
    updateUI(appState.currentUser);
  } catch (reloadError) {
    console.error('Error reloading user after coin click failure:', reloadError);
  }
}

async function flushCoinClicks() {
  if (coinRequestInFlight || queuedCoinClicks <= 0) {
    return;
  }

  const clickCount = queuedCoinClicks;
  queuedCoinClicks = 0;
  coinRequestInFlight = true;

  try {
    const result = await apiClient.clickCoin(appState.userId, clickCount);
    pendingOptimisticCoinClicks = Math.max(0, pendingOptimisticCoinClicks - clickCount);

    if (result.user) {
      appState.currentUser = result.user;

      if (pendingOptimisticCoinClicks > 0) {
        const optimisticAmount = pendingOptimisticCoinClicks * COIN_VALUE;
        appState.currentUser = {
          ...appState.currentUser,
          gold: Number(appState.currentUser.gold || 0) + optimisticAmount,
          jamcoins_from_clicks: Number(appState.currentUser.jamcoins_from_clicks || 0) + optimisticAmount,
        };
      }

      scheduleMiningUiUpdate();
    }
  } catch (error) {
    await rollbackCoinClicksAndReload();

    if (error.message.includes('Лимит казны')) {
      tg.showAlert(error.message);
    } else {
      tg.showAlert(error.message || '❌ Ошибка');
    }
  } finally {
    coinRequestInFlight = false;
    if (queuedCoinClicks > 0) {
      flushCoinClicks();
    }
  }
}

function queueCoinClicks(clickCount) {
  if (!appState.currentUser || clickCount <= 0) return;

  const acceptedClicks = Math.min(MAX_SIMULTANEOUS_TOUCHES, clickCount);
  queuedCoinClicks += acceptedClicks;
  applyOptimisticCoinClicks(acceptedClicks);

  const coinBtn = document.getElementById('coin-btn');
  if (coinBtn) {
    coinBtn.classList.remove('coin-click');
    void coinBtn.offsetWidth;
    coinBtn.classList.add('coin-click');
    setTimeout(() => coinBtn.classList.remove('coin-click'), 160);
  }

  if (coinFlushTimer) {
    clearTimeout(coinFlushTimer);
  }

  coinFlushTimer = setTimeout(() => {
    coinFlushTimer = null;
    flushCoinClicks();
  }, CLICK_FLUSH_DELAY_MS);
}

export function setupEventListeners() {
  document.getElementById('storage-btn').addEventListener('click', openWarehouseModal);
  document.getElementById('exchange-btn').addEventListener('click', openExchangeModal);
  document.getElementById('gold-input').addEventListener('input', updateExchangeResult);
  document.getElementById('treasury-btn').addEventListener('click', openTreasuryModal);
  document.getElementById('market-btn').addEventListener('click', () => showPage('market'));
  document.getElementById('quests-btn').addEventListener('click', openQuestsModal);
  
  // Attack button
  document.getElementById('attack-btn').addEventListener('click', openAttackMenu);

  const coinBtn = document.getElementById('coin-btn');

  coinBtn.addEventListener('touchstart', (event) => {
    event.preventDefault();
    ignoreSyntheticClickUntil = Date.now() + 700;
    queueCoinClicks(event.changedTouches?.length || 1);
  }, { passive: false });

  coinBtn.addEventListener('click', (event) => {
    event.preventDefault();
    if (Date.now() < ignoreSyntheticClickUntil) {
      return;
    }

    queueCoinClicks(1);
  });

  document.getElementById('nav-main').addEventListener('click', () => showPage('main'));
  document.getElementById('nav-mining').addEventListener('click', () => showPage('mining'));
  document.getElementById('nav-coin-mining').addEventListener('click', () => showPage('coin-mining'));
  document.getElementById('nav-barracks').addEventListener('click', () => showPage('barracks'));
  document.getElementById('nav-market-back').addEventListener('click', () => showPage('main'));

  document.querySelectorAll('.market-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.market-tab-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      market.loadMarketListings(e.currentTarget.dataset.resource);
    });
  });

  // Barracks tabs
  document.querySelectorAll('.barracks-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.barracks-tab-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      appState.selectedBarracksTab = e.currentTarget.dataset.type;
      renderBarracks();
    });
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      appState.selectedBuildingType = e.currentTarget.dataset.type;
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
