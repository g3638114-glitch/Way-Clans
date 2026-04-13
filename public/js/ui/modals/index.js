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
  openStorageInfoModal,
  closeStorageInfoModal,
  openStorageUpgradeModal,
  closeStorageUpgradeModal,
  openStorageSellModal,
  closeStorageSellModal,
  confirmStorageUpgrade,
} from './storage-info.js';

import {
  openTreasuryModal,
  closeTreasuryModal,
  openTreasuryUpgradeModal,
  closeTreasuryUpgradeModal,
  confirmTreasuryUpgrade,
} from './treasury.js';

import {
  openMarketModal,
  closeMarketModal,
} from './market.js';

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

// Re-export all functions
export {
  openStorageModal,
  closeStorageModal,
  setMaxWood,
  setMaxStone,
  setMaxMeat,
  sellResources,
  openStorageInfoModal,
  closeStorageInfoModal,
  openStorageUpgradeModal,
  closeStorageUpgradeModal,
  openStorageSellModal,
  closeStorageSellModal,
  confirmStorageUpgrade,
  openTreasuryModal,
  closeTreasuryModal,
  openTreasuryUpgradeModal,
  closeTreasuryUpgradeModal,
  confirmTreasuryUpgrade,
  openMarketModal,
  closeMarketModal,
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
};

// Setup modal background click handlers
export function setupModalHandlers() {
  document.getElementById('storage-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'storage-modal') {
      closeStorageModal();
    }
  });

  document.getElementById('storage-info-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'storage-info-modal') {
      closeStorageInfoModal();
    }
  });

  document.getElementById('storage-sell-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'storage-sell-modal') {
      closeStorageSellModal();
    }
  });

  document.getElementById('storage-upgrade-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'storage-upgrade-modal') {
      closeStorageUpgradeModal();
    }
  });

  document.getElementById('exchange-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'exchange-modal') {
      closeExchangeModal();
    }
  });

  document.getElementById('quests-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'quests-modal') {
      closeQuestsModal();
    }
  });

  document.getElementById('upgrade-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'upgrade-modal') {
      closeUpgradeModal();
    }
  });

  document.getElementById('treasury-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'treasury-modal') {
      closeTreasuryModal();
    }
  });

  document.getElementById('treasury-upgrade-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'treasury-upgrade-modal') {
      closeTreasuryUpgradeModal();
    }
  });

  document.getElementById('market-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'market-modal') {
      closeMarketModal();
    }
  });
}
