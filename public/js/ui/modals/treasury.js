import { appState } from '../../utils/state.js';
import { apiClient } from '../../api/client.js';
import { updateUI } from '../dom.js';
import { updateTreasuryModal, updateTreasuryUpgradeModal } from '../dom.js';

export function openTreasuryModal() {
  updateTreasuryModal(appState.currentUser);
  document.getElementById('treasury-modal').classList.add('active');
}

export function closeTreasuryModal() {
  document.getElementById('treasury-modal').classList.remove('active');
}

export function openTreasuryUpgradeModal() {
  updateTreasuryUpgradeModal(appState.currentUser);
  document.getElementById('treasury-upgrade-modal').classList.add('active');
}

export function closeTreasuryUpgradeModal() {
  document.getElementById('treasury-upgrade-modal').classList.remove('active');
}

export async function confirmTreasuryUpgrade() {
  try {
    const btn = document.getElementById('treasury-upgrade-confirm-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Улучшение...';

    const result = await apiClient.upgradeTreasury(appState.userId);
    appState.currentUser = result.user;
    updateUI(appState.currentUser);

    window.tg.showAlert('✅ Казна успешно улучшена!');
    closeTreasuryUpgradeModal();
    closeTreasuryModal();
  } catch (error) {
    console.error('Error upgrading treasury:', error);
    window.tg.showAlert(error.message || '❌ Ошибка при улучшении казны');
  } finally {
    const btn = document.getElementById('treasury-upgrade-confirm-btn');
    btn.disabled = false;
    btn.textContent = 'Улучшить';
  }
}
