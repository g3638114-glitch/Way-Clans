// Import all modal functions
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
  upgradeWarehouseToLevel,
} from './warehouse.js';

// Re-export all functions
export {
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
  upgradeWarehouseToLevel,
};

// Setup modal background click handlers
export function setupModalHandlers() {
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

  // Marketplace resource menu
  const resourceMenu = document.getElementById('marketplace-resource-menu');
  if (resourceMenu) {
    resourceMenu.addEventListener('click', (e) => {
      if (e.target.id === 'marketplace-resource-menu') {
        window.closeMarketplaceResourceMenu();
      }
    });
  }

  // Marketplace modals
  const marketplaceSellModal = document.getElementById('marketplace-sell-modal');
  if (marketplaceSellModal) {
    marketplaceSellModal.addEventListener('click', (e) => {
      if (e.target.id === 'marketplace-sell-modal') {
        window.closeMarketplaceSellModal();
      }
    });
  }

  const marketplaceBuyModal = document.getElementById('marketplace-buy-modal');
  if (marketplaceBuyModal) {
    marketplaceBuyModal.addEventListener('click', (e) => {
      if (e.target.id === 'marketplace-buy-modal') {
        window.closeMarketplaceBuyModal();
      }
    });
  }

  const marketplaceEditModal = document.getElementById('marketplace-edit-modal');
  if (marketplaceEditModal) {
    marketplaceEditModal.addEventListener('click', (e) => {
      if (e.target.id === 'marketplace-edit-modal') {
        window.closeEditListingModal();
      }
    });
  }
}
