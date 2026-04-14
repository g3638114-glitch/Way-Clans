import { appState } from '../utils/state.js';
import { updateUI } from './dom.js';
import { showPage } from './pages.js';
import { apiClient } from '../api/client.js';

// Resource configuration
const RESOURCES = {
  wood: { emoji: '🌲', name: 'Дерево' },
  stone: { emoji: '🪨', name: 'Камень' },
  meat: { emoji: '🍖', name: 'Мясо' },
};

let currentMarketplaceResource = null;
let currentMarketplaceListingData = null;
let currentEditingListing = null;

/**
 * Open the sell page with resource buttons
 */
export function openSellPage() {
  const sellResourcesList = document.getElementById('sell-resources-list');
  sellResourcesList.innerHTML = '';

  // Add resource buttons
  Object.entries(RESOURCES).forEach(([resourceKey, resourceData]) => {
    const amount = appState.currentUser[resourceKey] || 0;
    const btn = document.createElement('button');
    btn.className = 'btn sell-resource-btn';
    btn.innerHTML = `${resourceData.emoji} ${resourceData.name}: ${amount} — Нажмите чтобы продать`;
    btn.addEventListener('click', () => {
      openMarketplaceSellModal(resourceKey);
    });
    sellResourcesList.appendChild(btn);
  });

  showPage('sell');
}

/**
 * Open marketplace sell modal
 */
export function openMarketplaceSellModal(resourceKey) {
  currentMarketplaceResource = resourceKey;
  const resourceData = RESOURCES[resourceKey];
  const availableAmount = appState.currentUser[resourceKey] || 0;

  // Update modal content
  document.getElementById('marketplace-resource-name').innerHTML = `${resourceData.emoji} ${resourceData.name}`;
  document.getElementById('marketplace-available-amount').textContent = availableAmount;
  document.getElementById('marketplace-price-input').value = '';
  document.getElementById('marketplace-quantity-input').value = '';
  document.getElementById('marketplace-total-gold').textContent = '0';

  // Show modal
  document.getElementById('marketplace-sell-modal').style.display = 'flex';

  // Add event listeners for calculation
  document.getElementById('marketplace-price-input').addEventListener('input', updateMarketplaceTotalCalculation);
  document.getElementById('marketplace-quantity-input').addEventListener('input', updateMarketplaceTotalCalculation);
}

/**
 * Close marketplace sell modal
 */
export function closeMarketplaceSellModal() {
  document.getElementById('marketplace-sell-modal').style.display = 'none';
  currentMarketplaceResource = null;
}

/**
 * Update total calculation in marketplace sell modal
 */
function updateMarketplaceTotalCalculation() {
  const price = parseInt(document.getElementById('marketplace-price-input').value) || 0;
  const quantity = parseInt(document.getElementById('marketplace-quantity-input').value) || 0;
  const total = price * quantity;
  document.getElementById('marketplace-total-gold').textContent = total;
}

/**
 * Set max quantity in marketplace sell modal
 */
export function setMaxMarketplaceQuantity() {
  const availableAmount = appState.currentUser[currentMarketplaceResource] || 0;
  document.getElementById('marketplace-quantity-input').value = availableAmount;
  updateMarketplaceTotalCalculation();
}

/**
 * Create a marketplace listing
 */
export async function createMarketplaceListing() {
  // Validate inputs
  const priceInput = document.getElementById('marketplace-price-input').value;
  const quantityInput = document.getElementById('marketplace-quantity-input').value;

  if (!priceInput || priceInput.trim() === '') {
    tg.showAlert('❌ Укажите цену');
    return;
  }

  if (!quantityInput || quantityInput.trim() === '') {
    tg.showAlert('❌ Укажите количество');
    return;
  }

  const price = parseInt(priceInput);
  const quantity = parseInt(quantityInput);

  if (isNaN(price) || price < 1) {
    tg.showAlert('❌ Цена должна быть числом ≥ 1');
    return;
  }

  if (isNaN(quantity) || quantity < 1) {
    tg.showAlert('❌ Количество должно быть числом ≥ 1');
    return;
  }

  const resourceData = RESOURCES[currentMarketplaceResource];
  const availableAmount = appState.currentUser[currentMarketplaceResource] || 0;

  if (quantity > availableAmount) {
    tg.showAlert(`❌ Недостаточно ресурсов. Доступно: ${availableAmount}`);
    return;
  }

  try {
    const result = await apiClient.createMarketplaceListing(
      appState.userId,
      currentMarketplaceResource,
      price,
      quantity
    );

    if (result.success) {
      // Remove resources from player
      appState.currentUser[currentMarketplaceResource] -= quantity;
      updateUI(appState.currentUser);

      tg.showAlert(`✅ Товар выставлен на рынок!\n${quantity} ${resourceData.name} по ${price} Jamcoin за шт.`);
      closeMarketplaceSellModal();
    }
  } catch (error) {
    tg.showAlert(`❌ Ошибка: ${error.message}`);
  }
}

