import { supabase } from '../bot.js';
import { getTreasuryCapacity } from '../config/buildings.js';
import { getWarehouseCapacity } from '../config/buildings.js';

/**
 * Create a new market listing
 * Player sets their own price and quantity
 */
export async function createListing(userId, resourceType, quantity, pricePerUnit) {
  if (!['wood', 'stone', 'meat'].includes(resourceType)) {
    throw new Error('Invalid resource type');
  }

  if (quantity <= 0 || pricePerUnit <= 0) {
    throw new Error('Quantity and price must be greater than 0');
  }

  // Get user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', userId)
    .single();

  if (userError || !user) {
    throw new Error('User not found');
  }

  // Check if user has enough resources
  const resourceField = resourceType;
  if ((user[resourceField] || 0) < quantity) {
    throw new Error(`Not enough ${resourceType}. You have ${user[resourceField] || 0}, need ${quantity}`);
  }

  const totalPrice = quantity * pricePerUnit;

  // Create listing
  const { data: listing, error: listingError } = await supabase
    .from('market_listings')
    .insert({
      seller_id: user.id,
      resource_type: resourceType,
      quantity: quantity,
      price_per_unit: pricePerUnit,
      total_price: totalPrice,
      active: true,
    })
    .select()
    .single();

  if (listingError) {
    throw new Error('Failed to create listing');
  }

  // Deduct resources from user
  const { error: updateError } = await supabase
    .from('users')
    .update({
      [resourceField]: (user[resourceField] || 0) - quantity,
    })
    .eq('id', user.id);

  if (updateError) {
    // Rollback - delete listing if resource update failed
    await supabase.from('market_listings').delete().eq('id', listing.id);
    throw new Error('Failed to update resources');
  }

  return { success: true, listing };
}

/**
 * Get all active listings for a specific resource, sorted by price (cheapest first)
 */
export async function getListingsByResource(resourceType) {
  if (!['wood', 'stone', 'meat'].includes(resourceType)) {
    throw new Error('Invalid resource type');
  }

  const { data: listings, error } = await supabase
    .from('market_listings')
    .select(`
      *,
      seller:seller_id(
        id,
        telegram_id,
        username,
        first_name
      )
    `)
    .eq('resource_type', resourceType)
    .eq('active', true)
    .order('price_per_unit', { ascending: true });

  if (error) {
    throw new Error('Failed to fetch listings');
  }

  // Filter out listings from sellers at treasury limit
  const filteredListings = [];

  for (const listing of listings) {
    try {
      const { data: sellerData } = await supabase
        .from('users')
        .select('gold, treasury_level')
        .eq('id', listing.seller_id)
        .single();

      if (sellerData) {
        const treasuryLevel = sellerData.treasury_level || 1;
        const capacity = getTreasuryCapacity(treasuryLevel);
        const newGoldAfterSale = (sellerData.gold || 0) + listing.total_price;

        // Only include listing if seller's treasury won't be full after sale
        if (newGoldAfterSale <= capacity) {
          filteredListings.push(listing);
        }
      }
    } catch (err) {
      // Skip if there's an error checking the seller's capacity
      continue;
    }
  }

  return filteredListings;
}

/**
 * Get listings by current user
 */
export async function getUserListings(userId) {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', userId)
    .single();

  if (userError || !user) {
    throw new Error('User not found');
  }

  const { data: listings, error } = await supabase
    .from('market_listings')
    .select('*')
    .eq('seller_id', user.id)
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch listings');
  }

  return listings;
}

/**
 * Buy a listing (player purchases resources)
 * Returns remaining quantity if buyer buys less than listed
 */
