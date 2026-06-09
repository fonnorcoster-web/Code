import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

const SCRAPE_TIMEOUT = 10000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Keywords that suggest a page contains coffee products
const COFFEE_KEYWORDS = [
  'coffee',
  'roast',
  'blend',
  'single origin',
  'espresso',
  'bean',
  'light roast',
  'medium roast',
  'dark roast',
  'arabica',
  'robusta',
  'ethiopia',
  'colombia',
  'guatemala',
  'kenya',
  'brazil',
  'pour over',
  'french press',
  'cold brew',
];

// Keywords that suggest a page is the shop/products page
const SHOP_KEYWORDS = ['shop', 'coffee', 'buy', 'store', 'menu', 'products', 'beans', 'order'];

// Keywords that indicate the business actually roasts its own coffee
const ROASTER_INDICATOR_KEYWORDS = [
  'roastery',
  'we roast',
  'roasted in-house',
  'roasted in house',
  'roasted on-site',
  'roasted on site',
  'green coffee',
  'green beans',
  'roasting facility',
  'roast our own',
  'roastmaster',
  'head roaster',
  'small batch roast',
  'batch roast',
  'craft roast',
  'freshly roasted',
  'roasted fresh',
  'coffee roaster',
];

// Class name fragments that identify non-product containers (reviews, filter UI, sidebars)
const REVIEW_CONTAINER_FRAGMENTS = [
  'review', 'testimonial', 'comment', 'feedback', 'quote',
  'filter', 'facet', 'sidebar', 'breadcrumb', 'pagination',
];

// Navigation words — names containing 3+ of these are page headers, not product names
const NAV_WORDS = new Set([
  'shop', 'cafe', 'menu', 'about', 'events', 'contact', 'home',
  'gift', 'wholesale', 'careers', 'blog', 'login', 'cart', 'account',
  'story', 'press', 'faq', 'find', 'locations', 'subscribe', 'rewards',
]);

// Phrases that indicate a page or element is showing an empty/filtered state
const EMPTY_STATE_PATTERNS = [
  'no results match', 'no products found', '0 results', 'nothing found',
  'no items found', 'try removing', 'clear all filters',
];

// Keywords present on purchasable coffee products (bags, pouches) but not on menu items or reviews
const PURCHASABLE_PRODUCT_KEYWORDS = [
  'whole bean', 'whole-bean',
  'ground coffee', 'pre-ground',
  'oz bag', 'lb bag', 'g bag',
  '12oz', '16oz', '250g', '340g', '500g', '1kg',
  'subscribe', 'subscription',
];

// Brewing method keywords
const BREWING_METHODS = {
  espresso: ['espresso', 'shot', 'latte', 'cappuccino', 'americano'],
  'pour over': ['pour over', 'pourover', 'v60', 'chemex', 'kalita'],
  'french press': ['french press', 'french-press', 'plunger'],
  drip: ['drip', 'drip machine', 'auto drip', 'filter coffee', 'mr. coffee'],
  'cold brew': ['cold brew', 'cold-brew', 'iced coffee'],
  aeropress: ['aeropress', 'aero press'],
  'moka pot': ['moka', 'stovetop', 'moka pot'],
};

/**
 * Create an axios instance configured for scraping
 */
function createAxiosClient() {
  return axios.create({
    timeout: SCRAPE_TIMEOUT,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    },
    maxRedirects: 5,
  });
}

/**
 * Resolve a relative URL against a base URL
 */
function resolveUrl(base, href) {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

/**
 * Extract text content from an element, cleaned up
 */
function extractText($, el) {
  return $(el).text().replace(/\s+/g, ' ').trim();
}

/**
 * Find the shop/products page URL from the homepage
 */
async function findShopPage(baseUrl, $, client) {
  const links = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    const text = extractText($, el).toLowerCase();
    const resolvedHref = resolveUrl(baseUrl, href);

    if (!resolvedHref) return;

    // Check if text or href contains shop keywords
    const isShopLink = SHOP_KEYWORDS.some(
      (kw) => text.includes(kw) || href.toLowerCase().includes(kw)
    );

    if (isShopLink) {
      links.push({ url: resolvedHref, text, href });
    }
  });

  // Prioritize links with "shop", "coffee", or "buy" in text
  const prioritized = links.sort((a, b) => {
    const aScore =
      ['shop', 'coffee', 'buy', 'store'].filter((kw) => a.text.includes(kw)).length;
    const bScore =
      ['shop', 'coffee', 'buy', 'store'].filter((kw) => b.text.includes(kw)).length;
    return bScore - aScore;
  });

  // Try to find a page that actually has products
  for (const link of prioritized.slice(0, 3)) {
    // Don't re-fetch the same URL
    if (link.url === baseUrl || link.url === baseUrl + '/') continue;

    try {
      const response = await client.get(link.url);
      const shopText = response.data.toLowerCase();
      const hasCoffeeContent = COFFEE_KEYWORDS.some((kw) => shopText.includes(kw));

      const hasEmptyState = EMPTY_STATE_PATTERNS.some((p) => shopText.includes(p));
      if (hasCoffeeContent && !hasEmptyState) {
        return { url: link.url, html: response.data };
      }
    } catch {
      // Continue trying other links
    }
  }

  return null;
}

