import { appState } from '../../utils/state.js';
import { apiClient } from '../../api/client.js';
import { updateUI } from '../dom.js';

// State for sell price modal
let currentSellResource = null;
let currentSellQuantity = 1;
let currentSellPrice = 0;

// State for buy modal
let currentListingId = null;
let currentBuyQuantity = 1;
let currentBuyPrice = 0;
let currentBuyAvailable = 0;

// State for market modal
let currentMarketFilter = 'wood';

export function openMarketModal() {
  renderMarketListings('wood');
  currentMarketFilter = 'wood';
  document.getElementById('market-modal').classList.add('active');
}

export function closeMarketModal() {
  document.getElementById('market-modal').classList.remove('active');
}

export function openSellPriceModal(resourceType) {
  currentSellResource = resourceType;
  currentSellQuantity = 1;
  currentSellPrice = 0;

  // Update display
  const resourceIcons = { wood: '🌲', stone: '🪨', meat: '🍖' };
  const resourceNames = { wood: 'Дерево', stone: 'Камень', meat: 'Мясо' };

  document.getElementById('sell-resource-type').textContent = `${resourceIcons[resourceType]} ${resourceNames[resourceType]}`;
  document.getElementById('sell-price-input').value = '';
  document.getElementById('sell-quantity-input').value = '1';
  document.getElementById('sell-price-display').textContent = '0';
  document.getElementById('sell-total-price').textContent = '0';

  closeWarehouseSellModal();
  document.getElementById('sell-price-modal').classList.add('active');
}

export function closeSellPriceModal() {
  document.getElementById('sell-price-modal').classList.remove('active');
  currentSellResource = null;
  currentSellQuantity = 1;
  currentSellPrice = 0;
}

export function incrementSellQuantity() {
  const maxQuantity = appState.currentUser[currentSellResource] || 0;
  if (currentSellQuantity < maxQuantity) {
    currentSellQuantity++;
    updateSellPriceDisplay();
  }
}

export function decrementSellQuantity() {
  if (currentSellQuantity > 1) {
    currentSellQuantity--;
    updateSellPriceDisplay();
  }
}

export function setSellMaxQuantity() {
  currentSellQuantity = appState.currentUser[currentSellResource] || 0;
  document.getElementById('sell-quantity-input').value = currentSellQuantity;
  updateSellPriceDisplay();
}

function updateSellPriceDisplay() {
  const priceInput = document.getElementById('sell-price-input').value;
  currentSellPrice = parseInt(priceInput) || 0;

  document.getElementById('sell-quantity-input').value = currentSellQuantity;
  document.getElementById('sell-price-display').textContent = currentSellPrice;

  const total = currentSellPrice * currentSellQuantity;
  document.getElementById('sell-total-price').textContent = total;
}

export async function confirmSellPrice() {
  try {
    const priceInput = parseInt(document.getElementById('sell-price-input').value);
    const quantityInput = parseInt(document.getElementById('sell-quantity-input').value);

    if (!priceInput || priceInput < 1) {
      tg.showAlert('Введите корректную цену');
      return;
    }

    if (!quantityInput || quantityInput < 1) {
      tg.showAlert('Введите корректное количество');
      return;
    }

    const maxQuantity = appState.currentUser[currentSellResource] || 0;
    if (quantityInput > maxQuantity) {
      tg.showAlert(`Недостаточно ресурсов. Доступно: ${maxQuantity}`);
      return;
    }

    const result = await apiClient.createMarketListing(
      appState.userId,
      currentSellResource,
      quantityInput,
      priceInput
    );

    appState.currentUser[currentSellResource] -= quantityInput;
    updateUI(appState.currentUser);
    closeSellPriceModal();
    tg.showAlert('✅ Объявление выставлено на рынок!');

    // Refresh market view if it's open
    if (document.getElementById('market-modal').classList.contains('active')) {
      renderMarketListings(currentMarketFilter);
    }
  } catch (error) {
    console.error('Error creating listing:', error);
    tg.showAlert(error.message || 'Ошибка при создании объявления');
  }
}

export function filterMarketByResource(resourceType) {
  // Update active button
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');

  currentMarketFilter = resourceType;
  renderMarketListings(resourceType);
}

