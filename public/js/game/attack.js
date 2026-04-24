import { appState, withOperationLock } from '../utils/state.js';
import { apiClient } from '../api/client.js';
import { formatNumber } from '../utils/formatters.js';
import { getResourceIconHtml } from '../utils/resourceIcons.js';
import { getAdsgramBlockId, showRewardedAd } from '../services/adsgram.js';
import { getTroopIconHtml } from '../utils/troopIcons.js';

let currentTargetId = null;
const TARGET_SEARCH_DELAY_MS = 1400;

export async function openAttackMenu() {
  await withOperationLock('findTarget', async () => {
    try {
      document.getElementById('attack-modal').classList.add('active');
      renderSearchState('Ищем противника', 'Подбираем цель для атаки...');
      setAttackButtonsDisabled(true);
      await wait(TARGET_SEARCH_DELAY_MS);
      const data = await apiClient.getAttackTarget(appState.userId, 'default');
      currentTargetId = data.targetId;
      renderAttackTarget(data);
      setAttackButtonsDisabled(false);
    } catch (error) {
      setAttackButtonsDisabled(false);
      tg.showAlert(error.message);
    }
  });
}

export function closeAttackModal() {
  document.getElementById('attack-modal').classList.remove('active');
  currentTargetId = null;
  setAttackButtonsDisabled(false);
}

async function searchNewTarget() {
  await withOperationLock('findTarget', async () => {
    try {
      renderSearchState('Ищем противника', 'Смотрим, кто подойдёт для обычной атаки...');
      setAttackButtonsDisabled(true);
      await wait(TARGET_SEARCH_DELAY_MS);
      const data = await apiClient.getAttackTarget(appState.userId, 'default');
      currentTargetId = data.targetId;
      renderAttackTarget(data);
      setAttackButtonsDisabled(false);
    } catch (error) {
      setAttackButtonsDisabled(false);
      tg.showAlert(error.message);
    }
  });
}

async function searchBestTarget() {
  await withOperationLock('findBestTarget', async () => {
    try {
      renderSearchState('Ищем лучшую цель', 'После рекламы подбираем более выгодного противника...');
      setAttackButtonsDisabled(true);
      const adShown = await showRewardedAd(getAdsgramBlockId('building'));
      if (!adShown) {
        setAttackButtonsDisabled(false);
        tg.showAlert('Реклама не была просмотрена полностью. Лучшая цель не найдена.');
        return;
      }

      await wait(TARGET_SEARCH_DELAY_MS);
      const data = await apiClient.getAttackTarget(appState.userId, 'best');
      currentTargetId = data.targetId;
      renderAttackTarget(data);
      setAttackButtonsDisabled(false);
    } catch (error) {
      setAttackButtonsDisabled(false);
      tg.showAlert(error.message);
    }
  });
}

function renderSearchState(title, subtitle) {
  const body = document.getElementById('attack-modal-body');
  if (!body) return;

  body.innerHTML = `
    <div class="attack-search-state">
      <div class="attack-search-spinner"></div>
      <div class="attack-search-title">${title}</div>
      <div class="attack-search-subtitle">${subtitle}</div>
    </div>
  `;
}

