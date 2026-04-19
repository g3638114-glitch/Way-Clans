import express from 'express';
import {
  createListing,
  getListings,
  getMyListings,
  buyFromListing,
  deleteListing,
  editListing,
  claimPendingGold,
} from '../services/marketService.js';

const router = express.Router();

// POST /api/user/:userId/market/create - Create a listing
router.post('/:userId/market/create', async (req, res) => {
  try {
    const { userId } = req.params;
    const { resourceType, quantity, pricePerUnit } = req.body;

    const result = await createListing(userId, { resourceType, quantity, pricePerUnit });
    res.json(result);
  } catch (error) {
    console.error('Error creating listing:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// GET /api/user/:userId/market/listings/:resourceType - Get listings for a resource
router.get('/:userId/market/listings/:resourceType', async (req, res) => {
  try {
    const { resourceType } = req.params;
    const listings = await getListings(resourceType);
    res.json({ listings });
  } catch (error) {
    console.error('Error getting listings:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// GET /api/user/:userId/market/my-listings - Get current user's listings
router.get('/:userId/market/my-listings', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await getMyListings(userId);
    res.json(result);
  } catch (error) {
    console.error('Error getting my listings:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

router.post('/:userId/market/claim', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await claimPendingGold(userId);
    res.json(result);
  } catch (error) {
    console.error('Error claiming pending market gold:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// POST /api/user/:userId/market/buy - Buy from a listing
router.post('/:userId/market/buy', async (req, res) => {
  try {
    const { userId } = req.params;
    const { listingId, quantity } = req.body;

    const result = await buyFromListing(userId, listingId, quantity);
    res.json(result);
  } catch (error) {
    console.error('Error buying from listing:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// DELETE /api/user/:userId/market/:listingId - Delete a listing
router.delete('/:userId/market/:listingId', async (req, res) => {
  try {
    const { userId, listingId } = req.params;

    const result = await deleteListing(userId, listingId);
    res.json(result);
  } catch (error) {
    console.error('Error deleting listing:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// PATCH /api/user/:userId/market/:listingId - Edit a listing
router.patch('/:userId/market/:listingId', async (req, res) => {
  try {
    const { userId, listingId } = req.params;
    const { quantity, pricePerUnit } = req.body;

    const result = await editListing(userId, listingId, { quantity, pricePerUnit });
    res.json(result);
  } catch (error) {
    console.error('Error editing listing:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

export default router;
