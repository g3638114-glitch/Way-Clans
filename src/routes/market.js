import express from 'express';
import {
  createListing,
  getListingsByResource,
  getUserListings,
  buyListing,
  editListing,
  deleteListing,
  disableListingsForFullTreasury,
} from '../services/marketService.js';

const router = express.Router();

// POST /api/market/listings - Create new listing
router.post('/listings', async (req, res) => {
  try {
    const { userId, resourceType, quantity, pricePerUnit } = req.body;
    const result = await createListing(userId, resourceType, quantity, pricePerUnit);
    res.json(result);
  } catch (error) {
    console.error('Error creating listing:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// GET /api/market/listings/:resourceType - Get listings for a resource
router.get('/listings/:resourceType', async (req, res) => {
  try {
    const { resourceType } = req.params;
    const listings = await getListingsByResource(resourceType);
    res.json({ success: true, listings });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// GET /api/market/my-listings/:userId - Get user's listings
router.get('/my-listings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const listings = await getUserListings(userId);
    res.json({ success: true, listings });
  } catch (error) {
    console.error('Error fetching user listings:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// POST /api/market/buy - Buy from listing
router.post('/buy', async (req, res) => {
  try {
    const { buyerId, listingId, quantity } = req.body;
    const result = await buyListing(buyerId, listingId, quantity);
    res.json(result);
  } catch (error) {
    console.error('Error buying listing:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// PUT /api/market/listings/:listingId - Edit listing
router.put('/listings/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    const { userId, pricePerUnit } = req.body;
    const result = await editListing(userId, listingId, pricePerUnit);
    res.json(result);
  } catch (error) {
    console.error('Error editing listing:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// DELETE /api/market/listings/:listingId - Delete listing
router.delete('/listings/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    const { userId } = req.body;
    const result = await deleteListing(userId, listingId);
    res.json(result);
  } catch (error) {
    console.error('Error deleting listing:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// POST /api/market/disable-full-treasury/:userId - Disable listings if treasury is full
router.post('/disable-full-treasury/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // This would need to fetch the user and call disableListingsForFullTreasury with user.id
    // For now, we'll require the actual user ID to be passed
    const result = await disableListingsForFullTreasury(userId);
    res.json(result);
  } catch (error) {
    console.error('Error disabling listings:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

export default router;