async function renderMarketListings(resourceType) {
  try {
    const container = document.getElementById('market-listings-container');
    container.innerHTML = '<p style="text-align: center;">Загрузка...</p>';

    let listings = [];
    let currentUserId = null;

    if (resourceType === 'my-listings') {
      const result = await apiClient.getMyMarketListings(appState.userId);
      listings = result.listings || [];
    } else {
      const result = await apiClient.getMarketListings(appState.userId, resourceType);
      listings = result.listings || [];
    }

    if (listings.length === 0) {
      container.innerHTML = `
        <div class="empty-listings">
          <p>📭 Объявлений нет</p>
          <p class="summary-small">Проверьте позже</p>
        </div>
      `;
      return;
    }

    const resourceIcons = { wood: '🌲', stone: '🪨', meat: '🍖' };
    const resourceNames = { wood: 'Дерево', stone: 'Камень', meat: 'Мясо' };

    let html = '<div class="market-listings-list">';

    for (const listing of listings) {
      const isMyListing = resourceType === 'my-listings';
      const resourceIcon = resourceIcons[listing.resource_type];
      const resourceName = resourceNames[listing.resource_type];

      html += `
        <div class="market-listing-card ${isMyListing ? 'my-listing' : ''}">
          <div class="listing-header">
            <span class="listing-resource">${resourceIcon} ${resourceName}</span>
            <span class="listing-quantity">${listing.quantity} шт</span>
          </div>
          <div class="listing-price">${listing.price_per_unit} 💰 за шт</div>
          ${
            !isMyListing && listing.users
              ? `<div class="listing-seller">👤 ${listing.users.username || 'Unknown'}</div>`
              : ''
          }
          <div class="listing-actions ${isMyListing ? 'single' : ''}">
            ${
              isMyListing
                ? `
              <button class="btn btn-cancel" onclick="cancelMarketListing('${listing.id}')">🗑 Удалить</button>
            `
                : `
              <button class="btn btn-buy" onclick="openMarketBuyModal('${listing.id}', ${listing.price_per_unit}, ${listing.quantity}, '${resourceName}')">Купить</button>
            `
            }
          </div>
        </div>
      `;
    }

    html += '</div>';
    container.innerHTML = html;
  } catch (error) {
    console.error('Error rendering listings:', error);
    document.getElementById('market-listings-container').innerHTML =
      '<p style="color: red; text-align: center;">Ошибка при загрузке объявлений</p>';
  }
}

export async function cancelMarketListing(listingId) {
  try {
    if (!confirm('Вы уверены? Ресурсы вернутся на ваш баланс.')) {
      return;
    }

    await apiClient.cancelMarketListing(appState.userId, listingId);
    tg.showAlert('✅ Объявление удалено!');

    // Refresh market listings
    renderMarketListings(currentMarketFilter);

    // Refresh user data
    const userData = await apiClient.getUser(appState.userId);
    appState.currentUser = userData.user;
    updateUI(appState.currentUser);
  } catch (error) {
    console.error('Error canceling listing:', error);
    tg.showAlert(error.message || 'Ошибка при удалении объявления');
  }
}

export function openMarketBuyModal(listingId, pricePerUnit, availableQuantity, resourceName) {
  currentListingId = listingId;
  currentBuyPrice = pricePerUnit;
  currentBuyAvailable = availableQuantity;
  currentBuyQuantity = 1;

  document.getElementById('buy-resource-name').textContent = resourceName;
  document.getElementById('buy-price-per-unit').textContent = pricePerUnit;
  document.getElementById('buy-available-quantity').textContent = availableQuantity;
  document.getElementById('buy-quantity-input').value = '1';
  document.getElementById('buy-player-balance').textContent = appState.currentUser.gold || 0;

  updateBuyPriceDisplay();
  document.getElementById('market-buy-modal').classList.add('active');
}

export function closeMarketBuyModal() {
  document.getElementById('market-buy-modal').classList.remove('active');
  currentListingId = null;
  currentBuyQuantity = 1;
}

export function incrementBuyQuantity() {
  if (currentBuyQuantity < currentBuyAvailable) {
    currentBuyQuantity++;
    updateBuyPriceDisplay();
  }
}

export function decrementBuyQuantity() {
  if (currentBuyQuantity > 1) {
    currentBuyQuantity--;
    updateBuyPriceDisplay();
  }
}

export function setMaxBuyQuantity() {
  currentBuyQuantity = currentBuyAvailable;
  document.getElementById('buy-quantity-input').value = currentBuyQuantity;
  updateBuyPriceDisplay();
}

function updateBuyPriceDisplay() {
  const quantityInput = parseInt(document.getElementById('buy-quantity-input').value) || 1;
  currentBuyQuantity = Math.min(quantityInput, currentBuyAvailable);

  document.getElementById('buy-quantity-input').value = currentBuyQuantity;

  const total = currentBuyPrice * currentBuyQuantity;
  document.getElementById('buy-total-price').textContent = total;

  // Check if player has enough gold
  const hasEnough = (appState.currentUser.gold || 0) >= total;
  const buyBtn = document.getElementById('buy-confirm-btn');
  buyBtn.disabled = !hasEnough;
  buyBtn.className = hasEnough ? 'btn btn-primary' : 'btn btn-primary disabled';
}

export async function confirmBuyFromMarket() {
  try {
    const quantity = parseInt(document.getElementById('buy-quantity-input').value);

    if (!quantity || quantity < 1) {
      tg.showAlert('Введите корректное количество');
      return;
    }

    const result = await apiClient.buyFromMarket(appState.userId, currentListingId, quantity);

    appState.currentUser = result.buyer;
    updateUI(appState.currentUser);
    closeMarketBuyModal();
    tg.showAlert(`✅ Вы успешно купили ${quantity} ресурсов!`);

    // Refresh market view
    renderMarketListings(currentMarketFilter);
  } catch (error) {
    console.error('Error buying from market:', error);
    tg.showAlert(error.message || 'Ошибка при покупке');
  }
}

export function updateWarehouseSellDisplay() {
  document.getElementById('sell-wood-amount').textContent = appState.currentUser.wood;
  document.getElementById('sell-stone-amount').textContent = appState.currentUser.stone;
  document.getElementById('sell-meat-amount').textContent = appState.currentUser.meat;
}
