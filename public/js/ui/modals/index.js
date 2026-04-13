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
}
