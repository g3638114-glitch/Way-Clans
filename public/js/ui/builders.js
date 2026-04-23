import { appState } from '../utils/state.js';
import { formatNumber } from '../utils/formatters.js';
import {
  getProductionRate,
  getCapacity,
  getBuildingConfig,
  getMaxBuildingLevel,
  MINE_MEAT_COST,
  MINE_MEAT_WORKERS,
  MINE_AD_WORKERS,
} from '../game/config.js';
import { activateBuilding, collectResources, finishMineWorkNow, startMineWorkers, upgradeBuilding } from '../game/buildings.js';
import { getResourceIconHtml } from '../utils/resourceIcons.js';

// Make functions available globally for onclick handlers
window.activateBuilding = activateBuilding;
window.collectResources = collectResources;
window.upgradeBuilding = upgradeBuilding;

/**
 * Render all buildings of selected type
 */
export function renderBuildings() {
  const container = document.getElementById('buildings-container');
  if (!container) return;

  const filteredBuildings = appState.allBuildings.filter(
    (b) => b.building_type === appState.selectedBuildingType
  );

  // Clear and rebuild
  container.innerHTML = '';

  filteredBuildings.forEach((building, index) => {
    const card = createBuildingCard(building);
    card.style.animationDelay = `${index * 0.1}s`;
    container.appendChild(card);
  });
}

/**
 * Create a building card with new capacity-based mechanics
 */
export function createBuildingCard(building) {
  const card = document.createElement('div');
  card.className = 'building-card';
  card.dataset.buildingId = building.id;

  const config = getBuildingConfig(building.building_type);
  const level = building.level || 1;
  const productionRate = getProductionRate(building.building_type, level);
  const capacity = getCapacity(building.building_type, level);

  // Current accumulated amount (with smooth decimals if available)
  const currentAccumulated = Math.floor(
    building.currentAccumulated !== undefined ? building.currentAccumulated : 0
  );
  const isFull = currentAccumulated >= capacity;
  const isActivated = building.last_activated !== null && building.last_activated !== undefined;

  // Calculate progress percentage
  const progressPercent = capacity > 0 ? (currentAccumulated / capacity) * 100 : 0;

  // Calculate time to fill (if not full and activated)
  let timeToFillText = '';
  if (!isFull && isActivated) {
    const resourcesNeeded = capacity - currentAccumulated;
    const hoursNeeded = resourcesNeeded / productionRate;
    timeToFillText = formatTimeToFill(hoursNeeded);
  }

  const resourceType = config.resource;
  const resourceIcon = getResourceIconHtml(resourceType, 'resource-inline-icon', config.name);

  if (building.building_type === 'mine') {
    return createMineCard(building, config, level, productionRate, capacity, currentAccumulated, progressPercent, isFull);
  }

  // ========== Card Header ==========
  const header = document.createElement('div');
  header.className = 'building-card-header';
  header.innerHTML = `
    <div class="building-card-title">
      <span class="building-icon">${config.icon}</span>
      <h3 class="building-name">${config.name} (Уровень ${level})</h3>
    </div>
  `;

  // ========== Card Stats ==========
  const stats = document.createElement('div');
  stats.className = 'building-card-stats';
  stats.innerHTML = `
    <div class="stat-row">
      <span class="stat-label">Производство/час: </span>
      <span class="stat-value">${productionRate}${resourceIcon}/час</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Вместимость:</span>
      <span class="stat-value">${currentAccumulated}/${capacity}${resourceIcon}</span>
    </div>
    ${timeToFillText ? `<div class="stat-row"><span class="stat-time">${timeToFillText}</span></div>` : ''}
  `;

  // ========== Capacity Progress Bar ==========
  const progressContainer = document.createElement('div');
  progressContainer.className = 'capacity-progress-container';
  const progressBar = document.createElement('div');
  progressBar.className = 'capacity-progress-bar';
  const fill = document.createElement('div');
  fill.className = 'capacity-progress-fill';
  fill.style.width = `${Math.min(progressPercent, 100)}%`;
  if (isFull) {
    fill.classList.add('full');
  }
  progressBar.appendChild(fill);
  progressContainer.appendChild(progressBar);

  // ========== Action Buttons ==========
  const actions = document.createElement('div');
  actions.className = 'building-card-actions';

  // Activate button (visible only when not activated yet)
  if (!isActivated) {
    const activateBtn = document.createElement('button');
    activateBtn.className = 'btn btn-activate';
    activateBtn.textContent = 'Активировать';
    activateBtn.addEventListener('click', () => activateBuilding(building.id));
    actions.appendChild(activateBtn);
  }

  // Collect button (visible when activated, at any time)
  if (isActivated) {
    const collectBtn = document.createElement('button');
    collectBtn.className = 'btn btn-collect';
    collectBtn.innerHTML = `<span>Собрать</span> ${currentAccumulated}${resourceIcon}`;
    collectBtn.addEventListener('click', () => {
      collectResources(building.id);
      collectBtn.blur();
    });
    actions.appendChild(collectBtn);
  }

  // Upgrade button
  if (level < getMaxBuildingLevel()) {
    const upgradeBtn = document.createElement('button');
    upgradeBtn.className = 'btn btn-upgrade';
    upgradeBtn.textContent = `Улучшить до уровня ${level + 1}`;
    upgradeBtn.addEventListener('click', () => upgradeBuilding(building.id));
    actions.appendChild(upgradeBtn);
  } else {
    const maxedBtn = document.createElement('button');
    maxedBtn.className = 'btn btn-maxed';
    maxedBtn.textContent = 'Максимальный уровень';
    maxedBtn.disabled = true;
    actions.appendChild(maxedBtn);
  }

  // ========== Assemble Card ==========
  card.appendChild(header);
  card.appendChild(stats);
  card.appendChild(progressContainer);
  card.appendChild(actions);

  return card;
}

