import RecommendationCard from './RecommendationCard.jsx';

export default function RecommendationsGrid({ recommendations, meta, onStartOver }) {
  const count = recommendations.length;
  const roasterCount = count;
  const productCount = recommendations.reduce((sum, r) => sum + (r.topProducts?.length || 0), 0);

  return (
    <div>
      {/* Results header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          {count > 0 ? (
            <>
              <h2 className="text-2xl font-bold text-amber-900">Your Recommendations</h2>
              <p className="text-stone-500 text-sm mt-1">
                Found <strong className="text-amber-800">{productCount} coffee matches</strong> from{' '}
                <strong className="text-amber-800">{roasterCount} local roasters</strong>
                {meta?.totalRoastersSearched && (
                  <span className="text-stone-400"> (searched {meta.totalRoastersSearched} roasters nearby)</span>
                )}
              </p>
            </>
          ) : (
            <h2 className="text-2xl font-bold text-amber-900">No Matches Found</h2>
          )}
        </div>

        <button onClick={onStartOver} className="btn-secondary text-sm py-2 px-5 flex-shrink-0">
          ← Start Over
        </button>
      </div>

      {/* Empty state */}
      {count === 0 && (
        <div className="card p-10 text-center">
          <div className="text-5xl mb-4">😔</div>
          <h3 className="text-lg font-semibold text-stone-700 mb-2">No coffee matches found</h3>
          <p className="text-stone-400 text-sm max-w-sm mx-auto mb-2">
            {meta?.message || "We couldn't find local roasters matching your criteria. Try broadening your preferences or a different location."}
          </p>
          <ul className="text-stone-400 text-sm mt-4 space-y-1 text-left inline-block">
            <li>• Try a larger city or neighborhood</li>
            <li>• Remove ownership filters</li>
            <li>• Select "No Preference" for roast level</li>
          </ul>
          <div className="mt-6">
            <button onClick={onStartOver} className="btn-primary">
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Info message (e.g. partial results) */}
      {count > 0 && meta?.message && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-sm">
          {meta.message}
        </div>
      )}

      {/* Grid */}
      {count > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((rec, idx) => (
            <RecommendationCard key={rec.roaster.name + idx} recommendation={rec} />
          ))}
        </div>
      )}
    </div>
  );
}
