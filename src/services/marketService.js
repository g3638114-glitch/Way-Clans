import { supabase } from '../bot.js';
import { getTreasuryCapacity, getWarehouseCapacity } from '../config/buildings.js';
import { getOrCreateUser } from './userService.js';
import { withTransaction } from '../database/pg.js';


/**
 * Create a market listing for selling resources
 */
export async function createListing(telegramId, { resourceType, quantity, pricePerUnit }) {
  // Validate input
  if (!['wood', 'stone', 'meat'].includes(resourceType)) {
    throw new Error('Invalid resource type');
  }

  if (quantity <= 0 || pricePerUnit <= 0) {
    throw new Error('Quantity and price must be positive');
  }

  return withTransaction(async (client) => {
    const userResult = await client.query(
      'SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE',
      [telegramId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult.rows[0];
    const userResources = Number(user[resourceType] || 0);

    if (userResources < quantity) {
      throw new Error('Not enough resources');
    }

    const newQuantity = userResources - quantity;
    await client.query(`UPDATE users SET ${resourceType} = $1 WHERE id = $2`, [newQuantity, user.id]);

    const listingResult = await client.query(
      `INSERT INTO market_listings (seller_id, resource_type, quantity, price_per_unit)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user.id, resourceType, quantity, pricePerUnit]
    );

    return {
      success: true,
      listing: listingResult.rows[0],
      user: {
        ...user,
        [resourceType]: newQuantity,
      },
    };
  });
}

/**
 * Get market listings for a specific resource, sorted by price (cheapest first)
 */
export async function getListings(resourceType) {
  try {
    if (!['wood', 'stone', 'meat'].includes(resourceType)) {
      throw new Error('Invalid resource type');
    }

    // Get all listings for this resource
    const { data: listings, error: listingsError } = await supabase
      .from('market_listings')
      .select('*')
      .eq('resource_type', resourceType)
      .order('price_per_unit', { ascending: true });

    if (listingsError) {
      console.error('Supabase error getting listings:', listingsError);
      throw new Error(`Failed to get listings: ${listingsError.message}`);
    }

    // If no listings, return empty array
    if (!listings || listings.length === 0) return [];

    // Get seller information for all listings
    const sellerIds = listings.map(l => l.seller_id);

    const { data: sellers, error: sellersError } = await supabase
      .from('users')
      .select('id, telegram_id, first_name, username')
      .in('id', sellerIds);

    if (sellersError) {
      console.error('Supabase error getting sellers:', sellersError);
      throw new Error(`Failed to get seller information: ${sellersError.message}`);
    }

    // Create a map of sellers by ID for quick lookup
    const sellerMap = {};
    if (sellers) {
      sellers.forEach(seller => {
        sellerMap[seller.id] = seller;
      });
    }

    return listings
      .map(listing => ({
        ...listing,
        users: sellerMap[listing.seller_id],
      }))
      .filter((listing) => Boolean(listing.users));
  } catch (error) {
    console.error('Error in getListings:', error);
    throw error;
  }
}

/**
 * Get a user's own listings
 */
export async function getMyListings(telegramId) {
  const user = await getOrCreateUser(telegramId);
  if (!user) throw new Error('User not found');

  const { data: listings, error } = await supabase
    .from('market_listings')
    .select('*')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Failed to get listings');

  const { data: sales, error: salesError } = await supabase
    .from('market_sales')
    .select('id, resource_type, quantity, price_per_unit, total_price, created_at')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (salesError) throw new Error('Failed to load market sales history');

  return {
    listings,
    pendingGold: Number(user.market_pending_gold || 0),
    salesHistory: sales || [],
  };
}

/**
 * Buy from a market listing
 */
export async function buyFromListing(buyerTelegramId, listingId, quantity) {
  if (quantity <= 0) {
    throw new Error('Quantity must be positive');
  }

  return withTransaction(async (client) => {
    const buyerResult = await client.query(
      'SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE',
      [buyerTelegramId]
    );

    if (buyerResult.rows.length === 0) {
      throw new Error('Buyer not found');
    }

    const buyer = buyerResult.rows[0];
    const listingResult = await client.query(
      'SELECT * FROM market_listings WHERE id = $1 FOR UPDATE',
      [listingId]
    );

    if (listingResult.rows.length === 0) {
      throw new Error('Listing not found');
    }

    const listing = listingResult.rows[0];

    if (buyer.id === listing.seller_id) {
      throw new Error('You cannot buy your own listings');
    }

    if (quantity > Number(listing.quantity)) {
      throw new Error('Not enough quantity in listing');
    }

    const sellerResult = await client.query(
      'SELECT * FROM users WHERE id = $1 FOR UPDATE',
      [listing.seller_id]
    );

    if (sellerResult.rows.length === 0) {
      throw new Error('Seller not found');
    }

    const seller = sellerResult.rows[0];
    const totalPrice = quantity * Number(listing.price_per_unit);

    if (Number(buyer.gold) < totalPrice) {
      throw new Error('Not enough Jamcoin');
    }

    const warehouseCapacity = getWarehouseCapacity(buyer.warehouse_level || 1);
    const currentResourceAmount = Number(buyer[listing.resource_type] || 0);

    if (currentResourceAmount + quantity > warehouseCapacity) {
      throw new Error('Not enough warehouse space');
    }

    const buyerUpdates = {
      gold: Number(buyer.gold) - totalPrice,
      [listing.resource_type]: currentResourceAmount + quantity,
    };

    await client.query(
      `UPDATE users
       SET gold = $1, ${listing.resource_type} = $2
       WHERE id = $3`,
      [buyerUpdates.gold, buyerUpdates[listing.resource_type], buyer.id]
    );

    await client.query(
      'UPDATE users SET market_pending_gold = $1 WHERE id = $2',
      [Number(seller.market_pending_gold || 0) + totalPrice, seller.id]
    );

    await client.query(
      `INSERT INTO market_sales (seller_id, buyer_id, resource_type, quantity, price_per_unit, total_price)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [seller.id, buyer.id, listing.resource_type, quantity, Number(listing.price_per_unit), totalPrice]
    );

    const newQuantity = Number(listing.quantity) - quantity;
    if (newQuantity <= 0) {
      await client.query('DELETE FROM market_listings WHERE id = $1', [listingId]);
    } else {
      await client.query('UPDATE market_listings SET quantity = $1 WHERE id = $2', [newQuantity, listingId]);
    }

    return {
      success: true,
      message: `Purchased ${quantity} ${listing.resource_type}`,
      user: { ...buyer, ...buyerUpdates },
    };
  });
}

/**
 * Delete a market listing (returns resources to seller)
 */
export async function deleteListing(telegramId, listingId) {
  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [telegramId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user = userResult.rows[0];

    const listingResult = await client.query('SELECT * FROM market_listings WHERE id = $1 FOR UPDATE', [listingId]);
    if (listingResult.rows.length === 0) throw new Error('Listing not found');
    const listing = listingResult.rows[0];

    if (listing.seller_id !== user.id) {
      throw new Error('You do not own this listing');
    }

    const resourceField = listing.resource_type;
    const nextAmount = Number(user[resourceField] || 0) + Number(listing.quantity);

    await client.query(`UPDATE users SET ${resourceField} = $1 WHERE id = $2`, [nextAmount, user.id]);
    await client.query('DELETE FROM market_listings WHERE id = $1', [listingId]);

    return {
      success: true,
      message: 'Listing deleted and resources returned',
      user: { ...user, [resourceField]: nextAmount },
    };
  });
}

/**
 * Edit a market listing
 */
export async function editListing(telegramId, listingId, { quantity, pricePerUnit }) {
  if (quantity <= 0 || pricePerUnit <= 0) {
    throw new Error('Quantity and price must be positive');
  }

  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [telegramId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user = userResult.rows[0];

    const listingResult = await client.query('SELECT * FROM market_listings WHERE id = $1 FOR UPDATE', [listingId]);
    if (listingResult.rows.length === 0) throw new Error('Listing not found');
    const listing = listingResult.rows[0];

    if (listing.seller_id !== user.id) {
      throw new Error('You do not own this listing');
    }

    const quantityDiff = quantity - Number(listing.quantity);
    let updatedUser = user;

    if (quantityDiff > 0) {
      const userResources = Number(user[listing.resource_type] || 0);
      if (userResources < quantityDiff) {
        throw new Error('Not enough resources to increase listing quantity');
      }

      const nextAmount = userResources - quantityDiff;
      await client.query(`UPDATE users SET ${listing.resource_type} = $1 WHERE id = $2`, [nextAmount, user.id]);
      updatedUser = { ...user, [listing.resource_type]: nextAmount };
    } else if (quantityDiff < 0) {
      const nextAmount = Number(user[listing.resource_type] || 0) - quantityDiff;
      await client.query(`UPDATE users SET ${listing.resource_type} = $1 WHERE id = $2`, [nextAmount, user.id]);
      updatedUser = { ...user, [listing.resource_type]: nextAmount };
    }

    const updatedListingResult = await client.query(
      `UPDATE market_listings
       SET quantity = $1, price_per_unit = $2
       WHERE id = $3
       RETURNING *`,
      [quantity, pricePerUnit, listingId]
    );

    return { success: true, listing: updatedListingResult.rows[0], user: updatedUser };
  });
}

export async function claimPendingGold(telegramId) {
  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [telegramId]);
    if (userResult.rows.length === 0) throw new Error('User not found');

    const user = userResult.rows[0];
    const pendingGold = Number(user.market_pending_gold || 0);
    if (pendingGold <= 0) {
      throw new Error('На рынке нет Jamcoin для вывода');
    }

    const treasuryCapacity = getTreasuryCapacity(user.treasury_level || 1);
    const availableSpace = Math.max(0, treasuryCapacity - Number(user.gold || 0));

    if (availableSpace <= 0) {
      throw new Error(`Лимит казны достигнут. Вы не можете забрать Jamcoin с рынка. Вместимость казны: ${treasuryCapacity}, сейчас: ${user.gold || 0}.`);
    }

    const amountToClaim = Math.min(availableSpace, pendingGold);

    const updatedUserResult = await client.query(
      `UPDATE users
       SET gold = $1, market_pending_gold = $2
       WHERE id = $3
       RETURNING *`,
      [Number(user.gold || 0) + amountToClaim, pendingGold - amountToClaim, user.id]
    );

    return {
      success: true,
      claimedGold: amountToClaim,
      remainingPendingGold: pendingGold - amountToClaim,
      user: updatedUserResult.rows[0],
    };
  });
}
