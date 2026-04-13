import { appState } from '../utils/state.js';
import { formatNumber } from '../utils/formatters.js';
import {
  getProductionRate,
  getCapacity,
  getBuildingConfig,
  getResourceEmoji,
  getTreasuryCapacity,
  getStorageCapacity,
  getResourceType,
} from '../game/config.js';
import { activateBuilding, collectResources, upgradeBuilding } from '../game/buildings.js';

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
 * Check if resources can be collected based on current treasury/storage capacity
 */
function canCollectResources(building) {
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

  const resourceEmoji = getResourceEmoji(building.building_type);

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
      <span class="stat-label">Производство/час:</span>
      <span class="stat-value">${productionRate}${resourceEmoji}/час</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Вместимость:</span>
      <span class="stat-value">${currentAccumulated}/${capacity}${resourceEmoji}</span>
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

    // Check if collection is possible
    const canCollect = canCollectResources(building);

    if (canCollect) {
      // Can collect - button is enabled
      collectBtn.innerHTML = `<span>Собрать</span> ${currentAccumulated}${resourceEmoji}`;
      collectBtn.addEventListener('click', () => collectResources(building.id));
    } else if (currentAccumulated > 0) {
      // Resources available but storage/treasury is full
      const resourceType = getResourceType(building.building_type);
      const containerName = resourceType === 'gold' ? 'Казна' : 'Склад';
      collectBtn.innerHTML = `<span>${containerName} переполнена!</span> ${currentAccumulated}${resourceEmoji}`;
      collectBtn.disabled = true;
      collectBtn.classList.add('btn-disabled');
    } else {
      // Nothing accumulated yet
      collectBtn.innerHTML = `<span>Собирается...</span> ${currentAccumulated}${resourceEmoji}`;
      collectBtn.disabled = true;
      collectBtn.classList.add('btn-disabled');
    }

    actions.appendChild(collectBtn);
  }

  // Upgrade button
  if (level < 5) {
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
