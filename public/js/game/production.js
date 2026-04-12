import { appState } from '../utils/state.js';
import { getProductionRate, getCapacity, getResourceEmoji } from './config.js';

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
      } else {
        // Update collect button text with current accumulated amount
        collectBtn.innerHTML = `<span>Собрать</span> ${progress.accumulated}${resourceEmoji}`;
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