function createMineCard(building, config, level, productionRate, capacity, currentAccumulated, progressPercent, isFull) {
  const card = document.createElement('div');
  card.className = 'building-card mine-card';
  card.dataset.buildingId = building.id;

  const workerCount = Number(building.mineWorkerCount || 0);
  const shiftActive = Boolean(building.mineShiftActive);
  const ratePerHour = Number(building.mineRatePerHour || 0);
  const remainingText = shiftActive ? formatMineRemaining(building.mineRemainingMs || 0) : 'Смена не активна';
  const canCollect = currentAccumulated > 0;
  const collectButton = !shiftActive
    ? `<button class="btn btn-collect mine-action-wide" ${canCollect ? '' : 'disabled'} data-action="mine-collect"><span>Собрать</span> ${currentAccumulated}${getResourceIconHtml('gold', 'resource-inline-icon', 'Jamcoin')}</button>`
    : '';
  const actionButtons = shiftActive
    ? `
        <button class="btn btn-secondary mine-action-wide" data-action="mine-finish">Собрать сразу</button>
        <button class="btn btn-upgrade mine-upgrade-full" data-action="mine-upgrade" disabled>Улучшение недоступно во время работы</button>
      `
    : `
        <button class="btn btn-activate mine-action-wide" data-action="mine-meat">${MINE_MEAT_WORKERS} рабочих за ${MINE_MEAT_COST} ${getResourceIconHtml('meat', 'resource-inline-icon', 'Мясо')}</button>
        <button class="btn btn-upgrade mine-action-wide" data-action="mine-ad">${MINE_AD_WORKERS} рабочих за рекламу</button>
        ${collectButton}
      `;

  card.innerHTML = `
    <div class="building-card-header">
      <div class="building-card-title">
        <span class="building-icon">${config.icon}</span>
        <h3 class="building-name">${config.name} (Уровень ${level})</h3>
      </div>
      <span class="mine-worker-badge ${shiftActive ? 'is-active' : ''}">${shiftActive ? `${workerCount} рабочих` : 'Шахта ждёт рабочих'}</span>
    </div>
    <div class="building-card-stats">
      <div class="stat-row">
        <span class="stat-label">Доход / час:</span>
        <span class="stat-value">${ratePerHour || productionRate}${getResourceIconHtml('gold', 'resource-inline-icon', 'Jamcoin')}/час</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Накоплено в шахте:</span>
        <span class="stat-value">${currentAccumulated}/${capacity}${getResourceIconHtml('gold', 'resource-inline-icon', 'Jamcoin')}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Смена:</span>
        <span class="stat-value">${remainingText}</span>
      </div>
      <div class="stat-row mine-helper-row">
        <span class="stat-time">100 рабочих: ${productionRate}${getResourceIconHtml('gold', 'resource-inline-icon', 'Jamcoin')}/ч, 300 рабочих: ${productionRate * 3}${getResourceIconHtml('gold', 'resource-inline-icon', 'Jamcoin')}/ч</span>
      </div>
    </div>
    <div class="capacity-progress-container">
      <div class="capacity-progress-bar">
        <div class="capacity-progress-fill ${isFull ? 'full' : ''}" style="width:${Math.min(progressPercent, 100)}%"></div>
      </div>
    </div>
    <div class="building-card-actions mine-actions-grid">
      ${actionButtons}
      ${!shiftActive ? (level < getMaxBuildingLevel() ? `<button class="btn btn-upgrade mine-upgrade-full" data-action="mine-upgrade">Улучшить до уровня ${level + 1}</button>` : `<button class="btn btn-maxed mine-upgrade-full" disabled>Максимальный уровень</button>`) : ''}
    </div>
  `;

  card.querySelector('[data-action="mine-meat"]')?.addEventListener('click', () => startMineWorkers(building.id, 'meat_100'));
  card.querySelector('[data-action="mine-ad"]')?.addEventListener('click', () => startMineWorkers(building.id, 'ad_300'));
  card.querySelector('[data-action="mine-finish"]')?.addEventListener('click', () => finishMineWorkNow(building.id));
  card.querySelector('[data-action="mine-collect"]')?.addEventListener('click', () => collectResources(building.id));
  card.querySelector('[data-action="mine-upgrade"]')?.addEventListener('click', () => upgradeBuilding(building.id));

  return card;
}

/**
 * Format time remaining (hours/minutes)
 */
function formatTimeToFill(hours) {
  if (hours < 0.016) {
    // Less than 1 minute
    return '< 1 мин';
  }
  if (hours < 1) {
    const minutes = Math.ceil(hours * 60);
    return `~${minutes} мин`;
  }
  if (hours < 24) {
    const roundedHours = Math.ceil(hours);
    return `~${roundedHours}ч`;
  }
  const days = Math.ceil(hours / 24);
  return `~${days}д`;
}

function formatMineRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) {
    return `${seconds}с осталось`;
  }
  return `${minutes}м ${seconds.toString().padStart(2, '0')}с осталось`;
}
