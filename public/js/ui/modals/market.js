import { appState } from '../../utils/state.js';
import { apiClient } from '../../api/client.js';
import { updateUI } from '../dom.js';
import { formatNumber } from '../../utils/formatters.js';

// Store current context for modals
let currentMarketContext = {
  resourceType: null,
  currentListing: null,
  currentQuantity: 0,
  pricePerUnit: 0,
};

// ============ MARKET SELL MODAL ============

export function openMarketSellModal(resourceType) {
  const modal = document.getElementById('market-sell-modal');
  const user = appState.currentUser;

  if (!user) return;

  currentMarketContext.resourceType = resourceType;

  // Get available quantity based on resource type
  const availableQty = user[resourceType] || 0;
  currentMarketContext.currentQuantity = availableQty;

  // Update modal title and available quantity
  const resourceNames = { wood: 'Дерево', stone: 'Камень', meat: 'Мясо' };
  const resourceEmojis = { wood: '🌲', stone: '🪨', meat: '🍖' };

  document.getElementById('market-sell-title').textContent = `${resourceEmojis[resourceType]} Продать ${resourceNames[resourceType]}`;
  document.getElementById('market-sell-available-qty').textContent = formatNumber(availableQty);

  // Clear input fields
  document.getElementById('market-sell-quantity').value = '';
  document.getElementById('market-sell-price').value = '';
  document.getElementById('market-sell-total').textContent = '0';

  // Set max available
  document.getElementById('market-sell-quantity').max = availableQty;

  // Show modal
  modal.style.display = 'flex';
}

export function closeMarketSellModal() {
  const modal = document.getElementById('market-sell-modal');
  modal.style.display = 'none';
  currentMarketContext.resourceType = null;
}

export function setMaxMarketSellQuantity() {
  const availableQty = appState.currentUser[currentMarketContext.resourceType] || 0;
  document.getElementById('market-sell-quantity').value = availableQty;
  updateMarketSellTotal();
}

export function updateMarketSellTotal() {
  const quantity = parseInt(document.getElementById('market-sell-quantity').value) || 0;
  const price = parseInt(document.getElementById('market-sell-price').value) || 0;
  const total = quantity * price;

  document.getElementById('market-sell-total').textContent = formatNumber(total);
}

export async function confirmMarketSell() {
  const quantity = parseInt(document.getElementById('market-sell-quantity').value) || 0;
  const pricePerUnit = parseInt(document.getElementById('market-sell-price').value) || 0;
  const resourceType = currentMarketContext.resourceType;

  if (quantity <= 0) {
    tg.showAlert('❌ Введите количество');
    return;
  }

  if (pricePerUnit <= 0) {
    tg.showAlert('❌ Введите цену');
    return;
  }

  try {
    const result = await apiClient.createMarketListing(appState.userId, resourceType, quantity, pricePerUnit);

    if (result.success) {
      tg.showAlert(`✅ Объявление выставлено! Всего получите: ${formatNumber(quantity * pricePerUnit)} 💰`);
      closeMarketSellModal();
      // Refresh user data
      const user = await apiClient.getUser(appState.userId);
      appState.currentUser = user;
      updateUI(user);
    }
  } catch (error) {
    console.error('Error creating listing:', error);
    tg.showAlert(`❌ ${error.message || 'Ошибка при создании объявления'}`);
  }
}

// ============ MARKET BUY MODAL ============

export function openMarketBuyModal(listing) {
  const modal = document.getElementById('market-buy-modal');
  const user = appState.currentUser;

  if (!user) return;

  currentMarketContext.currentListing = listing;
  currentMarketContext.pricePerUnit = listing.price_per_unit;

  // Get resource name and emoji
  const resourceNames = { wood: 'Дерево', stone: 'Камень', meat: 'Мясо' };
  const resourceEmojis = { wood: '🌲', stone: '🪨', meat: '🍖' };

  document.getElementById('market-buy-title').textContent = `Купить ${resourceNames[listing.resource_type]}`;
  document.getElementById('market-buy-price').textContent = formatNumber(listing.price_per_unit);
  document.getElementById('market-buy-available').textContent = formatNumber(listing.quantity);
  document.getElementById('market-buy-balance').textContent = formatNumber(user.gold || 0);

  // Clear input fields
  document.getElementById('market-buy-quantity').value = '';
  document.getElementById('market-buy-quantity').max = listing.quantity;
  document.getElementById('market-buy-total-cost').textContent = '0';

  // Show modal
  modal.style.display = 'flex';
}

