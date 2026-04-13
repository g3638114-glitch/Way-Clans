import { formatNumberShort, formatNumber } from '../utils/formatters.js';

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
  if (exchangeGoldEl) exchangeGoldEl.textContent = `💰 ${goldText}`;

  // Reset input fields
  document.getElementById('wood-input').max = currentUser.wood;
  document.getElementById('stone-input').max = currentUser.stone;
  document.getElementById('meat-input').max = currentUser.meat;
}

// Import config for storage/treasury capacities
import { getStorageCapacity, getTreasuryCapacity } from '../game/config.js';

// Update Treasury info modal
export function updateTreasuryModal(user) {
  if (!user) return;

  const treasuryLevel = user.treasury_level || 1;
  const treasuryCapacity = getTreasuryCapacity(treasuryLevel);
  const treasuryAmount = user.gold || 0;
  const progressPercent = (treasuryAmount / treasuryCapacity) * 100;

  document.getElementById('treasury-level-display').textContent = treasuryLevel;
  document.getElementById('treasury-current-amount').textContent = formatNumber(treasuryAmount);
  document.getElementById('treasury-capacity-display').textContent = formatNumber(treasuryCapacity);

  const statusBar = document.getElementById('treasury-status-bar');
  if (statusBar) {
    statusBar.style.width = Math.min(progressPercent, 100) + '%';
    statusBar.textContent = progressPercent.toFixed(0) + '%';
  }
}

// Update Storage info modal
export function updateStorageModal(user) {
  if (!user) return;

  const storageLevel = user.storage_level || 1;
  const storageCapacity = getStorageCapacity(storageLevel);

  document.getElementById('storage-level-display').textContent = storageLevel;
  document.getElementById('storage-capacity-display').textContent = formatNumber(storageCapacity);

  document.getElementById('storage-wood-amount').textContent = formatNumber(user.wood || 0);
  document.getElementById('storage-wood-limit').textContent = formatNumber(storageCapacity);

  document.getElementById('storage-stone-amount').textContent = formatNumber(user.stone || 0);
  document.getElementById('storage-stone-limit').textContent = formatNumber(storageCapacity);

  document.getElementById('storage-meat-amount').textContent = formatNumber(user.meat || 0);
  document.getElementById('storage-meat-limit').textContent = formatNumber(storageCapacity);
}

// Update Storage/Treasury upgrade modals with cost and capacity info
export function updateStorageUpgradeModal(user) {
  if (!user) return;

  const currentLevel = user.storage_level || 1;
  if (currentLevel >= 5) return;

  const nextLevel = currentLevel + 1;
  const currentCapacity = getStorageCapacity(currentLevel);
  const newCapacity = getStorageCapacity(nextLevel);

  // Import config to get costs
  import('../game/config.js').then(({ getStorageCost }) => {
    const cost = getStorageCost(nextLevel);
    if (!cost) return;

    document.getElementById('storage-upgrade-current-level').textContent = currentLevel;
    document.getElementById('storage-upgrade-new-level').textContent = nextLevel;
    document.getElementById('storage-upgrade-current-capacity').textContent = formatNumber(currentCapacity);
    document.getElementById('storage-upgrade-new-capacity').textContent = formatNumber(newCapacity);

    document.getElementById('storage-upgrade-cost-gold').textContent = formatNumber(cost.gold);
    document.getElementById('storage-upgrade-cost-stone').textContent = formatNumber(cost.stone);
    document.getElementById('storage-upgrade-cost-wood').textContent = formatNumber(cost.wood);
  });
}

export function updateTreasuryUpgradeModal(user) {
  if (!user) return;

  const currentLevel = user.treasury_level || 1;
  if (currentLevel >= 5) return;

  const nextLevel = currentLevel + 1;
  const currentCapacity = getTreasuryCapacity(currentLevel);
  const newCapacity = getTreasuryCapacity(nextLevel);

  import('../game/config.js').then(({ getTreasuryCost }) => {
    const cost = getTreasuryCost(nextLevel);
    if (!cost) return;

    document.getElementById('treasury-upgrade-current-level').textContent = currentLevel;
    document.getElementById('treasury-upgrade-new-level').textContent = nextLevel;
    document.getElementById('treasury-upgrade-current-capacity').textContent = formatNumber(currentCapacity);
    document.getElementById('treasury-upgrade-new-capacity').textContent = formatNumber(newCapacity);

    document.getElementById('treasury-upgrade-cost-gold').textContent = formatNumber(cost.gold);
    document.getElementById('treasury-upgrade-cost-stone').textContent = formatNumber(cost.stone);
    document.getElementById('treasury-upgrade-cost-wood').textContent = formatNumber(cost.wood);
  });
}
