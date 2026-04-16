import { appState, withOperationLock } from '../utils/state.js';
import { apiClient } from '../api/client.js';
import { formatNumber } from '../utils/formatters.js';

let currentTargetId = null;

export async function openAttackMenu() {
  await withOperationLock('findTarget', async () => {
    try {
      const data = await apiClient.getAttackTarget(appState.userId);
      currentTargetId = data.targetId;
      renderAttackTarget(data);
      document.getElementById('attack-modal').classList.add('active');
    } catch (error) {
      tg.showAlert(error.message);
    }
  });
}

export function closeAttackModal() {
  document.getElementById('attack-modal').classList.remove('active');
  currentTargetId = null;
}

async function searchNewTarget() {
  await withOperationLock('findTarget', async () => {
    try {
      const data = await apiClient.getAttackTarget(appState.userId);
      currentTargetId = data.targetId;
      renderAttackTarget(data);
    } catch (error) {
      tg.showAlert(error.message);
    }
  });
}

async function confirmAttack() {
  if (!currentTargetId) {
    tg.showAlert('Ошибка: цель не выбрана');
    return;
  }

  await withOperationLock('performAttack', async () => {
    try {
      const result = await apiClient.performAttack(appState.userId, currentTargetId);
      
      let message = '';
      if (result.won) {
        message = `🎉 ПОБЕДА!\n\n`;
        message += `⚔️ Ваши воины: ${result.attackerTroopsCount}\n`;
        message += `🛡 Враг: ${result.defenderTroopsCount}\n\n`;
        message += `💀 Вы убили: ${result.defendersKilled} защитников\n`;
        message += `💀 Погибло ваших: ${result.attackersKilled}\n\n`;
        message += `📦 Добыча:\n`;
        message += `💰 ${formatNumber(result.loot.gold)} Jamcoin\n`;
        message += `🌲 ${formatNumber(result.loot.wood)} дерева\n`;
        message += `🪨 ${formatNumber(result.loot.stone)} камня\n`;
        message += `🍖 ${formatNumber(result.loot.meat)} мяса`;
      } else {
        message = `💪 АТАКА ОТРАЖЕНА!\n\n`;
        message += `⚔️ Ваши воины: ${result.attackerTroopsCount}\n`;
        message += `🛡 Враг: ${result.defenderTroopsCount}\n\n`;
        message += `💀 Вы убили: ${result.defendersKilled} защитников\n`;
        message += `💀 Погибло ваших: ${result.attackersKilled}`;
      }
      
      tg.showAlert(message);
      closeAttackModal();
      
      window.updateResources && window.updateResources();
    } catch (error) {
      tg.showAlert(error.message);
    }
  });
}

function renderAttackTarget(data) {
  const body = document.getElementById('attack-modal-body');
  const { target, defenders } = data;
  
  let defendersHtml = '';
  if (defenders.length === 0) {
    defendersHtml = '<p style="color: #4caf50;">Без защиты!</p>';
  } else {
    defendersHtml = defenders.map(d => `
      <div class="soldier-item" style="margin-bottom: 5px; border-left-color: #ff6b6b;">
        <span>Защитник ур. ${d.level}</span>
        <span class="soldier-count">${d.count}</span>
      </div>
    `).join('');
  }

  body.innerHTML = `
    <div class="target-card">
      <div class="target-name">${target.first_name} (@${target.username || '???'})</div>
      <div class="target-resources">
        <div class="troop-stat-item">
          <span class="troop-stat-label">Jamcoin</span>
          <span class="troop-stat-value">💰${formatNumber(target.gold)}</span>
        </div>
        <div class="troop-stat-item">
          <span class="troop-stat-label">Дерево</span>
          <span class="troop-stat-value">🌲${formatNumber(target.wood)}</span>
        </div>
        <div class="troop-stat-item">
          <span class="troop-stat-label">Камень</span>
          <span class="troop-stat-value">🪨${formatNumber(target.stone)}</span>
        </div>
        <div class="troop-stat-item">
          <span class="troop-stat-label">Мясо</span>
          <span class="troop-stat-value">🍖${formatNumber(target.meat)}</span>
        </div>
      </div>
      <div class="target-defenders">
        <h4>🛡 Защита игрока:</h4>
        ${defendersHtml}
      </div>
    </div>
  `;

  document.getElementById('confirm-attack-btn').onclick = confirmAttack;
  document.getElementById('search-target-btn').onclick = searchNewTarget;
}

window.closeAttackModal = closeAttackModal;
window.openAttackMenu = openAttackMenu;