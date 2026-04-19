// API Client for communicating with server
export const apiClient = {
  // ... existing methods ...
  async getUser(userId, userInfo = null, startParam = null) {
    const headers = { 'Content-Type': 'application/json' };
    const body = userInfo ? JSON.stringify({ userInfo, startParam }) : undefined;
    const query = startParam && !userInfo ? `?startParam=${encodeURIComponent(startParam)}` : '';
    const response = await fetch(`/api/user/${userId}${query}`, { method: userInfo ? 'POST' : 'GET', headers, body });
    if (!response.ok) throw new Error('Failed to load user data');
    return response.json();
  },

  async getReferrals(userId) {
    const response = await fetch(`/api/user/${userId}/referrals`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to load referrals');
    }
    return response.json();
  },

  async getBuildings(userId) {
    const response = await fetch(`/api/user/${userId}/buildings`);
    if (!response.ok) throw new Error('Failed to load buildings');
    return response.json();
  },

  async collectResources(userId, buildingId) {
    const response = await fetch(`/api/user/${userId}/building/${buildingId}/collect`, { method: 'POST' });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to collect resources'); }
    return response.json();
  },

  async activateBuilding(userId, buildingId) {
    const response = await fetch(`/api/user/${userId}/building/${buildingId}/activate`, { method: 'POST' });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to activate building'); }
    return response.json();
  },

  async upgradeBuilding(userId, buildingId) {
    const response = await fetch(`/api/user/${userId}/building/${buildingId}/upgrade`, { method: 'POST' });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to upgrade building'); }
    return response.json();
  },

  async sellResources(userId, resources) {
    const response = await fetch(`/api/user/${userId}/sell`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resources) });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to sell resources'); }
    return response.json();
  },

  async exchangeGold(userId, goldAmount) {
    const response = await fetch(`/api/user/${userId}/exchange`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goldAmount }) });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to exchange gold'); }
    return response.json();
  },

  async getQuests(userId) {
    const response = await fetch(`/api/user/${userId}/quests`);
    if (!response.ok) throw new Error('Failed to load quests');
    return response.json();
  },

  async claimQuestReward(userId, questId) {
    const response = await fetch(`/api/user/${userId}/quest/${questId}/claim`, { method: 'POST' });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to claim reward'); }
    return response.json();
  },

  async clickCoin(userId, count = 1) {
    const response = await fetch(`/api/user/${userId}/coin-click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to add gold'); }
    return response.json();
  },

  async getTreasury(userId) {
    const response = await fetch(`/api/user/${userId}/treasury`);
    if (!response.ok) throw new Error('Failed to load treasury data');
    return response.json();
  },

  async upgradeTreasury(userId) {
    const response = await fetch(`/api/user/${userId}/treasury/upgrade`, { method: 'POST' });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to upgrade treasury'); }
    return response.json();
  },

  async getWarehouse(userId) {
    const response = await fetch(`/api/user/${userId}/warehouse`);
    if (!response.ok) throw new Error('Failed to load warehouse data');
    return response.json();
  },

  async upgradeWarehouse(userId) {
    const response = await fetch(`/api/user/${userId}/warehouse/upgrade`, { method: 'POST' });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to upgrade warehouse'); }
    return response.json();
  },

  async createMarketListing(userId, { resourceType, quantity, pricePerUnit }) {
    const response = await fetch(`/api/user/${userId}/market/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resourceType, quantity, pricePerUnit }) });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to create listing'); }
    return response.json();
  },

  async getMarketListings(userId, resourceType) {
    const response = await fetch(`/api/user/${userId}/market/listings/${resourceType}`);
    if (!response.ok) throw new Error('Failed to load market listings');
    return response.json();
  },

  async getMyMarketListings(userId) {
    const response = await fetch(`/api/user/${userId}/market/my-listings`);
    if (!response.ok) throw new Error('Failed to load your listings');
    return response.json();
  },

  async claimMarketPendingGold(userId) {
    const response = await fetch(`/api/user/${userId}/market/claim`, { method: 'POST' });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to claim market gold'); }
    return response.json();
  },

  async buyFromMarketListing(userId, listingId, quantity) {
    const response = await fetch(`/api/user/${userId}/market/buy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listingId, quantity }) });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to buy from listing'); }
    return response.json();
  },

  async deleteMarketListing(userId, listingId) {
    const response = await fetch(`/api/user/${userId}/market/${listingId}`, { method: 'DELETE' });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to delete listing'); }
    return response.json();
  },

  async editMarketListing(userId, listingId, { quantity, pricePerUnit }) {
    const response = await fetch(`/api/user/${userId}/market/${listingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quantity, pricePerUnit }) });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to edit listing'); }
    return response.json();
  },

  // === TROOP ENDPOINTS ===
  async getTroops(userId) {
    const response = await fetch(`/api/user/${userId}/troops`);
    if (!response.ok) throw new Error('Failed to load troops');
    return response.json();
  },

  async hireTroop(userId, type, quantity = 1) {
    const response = await fetch(`/api/user/${userId}/troops/hire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, quantity })
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to hire troop'); }
    return response.json();
  },

  async upgradeTroopType(userId, type) {
    const response = await fetch(`/api/user/${userId}/troops/upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to upgrade troop'); }
    return response.json();
  },

  // === ATTACK ENDPOINTS ===
  async getAttackTarget(userId) {
    const response = await fetch(`/api/user/${userId}/attack/target`);
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to find target'); }
    return response.json();
  },

  async performAttack(userId, targetId) {
    const response = await fetch(`/api/user/${userId}/attack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId })
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to perform attack'); }
    return response.json();
  }
};
