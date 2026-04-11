// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.ready();

let currentUser = null;
let userId = null;
let currentPage = 'main';
let allBuildings = [];
let selectedBuildingType = 'mine';

// Parse userId from URL or Telegram WebApp
function getUserIdFromUrl() {
  // First try to get from URL parameters
  const params = new URLSearchParams(window.location.search);
  const urlUserId = params.get('userId');

  if (urlUserId) {
    return urlUserId;
  }

  // If no userId in URL, try to get from Telegram WebApp
  try {
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) {
      return tg.initDataUnsafe.user.id;
    }
  } catch (error) {
    console.warn('Could not get userId from Telegram WebApp:', error);
  }

  return null;
}

// Load user data
async function loadUserData() {
  try {
    userId = getUserIdFromUrl();
    if (!userId) {
      console.error('No userId provided');
      return;
    }

    const response = await fetch(`/api/user/${userId}`);
    if (!response.ok) {
      console.error('Failed to load user data');
      return;
    }

    currentUser = await response.json();
    updateUI();
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

// Load buildings data
async function loadBuildings() {
  try {
    console.log('Loading buildings for userId:', userId);
    const response = await fetch(`/api/user/${userId}/buildings`);
    if (!response.ok) {
      console.error('Failed to load buildings:', response.status);
      return;
    }

    allBuildings = await response.json();

    // Initialize decimal trackers for all buildings
    allBuildings.forEach(building => {
      if (!building._collected_decimal) {
        building._collected_decimal = building.collected_amount || 0;
      }
    });

    console.log('Buildings loaded:', allBuildings.length, 'buildings');
    renderBuildings();
  } catch (error) {
    console.error('Error loading buildings:', error);
  }
}

// Update UI with user data
function updateUI() {
  if (!currentUser) return;

  // Update resources - use short format for header to prevent wrapping
  const goldText = formatNumberShort(currentUser.gold);
  const woodText = formatNumberShort(currentUser.wood);
  const stoneText = formatNumberShort(currentUser.stone);
  const meatText = formatNumberShort(currentUser.meat);
  const jabcoinsText = currentUser.jabcoins;

  // Update header resources
  const goldEl = document.getElementById('gold-value');
  const woodEl = document.getElementById('wood-value');
  const stoneEl = document.getElementById('stone-value');
  const meatEl = document.getElementById('meat-value');
  const jabcoinsEl = document.getElementById('jabcoins-value');

  if (goldEl) goldEl.textContent = goldText;
  if (woodEl) woodEl.textContent = woodText;
  if (stoneEl) stoneEl.textContent = stoneText;
  if (meatEl) meatEl.textContent = meatText;
  if (jabcoinsEl) jabcoinsEl.textContent = jabcoinsText;

  // Update player card
  document.getElementById('player-name').textContent = currentUser.first_name || 'Player';
  document.getElementById('player-username').textContent = `@${currentUser.username || 'unknown'}`;
  document.getElementById('player-id').textContent = currentUser.telegram_id;

  // Update storage modal
  const storageWoodEl = document.getElementById('storage-wood');
  const storageStonEl = document.getElementById('storage-stone');
  const storageMeatEl = document.getElementById('storage-meat');

  if (storageWoodEl) storageWoodEl.textContent = woodText;
  if (storageStonEl) storageStonEl.textContent = stoneText;
  if (storageMeatEl) storageMeatEl.textContent = meatText;

  // Update exchange modal
  const exchangeGoldEl = document.getElementById('exchange-gold');
  if (exchangeGoldEl) exchangeGoldEl.textContent = `💰 ${goldText}`;

  // Reset input fields
  document.getElementById('wood-input').max = currentUser.wood;
  document.getElementById('stone-input').max = currentUser.stone;
  document.getElementById('meat-input').max = currentUser.meat;
}

// Format numbers with spaces
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Format large numbers with abbreviations (e.g. 100000 → 100K, 1200000 → 1.2M)
function formatNumberShort(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

// Page Management
function showPage(page) {
  currentPage = page;

  // Hide all pages
  document.getElementById('main-page').classList.remove('active');
  document.getElementById('mining-page').classList.remove('active');

  // Update nav items
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => item.classList.remove('active'));

  // Show selected page
  if (page === 'main') {
    document.getElementById('main-page').classList.add('active');
    document.getElementById('nav-main').classList.add('active');
    stopProductionRefresh();
  } else if (page === 'mining') {
    document.getElementById('mining-page').classList.add('active');
    document.getElementById('nav-mining').classList.add('active');
    loadBuildings(); // Load buildings when switching to mining page
    startProductionRefresh();
  }
}

// Calculate accumulated resources since last collection (with decimals internally)
function updateCollectedAmounts() {
  const now = new Date();

  allBuildings.forEach(building => {
    if (!building.last_collected) return;

    const lastCollected = new Date(building.last_collected);
    const hoursPassed = (now - lastCollected) / (1000 * 60 * 60);
    const productionRate = building.production_rate || 100;
    const maxCapacity = productionRate * 24; // 24 hour max capacity

    // Store decimal value internally for smooth calculation
    if (!building._collected_decimal) {
      building._collected_decimal = building.collected_amount || 0;
    }

    const newCollected = building._collected_decimal + (hoursPassed * productionRate);
    building._collected_decimal = Math.min(newCollected, maxCapacity); // Cap at max capacity
  });
}

// Render buildings - creates cards on first render, updates values on subsequent renders
function renderBuildings() {
  updateCollectedAmounts(); // Update production before rendering

  const container = document.getElementById('buildings-container');
  const filteredBuildings = allBuildings.filter(b => b.building_type === selectedBuildingType);

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
    const lockedCard = createLockedBuildingCard(selectedBuildingType);
    container.appendChild(lockedCard);
  }
}

// Update building card values (smooth update without re-rendering)
function updateBuildingCard(building) {
  const card = document.querySelector(`[data-building-id="${building.id}"]`);
  if (!card) return;

  const collectedAmount = Math.floor(building._collected_decimal || building.collected_amount || 0);
  const productionRate = building.production_rate || 100;
  const maxCapacity = productionRate * 24;
  const progressPercent = (collectedAmount / maxCapacity) * 100;

  // Update info values
  const infoValue = card.querySelector('.info-value-collected');
  if (infoValue) {
    infoValue.textContent = `${collectedAmount}/${maxCapacity}`;
  }

  // Update progress bar
  const progressFill = card.querySelector('.production-fill');
  if (progressFill) {
    progressFill.style.width = `${progressPercent}%`;
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
    collectBtn.disabled = collectedAmount === 0;
  }
}

// Create building card
function createBuildingCard(building) {
  const card = document.createElement('div');
  card.className = 'building-card';
  card.dataset.buildingId = building.id;

  const icon = getBuildingIcon(building.building_type);
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
      <span>${icon}</span>
      <span>${building.building_type === 'mine' ? 'Шахта' : building.building_type === 'quarry' ? 'Каменоломня' : building.building_type === 'lumber_mill' ? 'Лесопилка' : 'Ферма'} #${building.building_number}</span>
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
function createLockedBuildingCard(buildingType) {
  const card = document.createElement('div');
  card.className = 'building-card locked-card';

  const buildingNames = {
    mine: 'Шахта',
    quarry: 'Каменоломня',
    lumber_mill: 'Лесопилка',
    farm: 'Ферма',
  };

  const buildingIcons = {
    mine: '⛏',
    quarry: '🪨',
    lumber_mill: '🌲',
    farm: '🍖',
  };

  const buildingProductions = {
    mine: 80,
    quarry: 60,
    lumber_mill: 50,
    farm: 40,
  };

  // Calculate cost for first building of this type
  let cost = 0;
  if (buildingType === 'mine') {
    cost = 0; // First mine is free
  } else {
    // Other buildings have a cost for the first one
    const costs = {
      quarry: 50000,
      lumber_mill: 40000,
      farm: 30000,
    };
    cost = costs[buildingType] || 50000;
  }

  const icon = buildingIcons[buildingType];
  const name = buildingNames[buildingType];
  const production = buildingProductions[buildingType];

  // Header
  const header = document.createElement('div');
  header.className = 'building-header';
  header.innerHTML = `
    <div class="building-title">
      <span>${icon}</span>
      <span>${name} #1</span>
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
      <strong>${formatNumber(currentUser.gold)} 💰</strong>
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

// Get building icon
function getBuildingIcon(type) {
  const icons = {
    mine: '⛏',
    quarry: '🪨',
    lumber_mill: '🌲',
    farm: '🍖',
  };
  return icons[type] || '🏢';
}

// Calculate time remaining until full
function calculateTimeRemaining(collected, production, capacity) {
  if (production === 0) return 'Н/Д';
  const remaining = capacity - collected;
  const hoursNeeded = remaining / production;

  if (hoursNeeded <= 0) return 'Готово!';
  if (hoursNeeded < 1) {
    const minutes = Math.ceil(hoursNeeded * 60);
    return `${minutes} мин`;
  }
  return `${Math.ceil(hoursNeeded)} ч`;
}

// Purchase a building
async function purchaseBuilding(buildingType) {
  try {
    const response = await fetch(`/api/user/${userId}/building/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ buildingType }),
    });

    if (!response.ok) {
      const error = await response.json();
      tg.showAlert(error.error || 'Ошибка при покупке здания');
      return;
    }

    const result = await response.json();
    currentUser = result.user;
    allBuildings.push(result.building);

    // Initialize decimal tracker for new building
    result.building._collected_decimal = 0;

    updateUI();
    renderBuildings();

    const buildingNames = {
      mine: 'Шахта',
      quarry: 'Каменоломня',
      lumber_mill: 'Лесопилка',
      farm: 'Ферма',
    };

    tg.showAlert(`✅ ${buildingNames[buildingType]} #1 куплена!`);
  } catch (error) {
    console.error('Error purchasing building:', error);
    tg.showAlert('Ошибка при покупке здания');
  }
}

