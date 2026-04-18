import { formatNumberShort, formatNumber, formatDurationMs } from '../utils/formatters.js';
import { getResourceIconHtml } from '../utils/resourceIcons.js';
import { getTreasuryCapacity, getWarehouseCapacity } from '../game/config.js';

/**
 * Generate initials or fallback emoji for avatar
 * Returns user's initials (e.g., "JD" for John Doe) or emoji fallback
 */
function generateAvatarInitials(user) {
  if (!user) return '🧑';

  // Try to get initials from first name and username
  const firstName = user.first_name || '';
  const username = user.username || '';

  if (firstName && username) {
    // Use first letter of first name + first letter of username
    return (firstName.charAt(0) + username.charAt(0)).toUpperCase();
  } else if (firstName) {
    // Use first two letters of first name
    return firstName.substring(0, 2).toUpperCase();
  } else if (username) {
    // Use first two letters of username
    return username.substring(0, 2).toUpperCase();
  }

  // Default emoji if no name available
  return '🧑';
}

// Update UI with user data
export function updateUI(currentUser) {
  if (!currentUser) return;

  // Update resources - use short format for header to prevent wrapping
  const goldText = formatNumberShort(currentUser.gold);
  const goldFullText = formatNumber(currentUser.gold);
  const woodText = formatNumberShort(currentUser.wood);
  const stoneText = formatNumberShort(currentUser.stone);
  const meatText = formatNumberShort(currentUser.meat);
  const jabcoinsText = currentUser.jabcoins;

  // Update header resources
  const goldEl = document.getElementById('gold-value');
  const woodEl = document.getElementById('wood-value');
  const stoneEl = document.getElementById('stone-value');
  const meatEl = document.getElementById('meat-value');
  const jabcoinsEl = document.getElementById('jabcoins-value');

  if (goldEl) goldEl.textContent = goldText;
  if (woodEl) woodEl.textContent = woodText;
  if (stoneEl) stoneEl.textContent = stoneText;
  if (meatEl) meatEl.textContent = meatText;
  if (jabcoinsEl) jabcoinsEl.textContent = jabcoinsText;

  const treasuryCapacity = getTreasuryCapacity(currentUser.treasury_level || 1);
  const warehouseCapacity = getWarehouseCapacity(currentUser.warehouse_level || 1);
  const treasuryProgress = treasuryCapacity > 0 ? Math.min(100, Math.round(((currentUser.gold || 0) / treasuryCapacity) * 100)) : 0;
  const woodProgress = warehouseCapacity > 0 ? Math.round(((currentUser.wood || 0) / warehouseCapacity) * 100) : 0;
  const stoneProgress = warehouseCapacity > 0 ? Math.round(((currentUser.stone || 0) / warehouseCapacity) * 100) : 0;
  const meatProgress = warehouseCapacity > 0 ? Math.round(((currentUser.meat || 0) / warehouseCapacity) * 100) : 0;
  const warehouseProgress = Math.max(woodProgress, stoneProgress, meatProgress);

  applyCapacityState(goldEl?.closest('.resource-item'), treasuryProgress);
  applyCapacityState(woodEl?.closest('.resource-item'), woodProgress);
  applyCapacityState(stoneEl?.closest('.resource-item'), stoneProgress);
  applyCapacityState(meatEl?.closest('.resource-item'), meatProgress);

  // Update Jamcoin earned display on mining page with full number (no abbreviations)
  const jamcoinEarnedEl = document.getElementById('jamcoin-earned-display');
  if (jamcoinEarnedEl) jamcoinEarnedEl.textContent = goldFullText;

  // Update Jamcoin from clicks display
  const jamcoinsFromClicksEl = document.getElementById('jamcoins-from-clicks-display');
  if (jamcoinsFromClicksEl) {
    const jamcoinsFromClicks = currentUser.jamcoins_from_clicks || 0;
    jamcoinsFromClicksEl.textContent = formatNumber(jamcoinsFromClicks);
  }

  // Update player card
  document.getElementById('player-name').textContent = currentUser.first_name || 'Player';
  document.getElementById('player-username').textContent = `@${currentUser.username || 'unknown'}`;
  document.getElementById('player-id').textContent = currentUser.telegram_id;

  updatePlayerStatus(currentUser, treasuryProgress, warehouseProgress);

  // Update avatar with Telegram profile photo if available, otherwise show initials/fallback
  const avatarEl = document.getElementById('avatar-image');
  if (avatarEl) {
    if (currentUser.photo_url) {
      // Use Telegram profile photo
      avatarEl.style.backgroundImage = `url('${currentUser.photo_url}')`;
      avatarEl.textContent = ''; // Clear emoji placeholder
      avatarEl.classList.add('avatar-has-photo');
      avatarEl.classList.remove('avatar-fallback');
    } else {
      // Show fallback avatar with initials or emoji
      avatarEl.style.backgroundImage = '';
      const initials = generateAvatarInitials(currentUser);
      avatarEl.textContent = initials;
      avatarEl.classList.add('avatar-fallback');
      avatarEl.classList.remove('avatar-has-photo');
    }
  }

  // Update storage modal
  const storageWoodEl = document.getElementById('storage-wood');
  const storageStonEl = document.getElementById('storage-stone');
  const storageMeatEl = document.getElementById('storage-meat');

  if (storageWoodEl) storageWoodEl.textContent = woodText;
  if (storageStonEl) storageStonEl.textContent = stoneText;
  if (storageMeatEl) storageMeatEl.textContent = meatText;

  // Update exchange modal
  const exchangeGoldEl = document.getElementById('exchange-gold');
  if (exchangeGoldEl) exchangeGoldEl.innerHTML = `${getResourceIconHtml('gold', 'resource-inline-icon-lg', 'Jamcoin')} ${goldText}`;

  // Reset input fields
  document.getElementById('wood-input').max = currentUser.wood;
  document.getElementById('stone-input').max = currentUser.stone;
  document.getElementById('meat-input').max = currentUser.meat;
}