export function closeMarketBuyModal() {
  const modal = document.getElementById('market-buy-modal');
  modal.style.display = 'none';
  currentMarketContext.currentListing = null;
}

export function setMaxMarketBuyQuantity() {
  const maxQty = currentMarketContext.currentListing?.quantity || 0;
  document.getElementById('market-buy-quantity').value = maxQty;
  updateMarketBuyTotal();
}

export function updateMarketBuyTotal() {
  const quantity = parseInt(document.getElementById('market-buy-quantity').value) || 0;
  const pricePerUnit = currentMarketContext.pricePerUnit || 0;
  const total = quantity * pricePerUnit;

  document.getElementById('market-buy-total-cost').textContent = formatNumber(total);
}

export async function confirmMarketBuy() {
  const quantity = parseInt(document.getElementById('market-buy-quantity').value) || 0;
  const listing = currentMarketContext.currentListing;

  if (quantity <= 0) {
    tg.showAlert('❌ Введите количество');
    return;
  }

  if (quantity > listing.quantity) {
    tg.showAlert('❌ Недостаточно товара');
    return;
  }

  try {
    const result = await apiClient.buyMarketListing(appState.userId, listing.id, quantity);

    if (result.success) {
      tg.showAlert(`✅ Вы купили ${quantity} единиц! Потрачено: ${formatNumber(quantity * listing.price_per_unit)} 💰`);
      closeMarketBuyModal();
      // Refresh user data
      const user = await apiClient.getUser(appState.userId);
      appState.currentUser = user;
      updateUI(user);
      // Refresh listings
      const listings = await apiClient.getMarketListingsByResource(listing.resource_type);
      renderMarketListings(listing.resource_type, listings);
    }
  } catch (error) {
    console.error('Error buying listing:', error);
    tg.showAlert(`❌ ${error.message || 'Ошибка при покупке'}`);
  }
}

// ============ MARKET MY LISTINGS MODAL ============

export async function openMarketMyListingsModal() {
  const modal = document.getElementById('market-my-listings-modal');

  try {
    const listings = await apiClient.getUserMarketListings(appState.userId);
    renderMyListings(listings);
    modal.style.display = 'flex';
  } catch (error) {
    console.error('Error fetching my listings:', error);
    tg.showAlert(`❌ Ошибка при загрузке объявлений`);
  }
}

export function closeMarketMyListingsModal() {
  const modal = document.getElementById('market-my-listings-modal');
  modal.style.display = 'none';
}

function renderMyListings(listings) {
  const container = document.getElementById('my-listings-container');

  if (!listings || listings.length === 0) {
    container.innerHTML = '<p class="no-listings">У вас нет активных объявлений</p>';
    return;
  }

  const resourceNames = { wood: 'Дерево', stone: 'Камень', meat: 'Мясо' };
  const resourceEmojis = { wood: '🌲', stone: '🪨', meat: '🍖' };

  container.innerHTML = listings.map(listing => `
    <div class="listing-card">
      <div class="listing-header">
        <h3>${resourceEmojis[listing.resource_type]} ${resourceNames[listing.resource_type]}</h3>
      </div>
      <div class="listing-details">
        <div class="listing-row">
          <span>Количество:</span>
          <strong>${formatNumber(listing.quantity)}</strong>
        </div>
        <div class="listing-row">
          <span>Цена за 1:</span>
          <strong>${formatNumber(listing.price_per_unit)} 💰</strong>
        </div>
        <div class="listing-row">
          <span>Итого:</span>
          <strong>${formatNumber(listing.total_price)} 💰</strong>
        </div>
      </div>
      <div class="listing-actions">
        <button class="btn btn-small" onclick="openMarketEditModal('${listing.id}', '${listing.resource_type}', ${listing.quantity}, ${listing.price_per_unit})">✏️ Редактировать</button>
        <button class="btn btn-small btn-danger" onclick="deleteMarketListing('${listing.id}')">🗑️ Удалить</button>
      </div>
    </div>
  `).join('');
}

// ============ MARKET EDIT MODAL ============