/**
 * Open marketplace page with listings
 */
export async function openMarketplace() {
  const marketplaceFilters = document.getElementById('marketplace-filters');
  const marketplaceListings = document.getElementById('marketplace-listings');

  // Clear previous content
  marketplaceFilters.innerHTML = '';
  marketplaceListings.innerHTML = '';

  // Add filter buttons
  const buttons = [
    { label: '🌲 Дерево', key: 'wood' },
    { label: '🪨 Камень', key: 'stone' },
    { label: '🍖 Мясо', key: 'meat' },
    { label: '📋 Мои объявления', key: 'my-listings' },
  ];

  buttons.forEach(btn => {
    const filterBtn = document.createElement('button');
    filterBtn.className = 'marketplace-filter-btn';
    filterBtn.textContent = btn.label;
    filterBtn.addEventListener('click', async () => {
      // Update active state
      document.querySelectorAll('.marketplace-filter-btn').forEach(b => b.classList.remove('active'));
      filterBtn.classList.add('active');

      // Load listings
      await loadMarketplaceListings(btn.key, marketplaceListings);
    });
    marketplaceFilters.appendChild(filterBtn);
  });

  // Load wood listings by default
  const firstBtn = marketplaceFilters.querySelector('.marketplace-filter-btn');
  if (firstBtn) {
    firstBtn.classList.add('active');
    await loadMarketplaceListings('wood', marketplaceListings);
  }

  showPage('marketplace');
}

/**
 * Load marketplace listings
 */
async function loadMarketplaceListings(resourceKey, containerElement) {
  try {
    if (resourceKey === 'my-listings') {
      // Load user's own listings
      const result = await apiClient.getMarketplaceUserListings(appState.userId);
      displayMyListings(result.listings || [], containerElement);
    } else {
      // Load marketplace listings for the resource
      const result = await apiClient.getMarketplaceListings(appState.userId, resourceKey);
      displayMarketplaceListings(result.listings || [], resourceKey, containerElement);
    }
  } catch (error) {
    console.error('Error loading listings:', error);
    containerElement.innerHTML = `<div class="empty-listings"><p class="empty-listings-text">❌ Ошибка загрузки</p></div>`;
  }
}

/**
 * Display marketplace listings
 */
function displayMarketplaceListings(listings, resourceKey, containerElement) {
  containerElement.innerHTML = '';

  if (listings.length === 0) {
    containerElement.innerHTML = `<div class="empty-listings"><p class="empty-listings-text">📭 Объявлений не найдено</p></div>`;
    return;
  }

  const resourceData = RESOURCES[resourceKey];

  listings.forEach(listing => {
    const item = document.createElement('div');
    item.className = 'marketplace-listing-item';

    const info = document.createElement('div');
    info.className = 'listing-info';

    const name = document.createElement('div');
    name.className = 'listing-resource-name';
    name.textContent = `${resourceData.emoji} ${resourceData.name}`;

    const seller = document.createElement('div');
    seller.className = 'listing-seller';
    seller.textContent = `Продавец: ${listing.seller_name || 'Игрок'}`;

    const priceInfo = document.createElement('div');
    priceInfo.className = 'listing-price-info';

    const price = document.createElement('span');
    price.className = 'listing-price';
    price.textContent = `${listing.price_per_unit} Jamcoin/шт`;

    const available = document.createElement('span');
    available.className = 'listing-available';
    available.textContent = `Доступно: ${listing.quantity_available}`;

    priceInfo.appendChild(price);
    priceInfo.appendChild(available);

    info.appendChild(name);
    info.appendChild(seller);
    info.appendChild(priceInfo);

    const action = document.createElement('div');
    action.className = 'listing-action';

    const buyBtn = document.createElement('button');
    buyBtn.className = 'listing-action-btn buy-btn';
    buyBtn.textContent = '🛒 Купить';
    buyBtn.addEventListener('click', () => {
      openMarketplaceBuyModal(listing, resourceKey);
    });

    action.appendChild(buyBtn);

    item.appendChild(info);
    item.appendChild(action);
    containerElement.appendChild(item);
  });
}

