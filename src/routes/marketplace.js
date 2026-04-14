import express from 'express';
import {
  createListing,
  getListingsByResourceType,
  getUserListings,
  buyFromListing,
  cancelListing,
  editListing,
} from '../services/marketplaceService.js';

const router = express.Router();

// POST /api/user/:userId/marketplace/listings
// Create a new marketplace listing
router.post('/:userId/marketplace/listings', async (req, res) => {
  try {
    const { userId } = req.params;
    const { resource_type, price_per_unit, quantity } = req.body;

    if (!resource_type || !price_per_unit || !quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const listing = await createListing(userId, resource_type, price_per_unit, quantity);
    res.json({ success: true, listing });
  } catch (error) {
    console.error('Error creating listing:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/user/:userId/marketplace/listings/:resourceType
// Get listings for a specific resource type
router.get('/:userId/marketplace/listings/:resourceType', async (req, res) => {
  try {
    const { resourceType } = req.params;
    const listings = await getListingsByResourceType(resourceType);
    res.json({ success: true, listings });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/user/:userId/marketplace/my-listings
// Get user's own listings
router.get('/:userId/marketplace/my-listings', async (req, res) => {
  try {
    const { userId } = req.params;
    const listings = await getUserListings(userId);
    res.json({ success: true, listings });
  } catch (error) {
    console.error('Error fetching user listings:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/user/:userId/marketplace/buy
// Buy from a listing
router.post('/:userId/marketplace/buy', async (req, res) => {
  try {
    const { userId } = req.params;
    const { listing_id, quantity } = req.body;

    if (!listing_id || !quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await buyFromListing(userId, listing_id, quantity);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error buying from listing:', error);
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/user/:userId/marketplace/listings/:listingId
// Cancel a listing
router.delete('/:userId/marketplace/listings/:listingId', async (req, res) => {
  try {
    const { userId, listingId } = req.params;

    const result = await cancelListing(listingId, userId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error cancelling listing:', error);
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/user/:userId/marketplace/listings/:listingId
// Edit a listing
router.put('/:userId/marketplace/listings/:listingId', async (req, res) => {
  try {
    const { userId, listingId } = req.params;
    const { price_per_unit, quantity } = req.body;

    if (!price_per_unit || !quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const listing = await editListing(listingId, userId, price_per_unit, quantity);
    res.json({ success: true, listing });
  } catch (error) {
    console.error('Error editing listing:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
