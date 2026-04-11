import { formatNumberShort, formatNumber } from '../utils/formatters.js';

// Update UI with user data
export function updateUI(currentUser) {
  if (!currentUser) return;

  // Update resources - use short format for header to prevent wrapping
  const goldText = formatNumberShort(currentUser.gold);
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

  // Update player card
  document.getElementById('player-name').textContent = currentUser.first_name || 'Player';
  document.getElementById('player-username').textContent = `@${currentUser.username || 'unknown'}`;
  document.getElementById('player-id').textContent = currentUser.telegram_id;

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