function setAttackButtonsDisabled(disabled) {
  document.getElementById('confirm-attack-btn').disabled = disabled;
  document.getElementById('search-target-btn').disabled = disabled;
  document.getElementById('best-target-btn').disabled = disabled;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function confirmAttack() {
  if (!currentTargetId) {
    tg.showAlert('Ошибка: цель не выбрана');
    return;
  }

  await withOperationLock('performAttack', async () => {
    try {
      const result = await apiClient.performAttack(appState.userId, currentTargetId);
      renderAttackResult(result);
      window.updateResources && window.updateResources();
    } catch (error) {
      tg.showAlert(error.message);
    }
  });
}

function renderAttackTarget(data) {
  const body = document.getElementById('attack-modal-body');
  const { target, defenders } = data;
  const searchHint = data.searchMode === 'best'
    ? 'Подобрана более выгодная цель после просмотра рекламы.'
    : 'Обычный поиск чаще показывает менее выгодные цели.';
  
  let defendersHtml = '';
  if (defenders.length === 0) {
    defendersHtml = '<p style="color: #4caf50;">Без защиты!</p>';
  } else {
    defendersHtml = defenders.map(d => `
      <div class="soldier-item soldier-item-defender" style="margin-bottom: 5px; border-left-color: #ff6b6b;">
        <div class="soldier-item-accent soldier-item-accent-defender"></div>
        <span class="soldier-name-row">${getTroopIconHtml('defender', d.level, 'troop-list-icon', 'Защитник')}<span>Защитник ур. ${d.level}</span></span>
        <span class="soldier-count">${d.count}</span>
      </div>
    `).join('');
  }

  body.innerHTML = `
    <div class="target-card">
      <div class="target-name">${target.first_name} (@${target.username || '???'})</div>
      <div class="attack-empty-row" style="margin-bottom: 12px;">${searchHint}</div>
      <div class="target-resources">
        <div class="troop-stat-item">
          <span class="troop-stat-label">Jamcoin</span>
          <span class="troop-stat-value">${getResourceIconHtml('gold', 'resource-inline-icon', 'Jamcoin')}${formatNumber(target.gold)}</span>
        </div>
        <div class="troop-stat-item">
          <span class="troop-stat-label">Дерево</span>
          <span class="troop-stat-value">${getResourceIconHtml('wood', 'resource-inline-icon', 'Дерево')}${formatNumber(target.wood)}</span>
        </div>
        <div class="troop-stat-item">
          <span class="troop-stat-label">Камень</span>
          <span class="troop-stat-value">${getResourceIconHtml('stone', 'resource-inline-icon', 'Камень')}${formatNumber(target.stone)}</span>
        </div>
        <div class="troop-stat-item">
          <span class="troop-stat-label">Мясо</span>
          <span class="troop-stat-value">${getResourceIconHtml('meat', 'resource-inline-icon', 'Мясо')}${formatNumber(target.meat)}</span>
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
  document.getElementById('best-target-btn').onclick = searchBestTarget;
  document.getElementById('confirm-attack-btn').textContent = 'Атаковать';
  document.getElementById('search-target-btn').textContent = 'Искать';
  document.getElementById('best-target-btn').textContent = 'Найти лучшую цель [реклама]';
}

function renderAttackResult(result) {
  const body = document.getElementById('attack-modal-body');
  const confirmBtn = document.getElementById('confirm-attack-btn');
  const searchBtn = document.getElementById('search-target-btn');
  const bestBtn = document.getElementById('best-target-btn');

  body.innerHTML = `
    <div class="target-card attack-result-card ${result.won ? 'attack-result-win' : 'attack-result-lose'}">
      <div class="target-name attack-result-title">${result.won ? 'Победа' : 'Атака отражена'}</div>
      <div class="target-resources attack-result-summary">
        <div class="troop-stat-item">
          <span class="troop-stat-label">Ваши воины</span>
          <span class="troop-stat-value">${result.attackerTroopsCount}</span>
        </div>
        <div class="troop-stat-item">
          <span class="troop-stat-label">Вражеские</span>
          <span class="troop-stat-value">${result.defenderTroopsCount}</span>
        </div>
        <div class="troop-stat-item">
          <span class="troop-stat-label">Потери ваших</span>
          <span class="troop-stat-value">${result.attackersKilled}</span>
        </div>
        <div class="troop-stat-item">
          <span class="troop-stat-label">Убито врагов</span>
          <span class="troop-stat-value">${result.defendersKilled}</span>
        </div>
      </div>
      ${renderLossesBlock(result)}
      ${result.won ? renderLootBlock(result) : ''}
    </div>
  `;

  confirmBtn.textContent = 'Искать';
  confirmBtn.onclick = searchNewTarget;
  searchBtn.textContent = 'Закрыть';
  searchBtn.onclick = closeAttackModal;
  bestBtn.textContent = 'Найти лучшую цель [реклама]';
  bestBtn.onclick = searchBestTarget;
}

function renderLossesBlock(result) {
  return `
    <div class="target-defenders attack-result-section">
      <h4>Потери по уровням</h4>
      <div class="attack-loss-grid">
        <div class="attack-loss-card">
          <div class="attack-loss-title">Ваши</div>
          ${renderLevelCountRows(result.attackerLossesByLevel, 'attacker', 'Никто не погиб')}
        </div>
        <div class="attack-loss-card">
          <div class="attack-loss-title">Врага</div>
          ${renderLevelCountRows(result.defenderLossesByLevel, 'defender', 'Потерь нет')}
        </div>
      </div>
    </div>
  `;
}

function renderLootBlock(result) {
  const rows = [];
  for (let level = 1; level <= 6; level++) {
    const count = result.lootByLevel?.[level] || 0;
    if (!count) continue;
    const levelLoot = result.actualLootByLevel?.[level] || { gold: 0, wood: 0, stone: 0, meat: 0 };

    rows.push(`
      <div class="soldier-item soldier-item-attacker soldier-item-survivor" style="margin-bottom: 5px; border-left-color: #4caf50; display:block;">
        <div class="soldier-item-accent soldier-item-accent-attacker"></div>
        <div class="attack-survivor-title">${getTroopIconHtml('attacker', level, 'troop-list-icon', 'Атакующий')}<span>Ур. ${level}: ${count} выживших</span></div>
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
          <span>${getResourceIconHtml('gold', 'resource-inline-icon', 'Jamcoin')}${formatNumber(levelLoot.gold)}</span>
          <span>${getResourceIconHtml('wood', 'resource-inline-icon', 'Дерево')}${formatNumber(levelLoot.wood)}</span>
          <span>${getResourceIconHtml('stone', 'resource-inline-icon', 'Камень')}${formatNumber(levelLoot.stone)}</span>
          <span>${getResourceIconHtml('meat', 'resource-inline-icon', 'Мясо')}${formatNumber(levelLoot.meat)}</span>
        </div>
      </div>
    `);
  }

  return `
    <div class="target-defenders attack-result-section">
      <h4>Добыча:</h4>
      ${rows.join('')}
      <div class="soldier-item" style="border-left-color: #d4af37; display:block; margin-top:8px;">
        <div style="font-weight:700; margin-bottom:4px;">Итого</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
          <span>${getResourceIconHtml('gold', 'resource-inline-icon', 'Jamcoin')}${formatNumber(result.loot.gold)}</span>
          <span>${getResourceIconHtml('wood', 'resource-inline-icon', 'Дерево')}${formatNumber(result.loot.wood)}</span>
          <span>${getResourceIconHtml('stone', 'resource-inline-icon', 'Камень')}${formatNumber(result.loot.stone)}</span>
          <span>${getResourceIconHtml('meat', 'resource-inline-icon', 'Мясо')}${formatNumber(result.loot.meat)}</span>
        </div>
      </div>
    </div>
  `;
}

function renderLevelCountRows(levelMap = {}, troopType, emptyText) {
  const rows = [];

  for (let level = 1; level <= 6; level++) {
    const count = Number(levelMap[level] || 0);
    if (!count) continue;
    rows.push(`
      <div class="attack-level-row">
        <span class="attack-level-chip">${getTroopIconHtml(troopType, level, 'troop-badge-icon', 'Воин')} Ур. ${level}</span>
        <span class="attack-level-count">${count}</span>
      </div>
    `);
  }

  if (rows.length === 0) {
    return `<div class="attack-empty-row">${emptyText}</div>`;
  }

  return rows.join('');
}

window.closeAttackModal = closeAttackModal;
window.openAttackMenu = openAttackMenu;
