import { apiClient } from '../api/client.js';
import { appState } from '../utils/state.js';
import { getTreasuryCapacity, getWarehouseCapacity } from './config.js';

let currentSetPriceResource = null;
let currentBuyListing = null;
let currentBuyMaxQuantity = 0;
let currentEditListing = null;
let currentEditMaxQuantity = 0;

/**
 * Open set price modal for selling resources
 */
export function openSetPriceModal(resourceType) {
  currentSetPriceResource = resourceType;

  const resourceNames = {
    wood: 'Дерево',
    stone: 'Камень',
    meat: 'Мясо',
  };

  const resourceIcons = {
    wood: '🌲',
    stone: '🪨',
    meat: '🍖',
  };

  // Get available quantity from current user
  const available = appState.currentUser[resourceType] || 0;

  // Update modal
  document.getElementById('price-resource-name').textContent = `${resourceIcons[resourceType]} ${resourceNames[resourceType]}`;
  document.getElementById('price-available').textContent = available;
  document.getElementById('price-per-unit').value = '1';
  document.getElementById('price-quantity').value = '';
  document.getElementById('price-total').textContent = '0';

  // Show modal
  document.getElementById('set-price-modal').classList.add('active');

  // Close warehouse sell modal
  document.getElementById('warehouse-sell-modal').classList.remove('active');
}

/**
 * Close set price modal
 */
export function closeSetPriceModal() {
  document.getElementById('set-price-modal').classList.remove('active');
  document.getElementById('warehouse-sell-modal').classList.add('active');
  currentSetPriceResource = null;
}

/**
 * Set max quantity in price modal
 */
export function setMaxPriceQuantity() {
  const available = parseInt(document.getElementById('price-available').textContent) || 0;
  document.getElementById('price-quantity').value = available;
  updatePriceTotal();
}

/**
 * Update total price in modal
 */
export function updatePriceTotal() {
  const quantity = parseInt(document.getElementById('price-quantity').value) || 0;
  const pricePerUnit = parseInt(document.getElementById('price-per-unit').value) || 0;
  const total = quantity * pricePerUnit;

  document.getElementById('price-total').textContent = total.toLocaleString();

  // Check treasury capacity
  const treasuryCapacity = getTreasuryCapacity(appState.currentUser.treasury_level || 1);
  const newGoldAmount = (appState.currentUser.gold || 0) + total;
  const totalElement = document.getElementById('price-total');

  if (newGoldAmount > treasuryCapacity) {
    totalElement.style.color = '#ff6b6b';
    totalElement.title = 'Казна переполнится!';
  } else {
    totalElement.style.color = '#d4af37';
    totalElement.title = '';
  }
}

/**
 * Confirm selling resources at set price
 */
export async function confirmSellPrice() {
  const resourceType = currentSetPriceResource;
  const quantity = parseInt(document.getElementById('price-quantity').value);
  const pricePerUnit = parseInt(document.getElementById('price-per-unit').value);

  if (!quantity || quantity <= 0) {
    alert('Введите количество');
    return;
  }

  if (!pricePerUnit || pricePerUnit <= 0) {
    alert('Введите цену');
    return;
  }

  // Check if treasury will be full after this sale
  const totalRevenue = quantity * pricePerUnit;
  const treasuryCapacity = getTreasuryCapacity(appState.currentUser.treasury_level || 1);
  const newGoldAmount = (appState.currentUser.gold || 0) + totalRevenue;

  if (newGoldAmount > treasuryCapacity) {
    const maxSellable = Math.floor((treasuryCapacity - (appState.currentUser.gold || 0)) / pricePerUnit);
    alert(`❌ Казна переполнится! Вы можете продать максимум ${maxSellable} единиц по этой цене.\n\nТекущий баланс: ${(appState.currentUser.gold || 0).toLocaleString()} / ${treasuryCapacity.toLocaleString()}`);
    return;
  }

  try {
    const result = await apiClient.createMarketListing(appState.userId, {
      resourceType,
      quantity,
      pricePerUnit,
    });

    alert('Объявление выставлено на рынок!');
    closeSetPriceModal();
    document.getElementById('warehouse-sell-modal').style.display = 'none';

    // Refresh user data
    appState.currentUser = await apiClient.getUser(appState.userId, appState.userInfo);
    updateWarehouseSellModal();
  } catch (error) {
    alert('Ошибка: ' + (error.message || 'Не удалось выставить объявление'));
  }
}

/**
 * Open buy quantity modal
 */
