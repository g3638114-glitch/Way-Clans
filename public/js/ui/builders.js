import { appState } from '../utils/state.js';
import { formatNumber } from '../utils/formatters.js';
import { calculateTimeRemaining, updateCollectedAmounts } from '../game/calculations.js';
import { BUILDING_CONFIGS } from '../game/config.js';
import { collectResources, upgradeBuilding, purchaseBuilding } from '../game/buildings.js';

// Make functions available globally for onclick handlers
window.collectResources = collectResources;
window.upgradeBuilding = upgradeBuilding;
window.purchaseBuilding = purchaseBuilding;

// Render buildings - creates cards on first render, updates values on subsequent renders
export function renderBuildings() {
  updateCollectedAmounts(appState.allBuildings); // Update production before rendering

  const container = document.getElementById('buildings-container');
  const filteredBuildings = appState.allBuildings.filter(b => b.building_type === appState.selectedBuildingType);

  // Always clear and rebuild - ensures correct filter is applied
  container.innerHTML = '';

  // Show owned buildings
  filteredBuildings.forEach((building, index) => {
    const card = createBuildingCard(building);
    card.style.animationDelay = `${index * 0.1}s`;
    container.appendChild(card);
  });

  // If no buildings of this type owned, show "Buy first building" card
  if (filteredBuildings.length === 0) {
    const lockedCard = createLockedBuildingCard(appState.selectedBuildingType);
    container.appendChild(lockedCard);
  }
}

// Create building card
export function createBuildingCard(building) {
  const card = document.createElement('div');
  card.className = 'building-card';
  card.dataset.buildingId = building.id;

  const config = BUILDING_CONFIGS[building.building_type];
  const level = building.level || 1;
  const collectedAmount = Math.floor(building._collected_decimal || building.collected_amount || 0);
  const productionRate = building.production_rate || 100;
  const maxCapacity = productionRate * 24; // Capacity for 24 hours

  const progressPercent = (collectedAmount / maxCapacity) * 100;

  // Building Header
  const header = document.createElement('div');
  header.className = 'building-header';
  header.innerHTML = `
    <div class="building-title">
      <span>${config.icon}</span>
      <span>${config.name} #${building.building_number}</span>
    </div>
    <div class="building-level">Уровень: ${level}</div>
  `;

  // Building Info
  const info = document.createElement('div');
  info.className = 'building-info';
  info.innerHTML = `
    <div class="info-item">
      <span class="info-label">Производство/час</span>
      <span class="info-value">${productionRate}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Собрано</span>
      <span class="info-value info-value-collected">${collectedAmount}/${maxCapacity}</span>
    </div>
  `;

  // Production Progress Bar
  const progressBar = document.createElement('div');
  progressBar.className = 'production-bar';
  const fill = document.createElement('div');
  fill.className = 'production-fill';
  fill.style.width = `${progressPercent}%`;
  progressBar.appendChild(fill);

  // Time remaining
  const timeRemaining = calculateTimeRemaining(collectedAmount, productionRate, maxCapacity);
  const timeDiv = document.createElement('div');
  timeDiv.className = 'time-remaining';
  timeDiv.dataset.timeRemaining = '';
  timeDiv.style.fontSize = '12px';
  timeDiv.style.color = 'rgba(255, 255, 255, 0.7)';
  timeDiv.style.marginBottom = '12px';
  timeDiv.textContent = `Время до заполнения: ${timeRemaining}`;

  // Buttons
  const actions = document.createElement('div');
  actions.className = 'building-actions';

  const collectBtn = document.createElement('button');
  collectBtn.className = 'btn building-btn collect-btn';
  const isReady = collectedAmount >= maxCapacity;
  if (isReady) {
    collectBtn.classList.add('ready');
    collectBtn.textContent = `Собрать`;
  } else {
    collectBtn.classList.add('collecting');
    collectBtn.textContent = `Собрать`;
    collectBtn.disabled = true;
  }
  collectBtn.addEventListener('click', () => collectResources(building.id));

  const upgradeBtn = document.createElement('button');
  upgradeBtn.className = 'btn building-btn upgrade-btn';
  upgradeBtn.textContent = `Улучшить`;
  upgradeBtn.addEventListener('click', () => upgradeBuilding(building.id, level));

  actions.appendChild(collectBtn);
  actions.appendChild(upgradeBtn);

  // Assemble card
  card.appendChild(header);
  card.appendChild(info);
  card.appendChild(progressBar);
  card.appendChild(timeDiv);
  card.appendChild(actions);

  return card;
}

// Create locked building card for purchase
export function createLockedBuildingCard(buildingType) {
  const card = document.createElement('div');
  card.className = 'building-card locked-card';

  const config = BUILDING_CONFIGS[buildingType];
  const production = config.productionRate;
  const cost = config.cost;

  // Header
  const header = document.createElement('div');
  header.className = 'building-header';
  header.innerHTML = `
    <div class="building-title">
      <span>${config.icon}</span>
      <span>${config.name} #1</span>
    </div>
    <div class="building-level">Уровень: 1</div>
  `;

  // Locked info
  const lockedInfo = document.createElement('div');
  lockedInfo.className = 'locked-info';
  lockedInfo.innerHTML = `
    <div class="info-item">
      <span class="info-label">Производство/час</span>
      <span class="info-value">${production}</span>
    </div>
    <div class="cost-item">
      <span>Стоимость первого здания:</span>
      <strong>${cost === 0 ? 'БЕСПЛАТНО' : formatNumber(cost) + ' 💰'}</strong>
    </div>
    <div class="cost-item">
      <span>Ваше золото:</span>
      <strong>${formatNumber(appState.currentUser.gold)} 💰</strong>
    </div>
  `;

  // Buy button
  const actions = document.createElement('div');
  actions.className = 'building-actions';

  const buyBtn = document.createElement('button');
  buyBtn.className = 'btn building-btn buy-btn';
  buyBtn.textContent = cost === 0 ? 'Купить (Бесплатно)' : `Купить (${formatNumber(cost)})`;
  buyBtn.addEventListener('click', () => purchaseBuilding(buildingType));

  actions.appendChild(buyBtn);

  // Assemble card
  card.appendChild(header);
  card.appendChild(lockedInfo);
  card.appendChild(actions);

  return card;
}
