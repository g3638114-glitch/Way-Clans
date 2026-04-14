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
  upgradeWarehouseToLevel,
} from './warehouse.js';

import {
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
} from './market.js';

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

  document.getElementById('warehouse-modal').addEventListener('click', (e) => {
    if (e.target.id === 'warehouse-modal') {
      closeWarehouseModal();
    }
  });

  document.getElementById('warehouse-sell-modal').addEventListener('click', (e) => {
    if (e.target.id === 'warehouse-sell-modal') {
      closeWarehouseSellModal();
    }
  });

  document.getElementById('sell-price-modal').addEventListener('click', (e) => {
    if (e.target.id === 'sell-price-modal') {
      closeSellPriceModal();
    }
  });

  document.getElementById('market-modal').addEventListener('click', (e) => {
    if (e.target.id === 'market-modal') {
      closeMarketModal();
    }
  });

  document.getElementById('market-buy-modal').addEventListener('click', (e) => {
    if (e.target.id === 'market-buy-modal') {
      closeMarketBuyModal();
    }
  });
}