export async function buyListing(buyerId, listingId, quantityToBuy) {
  const { data: buyer, error: buyerError } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', buyerId)
    .single();

  if (buyerError || !buyer) {
    throw new Error('Buyer not found');
  }

  const { data: listing, error: listingError } = await supabase
    .from('market_listings')
    .select('*')
    .eq('id', listingId)
    .eq('active', true)
    .single();

  if (listingError || !listing) {
    throw new Error('Listing not found or no longer active');
  }

  if (quantityToBuy <= 0 || quantityToBuy > listing.quantity) {
    throw new Error(`Invalid quantity. Available: ${listing.quantity}`);
  }

  const totalCost = quantityToBuy * listing.price_per_unit;

  // Check buyer has enough gold
  if ((buyer.gold || 0) < totalCost) {
    throw new Error(`Not enough Jamcoin. Need ${totalCost}, have ${buyer.gold || 0}`);
  }

  // Check buyer's warehouse capacity
  const warehouseLevel = buyer.warehouse_level || 1;
  const warehouseCapacity = getWarehouseCapacity(warehouseLevel);
  const currentResource = buyer[listing.resource_type] || 0;

  if (currentResource >= warehouseCapacity) {
    throw new Error(`Your warehouse is full for ${listing.resource_type}`);
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

  // Check if seller's treasury is still valid (didn't reach limit)
  const treasuryLevel = seller.treasury_level || 1;
  const capacity = getTreasuryCapacity(treasuryLevel);
  const newSellerGold = (seller.gold || 0) + totalCost;

  if (newSellerGold > capacity) {
    throw new Error('Seller\'s treasury is full. This listing is no longer available');
  }

  const newListingQuantity = listing.quantity - quantityToBuy;

  // Update buyer
  const { error: buyerUpdateError } = await supabase
    .from('users')
    .update({
      gold: (buyer.gold || 0) - totalCost,
      [listing.resource_type]: currentResource + quantityToBuy,
    })
    .eq('id', buyer.id);

  if (buyerUpdateError) {
    throw new Error('Failed to update buyer resources');
  }

  // Update seller
  const { error: sellerUpdateError } = await supabase
    .from('users')
    .update({
      gold: newSellerGold,
    })
    .eq('id', seller.id);

  if (sellerUpdateError) {
    throw new Error('Failed to update seller resources');
  }

  // Update or delete listing
  if (newListingQuantity <= 0) {
    // Delete listing if all quantity sold
    const { error: deleteError } = await supabase
      .from('market_listings')
      .delete()
      .eq('id', listingId);

    if (deleteError) {
      throw new Error('Failed to delete listing');
    }
  } else {
    // Update quantity
    const { error: listingUpdateError } = await supabase
      .from('market_listings')
      .update({
        quantity: newListingQuantity,
        total_price: newListingQuantity * listing.price_per_unit,
      })
      .eq('id', listingId);

    if (listingUpdateError) {
      throw new Error('Failed to update listing');
    }
  }

  // Get updated buyer
  const { data: updatedBuyer } = await supabase
    .from('users')
    .select('*')
    .eq('id', buyer.id)
    .single();

  return { success: true, user: updatedBuyer, quantityPurchased: quantityToBuy };
}

/**
 * Edit a listing (only price, not quantity)
 */
export async function editListing(userId, listingId, newPricePerUnit) {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', userId)
    .single();

  if (userError || !user) {
    throw new Error('User not found');
  }

  const { data: listing, error: listingError } = await supabase
    .from('market_listings')
    .select('*')
    .eq('id', listingId)
    .eq('active', true)
    .single();

  if (listingError || !listing) {
    throw new Error('Listing not found');
  }

  // Check ownership
  if (listing.seller_id !== user.id) {
    throw new Error('You can only edit your own listings');
  }

  if (newPricePerUnit <= 0) {
    throw new Error('Price must be greater than 0');
  }

  const newTotalPrice = listing.quantity * newPricePerUnit;

  const { error: updateError } = await supabase
    .from('market_listings')
    .update({
      price_per_unit: newPricePerUnit,
      total_price: newTotalPrice,
    })
    .eq('id', listingId);

  if (updateError) {
    throw new Error('Failed to update listing');
  }

  return { success: true };
}

/**
 * Delete a listing and return resources to seller
 */
export async function deleteListing(userId, listingId) {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', userId)
    .single();

  if (userError || !user) {
    throw new Error('User not found');
  }

  const { data: listing, error: listingError } = await supabase
    .from('market_listings')
    .select('*')
    .eq('id', listingId)
    .eq('active', true)
    .single();

  if (listingError || !listing) {
    throw new Error('Listing not found');
  }

  // Check ownership
  if (listing.seller_id !== user.id) {
    throw new Error('You can only delete your own listings');
  }

  // Return resources to seller
  const { error: updateError } = await supabase
    .from('users')
    .update({
      [listing.resource_type]: (user[listing.resource_type] || 0) + listing.quantity,
    })
    .eq('id', user.id);

  if (updateError) {
    throw new Error('Failed to return resources');
  }

  // Delete listing
  const { error: deleteError } = await supabase
    .from('market_listings')
    .delete()
    .eq('id', listingId);

  if (deleteError) {
    throw new Error('Failed to delete listing');
  }

  // Get updated user
  const { data: updatedUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  return { success: true, user: updatedUser };
}

/**
 * Check and disable listings if seller's treasury is full
 * This is called periodically to ensure listings follow treasury restrictions
 */
export async function disableListingsForFullTreasury(sellerId) {
  const { data: seller, error: sellerError } = await supabase
    .from('users')
    .select('*')
    .eq('id', sellerId)
    .single();

  if (sellerError || !seller) {
    return { success: false, message: 'Seller not found' };
  }

  const treasuryLevel = seller.treasury_level || 1;
  const capacity = getTreasuryCapacity(treasuryLevel);

  if ((seller.gold || 0) >= capacity) {
    // Disable all listings
    const { error: updateError } = await supabase
      .from('market_listings')
      .update({ active: false })
      .eq('seller_id', sellerId);

    if (updateError) {
      return { success: false, message: 'Failed to disable listings' };
    }

    return { success: true, message: 'Listings disabled due to full treasury' };
  }

  return { success: true, message: 'Treasury not full' };
}