export function openMarketEditModal(listingId, resourceType, quantity, currentPrice) {
  const modal = document.getElementById('market-edit-modal');

  currentMarketContext.currentListing = { id: listingId, resource_type: resourceType, quantity, price_per_unit: currentPrice };

  const resourceNames = { wood: 'Дерево', stone: 'Камень', meat: 'Мясо' };

  document.getElementById('market-edit-title').textContent = 'Отредактировать объявление';
  document.getElementById('market-edit-resource').textContent = resourceNames[resourceType];
  document.getElementById('market-edit-quantity').textContent = formatNumber(quantity);
  document.getElementById('market-edit-price').value = currentPrice;

  updateMarketEditTotal();

  modal.style.display = 'flex';
}

export function closeMarketEditModal() {
  const modal = document.getElementById('market-edit-modal');
  modal.style.display = 'none';
  currentMarketContext.currentListing = null;
}

export function updateMarketEditTotal() {
  const quantity = parseInt(document.getElementById('market-edit-quantity').textContent) || 0;
  const newPrice = parseInt(document.getElementById('market-edit-price').value) || 0;
  const total = quantity * newPrice;

  document.getElementById('market-edit-total').textContent = formatNumber(total);
}

export async function confirmMarketEdit() {
  const listingId = currentMarketContext.currentListing?.id;
  const newPrice = parseInt(document.getElementById('market-edit-price').value) || 0;

  if (newPrice <= 0) {
    tg.showAlert('❌ Введите правильную цену');
    return;
  }

  try {
    const result = await apiClient.editMarketListing(appState.userId, listingId, newPrice);

    if (result.success) {
      tg.showAlert('✅ Объявление обновлено!');
      closeMarketEditModal();
      // Refresh my listings
      const listings = await apiClient.getUserMarketListings(appState.userId);
      renderMyListings(listings);
    }
  } catch (error) {
    console.error('Error editing listing:', error);
    tg.showAlert(`❌ ${error.message || 'Ошибка при редактировании'}`);
  }
}

// ============ DELETE LISTING ============

export async function deleteMarketListing(listingId) {
  if (!confirm('Вы уверены? Ресурсы вернутся на ваш баланс.')) {
    return;
  }

  try {
    const result = await apiClient.deleteMarketListing(appState.userId, listingId);

    if (result.success) {
      tg.showAlert('✅ Объявление удалено!');
      // Refresh user data and my listings
      const user = await apiClient.getUser(appState.userId);
      appState.currentUser = user;
      updateUI(user);
      const listings = await apiClient.getUserMarketListings(appState.userId);
      renderMyListings(listings);
    }
  } catch (error) {
    console.error('Error deleting listing:', error);
    tg.showAlert(`❌ ${error.message || 'Ошибка при удалении'}`);
  }
}

// ============ RENDER MARKET LISTINGS ============

export function renderMarketListings(resourceType, listings) {
  const container = document.getElementById('market-listings-container');
  const resourceNames = { wood: 'Дерево', stone: 'Камень', meat: 'Мясо' };
  const resourceEmojis = { wood: '🌲', stone: '🪨', meat: '🍖' };

  if (!listings || listings.length === 0) {
    container.innerHTML = `<p class="no-listings">Нет объявлений для ${resourceNames[resourceType]}</p>`;
    return;
  }

  container.innerHTML = listings.map(listing => `
    <div class="market-listing-card">
      <div class="listing-seller">
        <span class="seller-name">${listing.seller?.first_name || 'Unknown'}</span>
        <span class="seller-id">ID: ${listing.seller?.telegram_id || 'N/A'}</span>
      </div>
      <div class="listing-item">
        <div class="item-info">
          <strong>${formatNumber(listing.quantity)}</strong> шт. ${resourceEmojis[resourceType]}
        </div>
        <div class="item-price">
          <span class="price-per-unit">${formatNumber(listing.price_per_unit)} 💰 за шт.</span>
          <span class="price-total">${formatNumber(listing.total_price)} 💰</span>
        </div>
      </div>
      <button class="btn btn-buy" onclick="openMarketBuyModal({id: '${listing.id}', resource_type: '${listing.resource_type}', quantity: ${listing.quantity}, price_per_unit: ${listing.price_per_unit}})">Купить</button>
    </div>
  `).join('');
}

// Make functions available globally for onclick handlers
window.openMarketEditModal = openMarketEditModal;
window.deleteMarketListing = deleteMarketListing;
window.openMarketBuyModal = openMarketBuyModal;
