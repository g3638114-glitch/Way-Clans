import { supabase } from '../bot.js';
import { getTreasuryCapacity, getWarehouseCapacity } from '../config/buildings.js';
import { getOrCreateUser } from './userService.js';


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

  const user = await getOrCreateUser(telegramId);
  if (!user) throw new Error('User not found');

  // Check if user has enough resources
  const userResources = user[resourceType] || 0;
  if (userResources < quantity) {
    throw new Error('Not enough resources');
  }

  // Create listing
  const { data: listing, error } = await supabase
    .from('market_listings')
    .insert({
      seller_id: user.id,
      resource_type: resourceType,
      quantity,
      price_per_unit: pricePerUnit,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create listing');

  // Deduct resources from user
  const newQuantity = userResources - quantity;
  await supabase
    .from('users')
    .update({ [resourceType]: newQuantity })
    .eq('id', user.id);

  return {
    success: true,
    listing,
    user: {
      ...user,
      [resourceType]: newQuantity,
    },
  };
}

/**
 * Get market listings for a specific resource, sorted by price (cheapest first)
 * Only show listings from sellers who haven't exceeded treasury capacity
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
      .select('id, telegram_id, first_name, username, gold, treasury_level')
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

    // Combine listings with seller data and filter by treasury capacity
    const validListings = listings
      .map(listing => ({
        ...listing,
        users: sellerMap[listing.seller_id],
      }))
      .filter((listing) => {
        const seller = listing.users;
        if (!seller) return false;

        const treasuryLevel = seller.treasury_level || 1;
        const capacity = getTreasuryCapacity(treasuryLevel);
        const totalPrice = listing.quantity * listing.price_per_unit;

        // Check if seller has room in treasury for payment (if they were to sell)
        return (seller.gold + totalPrice) <= capacity;
      });

    return validListings;
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

  return listings;
}

/**
 * Buy from a market listing
 */
export async function buyFromListing(buyerTelegramId, listingId, quantity) {
  if (quantity <= 0) {
    throw new Error('Quantity must be positive');
  }

  const buyer = await getOrCreateUser(buyerTelegramId);
  if (!buyer) throw new Error('Buyer not found');

  // Get listing details
  const { data: listing, error: listingError } = await supabase
    .from('market_listings')
    .select('*')
    .eq('id', listingId)
    .single();

  if (listingError || !listing) throw new Error('Listing not found');

  // Check if buyer is trying to buy their own listing
  if (buyer.id === listing.seller_id) {
    throw new Error('You cannot buy your own listings');
  }

  if (quantity > listing.quantity) {
    throw new Error('Not enough quantity in listing');
  }

  // Get seller
  const { data: seller, error: sellerError } = await supabase
    .from('users')
    .select('*')
    .eq('id', listing.seller_id)
    .single();

  if (sellerError) throw new Error('Seller not found');

  // Calculate total price
  const totalPrice = quantity * listing.price_per_unit;

  // Check buyer has enough gold
  if (buyer.gold < totalPrice) {
    throw new Error('Not enough Jamcoin');
  }

  // Check buyer's warehouse capacity for this specific resource
  const warehouseCapacity = getWarehouseCapacity(buyer.warehouse_level || 1);
  const currentResourceAmount = buyer[listing.resource_type] || 0;

  if (currentResourceAmount + quantity > warehouseCapacity) {
    throw new Error('Not enough warehouse space');
  }

  // Check seller hasn't exceeded treasury capacity
  const treasuryLevel = seller.treasury_level || 1;
  const treasuryCapacity = getTreasuryCapacity(treasuryLevel);
  const newSellerGold = seller.gold + totalPrice;

  if (newSellerGold > treasuryCapacity) {
    throw new Error('Seller treasury is full');
  }

  // Perform transaction
  // 1. Deduct gold from buyer
  const buyerResourceField = listing.resource_type;
  const buyerUpdates = {
    gold: buyer.gold - totalPrice,
    [buyerResourceField]: (buyer[buyerResourceField] || 0) + quantity,
  };

  const newQuantity = listing.quantity - quantity;
  await Promise.all([
    supabase.from('users').update(buyerUpdates).eq('id', buyer.id),
    supabase.from('users').update({ gold: newSellerGold }).eq('id', listing.seller_id),
    newQuantity === 0
      ? supabase.from('market_listings').delete().eq('id', listingId)
      : supabase.from('market_listings').update({ quantity: newQuantity }).eq('id', listingId),
  ]);

  return {
    success: true,
    message: `Purchased ${quantity} ${listing.resource_type}`,
    user: {
      ...buyer,
      ...buyerUpdates,
    },
  };
}

/**
 * Delete a market listing (returns resources to seller)
 */
export async function deleteListing(telegramId, listingId) {
  const user = await getOrCreateUser(telegramId);
  if (!user) throw new Error('User not found');

  // Get listing
  const { data: listing, error: listingError } = await supabase
    .from('market_listings')
    .select('*')
    .eq('id', listingId)
    .single();

  if (listingError || !listing) throw new Error('Listing not found');

  // Check if user owns the listing
  if (listing.seller_id !== user.id) {
    throw new Error('You do not own this listing');
  }

  // Return resources to seller
  const resourceField = listing.resource_type;
  await supabase
    .from('users')
    .update({ [resourceField]: (user[resourceField] || 0) + listing.quantity })
    .eq('id', user.id);

  // Delete listing
  await supabase.from('market_listings').delete().eq('id', listingId);

  return {
    success: true,
    message: 'Listing deleted and resources returned',
    user: {
      ...user,
      [resourceField]: (user[resourceField] || 0) + listing.quantity,
    },
  };
}

/**
 * Edit a market listing
 */
export async function editListing(telegramId, listingId, { quantity, pricePerUnit }) {
  const user = await getOrCreateUser(telegramId);
  if (!user) throw new Error('User not found');

  if (quantity <= 0 || pricePerUnit <= 0) {
    throw new Error('Quantity and price must be positive');
  }

  // Get listing
  const { data: listing, error: listingError } = await supabase
    .from('market_listings')
    .select('*')
    .eq('id', listingId)
    .single();

  if (listingError || !listing) throw new Error('Listing not found');

  // Check if user owns the listing
  if (listing.seller_id !== user.id) {
    throw new Error('You do not own this listing');
  }

  // Calculate quantity difference
  const quantityDiff = quantity - listing.quantity;

  // If increasing quantity, check if user has enough resources
  let updatedUser = user;

  if (quantityDiff > 0) {
    const userResources = user[listing.resource_type] || 0;
    if (userResources < quantityDiff) {
      throw new Error('Not enough resources to increase listing quantity');
    }

    const nextAmount = userResources - quantityDiff;
    await supabase
      .from('users')
      .update({ [listing.resource_type]: nextAmount })
      .eq('id', user.id);
    updatedUser = { ...user, [listing.resource_type]: nextAmount };
  } else if (quantityDiff < 0) {
    const nextAmount = (user[listing.resource_type] || 0) - quantityDiff;
    await supabase
      .from('users')
      .update({ [listing.resource_type]: nextAmount })
      .eq('id', user.id);
    updatedUser = { ...user, [listing.resource_type]: nextAmount };
  }

  // Update listing
  const { data: updatedListing, error: updateError } = await supabase
    .from('market_listings')
    .update({ quantity, price_per_unit: pricePerUnit })
    .eq('id', listingId)
    .select()
    .single();

  if (updateError) throw new Error('Failed to update listing');

  return { success: true, listing: updatedListing, user: updatedUser };
}
