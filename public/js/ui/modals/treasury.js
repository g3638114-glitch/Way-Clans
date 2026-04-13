import { appState } from '../../utils/state.js';
import { apiClient } from '../../api/client.js';
import { updateUI } from '../dom.js';
import { formatNumber } from '../../utils/formatters.js';
import { getTreasuryLimit, getTreasuryUpgradeCost, isMaxTreasuryLevel, getMaxTreasuryLevel } from '../../game/treasury.js';

export function openTreasuryModal() {
  refreshTreasuryData();
  document.getElementById('treasury-modal').classList.add('active');
}

export function closeTreasuryModal() {
  document.getElementById('treasury-modal').classList.remove('active');
}

async function refreshTreasuryData() {
  try {
    // Fetch current treasury data from server
    const treasuryData = await apiClient.getTreasury(appState.userId);
    const treasury = treasuryData.treasury;

    // Update level and max level
    const currentLevel = treasury.level;
    const maxLevel = getMaxTreasuryLevel();
    const currentLimit = getTreasuryLimit(currentLevel);

    document.getElementById('treasury-current-level').textContent = currentLevel;
    document.getElementById('treasury-max-level').textContent = maxLevel;

    // Update capacity
    const currentJabcoins = appState.currentUser.jabcoins;
    document.getElementById('treasury-current-amount').textContent = formatNumber(currentJabcoins);
    document.getElementById('treasury-limit').textContent = formatNumber(currentLimit);

    // Calculate and update progress bar
    const progressPercent = (currentJabcoins / currentLimit) * 100;
    const progressBar = document.getElementById('treasury-progress-bar');
    progressBar.style.width = `${Math.min(progressPercent, 100)}%`;

    // Color progress bar based on fullness
    if (progressPercent >= 100) {
      progressBar.style.backgroundColor = '#ff6b6b'; // Red when full
    } else if (progressPercent >= 70) {
      progressBar.style.backgroundColor = '#ffd43b'; // Yellow when mostly full
    } else {
      progressBar.style.backgroundColor = '#51cf66'; // Green when not full
    }

    // Update next level info
    if (isMaxTreasuryLevel(currentLevel)) {
      // Show max treasury message
      document.getElementById('treasury-upgrade-info').style.display = 'none';
      document.getElementById('treasury-max-message').style.display = 'block';
      document.getElementById('treasury-upgrade-btn').disabled = true;
      document.getElementById('treasury-upgrade-btn').classList.add('disabled');
    } else {
      document.getElementById('treasury-upgrade-info').style.display = 'block';
      document.getElementById('treasury-max-message').style.display = 'none';
      document.getElementById('treasury-upgrade-btn').disabled = false;
      document.getElementById('treasury-upgrade-btn').classList.remove('disabled');

      const nextLevel = currentLevel + 1;
      const nextLimit = getTreasuryLimit(nextLevel);
      const upgradeCost = getTreasuryUpgradeCost(currentLevel);

      document.getElementById('treasury-next-level').textContent = nextLevel;
      document.getElementById('treasury-next-limit').textContent = formatNumber(nextLimit);

      // Update cost and availability
      const hasJamcoin = appState.currentUser.jabcoins >= upgradeCost.jamcoin;
      const hasStone = appState.currentUser.stone >= upgradeCost.stone;
      const hasWood = appState.currentUser.wood >= upgradeCost.wood;
      const canAfford = hasJamcoin && hasStone && hasWood;

      // Update cost display
      document.getElementById('treasury-cost-jamcoin').textContent = formatNumber(upgradeCost.jamcoin);
      document.getElementById('treasury-have-jamcoin').textContent = `(всего: ${formatNumber(appState.currentUser.jabcoins)})`;
      document.getElementById('treasury-cost-jamcoin').style.color = hasJamcoin ? '#51cf66' : '#ff6b6b';

      document.getElementById('treasury-cost-stone').textContent = formatNumber(upgradeCost.stone);
      document.getElementById('treasury-have-stone').textContent = `(всего: ${formatNumber(appState.currentUser.stone)})`;
      document.getElementById('treasury-cost-stone').style.color = hasStone ? '#51cf66' : '#ff6b6b';

      document.getElementById('treasury-cost-wood').textContent = formatNumber(upgradeCost.wood);
      document.getElementById('treasury-have-wood').textContent = `(всего: ${formatNumber(appState.currentUser.wood)})`;
      document.getElementById('treasury-cost-wood').style.color = hasWood ? '#51cf66' : '#ff6b6b';

      // Enable/disable upgrade button
      if (canAfford) {
        document.getElementById('treasury-upgrade-btn').disabled = false;
        document.getElementById('treasury-upgrade-btn').classList.remove('disabled');
      } else {
        document.getElementById('treasury-upgrade-btn').disabled = true;
        document.getElementById('treasury-upgrade-btn').classList.add('disabled');
      }
    }
  } catch (error) {
    console.error('Error refreshing treasury data:', error);
    window.tg.showAlert('Error loading treasury data');
  }
}

export async function upgradeTreasury() {
  try {
    const result = await apiClient.upgradeTreasury(appState.userId);
    
    // Update app state
    appState.currentUser = result.user;
    updateUI(appState.currentUser);

    // Refresh modal to show new level
    refreshTreasuryData();
    
    window.tg.showAlert(`✅ Казна улучшена! Новый уровень: ${result.treasury.level}`);
  } catch (error) {
    console.error('Error upgrading treasury:', error);
    window.tg.showAlert(error.message || 'Error upgrading treasury');
  }
}
