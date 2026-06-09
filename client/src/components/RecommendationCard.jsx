import { useState } from 'react';

function ProxiedImage({ src, alt, className, fallback = null }) {
  const [error, setError] = useState(false);

  if (!src || error) return fallback;

  const proxied = `/api/image-proxy?url=${encodeURIComponent(src)}`;

  return (
    <img
      src={proxied}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}

function StarRating({ rating }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className="flex items-center gap-0.5 text-sm" aria-label={`${rating} stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= full ? 'star-filled' : i === full + 1 && half ? 'star-filled opacity-60' : 'star-empty'}>
          ★
        </span>
      ))}
      <span className="text-stone-400 text-xs ml-1">{rating.toFixed(1)}</span>
    </span>
  );
}

function MatchBeans({ score }) {
  const filled = Math.round(score / 2); // 0-5 beans for score 0-10
  return (
    <span className="flex items-center gap-0.5" aria-label={`Match score: ${score} out of 10`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`text-sm ${i <= filled ? 'text-amber-600' : 'text-stone-200'}`}>
          ☕
        </span>
      ))}
      <span className="text-xs text-stone-400 ml-1">{score}/10</span>
    </span>
  );
}

export default function RecommendationCard({ recommendation }) {
  const { roaster, topProducts } = recommendation;

  return (
    <div className="card flex flex-col h-full">
      {/* Roaster Header */}
      <div className="p-5 border-b border-amber-50 flex items-start gap-4">
        <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-amber-100 flex items-center justify-center">
          <ProxiedImage
            src={roaster.logoUrl}
            alt={`${roaster.name} logo`}
            className="w-full h-full object-cover"
            fallback={<span className="text-2xl">☕</span>}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-stone-800 text-base leading-tight truncate">{roaster.name}</h3>
          <p className="text-stone-400 text-xs mt-0.5 truncate">{roaster.address}</p>
          {roaster.rating && (
            <div className="mt-1">
              <StarRating rating={roaster.rating} />
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 mt-2">
            {roaster.isWomenOwned && (
              <span className="badge-women-owned">👩 Women-Owned</span>
            )}
            {roaster.isBlackOwned && (
              <span className="badge-black-owned">✊ Black-Owned</span>
            )}
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="flex-1 p-5 space-y-5">
        {topProducts.length === 0 ? (
          <div className="text-center py-4 text-stone-400 text-sm">
            <p>Visit their website to explore their coffee selection.</p>
          </div>
        ) : (
          topProducts.map((product, idx) => (
            <ProductItem key={idx} product={product} roasterWebsite={roaster.website} />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-5">
        <a
          href={roaster.shopUrl || roaster.website}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center btn-secondary text-sm py-2.5"
        >
          Visit {roaster.name} →
        </a>
      </div>
    </div>
  );
}

function ProductItem({ product, roasterWebsite }) {
  return (
    <div className="flex gap-3">
      {/* Product Image */}
      <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-amber-50 border border-amber-100 flex items-center justify-center">
        <ProxiedImage
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
          fallback={<span className="text-2xl">🫘</span>}
        />
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-stone-800 text-sm leading-tight">{product.name}</h4>
          {product.price && (
            <span className="text-amber-700 font-semibold text-sm flex-shrink-0">{product.price}</span>
          )}
        </div>

        <div className="mt-1">
          <MatchBeans score={product.matchScore} />
        </div>

        {product.matchReason && (
          <p className="text-stone-500 text-xs mt-1.5 italic leading-relaxed line-clamp-2">
            {product.matchReason}
          </p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-2">
          {product.wholeBean && product.ground ? (
            <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">Whole Bean &amp; Ground</span>
          ) : product.wholeBean ? (
            <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">Whole Bean</span>
          ) : product.ground ? (
            <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">Pre-Ground</span>
          ) : null}
          {product.brewingMethods?.slice(0, 2).map((m) => (
            <span key={m} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full capitalize">{m}</span>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-2.5">
          {product.purchaseUrl ? (
            <a
              href={product.purchaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 btn-primary text-xs py-1.5 px-3"
            >
              Buy Now →
            </a>
          ) : roasterWebsite && (
            <a
              href={roasterWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 btn-secondary text-xs py-1.5 px-3"
            >
              View at Roaster →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
