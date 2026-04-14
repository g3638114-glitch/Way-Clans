import express from 'express';
import {
  createListing,
  getListingsByResource,
  getUserListings,
  cancelListing,
  buyListing,
} from '../services/marketService.js';

const router = express.Router();

// POST /api/user/:userId/market/create-listing
router.post('/:userId/market/create-listing', async (req, res) => {
  try {
    const { userId } = req.params;
    const { resourceType, quantity, pricePerUnit } = req.body;

    if (!resourceType || !quantity || !pricePerUnit) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await createListing(userId, resourceType, quantity, pricePerUnit);
    res.json(result);
  } catch (error) {
    console.error('Error creating listing:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// GET /api/user/:userId/market/listings/:resourceType
router.get('/:userId/market/listings/:resourceType', async (req, res) => {
  try {
    const { userId, resourceType } = req.params;
    const result = await getListingsByResource(resourceType, userId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// GET /api/user/:userId/market/my-listings
router.get('/:userId/market/my-listings', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await getUserListings(userId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching user listings:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// DELETE /api/user/:userId/market/listings/:listingId
router.delete('/:userId/market/listings/:listingId', async (req, res) => {
  try {
    const { userId, listingId } = req.params;
    const result = await cancelListing(listingId, userId);
    res.json(result);
  } catch (error) {
    console.error('Error canceling listing:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// POST /api/user/:userId/market/buy
router.post('/:userId/market/buy', async (req, res) => {
  try {
    const { userId } = req.params;
    const { listingId, quantity } = req.body;

    if (!listingId || !quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await buyListing(listingId, userId, quantity);
    res.json(result);
  } catch (error) {
    console.error('Error buying listing:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

export default router;
