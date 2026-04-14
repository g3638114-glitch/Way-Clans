import { supabase } from '../bot.js';
import { getTreasuryCapacity } from '../config/buildings.js';
import { getWarehouseCapacity } from '../config/buildings.js';

/**
 * Create a market listing for a resource
 */
export async function createListing(userId, resourceType, quantity, pricePerUnit) {
  try {
    // Get user to check resources
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userId)
      .single();

    if (userError || !user) {
      throw new Error('User not found');
    }

    // Validate resource type
    const validResources = ['wood', 'stone', 'meat'];
    if (!validResources.includes(resourceType)) {
      throw new Error('Invalid resource type');
    }

    // Check if user has enough resources
    if (user[resourceType] < quantity) {
      throw new Error(`Not enough ${resourceType}`);
    }

    // Reserve resources (deduct from user balance)
    const updateData = {};
    updateData[resourceType] = user[resourceType] - quantity;

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('telegram_id', userId);

    if (updateError) {
      throw new Error('Failed to reserve resources');
    }

    // Create listing
    const { data: listing, error: listingError } = await supabase
      .from('market_listings')
      .insert({
        seller_id: user.id,
        resource_type: resourceType,
        quantity,
        price_per_unit: pricePerUnit,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (listingError) {
      // Restore resources if listing creation failed
      updateData[resourceType] = user[resourceType];
      await supabase.from('users').update(updateData).eq('telegram_id', userId);
      throw new Error('Failed to create listing');
    }

    return { success: true, listing };
  } catch (error) {
    throw error;
  }
}

/**
 * Get all market listings for a resource type, sorted by price (cheapest first)
 */
export async function getListingsByResource(resourceType, buyerId = null) {
  try {
    const { data: listings, error } = await supabase
      .from('market_listings')
      .select('*')
      .eq('resource_type', resourceType)
      .order('price_per_unit', { ascending: true });

    if (error) {
      throw new Error('Failed to fetch listings');
    }

    if (!listings || listings.length === 0) {
      return { success: true, listings: [] };
    }

    // Get seller info for each listing and filter out listings where seller's treasury is full
    const sellerIds = [...new Set(listings.map(l => l.seller_id))];

    const { data: sellers, error: sellerError } = await supabase
      .from('users')
      .select('id, username, first_name, gold, treasury_level')
      .in('id', sellerIds);

    if (sellerError) {
      throw new Error('Failed to fetch seller info');
    }

    const sellerMap = {};
    sellers.forEach(seller => {
      sellerMap[seller.id] = seller;
    });

    const filteredListings = listings
      .map(listing => ({
        ...listing,
        users: sellerMap[listing.seller_id],
      }))
      .filter((listing) => {
        const seller = listing.users;
        if (!seller) return false;

        const treasuryLevel = seller.treasury_level || 1;
        const capacity = getTreasuryCapacity(treasuryLevel);
        const listingTotal = listing.quantity * listing.price_per_unit;

        // Check if seller can receive the payment
        return (seller.gold || 0) + listingTotal <= capacity;
      });

    return { success: true, listings: filteredListings };
  } catch (error) {
    throw error;
  }
}

/**
 * Get current user's listings
 */
export async function getUserListings(userId) {
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', userId)
      .single();

    if (userError || !user) {
      throw new Error('User not found');
    }

    const { data: listings, error } = await supabase
      .from('market_listings')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch user listings');
    }

    return { success: true, listings: listings || [] };
  } catch (error) {
    throw error;
  }
}

/**
 * Cancel a listing and return resources to seller
 */
export async function cancelListing(listingId, userId) {
  try {
    // Get listing
    const { data: listing, error: listingError } = await supabase
      .from('market_listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      throw new Error('Listing not found');
    }

    // Verify user is the seller
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', userId)
      .single();

    if (userError || !user) {
      throw new Error('User not found');
    }

    if (listing.seller_id !== user.id) {
      throw new Error('Not authorized to cancel this listing');
    }

    // Get current resource amount and return to seller
    const { data: currentUser } = await supabase
      .from('users')
      .select(listing.resource_type)
      .eq('id', user.id)
      .single();

    const updateData = {};
    updateData[listing.resource_type] = (currentUser[listing.resource_type] || 0) + listing.quantity;

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
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

    return { success: true };
  } catch (error) {
    throw error;
  }
}

/**
 * Update a listing price
 */
