import { appState } from '../utils/state.js';
import { apiClient } from '../api/client.js';
import { updateUI } from './dom.js';
import { renderBuildings } from './builders.js';
import { formatNumber } from '../utils/formatters.js';
import { calculateUpgradeCost, BUILDING_CONFIGS } from '../game/calculations.js';
import { loadQuests, checkQuestProgress, claimQuestReward } from '../game/quests.js';

// STORAGE MODAL
export function openStorageModal() {
  document.getElementById('storage-modal').classList.add('active');
}

export function closeStorageModal() {
  document.getElementById('storage-modal').classList.remove('active');
  resetStorageInputs();
}

function resetStorageInputs() {
  document.getElementById('wood-input').value = '';
  document.getElementById('stone-input').value = '';
  document.getElementById('meat-input').value = '';
}

export function setMaxWood() {
  document.getElementById('wood-input').value = appState.currentUser.wood;
}

export function setMaxStone() {
  document.getElementById('stone-input').value = appState.currentUser.stone;
}

export function setMaxMeat() {
  document.getElementById('meat-input').value = appState.currentUser.meat;
}

export async function sellResources() {
  try {
    const wood = parseInt(document.getElementById('wood-input').value) || 0;
    const stone = parseInt(document.getElementById('stone-input').value) || 0;
    const meat = parseInt(document.getElementById('meat-input').value) || 0;

    if (wood === 0 && stone === 0 && meat === 0) {
      tg.showAlert('Выберите ресурсы для продажи');
      return;
    }

    const result = await apiClient.sellResources(appState.userId, { wood, stone, meat });
    appState.currentUser = result.user;
    updateUI(appState.currentUser);
    closeStorageModal();
    tg.showAlert('✅ Ресурсы успешно проданы!');
  } catch (error) {
    console.error('Error selling resources:', error);
    tg.showAlert(error.message || 'Ошибка при продаже ресурсов');
  }
}

// EXCHANGE MODAL
export function openExchangeModal() {
  document.getElementById('exchange-modal').classList.add('active');
  document.getElementById('gold-input').value = '';
  updateExchangeResult();
}

export function closeExchangeModal() {
  document.getElementById('exchange-modal').classList.remove('active');
  document.getElementById('gold-input').value = '';
}

export function updateExchangeResult() {
  const goldAmount = parseInt(document.getElementById('gold-input').value) || 0;
  const jabcoinsResult = Math.floor(goldAmount / 1000000);
  document.getElementById('exchange-result').textContent = `💎 ${jabcoinsResult}`;
}

export async function exchangeGold() {
  try {
    const goldAmount = parseInt(document.getElementById('gold-input').value);

    if (!goldAmount || goldAmount < 1000000) {
      tg.showAlert('Минимум для обмена: 1 000 000 золота');
      return;
    }

    const result = await apiClient.exchangeGold(appState.userId, goldAmount);
    appState.currentUser = result.user;
    updateUI(appState.currentUser);
    closeExchangeModal();
    tg.showAlert(`✅ Обмен успешен! Получено ${result.jabcoinsGained} 💎`);
  } catch (error) {
    console.error('Error exchanging gold:', error);
    tg.showAlert(error.message || 'Ошибка при обмене');
  }
}

// UPGRADE MODAL
export function openUpgradeModal(buildingId, currentLevel) {
  const building = appState.allBuildings.find(b => b.id === buildingId);
  if (!building) return;

  appState.upgradeModalData.buildingId = buildingId;
  appState.upgradeModalData.currentLevel = currentLevel;

  // Update modal content
  const config = BUILDING_CONFIGS[building.building_type];
  const buildingName = `${config.name} #${building.building_number}`;
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
  document.getElementById('upgrade-player-gold').textContent = formatNumber(appState.currentUser.gold);

  // Enable/disable upgrade button based on gold
  const upgradeBtn = document.getElementById('upgrade-confirm-btn');
  if (appState.currentUser.gold >= upgradeCost) {
    upgradeBtn.classList.remove('disabled');
    upgradeBtn.disabled = false;
  } else {
    upgradeBtn.classList.add('disabled');
    upgradeBtn.disabled = true;
  }

  document.getElementById('upgrade-modal').classList.add('active');
}

export function closeUpgradeModal() {
  document.getElementById('upgrade-modal').classList.remove('active');
  appState.upgradeModalData = { buildingId: null, currentLevel: null };
}

export async function confirmUpgrade() {
  if (!appState.upgradeModalData.buildingId) return;

  try {
    const result = await apiClient.upgradeBuilding(appState.userId, appState.upgradeModalData.buildingId);
    appState.currentUser = result.user;
    updateUI(appState.currentUser);

    // Update building in local array
    const buildingIndex = appState.allBuildings.findIndex(b => b.id === appState.upgradeModalData.buildingId);
    if (buildingIndex !== -1) {
      appState.allBuildings[buildingIndex] = result.building;
      // Maintain decimal value tracking across upgrades
      if (!appState.allBuildings[buildingIndex]._collected_decimal) {
        appState.allBuildings[buildingIndex]._collected_decimal = 0;
      }
    }

    closeUpgradeModal();
    renderBuildings();
    tg.showAlert(`✅ Здание улучшено! Новый уровень: ${appState.upgradeModalData.currentLevel + 1}`);
  } catch (error) {
    console.error('Error upgrading building:', error);
    tg.showAlert(error.message || 'Ошибка при улучшении');
  }
}

// QUESTS MODAL
export async function openQuestsModal() {
  const quests = await loadQuests();
  renderQuestsList(quests);
  document.getElementById('quests-modal').classList.add('active');
}

export function closeQuestsModal() {
  document.getElementById('quests-modal').classList.remove('active');
}

export function renderQuestsList(quests) {
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
        <button class="btn btn-quest btn-quest-claim" onclick="handleClaimReward('${quest.id}')">
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
          <button class="btn btn-quest btn-quest-check" onclick="handleCheckQuest('${quest.id}')">
            Проверить
          </button>
        </div>
      `;
    } else {
      // For referral quests - show check button
      questContent += `
        <button class="btn btn-quest btn-quest-check" onclick="handleCheckQuest('${quest.id}')">
          Проверить
        </button>
      `;
    }

    questCard.innerHTML = questContent;
    questsList.appendChild(questCard);
  });
}

// Global handlers for quest buttons (used in onclick)
window.handleCheckQuest = async (questId) => {
  const quests = await checkQuestProgress(questId);
  renderQuestsList(quests);
};

window.handleClaimReward = async (questId) => {
  const result = await claimQuestReward(questId);
  if (result) {
    const quests = await loadQuests();
    renderQuestsList(quests);
  }
};

// Close modals on background click
export function setupModalHandlers() {
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
}
