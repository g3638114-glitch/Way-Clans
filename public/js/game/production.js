import { appState } from '../utils/state.js';
import { getProductionRate, getCapacity } from './config.js';
import { getResourceIconHtml } from '../utils/resourceIcons.js';

function setElementHtml(element, nextHtml) {
  if (element && element.innerHTML !== nextHtml) {
    element.innerHTML = nextHtml;
  }
}

function setElementText(element, nextText) {
  if (element && element.textContent !== nextText) {
    element.textContent = nextText;
  }
}

/**
 * Calculate accumulated resources for a building
 */
function calculateBuildingProgress(building) {
  if (building.building_type === 'mine') {
    const level = building.level || 1;
    const capacity = getCapacity('mine', level);
    const stored = Number(building.collected_amount || building.currentAccumulated || 0);
    const workerCount = Number(building.worker_count || building.mineWorkerCount || 0);
    const workStartedAt = building.work_started_at ? new Date(building.work_started_at) : null;
    const workEndsAt = building.work_ends_at ? new Date(building.work_ends_at) : null;
    const now = new Date();

    if (!workerCount || !workStartedAt || !workEndsAt || now >= workEndsAt) {
      const accumulated = Math.floor(Math.min(stored, capacity));
      return {
        accumulated,
        capacity,
        productionRate: 0,
        isFull: accumulated >= capacity,
        isMine: true,
        shiftActive: false,
        workerCount: 0,
        remainingMs: 0,
      };
    }

    const baseRate = getProductionRate('mine', level);
    const ratePerHour = baseRate * (workerCount / 100);
    const elapsedHours = Math.max(0, (now - workStartedAt) / (1000 * 60 * 60));
    const accumulated = Math.floor(Math.min(stored + elapsedHours * ratePerHour, capacity));

    return {
      accumulated,
      capacity,
      productionRate: ratePerHour,
      isFull: accumulated >= capacity,
      isMine: true,
      shiftActive: true,
      workerCount,
      remainingMs: Math.max(0, workEndsAt.getTime() - now.getTime()),
    };
  }

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
  const resourceType = building.building_type === 'mine'
    ? 'gold'
    : building.building_type === 'quarry'
      ? 'stone'
      : building.building_type === 'lumber_mill'
        ? 'wood'
        : 'meat';
  const resourceIcon = getResourceIconHtml(resourceType, 'resource-inline-icon', resourceType);

  if (building.building_type === 'mine') {
    const statRows = card.querySelectorAll('.stat-row');
    if (statRows.length >= 3) {
      const incomeStat = statRows[0].querySelector('.stat-value');
      const capacityStat = statRows[1].querySelector('.stat-value');
      const shiftStat = statRows[2].querySelector('.stat-value');
      if (incomeStat) {
        const shownRate = progress.shiftActive ? progress.productionRate : getProductionRate('mine', level);
        setElementHtml(incomeStat, `${shownRate}${resourceIcon}/час`);
      }
      if (capacityStat) {
        setElementHtml(capacityStat, `${progress.accumulated}/${capacity}${resourceIcon}`);
      }
      if (shiftStat) {
        setElementText(shiftStat, progress.shiftActive ? formatMineRemaining(progress.remainingMs) : 'Смена не активна');
      }
    }

    const badge = card.querySelector('.mine-worker-badge');
    if (badge) {
      setElementText(badge, progress.shiftActive ? `${progress.workerCount} рабочих` : 'Шахта ждёт рабочих');
      badge.classList.toggle('is-active', progress.shiftActive);
    }

    const collectBtn = card.querySelector('[data-action="mine-collect"]');
    if (collectBtn) {
      collectBtn.disabled = progress.accumulated <= 0;
      setElementHtml(collectBtn, `<span>Собрать</span> ${progress.accumulated}${resourceIcon}`);
    }

    return updateProgressBar(card, progressPercent, progress.isFull);
  }

  // ===== Update capacity stat row =====
  const statRows = card.querySelectorAll('.stat-row');
  if (statRows.length >= 2) {
    // Second stat row is capacity
    const capacityStatValue = statRows[1].querySelector('.stat-value');
    if (capacityStatValue) {
      setElementHtml(capacityStatValue, `${progress.accumulated}/${capacity}${resourceIcon}`);
    }
  }

  // ===== Update progress bar =====
  updateProgressBar(card, progressPercent, progress.isFull);

  // ===== Update action buttons =====
  const actionsContainer = card.querySelector('.building-card-actions');
  if (actionsContainer) {
    const activateBtn = actionsContainer.querySelector('.btn-activate');
    const collectBtn = actionsContainer.querySelector('[data-action="collect"]');
    const collectX2Btn = actionsContainer.querySelector('[data-action="collect-x2"]');
    const speedUpBtn = actionsContainer.querySelector('[data-action="speed-up"]');

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
        newCollectBtn.dataset.action = 'collect';
        newCollectBtn.innerHTML = `<span>Собрать</span> ${progress.accumulated}${resourceIcon}`;
        newCollectBtn.addEventListener('click', () => {
          window.collectResources(building.id);
          newCollectBtn.blur();
        });
        actionsContainer.insertBefore(newCollectBtn, actionsContainer.firstChild);
      } else {
        // Update collect button text with current accumulated amount
        setElementHtml(collectBtn, `<span>Собрать</span> ${progress.accumulated}${resourceIcon}`);
      }

      if (collectX2Btn) {
        setElementHtml(collectX2Btn, `<span>Собрать x2 [реклама]</span> ${progress.accumulated * 2}${resourceIcon}`);
      }

      if (speedUpBtn) {
        speedUpBtn.disabled = progress.isFull;
      }
    } else {
      // Should not have collect button
      if (collectBtn) {
        collectBtn.remove();
      }

      if (collectX2Btn) {
        collectX2Btn.remove();
      }

      if (speedUpBtn) {
        speedUpBtn.remove();
      }
    }
  }
}

function updateProgressBar(card, progressPercent, isFull) {
  const progressFill = card.querySelector('.capacity-progress-fill');
  if (!progressFill) return;

  progressFill.style.width = `${Math.min(progressPercent, 100)}%`;
  if (isFull) progressFill.classList.add('full');
  else progressFill.classList.remove('full');
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

function formatMineRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}с осталось`;
  return `${minutes}м ${seconds.toString().padStart(2, '0')}с осталось`;
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