// Collect resources
async function collectResources(buildingId) {
  try {
    const response = await fetch(`/api/user/${userId}/building/${buildingId}/collect`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMsg = error.error || 'Ошибка при сборе';
      tg.showAlert(errorMsg);
      return;
    }

    const result = await response.json();
    currentUser = result.user;
    updateUI();

    // Update building in local array
    const buildingIndex = allBuildings.findIndex(b => b.id === buildingId);
    if (buildingIndex !== -1) {
      allBuildings[buildingIndex] = result.building;
      // Reset decimal tracker
      allBuildings[buildingIndex]._collected_decimal = 0;
    }

    renderBuildings();
    tg.showAlert(`✅ Собрано ${Math.floor(result.collected)} ресурсов!`);
  } catch (error) {
    console.error('Error collecting resources:', error);
    tg.showAlert('Ошибка при сборе ресурсов');
  }
}

// Store building data for upgrade modal
let upgradeModalData = {
  buildingId: null,
  currentLevel: null,
};

// Open upgrade modal
function openUpgradeModal(buildingId, currentLevel) {
  const building = allBuildings.find(b => b.id === buildingId);
  if (!building) return;

  upgradeModalData.buildingId = buildingId;
  upgradeModalData.currentLevel = currentLevel;

  // Update modal content
  const buildingTypeNames = {
    mine: 'Шахта',
    quarry: 'Каменоломня',
    lumber_mill: 'Лесопилка',
    farm: 'Ферма',
  };

  const buildingName = `${buildingTypeNames[building.building_type] || 'Здание'} #${building.building_number}`;
  document.getElementById('upgrade-building-name').textContent = buildingName;

  // Current level and production
  document.getElementById('upgrade-current-level').textContent = currentLevel;
  document.getElementById('upgrade-new-level').textContent = currentLevel + 1;
  document.getElementById('upgrade-current-production').textContent = building.production_rate;

  // Calculate new production rate (20% increase per level)
  const newProductionRate = Math.floor(building.production_rate * 1.2);
  document.getElementById('upgrade-new-production').textContent = newProductionRate;

  // Cost
  const upgradeCost = calculateUpgradeCost(currentLevel);
  document.getElementById('upgrade-cost-value').textContent = formatNumber(upgradeCost);
  document.getElementById('upgrade-player-gold').textContent = formatNumber(currentUser.gold);

  // Enable/disable upgrade button based on gold
  const upgradeBtn = document.getElementById('upgrade-confirm-btn');
  if (currentUser.gold >= upgradeCost) {
    upgradeBtn.classList.remove('disabled');
    upgradeBtn.disabled = false;
  } else {
    upgradeBtn.classList.add('disabled');
    upgradeBtn.disabled = true;
  }

  document.getElementById('upgrade-modal').classList.add('active');
}

