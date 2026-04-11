import { appState } from '../../utils/state.js';
import { apiClient } from '../../api/client.js';
import { updateUI } from '../dom.js';

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
      tg.showAlert('Minimum for exchange: 1,000,000 gold');
      return;
    }

    const result = await apiClient.exchangeGold(appState.userId, goldAmount);
    appState.currentUser = result.user;
    updateUI(appState.currentUser);
    closeExchangeModal();
    tg.showAlert(`✅ Exchange successful! Received ${result.jabcoinsGained} 💎`);
  } catch (error) {
    console.error('Error exchanging gold:', error);
    tg.showAlert(error.message || 'Error during exchange');
  }
}
