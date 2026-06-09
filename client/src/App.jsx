import React, { useState } from 'react';
import axios from 'axios';
import PreferencesForm from './components/PreferencesForm.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import RecommendationsGrid from './components/RecommendationsGrid.jsx';

const DEFAULT_PREFERENCES = {
  flavorNotes: [],
  roastLevel: '',
  format: 'both',
  brewingMethod: '',
  brewingMethods: [],
  womenOwned: false,
  blackOwned: false,
  excludeRegionalChains: true,
  excludeNationalChains: true,
};

export default function App() {
  const [step, setStep] = useState('form'); // 'form' | 'loading' | 'results'
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [location, setLocation] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState(null);
  const [resultsMeta, setResultsMeta] = useState(null);

  const handleSubmit = async (formPreferences, formLocation) => {
    setPreferences(formPreferences);
    setLocation(formLocation);
    setStep('loading');
    setError(null);

    try {
      const response = await axios.post('/api/recommendations', {
        preferences: formPreferences,
        location: formLocation,
      });

      setRecommendations(response.data.recommendations || []);
      setResultsMeta({
        totalRoastersSearched: response.data.totalRoastersSearched,
        totalRoastersWithProducts: response.data.totalRoastersWithProducts,
        message: response.data.message,
      });
      setStep('results');
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      const errorMessage =
        err.response?.data?.details ||
        err.response?.data?.error ||
        err.message ||
        'Something went wrong. Please try again.';
      setError(errorMessage);
      setStep('form');
    }
  };

  const handleStartOver = () => {
    setStep('form');
    setRecommendations([]);
    setError(null);
    setResultsMeta(null);
  };

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <header className="bg-amber-900 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-3xl">☕</span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Coffee Roaster Recommender</h1>
            <p className="text-amber-200 text-xs">Discover local roasters matched to your taste</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {step === 'form' && (
          <PreferencesForm
            initialPreferences={preferences}
            initialLocation={location}
            onSubmit={handleSubmit}
          />
        )}

        {step === 'loading' && <LoadingScreen />}

        {step === 'results' && (
          <RecommendationsGrid
            recommendations={recommendations}
            meta={resultsMeta}
            preferences={preferences}
            location={location}
            onStartOver={handleStartOver}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-amber-200 text-center text-stone-500 text-sm">
        <p>Powered by Google Places API, Anthropic Claude AI, and a love of great coffee</p>
      </footer>
    </div>
  );
}