export async function updateListing(listingId, userId, newPrice) {
  try {
    // Get listing
    const { data: listing, error: listingError } = await supabase
      .from('market_listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      throw new Error('Listing not found');
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', userId)
      .single();

    if (userError || !user) {
      throw new Error('User not found');
    }

    // Verify user is the seller
    if (listing.seller_id !== user.id) {
      throw new Error('Not authorized to update this listing');
    }

    // Validate new price
    if (!newPrice || newPrice < 1) {
      throw new Error('Invalid price');
    }

    // Update listing price
    const { data: updatedListing, error: updateError } = await supabase
      .from('market_listings')
      .update({
        price_per_unit: newPrice,
        updated_at: new Date().toISOString(),
      })
      .eq('id', listingId)
      .select()
      .single();

    if (updateError) {
      throw new Error('Failed to update listing');
    }

    return { success: true, listing: updatedListing };
  } catch (error) {
    throw error;
  }
}

/**
 * Buy a listing from market
 */
export async function buyListing(listingId, buyerId, quantityToBuy) {
  try {
    // Get listing
    const { data: listing, error: listingError } = await supabase
      .from('market_listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      throw new Error('Listing not found');
    }

    // Get buyer
    const { data: buyer, error: buyerError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', buyerId)
      .single();

    if (buyerError || !buyer) {
      throw new Error('Buyer not found');
    }

    // Prevent self-buy
    const { data: seller, error: sellerError } = await supabase
      .from('users')
      .select('id')
      .eq('id', listing.seller_id)
      .single();

    if (sellerError || !seller) {
      throw new Error('Seller not found');
    }

    if (seller.id === buyer.id) {
      throw new Error('Cannot buy your own listing');
    }

    // Check if quantity is valid
    if (quantityToBuy > listing.quantity) {
      throw new Error('Not enough quantity available');
    }

    const totalPrice = quantityToBuy * listing.price_per_unit;

    // Check if buyer has enough gold
    if (buyer.gold < totalPrice) {
      throw new Error('Not enough Jamcoin to buy');
    }

    // Get fresh seller data to check treasury capacity
    const { data: freshSeller, error: freshSellerError } = await supabase
      .from('users')
      .select('*')
      .eq('id', listing.seller_id)
      .single();

    if (freshSellerError || !freshSeller) {
      throw new Error('Seller not found');
    }

    // Check if seller's treasury has capacity for payment
    const treasuryLevel = freshSeller.treasury_level || 1;
    const capacity = getTreasuryCapacity(treasuryLevel);
    if ((freshSeller.gold || 0) + totalPrice > capacity) {
      throw new Error('Seller treasury is full - cannot complete sale');
    }

    // Check if buyer's warehouse has capacity
    const warehouseLevel = buyer.warehouse_level || 1;
    const warehouseCapacity = getWarehouseCapacity(warehouseLevel);
    const currentStorageUsed = (buyer.wood || 0) + (buyer.stone || 0) + (buyer.meat || 0);
    if (currentStorageUsed + quantityToBuy > warehouseCapacity) {
      throw new Error('Warehouse is full - cannot buy more resources');
    }

    // Update buyer: deduct gold, add resource
    const buyerUpdate = {
      gold: buyer.gold - totalPrice,
    };
    buyerUpdate[listing.resource_type] = (buyer[listing.resource_type] || 0) + quantityToBuy;

    const { error: buyerUpdateError } = await supabase
      .from('users')
      .update(buyerUpdate)
      .eq('telegram_id', buyerId);

    if (buyerUpdateError) {
      throw new Error('Failed to update buyer');
    }

    // Update seller: add gold
    const { error: sellerUpdateError } = await supabase
      .from('users')
      .update({
        gold: freshSeller.gold + totalPrice,
      })
      .eq('id', listing.seller_id);

    if (sellerUpdateError) {
      // Revert buyer update if seller update fails
      const revert = {};
      revert[listing.resource_type] = buyer[listing.resource_type];
      await supabase.from('users').update(revert).eq('telegram_id', buyerId);
      await supabase
        .from('users')
        .update({ gold: buyer.gold })
        .eq('telegram_id', buyerId);
      throw new Error('Failed to update seller');
    }

    // Update or delete listing
    if (quantityToBuy === listing.quantity) {
      // Delete listing if fully purchased
      const { error: deleteError } = await supabase
        .from('market_listings')
        .delete()
        .eq('id', listingId);

      if (deleteError) {
        throw new Error('Failed to delete listing');
      }
    } else {
      // Update listing with remaining quantity
      const { error: updateError } = await supabase
        .from('market_listings')
        .update({
          quantity: listing.quantity - quantityToBuy,
          updated_at: new Date().toISOString(),
        })
        .eq('id', listingId);

      if (updateError) {
        throw new Error('Failed to update listing');
      }
    }

    // Fetch updated buyer state
    const { data: updatedBuyer } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', buyerId)
      .single();

    return {
      success: true,
      buyer: updatedBuyer,
      totalPrice,
      quantityBought: quantityToBuy,
    };
  } catch (error) {
    throw error;
  }
}