export function openBuyQuantityModal(listing) {
  currentBuyListing = listing;

  const resourceNames = {
    wood: 'Дерево',
    stone: 'Камень',
    meat: 'Мясо',
  };

  const resourceIcons = {
    wood: '🌲',
    stone: '🪨',
    meat: '🍖',
  };

  // Check warehouse capacity for this specific resource
  const warehouseCapacity = getWarehouseCapacity(appState.currentUser.warehouse_level || 1);
  const currentResourceAmount = appState.currentUser[listing.resource_type] || 0;
  const availableSpace = warehouseCapacity - currentResourceAmount;
  currentBuyMaxQuantity = Math.min(listing.quantity, Math.max(0, availableSpace));

  // Update modal
  document.getElementById('buy-resource-name').textContent = `${resourceIcons[listing.resource_type]} ${resourceNames[listing.resource_type]}`;
  document.getElementById('buy-price-per-unit').textContent = listing.price_per_unit.toLocaleString();
  document.getElementById('buy-available').textContent = listing.quantity;
  document.getElementById('buy-quantity').value = '';
  document.getElementById('buy-quantity').max = currentBuyMaxQuantity;
  document.getElementById('buy-total').textContent = '0';
  document.getElementById('buy-player-gold').textContent = (appState.currentUser.gold || 0).toLocaleString();

  // Disable/warn if warehouse is full for this resource
  const buyQuantityInput = document.getElementById('buy-quantity');
  const maxBtn = document.querySelector('#buy-quantity-modal .max-btn');
  const confirmBtn = document.querySelector('#buy-quantity-modal .btn-primary');

  if (availableSpace <= 0) {
    buyQuantityInput.disabled = true;
    buyQuantityInput.placeholder = 'Склад переполнен';
    confirmBtn.disabled = true;
  } else {
    buyQuantityInput.disabled = false;
    buyQuantityInput.placeholder = '0';
    confirmBtn.disabled = false;
  }

  // Show modal
  document.getElementById('buy-quantity-modal').classList.add('active');
}

/**
 * Close buy quantity modal
 */
export function closeBuyQuantityModal() {
  document.getElementById('buy-quantity-modal').classList.remove('active');
  currentBuyListing = null;
}

/**
 * Set max quantity in buy modal
 */
export function setMaxBuyQuantity() {
  const maxAffordable = Math.floor((appState.currentUser.gold || 0) / currentBuyListing.price_per_unit);
  const maxQuantity = Math.min(currentBuyMaxQuantity, maxAffordable);

  document.getElementById('buy-quantity').value = maxQuantity;
  updateBuyTotal();
}

/**
 * Update total price in buy modal
 */
export function updateBuyTotal() {
  const quantity = parseInt(document.getElementById('buy-quantity').value) || 0;
  const pricePerUnit = parseInt(document.getElementById('buy-price-per-unit').textContent) || 0;
  const total = quantity * pricePerUnit;

  document.getElementById('buy-total').textContent = total.toLocaleString();
}

/**
 * Confirm buying from market
 */
export async function confirmBuyQuantity() {
  const listing = currentBuyListing;
  const quantity = parseInt(document.getElementById('buy-quantity').value);

  if (!quantity || quantity <= 0) {
    alert('Введите количество');
    return;
  }

  if (quantity > listing.quantity) {
    alert('Недостаточно ресурсов в объявлении');
    return;
  }

  const totalCost = quantity * listing.price_per_unit;
  if (totalCost > (appState.currentUser.gold || 0)) {
    alert('Недостаточно Jamcoin');
    return;
  }

  // Check warehouse capacity for this specific resource
  const warehouseCapacity = getWarehouseCapacity(appState.currentUser.warehouse_level || 1);
  const currentResourceAmount = appState.currentUser[listing.resource_type] || 0;
  if (currentResourceAmount + quantity > warehouseCapacity) {
    alert('❌ Недостаточно места в складе! Продайте ресурсы, чтобы продолжить.');
    return;
  }

  try {
    await apiClient.buyFromMarketListing(appState.userId, listing.id, quantity);
    alert(`Вы купили ${quantity} ресурсов!`);
    closeBuyQuantityModal();

    // Refresh user data
    appState.currentUser = await apiClient.getUser(appState.userId, appState.userInfo);

    // Reload market listings
    const currentTab = document.querySelector('.market-tab-btn.active');
    if (currentTab) {
      loadMarketListings(currentTab.dataset.resource);
    }
  } catch (error) {
    // Show different messages for different errors
    if (error.message.includes('warehouse') || error.message.includes('Warehouse')) {
      alert('❌ Недостаточно места в складе! Продайте ресурсы, чтобы продолжить.');
    } else if (error.message.includes('treasury') || error.message.includes('Treasury')) {
      alert('❌ Казна продавца переполнена. Попробуйте другое объявление.');
    } else {
      alert('Ошибка: ' + (error.message || 'Не удалось купить ресурсы'));
    }
  }
}