function closeUpgradeModal() {
  document.getElementById('upgrade-modal').classList.remove('active');
  upgradeModalData = { buildingId: null, currentLevel: null };
}

// Confirm upgrade
async function confirmUpgrade() {
  if (!upgradeModalData.buildingId) return;

  try {
    const response = await fetch(`/api/user/${userId}/building/${upgradeModalData.buildingId}/upgrade`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      tg.showAlert(error.error || 'Ошибка при улучшении');
      return;
    }

    const result = await response.json();
    currentUser = result.user;
    updateUI();

    // Update building in local array
    const buildingIndex = allBuildings.findIndex(b => b.id === upgradeModalData.buildingId);
    if (buildingIndex !== -1) {
      allBuildings[buildingIndex] = result.building;
      // Maintain decimal value tracking across upgrades
      if (!allBuildings[buildingIndex]._collected_decimal) {
        allBuildings[buildingIndex]._collected_decimal = 0;
      }
    }

    closeUpgradeModal();
    renderBuildings();
    tg.showAlert(`✅ Здание улучшено! Новый уровень: ${upgradeModalData.currentLevel + 1}`);
  } catch (error) {
    console.error('Error upgrading building:', error);
    tg.showAlert('Ошибка при улучшении');
  }
}

// Upgrade building - opens modal instead of confirm dialog
function upgradeBuilding(buildingId, currentLevel) {
  openUpgradeModal(buildingId, currentLevel);
}

