// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.ready();

let currentUser = null;
let userId = null;
let currentBuildings = null;
let currentMiningTab = 'mine';
let buildingUpdateInterval = null;

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
      console.error('❌ No userId provided in URL');
      tg.showAlert('❌ Ошибка: не передан userId. Откройте МiniApp через команду /start в боте.');
      return;
    }

    console.log(`📊 Загрузка данных игрока ${userId} из Supabase...`);
    const response = await fetch(`/api/user/${userId}`);
    if (!response.ok) {
      console.error('❌ Failed to load user data. Status:', response.status);
      tg.showAlert('❌ Ошибка загрузки данных. Убедитесь что таблицы созданы в Supabase (см. SUPABASE_SETUP.md)');
      return;
    }

    currentUser = await response.json();
    console.log('✅ Данные игрока загружены:', currentUser);
    updateUI();
  } catch (error) {
    console.error('❌ Error loading user data:', error);
    tg.showAlert('❌ Ошибка подключения к серверу');
  }
}

// Update UI with user data
function updateUI() {
  if (!currentUser) return;

  // Update resources
  document.getElementById('gold-value').textContent = formatNumber(currentUser.gold);
  document.getElementById('wood-value').textContent = formatNumber(currentUser.wood);
  document.getElementById('stone-value').textContent = formatNumber(currentUser.stone);
  document.getElementById('meat-value').textContent = formatNumber(currentUser.meat);
  document.getElementById('jabcoins-value').textContent = currentUser.jabcoins;

  // Update player card
  document.getElementById('player-name').textContent = currentUser.first_name || 'Player';
  document.getElementById('player-username').textContent = `@${currentUser.username || 'unknown'}`;
  document.getElementById('player-id').textContent = currentUser.telegram_id;

  // Update storage modal
  document.getElementById('storage-wood').textContent = formatNumber(currentUser.wood);
  document.getElementById('storage-stone').textContent = formatNumber(currentUser.stone);
  document.getElementById('storage-meat').textContent = formatNumber(currentUser.meat);

  // Update exchange modal
  document.getElementById('exchange-gold').textContent = `💰 ${formatNumber(currentUser.gold)}`;

  // Reset input fields
  document.getElementById('wood-input').max = currentUser.wood;
  document.getElementById('stone-input').max = currentUser.stone;
  document.getElementById('meat-input').max = currentUser.meat;
}

// Format numbers with spaces
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
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

// Load buildings data
async function loadBuildings() {
  try {
    console.log(`🏗️ Загрузка построек из Supabase для пользователя ${userId}...`);
    const response = await fetch(`/api/user/${userId}/buildings`);
    if (!response.ok) {
      console.error('❌ Failed to load buildings. Status:', response.status);
      tg.showAlert('❌ Ошибка загрузки построек. Проверьте что таблицы созданы в Supabase.');
      return;
    }

    const data = await response.json();
    currentBuildings = data.buildings;
    console.log(`✅ Загружено ${currentBuildings.length} построек:`, currentBuildings);
    renderBuildings(currentMiningTab);
  } catch (error) {
    console.error('❌ Error loading buildings:', error);
    tg.showAlert('❌ Ошибка загрузки построек');
  }
}

// Render buildings based on selected category
function renderBuildings(category) {
  currentMiningTab = category;
  const container = document.getElementById('buildings-container');
  container.innerHTML = '';

  if (!currentBuildings) return;

  const filteredBuildings = currentBuildings.filter(b => b.building_type === category);

  filteredBuildings.forEach((building) => {
    const config = building.building_configs;
    const isLocked = false; // For now, all buildings are unlocked

    const card = createBuildingCard(building, config);
    container.appendChild(card);
  });
}

// Create building card element
function createBuildingCard(building, config) {
  const card = document.createElement('div');
  card.className = 'building-card';

  // Calculate production
  const now = new Date();
  const lastCollected = new Date(building.last_collected_at);
  const hoursPassed = (now - lastCollected) / (1000 * 60 * 60);
  const productionPerHour = config.base_production * building.level;
  const maxProduction = productionPerHour * 24; // 24 hour cap
  const collectedAmount = Math.min(Math.floor(productionPerHour * hoursPassed), maxProduction);
  const progressPercent = (collectedAmount / maxProduction) * 100;
  const timeToFull = maxProduction / productionPerHour;
  const timeRemaining = timeToFull - hoursPassed;

  card.innerHTML = `
    <div class="building-header">
      <div class="building-emoji">${config.emoji}</div>
      <div class="building-name">
        <h3>${config.emoji} ${config.name} #${building.id}</h3>
        <div class="building-level">Уровень: ${building.level}</div>
      </div>
    </div>

    <div class="building-info">
      <div class="info-item">
        <span class="info-label">Производство в час:</span>
        <span class="info-value">${formatNumber(productionPerHour)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Собрано:</span>
        <span class="info-value">${formatNumber(collectedAmount)}/${formatNumber(maxProduction)}</span>
      </div>
    </div>

    <div class="production-progress">
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progressPercent}%"></div>
      </div>
      <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); margin-top: 5px;">
        Заполнится через: ${timeRemaining > 0 ? Math.ceil(timeRemaining) : 0} часов
      </div>
    </div>

    <div class="building-actions">
      <button class="action-btn collect-btn" onclick="collectResources('${building.building_type}')">
        💰 Собрать
      </button>
      <button class="action-btn upgrade-btn" onclick="upgradeBuildingModal('${building.building_type}', ${building.level})">
        ⬆️ Улучшить
      </button>
    </div>
  `;

  return card;
}