/**
 * Extract product information from a page
 */
function extractProducts($, baseUrl) {
  const products = [];
  const seen = new Set();

  // Common product container selectors
  const productSelectors = [
    '[class*="product"]',
    '[class*="item"]',
    '[class*="coffee"]',
    '[data-product]',
    '.grid > div',
    '.collection > div',
    'article',
    '[class*="card"]',
  ];

  for (const selector of productSelectors) {
    const elements = $(selector);
    if (elements.length === 0) continue;

    elements.each((_, el) => {
      const $el = $(el);
      const text = extractText($, el);

      // Skip elements inside page-structural areas (navigation, site header, footer)
      if ($el.closest('header, nav, footer').length > 0) return;

      // Skip review/testimonial containers — their text mentions coffee but they're not products
      const elClass = ($el.attr('class') || '').toLowerCase();
      if (REVIEW_CONTAINER_FRAGMENTS.some((frag) => elClass.includes(frag))) return;

      // Require a purchasable-product signal so menu items and reviews don't qualify
      const hasPriceEl = $el.find('[class*="price"], .price, [data-price]').length > 0;
      const hasPurchasableKeyword = PURCHASABLE_PRODUCT_KEYWORDS.some((kw) =>
        text.toLowerCase().includes(kw)
      );
      if (!hasPriceEl && !hasPurchasableKeyword) return;

      // Check if this element contains coffee content
      const hasCoffeeContent = COFFEE_KEYWORDS.some((kw) =>
        text.toLowerCase().includes(kw)
      );

      if (!hasCoffeeContent || text.length < 20) return;

      // Hoist lowerText here so it's available for all checks below
      const lowerText = text.toLowerCase();

      // Skip elements that are in an empty/filtered state rather than showing real products
      if (EMPTY_STATE_PATTERNS.some((p) => lowerText.includes(p))) return;

      // Extract product name
      const nameEl =
        $el.find('h1, h2, h3, h4, [class*="title"], [class*="name"]').first();
      const name = nameEl.length ? extractText($, nameEl) : null;

      if (!name || name.length < 3 || name.length > 200) return;
      // Reject names that look like page titles or nav link lists
      if (/ [|>] /.test(name)) return;
      const nameTokens = name.toLowerCase().split(/[\s,]+/).filter(Boolean);
      if (nameTokens.filter((w) => NAV_WORDS.has(w)).length >= 3) return;
      if (seen.has(name.toLowerCase())) return;
      seen.add(name.toLowerCase());

      // Extract description
      const descEl = $el
        .find('p, [class*="desc"], [class*="notes"], [class*="flavor"]')
        .first();
      const description = descEl.length ? extractText($, descEl) : '';

      // Extract price
      let price = null;
      const priceEl = $el.find('[class*="price"], .price, [data-price]').first();
      if (priceEl.length) {
        const priceText = extractText($, priceEl);
        const priceMatch = priceText.match(/\$[\d,.]+/);
        if (priceMatch) price = priceMatch[0];
      }

      // Also search in all text for price pattern
      if (!price) {
        const priceMatch = text.match(/\$[\d,.]+/);
        if (priceMatch) price = priceMatch[0];
      }

      // Extract product image
      let imageUrl = null;
      const imgEl = $el.find('img').first();
      if (imgEl.length) {
        const src = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-lazy-src');
        if (src) {
          imageUrl = resolveUrl(baseUrl, src);
        }
      }

      // Check for whole bean / ground options
      const wholeBean =
        lowerText.includes('whole bean') ||
        lowerText.includes('whole-bean') ||
        lowerText.includes('whole beans');
      const ground =
        lowerText.includes('ground') ||
        lowerText.includes('pre-ground') ||
        lowerText.includes('pre ground');

      // Find purchase URL — prefer product-page links over add-to-cart or checkout links
      let purchaseUrl = null;
      const allLinks = $el.find('a[href]').toArray();
      for (const a of allLinks) {
        const href = $(a).attr('href') || '';
        const isCartLink = /\/(cart|checkout|bag)\b|add[-_]to[-_]cart|add-item/i.test(href);
        if (!isCartLink) {
          purchaseUrl = resolveUrl(baseUrl, href);
          break;
        }
      }

      // Extract brewing methods mentioned
      const brewingMethods = [];
      for (const [method, keywords] of Object.entries(BREWING_METHODS)) {
        if (keywords.some((kw) => lowerText.includes(kw))) {
          brewingMethods.push(method);
        }
      }

      products.push({
        name,
        description: description.slice(0, 500),
        price,
        imageUrl,
        purchaseUrl,
        wholeBean: wholeBean || (!wholeBean && !ground), // Default to true if neither specified
        ground: ground || (!wholeBean && !ground), // Default to true if neither specified
        brewingMethods,
      });
    });

    // If we found good products, stop looking
    if (products.length >= 10) break;
  }

  return products.slice(0, 15); // Limit to 15 products
}

