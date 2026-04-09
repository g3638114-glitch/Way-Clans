// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.ready();

let currentUser = null;
let userId = null;

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

// Event Listeners
document.getElementById('storage-btn').addEventListener('click', openStorageModal);
document.getElementById('exchange-btn').addEventListener('click', openExchangeModal);

document.getElementById('gold-input').addEventListener('input', updateExchangeResult);

document.getElementById('attack-btn').addEventListener('click', () => {
  tg.showAlert('🔧 Функция "Атаковать" скоро будет доступна!');
});

document.getElementById('nav-mining').addEventListener('click', () => {
  tg.showAlert('🔧 Раздел "Добыча" скоро будет доступна!');
});

document.getElementById('nav-barracks').addEventListener('click', () => {
  tg.showAlert('🔧 Раздел "Казарма" скоро будет доступна!');
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
