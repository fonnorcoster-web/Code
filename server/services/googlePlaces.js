import axios from 'axios';

const GOOGLE_API_BASE = 'https://maps.googleapis.com/maps/api';

// Third-party review/directory sites — not the roaster's own website
const THIRD_PARTY_DOMAINS = [
  'yelp.com',
  'tripadvisor.com',
  'google.com',
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'foursquare.com',
  'zomato.com',
  'opentable.com',
  'grubhub.com',
  'doordash.com',
  'ubereats.com',
  'seamless.com',
  'yellowpages.com',
  'superpages.com',
  'bbb.org',
  'manta.com',
];

function isThirdPartyWebsite(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return THIRD_PARTY_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

// Large chains to filter out
const CHAIN_BLACKLIST = [
  'starbucks',
  "peet's coffee",
  'peets coffee',
  'la colombe',
  'dunkin',
  "dunkin'",
  'tim hortons',
  'costa coffee',
  'caribou coffee',
  'dutch bros',
  'coffee bean & tea',
  'the coffee bean',
  'mcdonalds',
  "mcdonald's",
  'panera',
  'starbucks reserve',
];

function isChain(name) {
  const lowerName = name.toLowerCase();
  return CHAIN_BLACKLIST.some((chain) => lowerName.includes(chain));
}

/**
 * Geocode a city/address string to lat/lng coordinates
 */
async function geocodeLocation(address, apiKey) {
  const url = `${GOOGLE_API_BASE}/geocode/json`;
  const response = await axios.get(url, {
    params: {
      address,
      key: apiKey,
    },
    timeout: 10000,
  });

  if (response.data.status !== 'OK' || !response.data.results.length) {
    throw new Error(`Could not geocode location: ${address}. Status: ${response.data.status}`);
  }

  const { lat, lng } = response.data.results[0].geometry.location;
  return { lat, lng };
}

/**
 * Find local coffee roasters near a location using Google Places Text Search
 * @param {string|{lat: number, lng: number}} location - City string or lat/lng object
 * @param {number} radius - Search radius in meters (default 25km)
 * @returns {Array} Array of roaster objects
 */
export async function findLocalRoasters(location, radius = 25000) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY is not configured');
  }

  // Resolve location to coordinates
  let coords;
  if (typeof location === 'string') {
    coords = await geocodeLocation(location, apiKey);
  } else if (location && typeof location.lat === 'number') {
    coords = location;
  } else {
    throw new Error('Location must be a string or {lat, lng} object');
  }

  // Text search for coffee roasters
  const searchUrl = `${GOOGLE_API_BASE}/place/textsearch/json`;
  const searchResponse = await axios.get(searchUrl, {
    params: {
      query: 'coffee roaster',
      location: `${coords.lat},${coords.lng}`,
      radius,
      key: apiKey,
    },
    timeout: 15000,
  });

  if (searchResponse.data.status !== 'OK' && searchResponse.data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places search failed: ${searchResponse.data.status}`);
  }

  const places = searchResponse.data.results || [];

  // Filter out chains
  const localPlaces = places.filter((place) => !isChain(place.name));

  // Get details for each place (limit to first 12 to avoid too many API calls)
  const detailsPromises = localPlaces.slice(0, 12).map((place) =>
    getPlaceDetails(place.place_id, apiKey).catch((err) => {
      console.error(`Failed to get details for ${place.name}:`, err.message);
      return null;
    })
  );

  const detailsResults = await Promise.all(detailsPromises);

  const roasters = detailsResults
    .filter(Boolean)
    .filter((r) => r.website && !isThirdPartyWebsite(r.website)) // Own website only
    .map((details) => ({
      placeId: details.place_id,
      name: details.name,
      address: details.formatted_address,
      website: details.website,
      logoUrl: details.logoUrl,
      rating: details.rating,
      userRatingsTotal: details.user_ratings_total,
    }));

  return roasters;
}

/**
 * Get detailed information for a single place
 */
async function getPlaceDetails(placeId, apiKey) {
  const url = `${GOOGLE_API_BASE}/place/details/json`;
  const response = await axios.get(url, {
    params: {
      place_id: placeId,
      fields: 'name,website,formatted_address,photos,rating,user_ratings_total,place_id',
      key: apiKey,
    },
    timeout: 10000,
  });

  if (response.data.status !== 'OK') {
    throw new Error(`Place details failed: ${response.data.status}`);
  }

  const result = response.data.result;

  // Get photo URL if available
  let logoUrl = null;
  if (result.photos && result.photos.length > 0) {
    const photoRef = result.photos[0].photo_reference;
    logoUrl = `${GOOGLE_API_BASE}/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${apiKey}`;
  }

  return {
    ...result,
    logoUrl,
  };
}
