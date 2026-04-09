// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.ready();

let currentUser = null;
let userId = null;
let currentPage = 'main';
let allBuildings = [];
let selectedBuildingType = 'mine';

// Parse userId from URL
function getUserIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('userId');
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
    const response = await fetch(`/api/user/${userId}/buildings`);
    if (!response.ok) {
      console.error('Failed to load buildings');
      return;
    }

    allBuildings = await response.json();
    renderBuildings();
  } catch (error) {
    console.error('Error loading buildings:', error);
  }
}

// Update UI with user data
function updateUI() {
  if (!currentUser) return;

  // Update resources
  const goldText = formatNumber(currentUser.gold);
  const woodText = formatNumber(currentUser.wood);
  const stoneText = formatNumber(currentUser.stone);
  const meatText = formatNumber(currentUser.meat);
  const jabcoinsText = currentUser.jabcoins;

  document.getElementById('gold-value').textContent = goldText;
  document.getElementById('wood-value').textContent = woodText;
  document.getElementById('stone-value').textContent = stoneText;
  document.getElementById('meat-value').textContent = meatText;
  document.getElementById('jabcoins-value').textContent = jabcoinsText;

  // Update mining page resources
  document.getElementById('mining-gold-value').textContent = goldText;
  document.getElementById('mining-wood-value').textContent = woodText;
  document.getElementById('mining-stone-value').textContent = stoneText;
  document.getElementById('mining-meat-value').textContent = meatText;
  document.getElementById('mining-jabcoins-value').textContent = jabcoinsText;

  // Update player card
  document.getElementById('player-name').textContent = currentUser.first_name || 'Player';
  document.getElementById('player-username').textContent = `@${currentUser.username || 'unknown'}`;
  document.getElementById('player-id').textContent = currentUser.telegram_id;

  // Update storage modal
  document.getElementById('storage-wood').textContent = woodText;
  document.getElementById('storage-stone').textContent = stoneText;
  document.getElementById('storage-meat').textContent = meatText;

  // Update exchange modal
  document.getElementById('exchange-gold').textContent = `💰 ${goldText}`;

  // Reset input fields
  document.getElementById('wood-input').max = currentUser.wood;
  document.getElementById('stone-input').max = currentUser.stone;
  document.getElementById('meat-input').max = currentUser.meat;
}

// Format numbers with spaces
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Page Management
function showPage(page) {
  currentPage = page;

  // Hide all pages
  document.getElementById('main-page').style.display = 'none';
  document.getElementById('mining-page').style.display = 'none';

  // Show selected page
  if (page === 'main') {
    document.getElementById('main-page').style.display = 'flex';
    document.getElementById('nav-main').classList.add('active');
    document.getElementById('nav-mining').classList.remove('active');
    document.getElementById('nav-barracks').classList.remove('active');
  } else if (page === 'mining') {
    document.getElementById('mining-page').style.display = 'flex';
    document.getElementById('nav-main').classList.remove('active');
    document.getElementById('nav-mining').classList.add('active');
    document.getElementById('nav-barracks').classList.remove('active');
    document.getElementById('nav-main-from-mining').classList.remove('active');
    document.getElementById('nav-mining-active').classList.add('active');
    document.getElementById('nav-barracks-from-mining').classList.remove('active');
    loadBuildings(); // Load buildings when switching to mining page
  }
}

// Calculate accumulated resources since last collection
function updateCollectedAmounts() {
  const now = new Date();

  allBuildings.forEach(building => {
    if (!building.last_collected) return;

    const lastCollected = new Date(building.last_collected);
    const hoursPassed = (now - lastCollected) / (1000 * 60 * 60);
    const productionRate = building.production_rate || 100;
    const maxCapacity = productionRate * 24; // 24 hour max capacity

    const newCollected = building.collected_amount + (hoursPassed * productionRate);
    building.collected_amount = Math.min(newCollected, maxCapacity); // Cap at max capacity
  });
}

// Render buildings
function renderBuildings() {
  updateCollectedAmounts(); // Update production before rendering

  const container = document.getElementById('buildings-container');
  const filteredBuildings = allBuildings.filter(b => b.building_type === selectedBuildingType);

  container.innerHTML = '';

  filteredBuildings.forEach((building, index) => {
    const card = createBuildingCard(building);
    card.style.animationDelay = `${index * 0.1}s`;
    container.appendChild(card);
  });
}