/**
 * Display user's own listings
 */
function displayMyListings(listings, containerElement) {
  containerElement.innerHTML = '';

  if (listings.length === 0) {
    containerElement.innerHTML = `<div class="empty-listings"><p class="empty-listings-text">📭 У вас нет активных объявлений</p></div>`;
    return;
  }

  listings.forEach(listing => {
    const resourceData = RESOURCES[listing.resource_type];
    const item = document.createElement('div');
    item.className = 'my-listing-item';

    const info = document.createElement('div');
    info.className = 'my-listing-info';

    const resource = document.createElement('div');
    resource.className = 'my-listing-resource';
    resource.textContent = `${resourceData.emoji} ${resourceData.name}`;

    const stats = document.createElement('div');
    stats.className = 'my-listing-stats';
    stats.innerHTML = `
      <span>Цена: ${listing.price_per_unit} Jamcoin/шт</span>
      <span>Доступно: ${listing.quantity_available}</span>
      <span>Продано: ${listing.quantity_sold}</span>
    `;

    info.appendChild(resource);
    info.appendChild(stats);

    const actions = document.createElement('div');
    actions.className = 'my-listing-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'listing-action-btn edit-btn';
    editBtn.textContent = '✏️ Изменить';
    editBtn.addEventListener('click', () => {
      window.openEditListingModal(listing);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'listing-action-btn delete-btn';
    deleteBtn.textContent = '❌ Удалить';
    deleteBtn.addEventListener('click', () => {
      confirmDeleteListing(listing);
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(info);
    item.appendChild(actions);
    containerElement.appendChild(item);
  });
}

/**
 * Open buy modal
 */
export function openMarketplaceBuyModal(listing, resourceKey) {
  currentMarketplaceListingData = { ...listing, resourceKey };

  const resourceData = RESOURCES[resourceKey];
  document.getElementById('buy-resource-display').innerHTML = `${resourceData.emoji} ${resourceData.name}`;
  document.getElementById('buy-price-per-unit').textContent = listing.price_per_unit;
  document.getElementById('buy-available-quantity').textContent = listing.quantity_available;
  document.getElementById('buy-quantity-input').value = '';
  document.getElementById('buy-total-cost').textContent = '0';

  document.getElementById('marketplace-buy-modal').style.display = 'flex';

  document.getElementById('buy-quantity-input').addEventListener('input', updateBuyTotalCost);
}

/**
 * Close buy modal
 */
export function closeMarketplaceBuyModal() {
  document.getElementById('marketplace-buy-modal').style.display = 'none';
  currentMarketplaceListingData = null;
}

/**
 * Update total cost in buy modal
 */
function updateBuyTotalCost() {
  const quantity = parseInt(document.getElementById('buy-quantity-input').value) || 0;
  const pricePerUnit = currentMarketplaceListingData.price_per_unit;
  const total = quantity * pricePerUnit;
  document.getElementById('buy-total-cost').textContent = total;
}

/**
 * Set max quantity in buy modal
 */
export function setMaxBuyQuantity() {
  const available = currentMarketplaceListingData.quantity_available;
  document.getElementById('buy-quantity-input').value = available;
  updateBuyTotalCost();
}

/**
 * Confirm marketplace buy
 */
export async function confirmMarketplaceBuy() {
  // Validate input
  const quantityInput = document.getElementById('buy-quantity-input').value;

  if (!quantityInput || quantityInput.trim() === '') {
    tg.showAlert('❌ Укажите количество');
    return;
  }

  const quantity = parseInt(quantityInput);

  if (isNaN(quantity) || quantity < 1) {
    tg.showAlert('❌ Количество должно быть числом ≥ 1');
    return;
  }

  if (quantity > currentMarketplaceListingData.quantity_available) {
    tg.showAlert(`❌ Недостаточно товара. Доступно: ${currentMarketplaceListingData.quantity_available}`);
    return;
  }

  const totalCost = quantity * currentMarketplaceListingData.price_per_unit;
  if (appState.currentUser.gold < totalCost) {
    tg.showAlert(`❌ Недостаточно Jamcoin. Нужно: ${totalCost}, Есть: ${appState.currentUser.gold}`);
    return;
  }

  try {
    const result = await apiClient.buyFromMarketplace(
      appState.userId,
      currentMarketplaceListingData.id,
      quantity
    );

    if (result.success) {
      // Update user data
      appState.currentUser = result.updatedBuyer;
      updateUI(appState.currentUser);

      const resourceData = RESOURCES[currentMarketplaceListingData.resourceKey];
      tg.showAlert(`✅ Покупка успешна!\nВы получили ${quantity} ${resourceData.name}`);
      closeMarketplaceBuyModal();

      // Reload marketplace
      const marketplaceListings = document.getElementById('marketplace-listings');
      await loadMarketplaceListings(currentMarketplaceListingData.resourceKey, marketplaceListings);
    }
  } catch (error) {
    tg.showAlert(`❌ Ошибка: ${error.message}`);
  }
}

/**
 * Open edit listing modal
 */
export function openEditListingModal(listing) {
  currentEditingListing = listing;
  const resourceData = RESOURCES[listing.resource_type];

  // Update modal content
  document.getElementById('edit-resource-display').innerHTML = `${resourceData.emoji} ${resourceData.name}`;
  document.getElementById('edit-quantity-sold').textContent = listing.quantity_sold;
  document.getElementById('edit-price-input').value = listing.price_per_unit;
  document.getElementById('edit-quantity-input').value = listing.quantity_available + listing.quantity_sold;

  // Show modal
  document.getElementById('marketplace-edit-modal').style.display = 'flex';
}

/**
 * Close edit listing modal
 */
export function closeEditListingModal() {
  document.getElementById('marketplace-edit-modal').style.display = 'none';
  currentEditingListing = null;
}

/**
 * Set max quantity in edit modal
 */
export function setMaxEditQuantity() {
  if (!currentEditingListing) return;

  // Max = sold + available (original total)
  const maxQuantity = currentEditingListing.quantity_sold + currentEditingListing.quantity_available;
  document.getElementById('edit-quantity-input').value = maxQuantity;
}

/**
 * Confirm edit listing
 */
export async function confirmEditListing() {
  // Validate inputs
  const priceInput = document.getElementById('edit-price-input').value;
  const quantityInput = document.getElementById('edit-quantity-input').value;

  if (!priceInput || priceInput.trim() === '') {
    tg.showAlert('❌ Укажите цену');
    return;
  }

  if (!quantityInput || quantityInput.trim() === '') {
    tg.showAlert('❌ Укажите количество');
    return;
  }

  const price = parseInt(priceInput);
  const totalQuantity = parseInt(quantityInput);

  if (isNaN(price) || price < 1) {
    tg.showAlert('❌ Цена должна быть числом ≥ 1');
    return;
  }

  if (isNaN(totalQuantity) || totalQuantity < currentEditingListing.quantity_sold) {
    tg.showAlert(`❌ Количество должно быть ≥ ${currentEditingListing.quantity_sold} (уже продано)`);
    return;
  }

  try {
    const result = await apiClient.editMarketplaceListing(
      appState.userId,
      currentEditingListing.id,
      price,
      totalQuantity
    );

    if (result.success) {
      // Reload marketplace
      const marketplaceListings = document.getElementById('marketplace-listings');
      await loadMarketplaceListings('my-listings', marketplaceListings);

      tg.showAlert('✅ Объявление изменено');
      closeEditListingModal();
    }
  } catch (error) {
    tg.showAlert(`❌ Ошибка: ${error.message}`);
  }
}

/**
 * Confirm delete listing
 */
async function confirmDeleteListing(listing) {
  const resourceData = RESOURCES[listing.resource_type];

  if (confirm(`Вы уверены? Объявление будет удалено, и ${listing.quantity_available} ${resourceData.name} вернется на ваш баланс.`)) {
    try {
      const result = await apiClient.deleteMarketplaceListing(appState.userId, listing.id);

      if (result.success) {
        // Update user data
        appState.currentUser = result.updatedSeller;
        updateUI(appState.currentUser);

        tg.showAlert(`✅ Объявление удалено\n${listing.quantity_available} ${resourceData.name} возвращено на баланс`);

        // Reload marketplace
        const marketplaceListings = document.getElementById('marketplace-listings');
        await loadMarketplaceListings('my-listings', marketplaceListings);
      }
    } catch (error) {
      tg.showAlert(`❌ Ошибка: ${error.message}`);
    }
  }
}

/**
 * Close marketplace and return to main
 */
export function closeMarketplaceAndReturnMain() {
  showPage('main');
}