// Collect resources from building
async function collectResources(buildingType) {
  try {
    const response = await fetch(`/api/user/${userId}/buildings/${buildingType}/collect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      tg.showAlert(error.error || 'Не удалось собрать ресурсы');
      return;
    }

    const result = await response.json();
    currentUser = result.user;
    updateUI();
    loadBuildings();

    const resourceEmojis = { gold: '💰', stone: '🪨', wood: '🌲', meat: '🍖' };
    const emoji = resourceEmojis[result.resourceType] || '📦';
    tg.showAlert(`✅ Собрано ${emoji} ${formatNumber(result.collectedAmount)}`);
  } catch (error) {
    console.error('Error collecting resources:', error);
    tg.showAlert('Ошибка при сборе ресурсов');
  }
}

// Show upgrade confirmation
function upgradeBuildingModal(buildingType, currentLevel) {
  const building = currentBuildings.find(b => b.building_type === buildingType);
  const config = building.building_configs;

  const costMultiplier = Math.pow(1.1, currentLevel - 1);
  const costGold = Math.floor((config.cost_gold || 0) * costMultiplier);
  const costStone = Math.floor((config.cost_stone || 0) * costMultiplier);
  const costWood = Math.floor((config.cost_wood || 0) * costMultiplier);
  const costMeat = Math.floor((config.cost_meat || 0) * costMultiplier);

  const hasEnough =
    currentUser.gold >= costGold &&
    currentUser.stone >= costStone &&
    currentUser.wood >= costWood &&
    currentUser.meat >= costMeat;

  let message = `🏗️ Улучшение ${config.emoji} ${config.name} #${building.id}
До уровня ${currentLevel + 1}

Стоимость улучшения:
💰 Золото: ${formatNumber(costGold)} ${currentUser.gold >= costGold ? '✅' : '❌'}
🪨 Камень: ${formatNumber(costStone)} ${currentUser.stone >= costStone ? '✅' : '❌'}
🌲 Дерево: ${formatNumber(costWood)} ${currentUser.wood >= costWood ? '✅' : '❌'}
🍖 Мясо: ${formatNumber(costMeat)} ${currentUser.meat >= costMeat ? '✅' : '❌'}`;

  if (hasEnough) {
    tg.showConfirm(message, (result) => {
      if (result) {
        upgradeBuildingConfirm(buildingType);
      }
    });
  } else {
    tg.showAlert(message + '\n\n❌ Недостаточно ресурсов');
  }
}

// Confirm building upgrade
async function upgradeBuildingConfirm(buildingType) {
  try {
    const response = await fetch(`/api/user/${userId}/buildings/${buildingType}/upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      tg.showAlert(error.error || 'Не удалось улучшить здание');
      return;
    }

    const result = await response.json();
    currentUser = result.user;
    updateUI();
    loadBuildings();

    tg.showAlert(`✅ Здание улучшено до уровня ${result.newLevel}!`);
  } catch (error) {
    console.error('Error upgrading building:', error);
    tg.showAlert('Ошибка при улучшении здания');
  }
}

// Event Listeners
document.getElementById('storage-btn').addEventListener('click', openStorageModal);
document.getElementById('exchange-btn').addEventListener('click', openExchangeModal);

document.getElementById('gold-input').addEventListener('input', updateExchangeResult);

document.getElementById('attack-btn').addEventListener('click', () => {
  tg.showAlert('🔧 Функция "Атаковать" скоро будет доступна!');
});

// Navigation handlers
document.getElementById('nav-main').addEventListener('click', () => {
  showMainView();
});

document.getElementById('nav-mining').addEventListener('click', () => {
  showMiningView();
});

document.getElementById('nav-barracks').addEventListener('click', () => {
  tg.showAlert('🔧 Раздел "Казарма" скоро будет доступна!');
});

// Show main view
function showMainView() {
  document.getElementById('mining-section').style.display = 'none';
  document.querySelector('.player-card').style.display = 'block';
  document.querySelector('.resources-header').style.display = 'grid';
  document.getElementById('action-buttons').style.display = 'flex';

  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
  document.getElementById('nav-main').classList.add('active');

  clearInterval(buildingUpdateInterval);
}

// Show mining view
function showMiningView() {
  document.getElementById('mining-section').style.display = 'flex';
  document.querySelector('.player-card').style.display = 'none';
  document.querySelector('.resources-header').style.display = 'none';

  const actionButtons = document.querySelectorAll('.action-buttons');
  actionButtons.forEach(btn => btn.style.display = 'none');

  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
  document.getElementById('nav-mining').classList.add('active');

  loadBuildings();

  // Update buildings every 5 seconds for live progress
  if (buildingUpdateInterval) clearInterval(buildingUpdateInterval);
  buildingUpdateInterval = setInterval(() => {
    renderBuildings(currentMiningTab);
  }, 5000);
}

// Mining tab switching
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('mining-tab')) {
    document.querySelectorAll('.mining-tab').forEach(tab => tab.classList.remove('active'));
    e.target.classList.add('active');
    renderBuildings(e.target.dataset.category);
  }
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

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  loadUserData();
});