// Create building card
function createBuildingCard(building) {
  const card = document.createElement('div');
  card.className = 'building-card';

  const icon = getBuildingIcon(building.building_type);
  const level = building.level || 1;
  const collectedAmount = building.collected_amount || 0;
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
      <span class="info-value">${collectedAmount}/${maxCapacity}</span>
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
  timeDiv.style.fontSize = '12px';
  timeDiv.style.color = 'rgba(255, 255, 255, 0.7)';
  timeDiv.style.marginBottom = '12px';
  timeDiv.innerHTML = `Время до заполнения: ${timeRemaining}`;

  // Buttons
  const actions = document.createElement('div');
  actions.className = 'building-actions';

  const collectBtn = document.createElement('button');
  collectBtn.className = 'btn building-btn collect-btn';
  collectBtn.textContent = `Собрать`;
  collectBtn.disabled = collectedAmount === 0;
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

// Collect resources
async function collectResources(buildingId) {
  try {
    const response = await fetch(`/api/user/${userId}/building/${buildingId}/collect`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      tg.showAlert(error.error || 'Ошибка при сборе');
      return;
    }

    const result = await response.json();
    currentUser = result.user;
    updateUI();

    // Update building in local array
    const buildingIndex = allBuildings.findIndex(b => b.id === buildingId);
    if (buildingIndex !== -1) {
      allBuildings[buildingIndex] = result.building;
    }

    renderBuildings();
    tg.showAlert(`✅ Собрано ${result.collected} ресурсов!`);
  } catch (error) {
    console.error('Error collecting resources:', error);
    tg.showAlert('Ошибка при сборе ресурсов');
  }
}

// Upgrade building
async function upgradeBuilding(buildingId, currentLevel) {
  try {
    const upgradeCost = calculateUpgradeCost(currentLevel);
    const confirmation = confirm(`Улучшение до уровня ${currentLevel + 1}? Стоимость: ${formatNumber(upgradeCost)} 💰`);

    if (!confirmation) return;

    const response = await fetch(`/api/user/${userId}/building/${buildingId}/upgrade`, {
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
    const buildingIndex = allBuildings.findIndex(b => b.id === buildingId);
    if (buildingIndex !== -1) {
      allBuildings[buildingIndex] = result.building;
    }

    renderBuildings();
    tg.showAlert(`✅ Здание улучшено! Новый уровень: ${currentLevel + 1}`);
  } catch (error) {
    console.error('Error upgrading building:', error);
    tg.showAlert('Ошибка при улучшении');
  }
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

// Event Listeners
document.getElementById('storage-btn').addEventListener('click', openStorageModal);
document.getElementById('exchange-btn').addEventListener('click', openExchangeModal);

document.getElementById('gold-input').addEventListener('input', updateExchangeResult);

document.getElementById('attack-btn').addEventListener('click', () => {
  tg.showAlert('🔧 Функция "Атаковать" скоро будет доступна!');
});

document.getElementById('nav-main').addEventListener('click', () => showPage('main'));
document.getElementById('nav-mining').addEventListener('click', () => showPage('mining'));
document.getElementById('nav-main-from-mining').addEventListener('click', () => showPage('main'));
document.getElementById('nav-mining-active').addEventListener('click', () => showPage('mining'));

document.getElementById('nav-barracks').addEventListener('click', () => {
  tg.showAlert('🔧 Раздел "Казарма" скоро будет доступна!');
});

document.getElementById('nav-barracks-from-mining').addEventListener('click', () => {
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

// Set up auto-refresh for building production
let productionRefreshInterval = null;

function startProductionRefresh() {
  // Update production every second
  productionRefreshInterval = setInterval(() => {
    if (currentPage === 'mining' && allBuildings.length > 0) {
      renderBuildings();
    }
  }, 1000);
}

function stopProductionRefresh() {
  if (productionRefreshInterval) {
    clearInterval(productionRefreshInterval);
    productionRefreshInterval = null;
  }
}

// Override showPage to manage production refresh
const originalShowPage = showPage;
function showPage(page) {
  originalShowPage(page);

  if (page === 'mining') {
    startProductionRefresh();
  } else {
    stopProductionRefresh();
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  loadUserData();
  showPage('main');
});