// Calculate upgrade cost
function calculateUpgradeCost(level) {
  return Math.floor(1000 * Math.pow(1.15, level - 1));
}

// Storage Modal Functions
function openStorageModal() {
  document.getElementById('storage-modal').classList.add('active');
}

function closeStorageModal() {
  document.getElementById('storage-modal').classList.remove('active');
  resetStorageInputs();
}

function resetStorageInputs() {
  document.getElementById('wood-input').value = '';
  document.getElementById('stone-input').value = '';
  document.getElementById('meat-input').value = '';
}

function setMaxWood() {
  document.getElementById('wood-input').value = currentUser.wood;
}

function setMaxStone() {
  document.getElementById('stone-input').value = currentUser.stone;
}

function setMaxMeat() {
  document.getElementById('meat-input').value = currentUser.meat;
}

async function sellResources() {
  try {
    const wood = parseInt(document.getElementById('wood-input').value) || 0;
    const stone = parseInt(document.getElementById('stone-input').value) || 0;
    const meat = parseInt(document.getElementById('meat-input').value) || 0;

    if (wood === 0 && stone === 0 && meat === 0) {
      tg.showAlert('Выберите ресурсы для продажи');
      return;
    }

    const response = await fetch(`/api/user/${userId}/sell`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ wood, stone, meat }),
    });

    if (!response.ok) {
      const error = await response.json();
      tg.showAlert(error.error || 'Ошибка при продаже ресурсов');
      return;
    }

    const result = await response.json();
    currentUser = result.user;
    updateUI();
    closeStorageModal();
    tg.showAlert('✅ Ресурсы успешно проданы!');
  } catch (error) {
    console.error('Error selling resources:', error);
    tg.showAlert('Ошибка при продаже ресурсов');
  }
}

