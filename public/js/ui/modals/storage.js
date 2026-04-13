import { appState } from '../../utils/state.js';
import { apiClient } from '../../api/client.js';
import { updateUI } from '../dom.js';

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

    // Handle treasury full error separately - show as notification, not error
    if (error.message.includes('Treasury is full')) {
      tg.showAlert('🏦 Казна переполнена! Обменяйте Jamcoin на Jabcoins или потратьте его, чтобы продолжить продажу.');
      return;
    }

    tg.showAlert(error.message || 'Ошибка при продаже ресурсов');
  }
}
