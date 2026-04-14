// API Client for communicating with server
export const apiClient = {
  // Get user data
  async getUser(userId, userInfo = null) {
    const headers = { 'Content-Type': 'application/json' };
    const body = userInfo ? JSON.stringify({ userInfo }) : undefined;

    const response = await fetch(`/api/user/${userId}`, {
      method: userInfo ? 'POST' : 'GET',
      headers,
      body,
    });
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

  // Activate building
  async activateBuilding(userId, buildingId) {
    const response = await fetch(`/api/user/${userId}/building/${buildingId}/activate`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to activate building');
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

  // Click coin button to get +100 gold
  async clickCoin(userId) {
    const response = await fetch(`/api/user/${userId}/coin-click`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add gold');
    }
    return response.json();
  },

  // Get treasury info
  async getTreasury(userId) {
    const response = await fetch(`/api/user/${userId}/treasury`);
    if (!response.ok) {
      throw new Error('Failed to load treasury data');
    }
    return response.json();
  },

  // Upgrade treasury
  async upgradeTreasury(userId) {
    const response = await fetch(`/api/user/${userId}/treasury/upgrade`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upgrade treasury');
    }
    return response.json();
  },

  // Get warehouse info
  async getWarehouse(userId) {
    const response = await fetch(`/api/user/${userId}/warehouse`);
    if (!response.ok) {
      throw new Error('Failed to load warehouse data');
    }
    return response.json();
  },

  // Upgrade warehouse
  async upgradeWarehouse(userId) {
    const response = await fetch(`/api/user/${userId}/warehouse/upgrade`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upgrade warehouse');
    }
    return response.json();
  },

  // Market - Create listing
  async createMarketListing(userId, resourceType, quantity, pricePerUnit) {
    const response = await fetch(`/api/user/${userId}/market/create-listing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resourceType, quantity, pricePerUnit }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create listing');
    }
    return response.json();
  },

  // Market - Get listings for resource
  async getMarketListings(userId, resourceType) {
    const response = await fetch(`/api/user/${userId}/market/listings/${resourceType}`);
    if (!response.ok) {
      throw new Error('Failed to load market listings');
    }
    return response.json();
  },

  // Market - Get user's listings
  async getMyMarketListings(userId) {
    const response = await fetch(`/api/user/${userId}/market/my-listings`);
    if (!response.ok) {
      throw new Error('Failed to load your listings');
    }
    return response.json();
  },

  // Market - Cancel listing
  async cancelMarketListing(userId, listingId) {
    const response = await fetch(`/api/user/${userId}/market/listings/${listingId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to cancel listing');
    }
    return response.json();
  },

  // Market - Buy listing
  async buyFromMarket(userId, listingId, quantity) {
    const response = await fetch(`/api/user/${userId}/market/buy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ listingId, quantity }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to buy from market');
    }
    return response.json();
  },

  // Market - Update listing
  async updateMarketListing(userId, listingId, quantity, pricePerUnit) {
    const response = await fetch(`/api/user/${userId}/market/listings/${listingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ quantity, pricePerUnit }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update listing');
    }
    return response.json();
  },
};