// Exchange Modal Functions
function openExchangeModal() {
  document.getElementById('exchange-modal').classList.add('active');
  document.getElementById('gold-input').value = '';
  updateExchangeResult();
}

function closeExchangeModal() {
  document.getElementById('exchange-modal').classList.remove('active');
  document.getElementById('gold-input').value = '';
}

function updateExchangeResult() {
  const goldAmount = parseInt(document.getElementById('gold-input').value) || 0;
  const jabcoinsResult = Math.floor(goldAmount / 1000000);
  document.getElementById('exchange-result').textContent = `💎 ${jabcoinsResult}`;
}

async function exchangeGold() {
  try {
    const goldAmount = parseInt(document.getElementById('gold-input').value);

    if (!goldAmount || goldAmount < 1000000) {
      tg.showAlert('Минимум для обмена: 1 000 000 золота');
      return;
    }

    const response = await fetch(`/api/user/${userId}/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ goldAmount }),
    });

    if (!response.ok) {
      const error = await response.json();
      tg.showAlert(error.error || 'Ошибка при обмене');
      return;
    }

    const result = await response.json();
    currentUser = result.user;
    updateUI();
    closeExchangeModal();
    tg.showAlert(`✅ Обмен успешен! Получено ${result.jabcoinsGained} 💎`);
  } catch (error) {
    console.error('Error exchanging gold:', error);
    tg.showAlert('Ошибка при обмене');
  }
}

// Quests Modal Functions
async function loadQuests() {
  try {
    console.log('Loading quests for userId:', userId);
    const response = await fetch(`/api/user/${userId}/quests`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to load quests:', response.status, errorData);
      tg.showAlert('Ошибка загрузки заданий');
      return [];
    }

    const quests = await response.json();
    console.log('Quests loaded:', quests);
    return quests;
  } catch (error) {
    console.error('Error loading quests:', error);
    tg.showAlert('Ошибка загрузки заданий');
    return [];
  }
}

function openQuestsModal() {
  loadQuests().then(quests => {
    renderQuestsList(quests);
    document.getElementById('quests-modal').classList.add('active');
  });
}

function closeQuestsModal() {
  document.getElementById('quests-modal').classList.remove('active');
}

function renderQuestsList(quests) {
  const questsList = document.getElementById('quests-list');
  questsList.innerHTML = '';

  quests.forEach(quest => {
    const questCard = document.createElement('div');
    questCard.className = 'quest-card';
    if (quest.completed) {
      questCard.classList.add('completed');
    }

    let questContent = `
      <div class="quest-header">
        <span class="quest-icon">${quest.icon}</span>
        <div class="quest-info">
          <h3 class="quest-title">${quest.title}</h3>
          <p class="quest-description">${quest.description}</p>
        </div>
      </div>
      <div class="quest-reward">
        <span class="reward-text">Награда: ${quest.reward}</span>
      </div>
    `;

    // Button logic
    if (quest.rewarded) {
      // If already received reward - show completed status
      questContent += `
        <button class="btn btn-quest btn-quest-completed" disabled>
          ✓ Награда получена
        </button>
      `;
    } else if (quest.completed) {
      // If completed but not rewarded - show "Get Reward" button
      questContent += `
        <button class="btn btn-quest btn-quest-claim" onclick="claimQuestReward('${quest.id}')">
          Получить награду ✓
        </button>
      `;
    } else if (quest.url) {
      // For subscribe quest - show button to open link and check button
      questContent += `
        <div class="quest-buttons">
          <button class="btn btn-quest btn-quest-action" onclick="window.open('${quest.url}', '_blank')">
            Перейти на канал
          </button>
          <button class="btn btn-quest btn-quest-check" onclick="checkQuestProgress('${quest.id}')">
            Проверить
          </button>
        </div>
      `;
    } else {
      // For referral quests - show check button
      questContent += `
        <button class="btn btn-quest btn-quest-check" onclick="checkQuestProgress('${quest.id}')">
          Проверить
        </button>
      `;
    }

    questCard.innerHTML = questContent;
    questsList.appendChild(questCard);
  });
}

function checkQuestProgress(questId) {
  // Load quests again to refresh their status
  loadQuests().then(quests => {
    // Find the quest
    const quest = quests.find(q => q.id === questId);

    if (!quest) {
      tg.showAlert('❌ Задание не найдено');
      return;
    }

    if (quest.completed) {
      tg.showAlert('✅ Задание выполнено! Вы можете получить награду.');
      // Reload quests modal with updated status
      renderQuestsList(quests);
    } else {
      if (questId === 'subscribe_channel') {
        tg.showAlert('❌ Вы еще не подписаны на канал.\n\nПожалуйста:\n1. Нажмите "Перейти на канал"\n2. Подпишитесь на канал\n3. Вернитесь и нажмите "Проверить" ещё раз');
      } else {
        tg.showAlert('❌ Условие квеста еще не выполнено.\n\nВам нужно пригласить больше друзей.');
      }
    }
  });
}

async function claimQuestReward(questId) {
  try {
    const response = await fetch(`/api/user/${userId}/quest/${questId}/claim`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      tg.showAlert(error.error || 'Ошибка при получении награды');
      return;
    }

    const result = await response.json();

    // Add new buildings to local array
    if (result.buildings && result.buildings.length > 0) {
      result.buildings.forEach(building => {
        building._collected_decimal = 0;
        allBuildings.push(building);
      });
    }

    tg.showAlert(result.message || `✅ Получено ${result.minesAdded} шахт!`);

    // Reload quests and refresh UI
    openQuestsModal();
  } catch (error) {
    console.error('Error claiming reward:', error);
    tg.showAlert('Ошибка при получении награды');
  }
}

// Event Listeners
document.getElementById('storage-btn').addEventListener('click', openStorageModal);
document.getElementById('exchange-btn').addEventListener('click', openExchangeModal);
document.getElementById('quests-btn').addEventListener('click', openQuestsModal);

document.getElementById('gold-input').addEventListener('input', updateExchangeResult);

document.getElementById('attack-btn').addEventListener('click', () => {
  tg.showAlert('🔧 Функция "Атаковать" скоро будет доступна!');
});

document.getElementById('nav-main').addEventListener('click', () => showPage('main'));
document.getElementById('nav-mining').addEventListener('click', () => showPage('mining'));

document.getElementById('nav-barracks').addEventListener('click', () => {
  tg.showAlert('🔧 Раздел "Казарма" скоро будет доступна!');
});

// Building type tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    selectedBuildingType = e.target.dataset.type;
    renderBuildings();
  });
});

// Close modals on background click
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

// Smooth production updates - only update values, no re-render
let productionRefreshInterval = null;

function smoothUpdateProduction() {
  // Update decimal production amounts for all buildings
  const now = new Date();

  allBuildings.forEach(building => {
    if (!building.last_collected) return;

    const lastCollected = new Date(building.last_collected);
    const hoursPassed = (now - lastCollected) / (1000 * 60 * 60);
    const productionRate = building.production_rate || 100;
    const maxCapacity = productionRate * 24; // 24 hour max capacity

    // Store decimal value internally for smooth calculation
    if (!building._collected_decimal) {
      building._collected_decimal = building.collected_amount || 0;
    }

    const newCollected = building._collected_decimal + (hoursPassed * productionRate);
    building._collected_decimal = Math.min(newCollected, maxCapacity); // Cap at max capacity

    // Update UI for this building card only
    updateBuildingCardValues(building);
  });
}

// Update only the values on a building card (smooth update, no re-render)
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

  // Update collect button state - green when ready, gray when collecting
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

function startProductionRefresh() {
  // Update production every second with smooth updates
  if (productionRefreshInterval) return; // Prevent multiple intervals
  productionRefreshInterval = setInterval(() => {
    if (currentPage === 'mining' && allBuildings.length > 0) {
      smoothUpdateProduction();
    }
  }, 1000);
}

function stopProductionRefresh() {
  if (productionRefreshInterval) {
    clearInterval(productionRefreshInterval);
    productionRefreshInterval = null;
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  loadUserData();
  showPage('main');
});
