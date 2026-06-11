import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

/**
 * Match coffee products to user preferences using Claude AI
 * @param {Array} roasters - Array of roasters with scraped products
 * @param {Object} preferences - User preferences
 * @returns {Array} Roasters with matched products, sorted by score
 */
export async function matchProductsToPreferences(roasters, preferences) {
  const {
    flavorNotes = [],
    roastLevel = 'No preference',
    format = 'both',
    brewingMethod = '',
    womenOwned = false,
    blackOwned = false,
  } = preferences;

  // Filter roasters that have products
  const roastersWithProducts = roasters.filter(
    (r) => r.scrapedData && r.scrapedData.products && r.scrapedData.products.length > 0
  );

  if (roastersWithProducts.length === 0) {
    // Return roasters without products with empty top products
    return roasters
      .filter((r) => {
        if (womenOwned && !r.scrapedData?.isWomenOwned) return false;
        if (blackOwned && !r.scrapedData?.isBlackOwned) return false;
        return true;
      })
      .map((r) => ({
        roaster: {
          name: r.name,
          address: r.address,
          website: r.website,
          shopUrl: r.scrapedData?.shopUrl || null,
          logoUrl: r.logoUrl,
          rating: r.rating,
          isWomenOwned: r.scrapedData?.isWomenOwned || false,
          isBlackOwned: r.scrapedData?.isBlackOwned || false,
        },
        topProducts: [],
        matchScore: 0,
      }));
  }

  // Build a batch request to Claude for all roasters
  const roasterDescriptions = roastersWithProducts
    .map((roaster, idx) => {
      const { isLikelyRoaster = false, siteMatchesRoaster = true } = roaster.scrapedData || {};

      const products = roaster.scrapedData.products
        .slice(0, 10)
        .map(
          (p, i) =>
            `  Product ${i + 1}: "${p.name}"
    Description: ${p.description || 'No description available'}
    Price: ${p.price || 'Unknown'}
    Whole Bean: ${p.wholeBean ? 'Yes' : 'No'}
    Ground: ${p.ground ? 'Yes' : 'No'}
    Brewing Methods: ${p.brewingMethods?.join(', ') || 'Not specified'}`
        )
        .join('\n\n');

      return `Roaster ${idx + 1}: ${roaster.name}
Address: ${roaster.address}
Verification signals — website contains roaster keywords: ${isLikelyRoaster ? 'YES' : 'NO'} | website title matches business name: ${siteMatchesRoaster ? 'YES' : 'NO'}
Products:
${products}`;
    })
    .join('\n\n---\n\n');

  const preferencesDescription = `
User Preferences:
- Roast Level: ${roastLevel}
- Flavor Notes: ${flavorNotes.length > 0 ? flavorNotes.join(', ') : 'No specific preference'}
- Format: ${format === 'whole' ? 'Whole Bean only' : format === 'ground' ? 'Pre-Ground only' : 'Either whole bean or ground'}
- Brewing Method: ${brewingMethod || 'Any'}
- Prefers Women-Owned: ${womenOwned ? 'Yes — surface these roasters first when quality is comparable' : 'No preference'}
- Prefers Black-Owned: ${blackOwned ? 'Yes — surface these roasters first when quality is comparable' : 'No preference'}`;

  const prompt = `${preferencesDescription}

Here are the local coffee roasters and their products to evaluate:

${roasterDescriptions}

For each roaster, do the following:

STEP 1 — Verify it is an actual coffee roaster:
Set "isActualRoaster" to false if the business appears to be a coffee shop or cafe that does NOT roast its own beans. Signs of a non-roaster: products are drinks (lattes, cappuccinos, smoothies) rather than bags of beans for purchase, all products are from recognizable national/international brands (e.g. Lavazza, Folgers, Stumptown listed on another business's site), or there is no indication of an in-house roasting operation. Use the verification signals provided and your judgment from the product list.

STEP 2 — Select matching products (own products only):
Only recommend products that this roaster makes and sells themselves. Skip any product that is clearly from a different brand. If no own products exist or the business is not a real roaster, return an empty topProducts array.

Return a JSON array where each element has this exact structure:
{
  "roasterIndex": <number starting from 1>,
  "isActualRoaster": <boolean>,
  "topProducts": [
    {
      "productIndex": <number starting from 1, corresponding to the product numbers listed above>,
      "matchScore": <integer 0-10>,
      "matchReason": "<2-3 sentences describing this coffee's specific character — its origin, processing method, tasting notes, or roast profile — and how those qualities connect to the user's stated preferences. Write about the coffee itself; avoid generic phrases like 'this product may match your preferences'.>"
    }
  ]
}

Only include products with a matchScore of 5 or higher. If no products score 5+, include the best one anyway with its actual score.
Consider:
- How well the roast level matches
- Whether flavor notes align (even if not explicitly stated, infer from origin, processing, or descriptions)
- Whether the format (whole bean/ground) matches
- Whether brewing method compatibility matches
- Overall quality and uniqueness of the product

Return ONLY the JSON array, no other text.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system:
        'You are a coffee expert helping match people with local coffee roasters and their products. Your job has two parts: (1) verify that each listed business is a genuine coffee roaster that roasts its own beans — not merely a cafe or coffee shop — and (2) match only that roaster\'s own products to the user\'s preferences. Always respond with valid JSON only.',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].text.trim();

    // Extract JSON from response (handle potential markdown code blocks)
    let jsonText = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    const matchResults = JSON.parse(jsonText);

    // Build the final results
    const results = [];
    const aiExcludedNames = new Set(); // names Claude flagged as not actual roasters

    for (let i = 0; i < roastersWithProducts.length; i++) {
      const roaster = roastersWithProducts[i];
      const matchResult = matchResults.find((r) => r.roasterIndex === i + 1);

      // Skip if Claude determined this is not an actual roaster
      if (matchResult && matchResult.isActualRoaster === false) {
        aiExcludedNames.add(roaster.name);
        continue;
      }

      if (!matchResult || matchResult.topProducts.length === 0) {
        // Has products but none matched — still surface the roaster
        results.push({
          roaster: {
            name: roaster.name,
            address: roaster.address,
            website: roaster.website,
            shopUrl: roaster.scrapedData?.shopUrl || null,
            logoUrl: roaster.logoUrl,
            rating: roaster.rating,
            isWomenOwned: roaster.scrapedData?.isWomenOwned || false,
            isBlackOwned: roaster.scrapedData?.isBlackOwned || false,
          },
          topProducts: [],
          matchScore: 0,
        });
        continue;
      }

      const topProducts = matchResult.topProducts
        .filter((tp) => tp.matchScore >= 5)
        .slice(0, 2)
        .map((tp) => {
          const product = roaster.scrapedData.products[tp.productIndex - 1];
          if (!product) return null;
          return {
            name: product.name,
            description: product.description,
            price: product.price,
            imageUrl: product.imageUrl,
            purchaseUrl: product.purchaseUrl,
            wholeBean: product.wholeBean,
            ground: product.ground,
            brewingMethods: product.brewingMethods || [],
            matchScore: tp.matchScore,
            matchReason: tp.matchReason,
          };
        })
        .filter(Boolean);

      // If no products scored >= 5, take the best one anyway
      if (topProducts.length === 0 && matchResult.topProducts.length > 0) {
        const best = matchResult.topProducts[0];
        const product = roaster.scrapedData.products[best.productIndex - 1];
        if (product) {
          topProducts.push({
            name: product.name,
            description: product.description,
            price: product.price,
            imageUrl: product.imageUrl,
            purchaseUrl: product.purchaseUrl,
            wholeBean: product.wholeBean,
            ground: product.ground,
            brewingMethods: product.brewingMethods || [],
            matchScore: best.matchScore,
            matchReason: best.matchReason,
          });
        }
      }

      if (topProducts.length === 0) continue;

      const maxScore = Math.max(...topProducts.map((p) => p.matchScore));

      results.push({
        roaster: {
          name: roaster.name,
          address: roaster.address,
          website: roaster.website,
          shopUrl: roaster.scrapedData?.shopUrl || null,
          logoUrl: roaster.logoUrl,
          rating: roaster.rating,
          isWomenOwned: roaster.scrapedData?.isWomenOwned || false,
          isBlackOwned: roaster.scrapedData?.isBlackOwned || false,
        },
        topProducts,
        matchScore: maxScore,
      });
    }

    // Append roasters whose sites couldn't be scraped (JS-rendered, bot-blocked, etc.)
    // They're still real local roasters worth knowing about — show them as "visit website" cards.
    const includedNames = new Set(results.map((r) => r.roaster.name));
    for (const r of roasters) {
      if (includedNames.has(r.name) || aiExcludedNames.has(r.name)) continue;
      results.push({
        roaster: {
          name: r.name,
          address: r.address,
          website: r.website,
          shopUrl: r.scrapedData?.shopUrl || null,
          logoUrl: r.logoUrl,
          rating: r.rating,
          isWomenOwned: r.scrapedData?.isWomenOwned || false,
          isBlackOwned: r.scrapedData?.isBlackOwned || false,
        },
        topProducts: [],
        matchScore: 0,
      });
    }

    // Sort: preferred-ownership roasters first, then by match score within each tier
    results.sort((a, b) => {
      const aPreferred = (womenOwned && a.roaster.isWomenOwned) || (blackOwned && a.roaster.isBlackOwned);
      const bPreferred = (womenOwned && b.roaster.isWomenOwned) || (blackOwned && b.roaster.isBlackOwned);
      if (aPreferred !== bPreferred) return aPreferred ? -1 : 1;
      return b.matchScore - a.matchScore;
    });

    return results;
  } catch (error) {
    console.error('AI matching error:', error.message);

    // Fallback: return all roasters with products, ownership-preferred ones first
    return roastersWithProducts
      .sort((a, b) => {
        const aPreferred = (womenOwned && a.scrapedData?.isWomenOwned) || (blackOwned && a.scrapedData?.isBlackOwned);
        const bPreferred = (womenOwned && b.scrapedData?.isWomenOwned) || (blackOwned && b.scrapedData?.isBlackOwned);
        return aPreferred === bPreferred ? 0 : aPreferred ? -1 : 1;
      })
      .map((r) => ({
        roaster: {
          name: r.name,
          address: r.address,
          website: r.website,
          shopUrl: r.scrapedData?.shopUrl || null,
          logoUrl: r.logoUrl,
          rating: r.rating,
          isWomenOwned: r.scrapedData?.isWomenOwned || false,
          isBlackOwned: r.scrapedData?.isBlackOwned || false,
        },
        topProducts: r.scrapedData.products.slice(0, 2).map((p) => ({
          ...p,
          matchScore: 5,
          matchReason: p.description || 'Visit the roaster\'s website for full product details.',
        })),
        matchScore: 5,
      }));
  }
}
