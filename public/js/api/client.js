import { appState } from '../utils/state.js';

function buildAuthHeaders(includeJson = false) {
  const headers = {};
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (appState.telegramInitData) {
    headers['X-Telegram-Init-Data'] = appState.telegramInitData;
  }
  return headers;
}

// API Client for communicating with server
export const apiClient = {
  // ... existing methods ...
  async getUser(userId, userInfo = null, startParam = null) {
    const headers = buildAuthHeaders(true);
    const body = userInfo ? JSON.stringify({ userInfo, startParam }) : undefined;
    const query = startParam && !userInfo ? `?startParam=${encodeURIComponent(startParam)}` : '';
    const response = await fetch(`/api/user/${userId}${query}`, { method: userInfo ? 'POST' : 'GET', headers, body });
    if (!response.ok) throw new Error('Failed to load user data');
    return response.json();
  },

  async getReferrals(userId) {
    const response = await fetch(`/api/user/${userId}/referrals`, { headers: buildAuthHeaders() });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to load referrals');
    }
    return response.json();
  },

  async getBuildings(userId) {
    const response = await fetch(`/api/user/${userId}/buildings`, { headers: buildAuthHeaders() });
    if (!response.ok) throw new Error('Failed to load buildings');
    return response.json();
  },

  async collectResources(userId, buildingId) {
    const response = await fetch(`/api/user/${userId}/building/${buildingId}/collect`, { method: 'POST', headers: buildAuthHeaders() });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to collect resources'); }
    return response.json();
  },

  async collectResourcesX2(userId, buildingId) {
    const response = await fetch(`/api/user/${userId}/building/${buildingId}/collect-x2`, { method: 'POST', headers: buildAuthHeaders() });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to collect resources x2'); }
    return response.json();
  },

  async finalizeCollectResourcesX2(userId, buildingId, sessionId) {
    const response = await fetch(`/api/user/${userId}/building/${buildingId}/collect-x2/finalize`, {
      method: 'POST',
      headers: buildAuthHeaders(true),
      body: JSON.stringify({ sessionId }),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to finalize resources x2'); }
    return response.json();
  },

  async speedUpBuilding(userId, buildingId) {
    const response = await fetch(`/api/user/${userId}/building/${buildingId}/speed-up`, { method: 'POST', headers: buildAuthHeaders() });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to speed up building'); }
    return response.json();
  },

  async finalizeSpeedUpBuilding(userId, buildingId, sessionId) {
    const response = await fetch(`/api/user/${userId}/building/${buildingId}/speed-up/finalize`, {
      method: 'POST',
      headers: buildAuthHeaders(true),
      body: JSON.stringify({ sessionId }),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to finalize building speed-up'); }
    return response.json();
  },

  async startMineWorkers(userId, buildingId, mode) {
    const response = await fetch(`/api/user/${userId}/building/${buildingId}/mine/start`, {
      method: 'POST',
      headers: buildAuthHeaders(true),
      body: JSON.stringify({ mode }),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to start mine workers'); }
    return response.json();
  },

  async finishMineWorkNow(userId, buildingId) {
    const response = await fetch(`/api/user/${userId}/building/${buildingId}/mine/finish-now`, {
      method: 'POST',
      headers: buildAuthHeaders(true),
      body: JSON.stringify({}),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to finish mine work'); }
    return response.json();
  },

  async finalizeMineWorkNow(userId, buildingId, sessionId) {
    const response = await fetch(`/api/user/${userId}/building/${buildingId}/mine/finish-now/finalize`, {
      method: 'POST',
      headers: buildAuthHeaders(true),
      body: JSON.stringify({ sessionId }),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to finalize mine work'); }
    return response.json();
  },

  async activateBuilding(userId, buildingId) {
    const response = await fetch(`/api/user/${userId}/building/${buildingId}/activate`, { method: 'POST', headers: buildAuthHeaders() });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to activate building'); }
    return response.json();
  },

  async upgradeBuilding(userId, buildingId) {
    const response = await fetch(`/api/user/${userId}/building/${buildingId}/upgrade`, { method: 'POST', headers: buildAuthHeaders() });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to upgrade building'); }
    return response.json();
  },

  async sellResources(userId, resources) {
    const response = await fetch(`/api/user/${userId}/sell`, { method: 'POST', headers: buildAuthHeaders(true), body: JSON.stringify(resources) });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to sell resources'); }
    return response.json();
  },

  async exchangeGold(userId, goldAmount) {
    const response = await fetch(`/api/user/${userId}/exchange`, { method: 'POST', headers: buildAuthHeaders(true), body: JSON.stringify({ goldAmount }) });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to exchange gold'); }
    return response.json();
  },

  async getQuests(userId) {
    const response = await fetch(`/api/user/${userId}/quests`, { headers: buildAuthHeaders() });
    if (!response.ok) throw new Error('Failed to load quests');
    return response.json();
  },

  async claimQuestReward(userId, questId) {
    const response = await fetch(`/api/user/${userId}/quest/${questId}/claim`, { method: 'POST', headers: buildAuthHeaders() });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to claim reward'); }
    return response.json();
  },

  async clickCoin(userId, count = 1) {
    const response = await fetch(`/api/user/${userId}/coin-click`, {
      method: 'POST',
      headers: buildAuthHeaders(true),
      body: JSON.stringify({ count }),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to add gold'); }
    return response.json();
  },

  async refillEnergy(userId) {
    const response = await fetch(`/api/user/${userId}/refill-energy`, { method: 'POST', headers: buildAuthHeaders() });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to refill energy'); }
    return response.json();
  },

  async getTreasury(userId) {
    const response = await fetch(`/api/user/${userId}/treasury`, { headers: buildAuthHeaders() });
    if (!response.ok) throw new Error('Failed to load treasury data');
    return response.json();
  },

  async upgradeTreasury(userId) {
    const response = await fetch(`/api/user/${userId}/treasury/upgrade`, { method: 'POST', headers: buildAuthHeaders() });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to upgrade treasury'); }
    return response.json();
  },

  async getWarehouse(userId) {
    const response = await fetch(`/api/user/${userId}/warehouse`, { headers: buildAuthHeaders() });
    if (!response.ok) throw new Error('Failed to load warehouse data');
    return response.json();
  },

  async upgradeWarehouse(userId) {
    const response = await fetch(`/api/user/${userId}/warehouse/upgrade`, { method: 'POST', headers: buildAuthHeaders() });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to upgrade warehouse'); }
    return response.json();
  },

  async createMarketListing(userId, { resourceType, quantity, pricePerUnit }) {
    const response = await fetch(`/api/user/${userId}/market/create`, { method: 'POST', headers: buildAuthHeaders(true), body: JSON.stringify({ resourceType, quantity, pricePerUnit }) });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to create listing'); }
    return response.json();
  },

  async getMarketListings(userId, resourceType) {
    const response = await fetch(`/api/user/${userId}/market/listings/${resourceType}`, { headers: buildAuthHeaders() });
    if (!response.ok) throw new Error('Failed to load market listings');
    return response.json();
  },

  async getMyMarketListings(userId) {
    const response = await fetch(`/api/user/${userId}/market/my-listings`, { headers: buildAuthHeaders() });
    if (!response.ok) throw new Error('Failed to load your listings');
    return response.json();
  },

  async claimMarketPendingGold(userId) {
    const response = await fetch(`/api/user/${userId}/market/claim`, { method: 'POST', headers: buildAuthHeaders() });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to claim market gold'); }
    return response.json();
  },

  async buyFromMarketListing(userId, listingId, quantity) {
    const response = await fetch(`/api/user/${userId}/market/buy`, { method: 'POST', headers: buildAuthHeaders(true), body: JSON.stringify({ listingId, quantity }) });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to buy from listing'); }
    return response.json();
  },

  async deleteMarketListing(userId, listingId) {
    const response = await fetch(`/api/user/${userId}/market/${listingId}`, { method: 'DELETE', headers: buildAuthHeaders() });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to delete listing'); }
    return response.json();
  },

  async editMarketListing(userId, listingId, { quantity, pricePerUnit }) {
    const response = await fetch(`/api/user/${userId}/market/${listingId}`, { method: 'PATCH', headers: buildAuthHeaders(true), body: JSON.stringify({ quantity, pricePerUnit }) });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to edit listing'); }
    return response.json();
  },

  // === TROOP ENDPOINTS ===
  async getTroops(userId) {
    const response = await fetch(`/api/user/${userId}/troops`, { headers: buildAuthHeaders() });
    if (!response.ok) throw new Error('Failed to load troops');
    return response.json();
  },

  async hireTroop(userId, type, quantity = 1) {
    const response = await fetch(`/api/user/${userId}/troops/hire`, {
      method: 'POST',
      headers: buildAuthHeaders(true),
      body: JSON.stringify({ type, quantity })
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to hire troop'); }
    return response.json();
  },

  async upgradeTroopType(userId, type) {
    const response = await fetch(`/api/user/${userId}/troops/upgrade`, {
      method: 'POST',
      headers: buildAuthHeaders(true),
      body: JSON.stringify({ type })
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to upgrade troop'); }
    return response.json();
  },

  // === ATTACK ENDPOINTS ===
  async getAttackTarget(userId, mode = 'default') {
    const response = await fetch(`/api/user/${userId}/attack/target?mode=${encodeURIComponent(mode)}`, { headers: buildAuthHeaders() });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to find target'); }
    return response.json();
  },

  async performAttack(userId, targetId) {
    const response = await fetch(`/api/user/${userId}/attack`, {
      method: 'POST',
      headers: buildAuthHeaders(true),
      body: JSON.stringify({ targetId })
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to perform attack'); }
    return response.json();
  }
};
