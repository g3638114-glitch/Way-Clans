import { supabase } from '../bot.js';
import { getTreasuryCapacity, getWarehouseCapacity } from '../config/buildings.js';

/**
 * Create a new marketplace listing
 * seller_id is telegram_id, need to convert to user UUID
 */
export async function createListing(seller_telegram_id, resource_type, price_per_unit, quantity) {
  // Get user by telegram_id to get UUID
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', seller_telegram_id)
    .single();

  if (userError || !user) {
    throw new Error('User not found');
  }

  // Deduct resources from seller immediately
  const { data: sellerData, error: sellerError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (sellerError) {
    throw new Error('Failed to get seller data');
  }

  if ((sellerData[resource_type] || 0) < quantity) {
    throw new Error('Not enough resources');
  }

  // Create listing
  const { data, error } = await supabase
    .from('marketplace_listings')
    .insert({
      seller_id: user.id,
      resource_type,
      price_per_unit,
      quantity_available: quantity,
      quantity_sold: 0,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create listing: ${error.message}`);
  }

  // Remove resources from seller
  const updateData = {};
  updateData[resource_type] = (sellerData[resource_type] || 0) - quantity;

  await supabase
    .from('users')
    .update(updateData)
    .eq('id', user.id);

  return data;
}

/**
 * Get all active listings for a specific resource type
 * Sorted by price (cheapest first), excluding listings from users who exceeded treasury capacity
 */
export async function getListingsByResourceType(resource_type, buyer_id = null) {
  // First, get all users with their treasury levels to check capacity
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, gold, treasury_level, first_name, username');

  if (usersError) {
    throw new Error(`Failed to fetch users: ${usersError.message}`);
  }

  // Build a map of user ID to their treasury capacity and info
  const userTreasuryMap = {};
  users.forEach(user => {
    const treasuryLevel = user.treasury_level || 1;
    const capacity = getTreasuryCapacity(treasuryLevel);
    userTreasuryMap[user.id] = {
      gold: user.gold,
      capacity,
      first_name: user.first_name,
      username: user.username,
    };
  });

  // Get active listings for this resource type
  const { data: listings, error: listingsError } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('resource_type', resource_type)
    .eq('status', 'active')
    .gt('quantity_available', 0)
    .order('price_per_unit', { ascending: true });

  if (listingsError) {
    throw new Error(`Failed to fetch listings: ${listingsError.message}`);
  }

  // Filter out listings from sellers who have exceeded their treasury capacity
  // Also add seller info to each listing
  const filteredListings = listings
    .filter(listing => {
      const sellerInfo = userTreasuryMap[listing.seller_id];
      if (!sellerInfo) return false;

      // If seller's gold is at or above their capacity, hide the listing
      return sellerInfo.gold < sellerInfo.capacity;
    })
    .map(listing => ({
      ...listing,
      seller_name: userTreasuryMap[listing.seller_id]?.first_name || 'Игрок',
      seller_username: userTreasuryMap[listing.seller_id]?.username,
    }));

  return filteredListings;
}

/**
 * Get user's own listings
 * seller_id is telegram_id, need to convert to user UUID
 */
export async function getUserListings(seller_telegram_id) {
  // Get seller by telegram_id
  const { data: sellerUser, error: sellerUserError } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', seller_telegram_id)
    .single();

  if (sellerUserError || !sellerUser) {
    throw new Error('User not found');
  }

  const { data, error } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('seller_id', sellerUser.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch user listings: ${error.message}`);
  }

  return data || [];
}

/**
 * Buy from a listing
 * buyer_id is telegram_id, need to convert to user UUID
 */
export async function buyFromListing(buyer_telegram_id, listing_id, quantity_to_buy) {
  // Get buyer by telegram_id
  const { data: buyerUser, error: buyerUserError } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', buyer_telegram_id)
    .single();

  if (buyerUserError || !buyerUser) {
    throw new Error('Buyer not found');
  }

  // Get the listing
  const { data: listing, error: listingError } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('id', listing_id)
    .single();

  if (listingError || !listing) {
    throw new Error('Listing not found');
  }

  if (listing.quantity_available < quantity_to_buy) {
    throw new Error('Not enough quantity available');
  }

  // Get buyer full data
  const { data: buyer, error: buyerError } = await supabase
    .from('users')
    .select('*')
    .eq('id', buyerUser.id)
    .single();

  if (buyerError || !buyer) {
    throw new Error('Buyer not found');
  }

  // Get seller
  const { data: seller, error: sellerError } = await supabase
    .from('users')
    .select('*')
    .eq('id', listing.seller_id)
    .single();

  if (sellerError || !seller) {
    throw new Error('Seller not found');
  }

  // Check buyer's warehouse capacity
  const warehouseLevel = buyer.warehouse_level || 1;
  const warehouseCapacity = getWarehouseCapacity(warehouseLevel);
  const currentWarehouseUsage = (buyer.wood || 0) + (buyer.stone || 0) + (buyer.meat || 0);
  const newWarehouseUsage = currentWarehouseUsage + quantity_to_buy;

  if (newWarehouseUsage > warehouseCapacity) {
    throw new Error('Warehouse is full. Cannot buy more resources.');
  }

  // Calculate cost
  const totalCost = listing.price_per_unit * quantity_to_buy;

  if (buyer.gold < totalCost) {
    throw new Error('Not enough Jamcoin');
  }

  // Update buyer resources and gold
  const resourceKey = listing.resource_type;
  const updateBuyerData = {
    gold: buyer.gold - totalCost,
    [resourceKey]: (buyer[resourceKey] || 0) + quantity_to_buy,
  };

  const { data: updatedBuyer, error: buyerUpdateError } = await supabase
    .from('users')
    .update(updateBuyerData)
    .eq('id', buyerUser.id)
    .select()
    .single();

  if (buyerUpdateError) {
    throw new Error('Failed to update buyer');
  }

  // Update seller gold
  const { data: updatedSeller, error: sellerUpdateError } = await supabase
    .from('users')
    .update({ gold: seller.gold + totalCost })
    .eq('id', listing.seller_id)
    .select()
    .single();

  if (sellerUpdateError) {
    throw new Error('Failed to update seller');
  }

  // Update listing
  const newQuantityAvailable = listing.quantity_available - quantity_to_buy;
  const newStatus = newQuantityAvailable === 0 ? 'completed' : 'active';

  const { data: updatedListing, error: listingUpdateError } = await supabase
    .from('marketplace_listings')
    .update({
      quantity_available: newQuantityAvailable,
      quantity_sold: listing.quantity_sold + quantity_to_buy,
      status: newStatus,
    })
    .eq('id', listing_id)
    .select()
    .single();

  if (listingUpdateError) {
    throw new Error('Failed to update listing');
  }

  return {
    success: true,
    updatedBuyer,
    updatedSeller,
    updatedListing,
  };
}

/**
 * Delete/cancel a listing and return resources to seller's balance
 * seller_id is telegram_id, need to convert to user UUID
 */
export async function cancelListing(listing_id, seller_telegram_id) {
  // Get seller by telegram_id
  const { data: sellerUser, error: sellerUserError } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', seller_telegram_id)
    .single();

  if (sellerUserError || !sellerUser) {
    throw new Error('Seller not found');
  }

  // Get the listing
  const { data: listing, error: listingError } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('id', listing_id)
    .eq('seller_id', sellerUser.id)
    .single();

  if (listingError || !listing) {
    throw new Error('Listing not found');
  }

  // Get seller full data
  const { data: seller, error: sellerError } = await supabase
    .from('users')
    .select('*')
    .eq('id', sellerUser.id)
    .single();

  if (sellerError || !seller) {
    throw new Error('Seller not found');
  }

  // Return remaining resources to seller
  const remainingQuantity = listing.quantity_available;
  const resourceKey = listing.resource_type;
  const updateData = {
    [resourceKey]: (seller[resourceKey] || 0) + remainingQuantity,
  };

  const { data: updatedSeller, error: sellerUpdateError } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', sellerUser.id)
    .select()
    .single();

  if (sellerUpdateError) {
    throw new Error('Failed to update seller');
  }

  // Mark listing as cancelled
  const { data: cancelledListing, error: listingUpdateError } = await supabase
    .from('marketplace_listings')
    .update({ status: 'cancelled', quantity_available: 0 })
    .eq('id', listing_id)
    .select()
    .single();

  if (listingUpdateError) {
    throw new Error('Failed to cancel listing');
  }

  return {
    success: true,
    updatedSeller,
    cancelledListing,
  };
}

/**
 * Edit a listing (price and quantity)
 * seller_id is telegram_id, need to convert to user UUID
 */
export async function editListing(listing_id, seller_telegram_id, price_per_unit, quantity) {
  // Get seller by telegram_id
  const { data: sellerUser, error: sellerUserError } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', seller_telegram_id)
    .single();

  if (sellerUserError || !sellerUser) {
    throw new Error('Seller not found');
  }

  // Get the listing
  const { data: listing, error: listingError } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('id', listing_id)
    .eq('seller_id', sellerUser.id)
    .single();

  if (listingError || !listing) {
    throw new Error('Listing not found');
  }

  // Get seller to check warehouse capacity
  const { data: seller, error: sellerError } = await supabase
    .from('users')
    .select('*')
    .eq('id', sellerUser.id)
    .single();

  if (sellerError || !seller) {
    throw new Error('Seller not found');
  }

  // Calculate the difference in quantity
  const currentOnSale = listing.quantity_available + listing.quantity_sold;
  const newOnSale = quantity;
  const quantityDifference = newOnSale - currentOnSale;

  if (quantityDifference > 0) {
    // Need to remove more resources from seller's balance
    const resourceKey = listing.resource_type;
    if ((seller[resourceKey] || 0) < quantityDifference) {
      throw new Error('Not enough resources to increase listing quantity');
    }
  }

  // Update listing
  const { data: updatedListing, error: updateError } = await supabase
    .from('marketplace_listings')
    .update({
      price_per_unit,
      quantity_available: quantity - listing.quantity_sold,
    })
    .eq('id', listing_id)
    .select()
    .single();

  if (updateError) {
    throw new Error('Failed to update listing');
  }

  // If quantity changed, update seller's resources
  if (quantityDifference !== 0) {
    const resourceKey = listing.resource_type;
    const updateData = {
      [resourceKey]: (seller[resourceKey] || 0) - quantityDifference,
    };

    await supabase
      .from('users')
      .update(updateData)
      .eq('id', sellerUser.id);
  }

  return updatedListing;
}
