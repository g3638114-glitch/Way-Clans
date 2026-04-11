import { appState } from '../utils/state.js';
import { updateCollectedAmounts, calculateTimeRemaining } from './calculations.js';

// Update building card values (smooth update without re-rendering)
function updateBuildingCardValues(building) {
  const card = document.querySelector(`[data-building-id="${building.id}"]`);
  if (!card) return;

  const collectedAmount = Math.floor(building._collected_decimal || building.collected_amount || 0);
  const productionRate = building.production_rate || 100;
  const maxCapacity = productionRate * 24;
  const progressPercent = (collectedAmount / maxCapacity) * 100;
  const isReady = collectedAmount >= maxCapacity;

  // Update collected value
  const infoValue = card.querySelector('.info-value-collected');
  if (infoValue) {
    infoValue.textContent = `${collectedAmount}/${maxCapacity}`;
  }

  // Update progress bar
  const progressFill = card.querySelector('.production-fill');
  if (progressFill) {
    progressFill.style.width = `${Math.min(progressPercent, 100)}%`;
  }

  // Update time remaining
  const timeDiv = card.querySelector('[data-time-remaining]');
  if (timeDiv) {
    const timeRemaining = calculateTimeRemaining(collectedAmount, productionRate, maxCapacity);
    timeDiv.textContent = `Время до заполнения: ${timeRemaining}`;
  }

  // Update collect button state
  const collectBtn = card.querySelector('.collect-btn');
  if (collectBtn) {
    collectBtn.disabled = !isReady;
    if (isReady) {
      collectBtn.classList.add('ready');
      collectBtn.classList.remove('collecting');
    } else {
      collectBtn.classList.remove('ready');
      collectBtn.classList.add('collecting');
    }
  }
}

// Smooth production updates - only update values, no re-render
export function smoothUpdateProduction() {
  updateCollectedAmounts(appState.allBuildings);

  // Update UI for each building card only
  appState.allBuildings.forEach(building => {
    updateBuildingCardValues(building);
  });
}

export function startProductionRefresh() {
  // Update production every second with smooth updates
  if (appState.productionRefreshInterval) return; // Prevent multiple intervals
  
  appState.productionRefreshInterval = setInterval(() => {
    if (appState.currentPage === 'mining' && appState.allBuildings.length > 0) {
      smoothUpdateProduction();
    }
  }, 1000);
}

export function stopProductionRefresh() {
  if (appState.productionRefreshInterval) {
    clearInterval(appState.productionRefreshInterval);
    appState.productionRefreshInterval = null;
  }
}