/**
 * Returns true if the page text contains signals that the business actually roasts coffee
 */
function checkIsActualRoaster(text) {
  const lower = text.toLowerCase();
  return ROASTER_INDICATOR_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Returns true if the page title plausibly belongs to the named roaster.
 * Normalizes both strings, strips generic words, and requires ≥50% word overlap.
 */
function checkSiteMatchesRoaster(pageTitle, roasterName) {
  if (!roasterName || !pageTitle) return true;

  const normalize = (str) =>
    str
      .toLowerCase()
      .replace(/\b(coffee|roasters?|roasting|co|company|llc|inc|cafe|the|and|&)\b/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const normalizedTitle = normalize(pageTitle);
  const normalizedName = normalize(roasterName);
  const nameWords = normalizedName.split(' ').filter((w) => w.length > 2);

  if (nameWords.length === 0) return true;

  const matchCount = nameWords.filter((word) => normalizedTitle.includes(word)).length;
  return matchCount / nameWords.length >= 0.5;
}

/**
 * Check ownership indicators in page text
 */
function checkOwnershipIndicators(text) {
  const lower = text.toLowerCase();
  const isWomenOwned =
    lower.includes('women-owned') ||
    lower.includes('woman-owned') ||
    lower.includes('women owned') ||
    lower.includes('woman owned') ||
    lower.includes('female-owned') ||
    lower.includes('female owned');

  const isBlackOwned =
    lower.includes('black-owned') ||
    lower.includes('black owned') ||
    lower.includes('bipoc') ||
    lower.includes('minority-owned') ||
    lower.includes('minority owned') ||
    lower.includes('african american owned') ||
    lower.includes('african-american owned');

  return { isWomenOwned, isBlackOwned };
}

/**
 * Scrape a coffee roaster's website for product information
 * @param {string} website - The roaster's website URL
 * @param {string} roasterName - The business name from Google Places (used for site verification)
 * @returns {Object} Products and metadata
 */
export async function scrapeRoasterProducts(website, roasterName = '') {
  const emptyResult = {
    products: [],
    isWomenOwned: false,
    isBlackOwned: false,
    shopUrl: null,
    isLikelyRoaster: false,
    siteMatchesRoaster: false,
  };

  if (!website) return emptyResult;

  // Normalize URL
  let baseUrl;
  try {
    baseUrl = new URL(website).origin;
    if (!website.startsWith('http')) {
      website = 'https://' + website;
    }
  } catch {
    return emptyResult;
  }

  const client = createAxiosClient();

  try {
    // Fetch the homepage
    let homepageHtml;
    try {
      const response = await client.get(website);
      homepageHtml = response.data;
    } catch {
      // Try with https if http failed
      try {
        const httpsUrl = website.replace(/^http:\/\//, 'https://');
        const response = await client.get(httpsUrl);
        homepageHtml = response.data;
        website = httpsUrl;
      } catch {
        return emptyResult;
      }
    }

    const $home = cheerio.load(homepageHtml);
    const homepageText = $home('body').text();

    // Verify the site belongs to this roaster and that they actually roast
    const pageTitle =
      $home('title').text().trim() ||
      $home('meta[property="og:site_name"]').attr('content') ||
      '';
    const isLikelyRoaster = checkIsActualRoaster(homepageText);
    const siteMatchesRoaster = checkSiteMatchesRoaster(pageTitle, roasterName);

    // Check ownership indicators from homepage
    const { isWomenOwned: homeWomen, isBlackOwned: homeBlack } =
      checkOwnershipIndicators(homepageText);

    // Try to find the shop page
    let shopHtml = null;
    let shopUrl = null;
    const shopPage = await findShopPage(website, $home, client);

    if (shopPage) {
      shopHtml = shopPage.html;
      shopUrl = shopPage.url;
    }

    // Parse products from shop page or homepage
    const htmlToParse = shopHtml || homepageHtml;
    const $ = cheerio.load(htmlToParse);
    const pageText = $('body').text();

    // Check ownership from all pages
    const { isWomenOwned: shopWomen, isBlackOwned: shopBlack } =
      checkOwnershipIndicators(pageText);

    const isWomenOwned = homeWomen || shopWomen;
    const isBlackOwned = homeBlack || shopBlack;

    // Extract products
    const products = extractProducts($, shopUrl || website);

    return {
      products,
      isWomenOwned,
      isBlackOwned,
      shopUrl,
      isLikelyRoaster,
      siteMatchesRoaster,
    };
  } catch (error) {
    console.error(`Scraping failed for ${website}:`, error.message);
    return emptyResult;
  }
}