/**
 * Load market listings for a resource
 */
export async function loadMarketListings(resourceType) {
  try {
    if (resourceType === 'my-listings') {
      loadMyListings();
      return;
    }

    const result = await apiClient.getMarketListings(appState.userId, resourceType);
    const listings = result.listings || [];

    const container = document.getElementById('market-listings-container');
    container.innerHTML = '';

    if (listings.length === 0) {
      container.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">Нет объявлений на рынке</p>';
      return;
    }

    listings.forEach((listing) => {
      const seller = listing.users;
      const isOwnListing = appState.currentUser && appState.currentUser.id === seller.id;

      const listingDiv = document.createElement('div');
      listingDiv.className = 'market-listing-item';

      const buyButtonHTML = isOwnListing
        ? '<p style="color: #999; text-align: center; font-size: 14px;">Ваше объявление</p>'
        : `<button class="btn btn-primary" onclick="window.market.openBuyQuantityModal(${JSON.stringify(listing).replace(/"/g, '&quot;')})">Купить</button>`;

      listingDiv.innerHTML = `
        <div class="listing-header">
          <div class="seller-info">
            <strong>${seller.first_name} (@${seller.username})</strong>
          </div>
          <div class="listing-price">
            <span>${listing.price_per_unit.toLocaleString()} 💰/шт</span>
          </div>
        </div>
        <div class="listing-body">
          <div class="listing-quantity">
            <p>Доступно: <strong>${listing.quantity.toLocaleString()}</strong></p>
          </div>
          ${buyButtonHTML}
        </div>
      `;
      container.appendChild(listingDiv);
    });
  } catch (error) {
    document.getElementById('market-listings-container').innerHTML = `
      <p style="color: red; text-align: center; padding: 20px;">Ошибка: ${error.message}</p>
    `;
  }
}

/**
 * Load user's own listings
 */
export async function loadMyListings() {
  try {
    const result = await apiClient.getMyMarketListings(appState.userId);
    const listings = result.listings || [];

    const container = document.getElementById('market-listings-container');
    container.innerHTML = '';

    if (listings.length === 0) {
      container.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">У вас нет активных объявлений</p>';
      return;
    }

    listings.forEach((listing) => {
      const resourceIcons = {
        wood: '🌲',
        stone: '🪨',
        meat: '🍖',
      };

      const listingDiv = document.createElement('div');
      listingDiv.className = 'market-listing-item my-listing';
      listingDiv.innerHTML = `
        <div class="listing-header">
          <div class="resource-info">
            <strong>${resourceIcons[listing.resource_type]} ${listing.resource_type.toUpperCase()}</strong>
          </div>
          <div class="listing-price">
            <span>${listing.price_per_unit.toLocaleString()} 💰/шт</span>
          </div>
        </div>
        <div class="listing-body">
          <div class="listing-quantity">
            <p>Количество: <strong>${listing.quantity.toLocaleString()}</strong></p>
            <p>Итого: ${(listing.quantity * listing.price_per_unit).toLocaleString()} 💰</p>
          </div>
          <div class="listing-actions">
            <button class="btn btn-secondary btn-sm" onclick="window.market.openEditListingModal('${listing.id}', '${listing.resource_type}', ${listing.quantity}, ${listing.price_per_unit})">
              ✏️ Редактировать
            </button>
            <button class="btn btn-danger btn-sm" onclick="window.market.deleteListing('${listing.id}')">
              🗑 Удалить
            </button>
          </div>
        </div>
      `;
      container.appendChild(listingDiv);
    });
  } catch (error) {
    document.getElementById('market-listings-container').innerHTML = `
      <p style="color: red; text-align: center; padding: 20px;">Ошибка: ${error.message}</p>
    `;
  }
}

/**
 * Delete a market listing
 */
