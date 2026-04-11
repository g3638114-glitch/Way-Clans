import { apiClient } from '../api/client.js';
import { appState } from '../utils/state.js';

// Load quests for user
export async function loadQuests() {
  try {
    console.log('Loading quests for userId:', appState.userId);
    const quests = await apiClient.getQuests(appState.userId);
    console.log('Quests loaded:', quests);
    return quests;
  } catch (error) {
    console.error('Error loading quests:', error);
    tg.showAlert('Ошибка загрузки заданий');
    return [];
  }
}

// Check if quest is completed
export async function checkQuestProgress(questId) {
  const quests = await loadQuests();
  
  // Find the quest
  const quest = quests.find(q => q.id === questId);

  if (!quest) {
    tg.showAlert('❌ Задание не найдено');
    return quests;
  }

  if (quest.completed) {
    tg.showAlert('✅ Задание выполнено! Вы можете получить награду.');
  } else {
    if (questId === 'subscribe_channel') {
      tg.showAlert('❌ Вы еще не подписаны на канал.\n\nПожалуйста:\n1. Нажмите "Перейти на канал"\n2. Подпишитесь на канал\n3. Вернитесь и нажмите "Проверить" ещё раз');
    } else {
      tg.showAlert('❌ Условие квеста еще не выполнено.\n\nВам нужно пригласить больше друзей.');
    }
  }

  return quests;
}

// Claim quest reward
export async function claimQuestReward(questId) {
  try {
    const result = await apiClient.claimQuestReward(appState.userId, questId);

    // Add new buildings to local array
    if (result.buildings && result.buildings.length > 0) {
      result.buildings.forEach(building => {
        building._collected_decimal = 0;
        appState.allBuildings.push(building);
      });
    }

    tg.showAlert(result.message || `✅ Получено ${result.minesAdded} шахт!`);
    return result;
  } catch (error) {
    console.error('Error claiming reward:', error);
    tg.showAlert(error.message || 'Ошибка при получении награды');
  }
}
