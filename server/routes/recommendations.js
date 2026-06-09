import express from 'express';
import { findLocalRoasters } from '../services/googlePlaces.js';
import { scrapeRoasterProducts } from '../services/webScraper.js';
import { matchProductsToPreferences } from '../services/aiMatcher.js';

const router = express.Router();

/**
 * POST /api/recommendations
 * Body: { preferences: {...}, location: string }
 */
router.post('/', async (req, res) => {
  const { preferences, location } = req.body;

  // Validate required fields
  if (!location) {
    return res.status(400).json({
      error: 'Location is required',
      details: 'Please provide a city, neighborhood, or allow location access',
    });
  }

  if (!preferences) {
    return res.status(400).json({
      error: 'Preferences are required',
      details: 'Please provide at least one coffee preference',
    });
  }

  // Validate location format
  const isCoords =
    typeof location === 'object' &&
    typeof location.lat === 'number' &&
    typeof location.lng === 'number';
  const isString = typeof location === 'string' && location.trim().length > 0;

  if (!isCoords && !isString) {
    return res.status(400).json({
      error: 'Invalid location format',
      details: 'Location must be a string (city name) or {lat, lng} object',
    });
  }

  console.log(`Processing recommendations for location: ${JSON.stringify(location)}`);
  console.log('Preferences:', JSON.stringify(preferences, null, 2));

  try {
    // Step 1: Find local roasters via Google Places
    console.log('Step 1: Finding local roasters...');
    let roasters;
    try {
      roasters = await findLocalRoasters(location);
      console.log(`Found ${roasters.length} local roasters`);
    } catch (error) {
      console.error('Google Places error:', error.message);
      return res.status(500).json({
        error: 'Failed to find local roasters',
        details: error.message,
      });
    }

    if (roasters.length === 0) {
      return res.json({
        recommendations: [],
        message: 'No local coffee roasters found in your area. Try a nearby city or expand the search radius.',
      });
    }

    // Step 2: Scrape roaster websites in parallel (limit to 8 roasters)
    console.log('Step 2: Scraping roaster websites...');
    const roastersToScrape = roasters.slice(0, 8);

    const scrapeResults = await Promise.allSettled(
      roastersToScrape.map(async (roaster) => {
        if (!roaster.website) {
          return { ...roaster, scrapedData: { products: [], isWomenOwned: false, isBlackOwned: false, shopUrl: null } };
        }
        try {
          const scrapedData = await scrapeRoasterProducts(roaster.website, roaster.name);
          console.log(`Scraped ${roaster.name}: ${scrapedData.products.length} products found`);
          return { ...roaster, scrapedData };
        } catch (error) {
          console.error(`Failed to scrape ${roaster.name}:`, error.message);
          return {
            ...roaster,
            scrapedData: { products: [], isWomenOwned: false, isBlackOwned: false, shopUrl: null },
          };
        }
      })
    );

    const roastersWithData = scrapeResults
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value);

    // Apply ownership filters early if possible
    let filteredRoasters = roastersWithData;
    if (preferences.womenOwned) {
      filteredRoasters = filteredRoasters.filter((r) => r.scrapedData?.isWomenOwned);
    }
    if (preferences.blackOwned) {
      filteredRoasters = filteredRoasters.filter((r) => r.scrapedData?.isBlackOwned);
    }

    if (filteredRoasters.length === 0 && (preferences.womenOwned || preferences.blackOwned)) {
      // Try without filters to see if any roasters exist
      const message = preferences.womenOwned && preferences.blackOwned
        ? 'No women-owned or Black-owned coffee roasters were found in your area with the current filters.'
        : preferences.womenOwned
        ? 'No women-owned coffee roasters were found in your area. Try removing that filter.'
        : 'No Black-owned coffee roasters were found in your area. Try removing that filter.';

      return res.json({
        recommendations: [],
        message,
      });
    }

    // Use roasters with data (not filtered) for AI matching - let AI matcher handle filtering
    console.log(`Step 3: AI matching for ${roastersWithData.length} roasters...`);

    let recommendations;
    try {
      recommendations = await matchProductsToPreferences(roastersWithData, preferences);
      console.log(`AI matching complete: ${recommendations.length} recommendations`);
    } catch (error) {
      console.error('AI matching error:', error.message);
      // Return basic results without AI matching
      recommendations = roastersWithData
        .filter((r) => {
          if (preferences.womenOwned && !r.scrapedData?.isWomenOwned) return false;
          if (preferences.blackOwned && !r.scrapedData?.isBlackOwned) return false;
          return true;
        })
        .map((r) => ({
          roaster: {
            name: r.name,
            address: r.address,
            website: r.website,
            logoUrl: r.logoUrl,
            rating: r.rating,
            isWomenOwned: r.scrapedData?.isWomenOwned || false,
            isBlackOwned: r.scrapedData?.isBlackOwned || false,
          },
          topProducts: r.scrapedData?.products?.slice(0, 2).map((p) => ({
            ...p,
            matchScore: 5,
            matchReason: 'AI matching is temporarily unavailable. This product may match your preferences.',
          })) || [],
          matchScore: 5,
        }));
    }

    if (recommendations.length === 0) {
      return res.json({
        recommendations: [],
        message: 'We found local roasters but could not find products that match your preferences. Try adjusting your preferences or location.',
      });
    }

    return res.json({
      recommendations,
      totalRoastersSearched: roasters.length,
      totalRoastersWithProducts: roastersWithData.filter(
        (r) => r.scrapedData?.products?.length > 0
      ).length,
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    return res.status(500).json({
      error: 'Failed to generate recommendations',
      details: error.message,
    });
  }
});

export default router;
