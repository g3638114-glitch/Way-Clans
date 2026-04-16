import { appState, withOperationLock } from '../../utils/state.js';
import { apiClient } from '../../api/client.js';
import { updateUI } from '../dom.js';
import { getResourceIconHtml } from '../../utils/resourceIcons.js';

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
  document.getElementById('exchange-result').innerHTML = `${getResourceIconHtml('jabcoin', 'resource-inline-icon-lg', 'Jabcoin')} ${jabcoinsResult}`;
}

export async function exchangeGold() {
  await withOperationLock('exchangeGold', async () => {
    try {
      const goldAmount = parseInt(document.getElementById('gold-input').value);

      if (!goldAmount || goldAmount < 1000000) {
        tg.showAlert('Минимум для обмена: 1,000,000 Jamcoin');
        return;
      }

      const result = await apiClient.exchangeGold(appState.userId, goldAmount);
      appState.currentUser = result.user;
      updateUI(appState.currentUser);
      closeExchangeModal();
      tg.showAlert(`✅ Обмен пройден успешно! Получено ${result.jabcoinsGained} 💎`);
    } catch (error) {
      console.error('Error exchanging Jamcoin:', error);
      tg.showAlert(error.message || 'Ошибка при обмене');
    }
  });
}