function applyCapacityState(element, progress) {
  if (!element) return;

  element.classList.remove('is-warning', 'is-danger');

  if (progress >= 100) {
    element.classList.add('is-danger');
  } else if (progress >= 85) {
    element.classList.add('is-warning');
  }
}

function updatePlayerStatus(currentUser, treasuryProgress, warehouseProgress) {
  const shieldEl = document.getElementById('shield-status');
  const treasuryEl = document.getElementById('treasury-status');
  const warehouseEl = document.getElementById('warehouse-status');

  if (shieldEl) {
    shieldEl.classList.remove('is-active', 'is-warning', 'is-danger');

    if (currentUser.shield_until) {
      const shieldUntilMs = new Date(currentUser.shield_until).getTime();
      const remainingMs = shieldUntilMs - Date.now();

      if (remainingMs > 0) {
        shieldEl.textContent = `Щит: ${formatDurationMs(remainingMs)}`;
        shieldEl.classList.add('is-active');
      } else {
        shieldEl.textContent = 'Щит: нет';
      }
    } else {
      shieldEl.textContent = 'Щит: нет';
    }
  }

  if (treasuryEl) {
    treasuryEl.textContent = `Казна: ${treasuryProgress}%`;
    treasuryEl.classList.remove('is-warning', 'is-danger');
    if (treasuryProgress >= 100) treasuryEl.classList.add('is-danger');
    else if (treasuryProgress >= 85) treasuryEl.classList.add('is-warning');
  }

  if (warehouseEl) {
    warehouseEl.textContent = `Склад: ${warehouseProgress}%`;
    warehouseEl.classList.remove('is-warning', 'is-danger');
    if (warehouseProgress >= 100) warehouseEl.classList.add('is-danger');
    else if (warehouseProgress >= 85) warehouseEl.classList.add('is-warning');
  }
}
