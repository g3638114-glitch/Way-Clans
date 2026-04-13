import { appState } from '../../utils/state.js';
import { apiClient } from '../../api/client.js';
import { updateUI } from '../dom.js';
import { updateStorageModal, updateStorageUpgradeModal } from '../dom.js';

export function openStorageInfoModal() {
  updateStorageModal(appState.currentUser);
  document.getElementById('storage-info-modal').classList.add('active');
}

export function closeStorageInfoModal() {
  document.getElementById('storage-info-modal').classList.remove('active');
}

export function openStorageUpgradeModal() {
  updateStorageUpgradeModal(appState.currentUser);
  document.getElementById('storage-upgrade-modal').classList.add('active');
}

export function closeStorageUpgradeModal() {
  document.getElementById('storage-upgrade-modal').classList.remove('active');
}

export function openStorageSellModal() {
  // Update current resource values in the sell modal
  const storageWoodEl = document.getElementById('storage-wood');
  const storageStonEl = document.getElementById('storage-stone');
  const storageMeatEl = document.getElementById('storage-meat');

  if (storageWoodEl) storageWoodEl.textContent = appState.currentUser.wood;
  if (storageStonEl) storageStonEl.textContent = appState.currentUser.stone;
  if (storageMeatEl) storageMeatEl.textContent = appState.currentUser.meat;

  document.getElementById('storage-sell-modal').classList.add('active');
}

export function closeStorageSellModal() {
  document.getElementById('storage-sell-modal').classList.remove('active');
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

export async function confirmStorageUpgrade() {
  try {
    const btn = document.getElementById('storage-upgrade-confirm-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Улучшение...';

    const result = await apiClient.upgradeStorage(appState.userId);
    appState.currentUser = result.user;
    updateUI(appState.currentUser);

    window.tg.showAlert('✅ Склад успешно улучшен!');
    closeStorageUpgradeModal();
    closeStorageInfoModal();
  } catch (error) {
    console.error('Error upgrading storage:', error);
    window.tg.showAlert(error.message || '❌ Ошибка при улучшении склада');
  } finally {
    const btn = document.getElementById('storage-upgrade-confirm-btn');
    btn.disabled = false;
    btn.textContent = 'Улучшить';
  }
}

export async function sellResources() {
  try {
    const wood = parseInt(document.getElementById('wood-input').value) || 0;
    const stone = parseInt(document.getElementById('stone-input').value) || 0;
    const meat = parseInt(document.getElementById('meat-input').value) || 0;

    if (wood === 0 && stone === 0 && meat === 0) {
      window.tg.showAlert('Выберите ресурсы для продажи');
      return;
    }

    const result = await apiClient.sellResources(appState.userId, { wood, stone, meat });
    appState.currentUser = result.user;
    updateUI(appState.currentUser);
    closeStorageSellModal();
    window.tg.showAlert('✅ Ресурсы успешно проданы!');
  } catch (error) {
    console.error('Error selling resources:', error);
    window.tg.showAlert(error.message || '❌ Ошибка при продаже ресурсов');
  }
}
