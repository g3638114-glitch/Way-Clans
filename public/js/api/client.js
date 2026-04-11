// API Client for communicating with server
export const apiClient = {
  // Get user data
  async getUser(userId) {
    const response = await fetch(`/api/user/${userId}`);
    if (!response.ok) {
      throw new Error('Failed to load user data');
    }
    return response.json();
  },

  // Get user buildings
  async getBuildings(userId) {
    const response = await fetch(`/api/user/${userId}/buildings`);
    if (!response.ok) {
      throw new Error('Failed to load buildings');
    }
    return response.json();
  },

  // Collect resources from building
  async collectResources(userId, buildingId) {
    const response = await fetch(`/api/user/${userId}/building/${buildingId}/collect`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to collect resources');
    }
    return response.json();
  },

  // Upgrade building
  async upgradeBuilding(userId, buildingId) {
    const response = await fetch(`/api/user/${userId}/building/${buildingId}/upgrade`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upgrade building');
    }
    return response.json();
  },

  // Purchase building
  async purchaseBuilding(userId, buildingType) {
    const response = await fetch(`/api/user/${userId}/building/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ buildingType }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to purchase building');
    }
    return response.json();
  },

  // Sell resources
  async sellResources(userId, resources) {
    const response = await fetch(`/api/user/${userId}/sell`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resources),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sell resources');
    }
    return response.json();
  },

  // Exchange gold to jabcoins
  async exchangeGold(userId, goldAmount) {
    const response = await fetch(`/api/user/${userId}/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ goldAmount }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to exchange gold');
    }
    return response.json();
  },

  // Get quests for user
  async getQuests(userId) {
    const response = await fetch(`/api/user/${userId}/quests`);
    if (!response.ok) {
      throw new Error('Failed to load quests');
    }
    return response.json();
  },

  // Claim quest reward
  async claimQuestReward(userId, questId) {
    const response = await fetch(`/api/user/${userId}/quest/${questId}/claim`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to claim reward');
    }
    return response.json();
  },
};
