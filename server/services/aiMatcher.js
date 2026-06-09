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
- Looking for Women-Owned: ${womenOwned ? 'Yes' : 'No preference'}
- Looking for Black-Owned: ${blackOwned ? 'Yes' : 'No preference'}`;

  const prompt = `${preferencesDescription}

Here are the local coffee roasters and their products to evaluate:

${roasterDescriptions}

For each roaster, analyze their products and identify the top 1-2 products that best match the user's preferences.

Return a JSON array where each element has this exact structure:
{
  "roasterIndex": <number starting from 1>,
  "topProducts": [
    {
      "productIndex": <number starting from 1, corresponding to the product numbers listed above>,
      "matchScore": <integer 0-10>,
      "matchReason": "<2-3 sentence explanation of why this product matches the preferences>"
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
        'You are a coffee expert helping match people with local coffee products. Analyze each product\'s description and match it to the user\'s preferences. Always respond with valid JSON only.',
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

    for (let i = 0; i < roastersWithProducts.length; i++) {
      const roaster = roastersWithProducts[i];
      const matchResult = matchResults.find((r) => r.roasterIndex === i + 1);

      // Apply ownership filters
      if (womenOwned && !roaster.scrapedData?.isWomenOwned) continue;
      if (blackOwned && !roaster.scrapedData?.isBlackOwned) continue;

      if (!matchResult || matchResult.topProducts.length === 0) {
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
          logoUrl: roaster.logoUrl,
          rating: roaster.rating,
          isWomenOwned: roaster.scrapedData?.isWomenOwned || false,
          isBlackOwned: roaster.scrapedData?.isBlackOwned || false,
        },
        topProducts,
        matchScore: maxScore,
      });
    }

    // Sort by match score descending
    results.sort((a, b) => b.matchScore - a.matchScore);

    return results;
  } catch (error) {
    console.error('AI matching error:', error.message);

    // Fallback: return all roasters with products but no specific match info
    return roastersWithProducts
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
          logoUrl: r.logoUrl,
          rating: r.rating,
          isWomenOwned: r.scrapedData?.isWomenOwned || false,
          isBlackOwned: r.scrapedData?.isBlackOwned || false,
        },
        topProducts: r.scrapedData.products.slice(0, 2).map((p) => ({
          ...p,
          matchScore: 5,
          matchReason: 'This product may match your preferences. Visit the roaster website for more details.',
        })),
        matchScore: 5,
      }));
  }
}
