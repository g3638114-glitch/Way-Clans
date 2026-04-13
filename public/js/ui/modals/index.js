// Import all modal functions
import {
  openStorageModal,
  closeStorageModal,
  setMaxWood,
  setMaxStone,
  setMaxMeat,
  sellResources,
} from './storage.js';

import {
  openExchangeModal,
  closeExchangeModal,
  updateExchangeResult,
  exchangeGold,
} from './exchange.js';

import {
  openUpgradeModal,
  closeUpgradeModal,
  confirmUpgrade,
} from './upgrade.js';

import {
  openQuestsModal,
  closeQuestsModal,
  renderQuestsList,
} from './quests.js';

import {
  openTreasuryModal,
  closeTreasuryModal,
  upgradeTreasuryToLevel,
} from './treasury.js';

import {
  openWarehouseModal,
  closeWarehouseModal,
  openWarehouseSellModal,
  closeWarehouseSellModal,
  setMaxWarehouseWood,
  setMaxWarehouseStone,
  setMaxWarehouseMeat,
  sellWarehouseResources,
  upgradeWarehouseToLevel,
} from './warehouse.js';

// Re-export all functions
export {
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
  openUpgradeModal,
  closeUpgradeModal,
  confirmUpgrade,
  openQuestsModal,
  closeQuestsModal,
  renderQuestsList,
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
};

// Setup modal background click handlers
export function setupModalHandlers() {
  document.getElementById('storage-modal').addEventListener('click', (e) => {
    if (e.target.id === 'storage-modal') {
      closeStorageModal();
    }
  });

  document.getElementById('exchange-modal').addEventListener('click', (e) => {
    if (e.target.id === 'exchange-modal') {
      closeExchangeModal();
    }
  });

  document.getElementById('quests-modal').addEventListener('click', (e) => {
    if (e.target.id === 'quests-modal') {
      closeQuestsModal();
    }
  });

  document.getElementById('upgrade-modal').addEventListener('click', (e) => {
    if (e.target.id === 'upgrade-modal') {
      closeUpgradeModal();
    }
  });

  document.getElementById('treasury-modal').addEventListener('click', (e) => {
    if (e.target.id === 'treasury-modal') {
      closeTreasuryModal();
    }
  });

  const warehouseModal = document.getElementById('warehouse-modal');
  if (warehouseModal) {
    warehouseModal.addEventListener('click', (e) => {
      if (e.target.id === 'warehouse-modal') {
        closeWarehouseModal();
      }
    });
  }

  const warehouseSellModal = document.getElementById('warehouse-sell-modal');
  if (warehouseSellModal) {
    warehouseSellModal.addEventListener('click', (e) => {
      if (e.target.id === 'warehouse-sell-modal') {
        closeWarehouseSellModal();
      }
    });
  }
}
