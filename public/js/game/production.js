import { appState } from '../utils/state.js';
import {
  getProductionRate,
  getCapacity,
  getResourceEmoji,
  getTreasuryCapacity,
  getStorageCapacity,
  getResourceType,
} from './config.js';

/**
 * Check if resources can be collected based on current treasury/storage capacity
 * This is the same logic as in builders.js but called during production updates
 */
function canCollectResourcesNow(building) {
  if (!appState.currentUser) return false;
  if (!building.last_activated) return false;

  const level = building.level || 1;
  const productionRate = getProductionRate(building.building_type, level);
  const capacity = getCapacity(building.building_type, level);

  // Calculate hours passed and accumulated resources
  const lastActivated = new Date(building.last_activated);
  const now = new Date();
  const hoursPassed = (now - lastActivated) / (1000 * 60 * 60);
  const totalAccumulated = (building.collected_amount || 0) + (hoursPassed * productionRate);
  const collectedAmount = Math.floor(Math.min(totalAccumulated, capacity));

  // If nothing to collect, can't collect
  if (collectedAmount <= 0) return false;

  // Check if collection would exceed treasury/storage capacity
  const resourceType = getResourceType(building.building_type);
  const currentResourceAmount = appState.currentUser[resourceType] || 0;
  const newResourceAmount = currentResourceAmount + collectedAmount;

  // Get appropriate capacity limit
  let maxCapacity;
  if (resourceType === 'gold') {
    const treasuryLevel = appState.currentUser.treasury_level || 1;
    maxCapacity = getTreasuryCapacity(treasuryLevel);
  } else {
    const storageLevel = appState.currentUser.storage_level || 1;
    maxCapacity = getStorageCapacity(storageLevel);
  }

  // Can only collect if it doesn't exceed capacity
  return newResourceAmount <= maxCapacity;
}

/**
 * Calculate accumulated resources for a building
 */
function calculateBuildingProgress(building) {
  if (!building.last_activated) {
    return {
      accumulated: 0,
      isFull: false,
    };
  }

  const level = building.level || 1;
  const productionRate = getProductionRate(building.building_type, level);
  const capacity = getCapacity(building.building_type, level);

  const lastActivated = new Date(building.last_activated);
  const now = new Date();
  const hoursPassed = (now - lastActivated) / (1000 * 60 * 60);

  const totalAccumulated = (building.collected_amount || 0) + hoursPassed * productionRate;
  const accumulated = Math.floor(Math.min(totalAccumulated, capacity));
  const isFull = accumulated >= capacity;

  return {
    accumulated,
    capacity,
    productionRate,
    isFull,
  };
}

/**
 * Update a single building card's values (smooth update without re-rendering)
 */
function updateBuildingCardValues(building) {
  const card = document.querySelector(`[data-building-id="${building.id}"]`);
  if (!card) return;

  const level = building.level || 1;
  const progress = calculateBuildingProgress(building);
  const capacity = getCapacity(building.building_type, level);
  const progressPercent = (progress.accumulated / capacity) * 100;
  const resourceEmoji = getResourceEmoji(building.building_type);

  // ===== Update capacity stat row =====
  const statRows = card.querySelectorAll('.stat-row');
  if (statRows.length >= 2) {
    // Second stat row is capacity
    const capacityStatValue = statRows[1].querySelector('.stat-value');
    if (capacityStatValue) {
      capacityStatValue.textContent = `${progress.accumulated}/${capacity}${resourceEmoji}`;
    }
  }

  // ===== Update progress bar =====
  const progressFill = card.querySelector('.capacity-progress-fill');
  if (progressFill) {
    progressFill.style.width = `${Math.min(progressPercent, 100)}%`;

    // Add full class when at capacity
    if (progress.isFull) {
      progressFill.classList.add('full');
    } else {
      progressFill.classList.remove('full');
    }
  }

  // ===== Update action buttons =====
  const actionsContainer = card.querySelector('.building-card-actions');
  if (actionsContainer) {
    const activateBtn = actionsContainer.querySelector('.btn-activate');
    const collectBtn = actionsContainer.querySelector('.btn-collect');

    const isActivated = building.last_activated !== null && building.last_activated !== undefined;

    // Manage activate button visibility - only show on first activation
    if (!isActivated) {
      // Should have activate button
      if (!activateBtn) {
        const newActivateBtn = document.createElement('button');
        newActivateBtn.className = 'btn btn-activate';
        newActivateBtn.textContent = 'Активировать';
        newActivateBtn.addEventListener('click', () => {
          window.activateBuilding(building.id);
        });
        actionsContainer.insertBefore(newActivateBtn, actionsContainer.firstChild);
      }
    } else {
      // Should not have activate button
      if (activateBtn) {
        activateBtn.remove();
      }
    }

    // Manage collect button visibility - show when activated
    if (isActivated) {
      // Should have collect button
      if (!collectBtn) {
        const newCollectBtn = document.createElement('button');
        newCollectBtn.className = 'btn btn-collect';
        newCollectBtn.innerHTML = `<span>Собрать</span> ${progress.accumulated}${resourceEmoji}`;
        newCollectBtn.addEventListener('click', () => {
          window.collectResources(building.id);
        });
        actionsContainer.insertBefore(newCollectBtn, actionsContainer.firstChild);
        collectBtn = newCollectBtn; // Update reference for state check below
      }

      // RE-CHECK button state every update (this fixes the "forever disabled" bug)
      if (collectBtn) {
        const canCollect = canCollectResourcesNow(building);
        const resourceType = getResourceType(building.building_type);

        if (canCollect) {
          // Can collect - button is enabled
          collectBtn.innerHTML = `<span>Собрать</span> ${progress.accumulated}${resourceEmoji}`;
          collectBtn.disabled = false;
          collectBtn.classList.remove('btn-disabled');
        } else if (progress.accumulated > 0) {
          // Resources available but storage/treasury is full
          const containerName = resourceType === 'gold' ? 'Казна' : 'Склад';
          collectBtn.innerHTML = `<span>${containerName} переполнена!</span> ${progress.accumulated}${resourceEmoji}`;
          collectBtn.disabled = true;
          collectBtn.classList.add('btn-disabled');
        } else {
          // Nothing accumulated yet
          collectBtn.innerHTML = `<span>Собирается...</span> ${progress.accumulated}${resourceEmoji}`;
          collectBtn.disabled = true;
          collectBtn.classList.add('btn-disabled');
        }
      }
    } else {
      // Should not have collect button
      if (collectBtn) {
        collectBtn.remove();
      }
    }
  }
}

/**
 * Smooth production update - updates card values every second without full re-render
 */
export function smoothUpdateProduction() {
  if (!appState.allBuildings || appState.allBuildings.length === 0) return;

  // Update each building card
  appState.allBuildings.forEach((building) => {
    updateBuildingCardValues(building);
  });
}

/**
 * Start smooth production updates
 */
export function startProductionRefresh() {
  if (appState.productionRefreshInterval) return;

  appState.productionRefreshInterval = setInterval(() => {
    if (appState.currentPage === 'mining' && appState.allBuildings && appState.allBuildings.length > 0) {
      smoothUpdateProduction();
    }
  }, 1000);
}

/**
 * Stop production updates
 */
export function stopProductionRefresh() {
  if (appState.productionRefreshInterval) {
    clearInterval(appState.productionRefreshInterval);
    appState.productionRefreshInterval = null;
  }
}