export async function deleteListing(listingId) {
  if (!confirm('Вы уверены? Ресурсы вернутся на ваш баланс.')) {
    return;
  }

  try {
    await apiClient.deleteMarketListing(appState.userId, listingId);
    alert('Объявление удалено');

    // Refresh user data
    appState.currentUser = await apiClient.getUser(appState.userId, appState.userInfo);

    // Reload my listings
    loadMyListings();
    updateWarehouseSellModal();
  } catch (error) {
    alert('Ошибка: ' + (error.message || 'Не удалось удалить объявление'));
  }
}

/**
 * Update warehouse sell modal with current amounts
 */
export function updateWarehouseSellModal() {
  document.getElementById('warehouse-sell-wood-amount').textContent = (appState.currentUser.wood || 0).toLocaleString();
  document.getElementById('warehouse-sell-stone-amount').textContent = (appState.currentUser.stone || 0).toLocaleString();
  document.getElementById('warehouse-sell-meat-amount').textContent = (appState.currentUser.meat || 0).toLocaleString();
}

/**
 * Open edit listing modal
 */
export function openEditListingModal(listingId, resourceType, quantity, pricePerUnit) {
  currentEditListing = {
    id: listingId,
    resourceType: resourceType,
    originalQuantity: quantity,
  };
  currentEditMaxQuantity = quantity + (appState.currentUser[resourceType] || 0);

  const resourceNames = {
    wood: 'Дерево',
    stone: 'Камень',
    meat: 'Мясо',
  };

  const resourceIcons = {
    wood: '🌲',
    stone: '🪨',
    meat: '🍖',
  };

  // Update modal
  document.getElementById('edit-resource-name').textContent = `${resourceIcons[resourceType]} ${resourceNames[resourceType]}`;
  document.getElementById('edit-price-per-unit').value = pricePerUnit;
  document.getElementById('edit-quantity').value = quantity;
  document.getElementById('edit-quantity').max = currentEditMaxQuantity;

  updateEditTotal();

  // Show modal
  document.getElementById('edit-listing-modal').classList.add('active');
}

/**
 * Close edit listing modal
 */
export function closeEditListingModal() {
  document.getElementById('edit-listing-modal').classList.remove('active');
  currentEditListing = null;
}

/**
 * Set max quantity in edit modal
 */
export function setMaxEditQuantity() {
  document.getElementById('edit-quantity').value = currentEditMaxQuantity;
  updateEditTotal();
}

/**
 * Update total price in edit modal
 */
export function updateEditTotal() {
  const quantity = parseInt(document.getElementById('edit-quantity').value) || 0;
  const pricePerUnit = parseInt(document.getElementById('edit-price-per-unit').value) || 0;
  const total = quantity * pricePerUnit;

  document.getElementById('edit-total').textContent = total.toLocaleString();

  // Check treasury capacity
  const treasuryCapacity = getTreasuryCapacity(appState.currentUser.treasury_level || 1);
  const currentGold = appState.currentUser.gold || 0;
  const originalQuantity = currentEditListing?.originalQuantity || 0;
  const priceChange = (quantity - originalQuantity) * pricePerUnit;
  const newGoldAmount = currentGold + priceChange;
  const totalElement = document.getElementById('edit-total');

  if (newGoldAmount > treasuryCapacity) {
    totalElement.style.color = '#ff6b6b';
    totalElement.title = 'Казна переполнится!';
  } else {
    totalElement.style.color = '#d4af37';
    totalElement.title = '';
  }
}

/**
 * Confirm editing a listing
 */
export async function confirmEditListing() {
  if (!currentEditListing) return;

  const quantity = parseInt(document.getElementById('edit-quantity').value);
  const pricePerUnit = parseInt(document.getElementById('edit-price-per-unit').value);

  if (!quantity || quantity <= 0) {
    alert('Введите количество');
    return;
  }

  if (!pricePerUnit || pricePerUnit <= 0) {
    alert('Введите цену');
    return;
  }

  if (quantity > currentEditMaxQuantity) {
    alert(`Максимальное количество: ${currentEditMaxQuantity}`);
    return;
  }

  try {
    await apiClient.editMarketListing(appState.userId, currentEditListing.id, {
      quantity,
      pricePerUnit,
    });

    alert('✅ Объявление обновлено!');

    // Refresh user data
    appState.currentUser = await apiClient.getUser(appState.userId, appState.userInfo);

    // Reload my listings
    loadMyListings();
    updateWarehouseSellModal();

    closeEditListingModal();
  } catch (error) {
    alert('Ошибка: ' + (error.message || 'Не удалось обновить объявление'));
  }
}
