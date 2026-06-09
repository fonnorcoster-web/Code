import React, { useState } from 'react';

const ROAST_LEVELS = [
  {
    id: 'light',
    label: 'Light',
    emoji: '🌅',
    description: 'Bright, fruity, tea-like',
    gradient: 'from-amber-100 to-amber-200',
    selectedBg: 'bg-amber-200',
  },
  {
    id: 'medium',
    label: 'Medium',
    emoji: '☀️',
    description: 'Balanced, caramel, smooth',
    gradient: 'from-amber-300 to-amber-400',
    selectedBg: 'bg-amber-400',
  },
  {
    id: 'medium-dark',
    label: 'Medium-Dark',
    emoji: '🌇',
    description: 'Rich, bittersweet, nutty',
    gradient: 'from-amber-600 to-amber-700',
    selectedBg: 'bg-amber-700',
  },
  {
    id: 'dark',
    label: 'Dark',
    emoji: '🌑',
    description: 'Bold, smoky, intense',
    gradient: 'from-stone-700 to-stone-900',
    selectedBg: 'bg-stone-800',
  },
  {
    id: 'no-preference',
    label: 'No Preference',
    emoji: '✨',
    description: 'Surprise me!',
    gradient: 'from-amber-100 to-stone-600',
    selectedBg: 'bg-gradient-to-r from-amber-400 to-stone-600',
  },
];

const FLAVOR_NOTES = [
  { id: 'fruity', label: 'Fruity', emoji: '🍓', description: 'Berry, citrus, tropical' },
  { id: 'chocolatey', label: 'Chocolatey/Nutty', emoji: '🍫', description: 'Chocolate, hazelnut, almond' },
  { id: 'floral', label: 'Floral/Herbal', emoji: '🌸', description: 'Jasmine, lavender, tea-like' },
  { id: 'caramel', label: 'Caramel/Sweet', emoji: '🍮', description: 'Brown sugar, honey, vanilla' },
  { id: 'earthy', label: 'Earthy/Spicy', emoji: '🌿', description: 'Cedar, tobacco, pepper' },
  { id: 'bright', label: 'Bright/Acidic', emoji: '⚡', description: 'Lemon, wine-like, crisp' },
];

const BREWING_METHODS = [
  { id: 'espresso', label: 'Espresso', emoji: '☕' },
  { id: 'pour-over', label: 'Pour Over', emoji: '🫗' },
  { id: 'french-press', label: 'French Press', emoji: '🧪' },
  { id: 'drip', label: 'Drip Machine', emoji: '💧' },
  { id: 'cold-brew', label: 'Cold Brew', emoji: '🧊' },
  { id: 'aeropress', label: 'AeroPress', emoji: '🔬' },
  { id: 'moka-pot', label: 'Moka Pot', emoji: '🫙' },
];

const TOTAL_STEPS = 5;

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((stepNum) => (
        <React.Fragment key={stepNum}>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
              stepNum === currentStep
                ? 'bg-amber-700 text-white scale-110'
                : stepNum < currentStep
                ? 'bg-amber-300 text-amber-900'
                : 'bg-amber-100 text-stone-400'
            }`}
          >
            {stepNum < currentStep ? '✓' : stepNum}
          </div>
          {stepNum < TOTAL_STEPS && (
            <div
              className={`h-1 w-8 rounded transition-all duration-300 ${
                stepNum < currentStep ? 'bg-amber-400' : 'bg-amber-100'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function ToggleSwitch({ label, description, checked, onChange, disabled = false }) {
  return (
    <label className={`flex items-start gap-3 cursor-pointer ${disabled ? 'opacity-60' : ''}`}>
      <div className="relative flex-shrink-0 mt-0.5">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-amber-700 transition-colors duration-200" />
        <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 peer-checked:translate-x-5" />
      </div>
      <div>
        <div className="font-medium text-stone-700">{label}</div>
        {description && <div className="text-xs text-stone-500 mt-0.5">{description}</div>}
      </div>
    </label>
  );
}

export default function PreferencesForm({ initialPreferences, initialLocation, onSubmit }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [locationInput, setLocationInput] = useState(initialLocation || '');
  const [locationCoords, setLocationCoords] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [preferences, setPreferences] = useState(
    initialPreferences || {
      flavorNotes: [],
      roastLevel: '',
      format: 'both',
      brewingMethods: [],
      womenOwned: false,
      blackOwned: false,
      excludeRegionalChains: true,
      excludeNationalChains: true,
    }
  );

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocationLoading(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationInput('📍 Current Location');
        setLocationLoading(false);
      },
      (error) => {
        setLocationError('Unable to get your location. Please enter a city manually.');
        setLocationLoading(false);
      },
      { timeout: 10000 }
    );
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    const finalLocation = locationCoords || locationInput.trim();
    if (!finalLocation) return;

    const finalPreferences = {
      ...preferences,
      brewingMethod: preferences.brewingMethods.join(', '),
    };

    onSubmit(finalPreferences, finalLocation);
  };

  const toggleFlavorNote = (noteId) => {
    setPreferences((prev) => ({
      ...prev,
      flavorNotes: prev.flavorNotes.includes(noteId)
        ? prev.flavorNotes.filter((n) => n !== noteId)
        : [...prev.flavorNotes, noteId],
    }));
  };

  const toggleBrewingMethod = (methodId) => {
    setPreferences((prev) => ({
      ...prev,
      brewingMethods: prev.brewingMethods.includes(methodId)
        ? prev.brewingMethods.filter((m) => m !== methodId)
        : [...prev.brewingMethods, methodId],
    }));
  };

  const canProceedStep1 = locationCoords || locationInput.trim().length > 0;
  const canProceedStep2 = preferences.roastLevel !== '';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-stone-800 mb-2">Find Your Perfect Coffee</h2>
        <p className="text-stone-500">Tell us your preferences and we'll find local roasters that match</p>
      </div>

      <StepIndicator currentStep={currentStep} />

      <div className="card p-8">
        {/* Step 1: Location */}
        {currentStep === 1 && (
          <div>
            <h3 className="text-xl font-bold text-stone-800 mb-2">Where are you?</h3>
            <p className="text-stone-500 text-sm mb-6">
              We'll find coffee roasters near you
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  City or Neighborhood
                </label>
                <input
                  type="text"
                  value={locationInput.startsWith('📍') ? '' : locationInput}
                  onChange={(e) => {
                    setLocationInput(e.target.value);
                    setLocationCoords(null);
                  }}
                  placeholder="e.g. Portland, OR or Brooklyn, NY"
                  className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-stone-800 placeholder-stone-400"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-amber-200" />
                <span className="text-stone-400 text-sm">or</span>
                <div className="flex-1 border-t border-amber-200" />
              </div>

              <button
                onClick={handleGetLocation}
                disabled={locationLoading}
                className="w-full py-3 px-4 border-2 border-amber-300 rounded-lg text-amber-800 font-medium hover:bg-amber-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {locationLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Getting location...
                  </>
                ) : locationCoords ? (
                  <>✓ Using your location</>
                ) : (
                  <>📍 Use My Current Location</>
                )}
              </button>

              {locationError && (
                <p className="text-red-500 text-sm">{locationError}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Roast Level */}
        {currentStep === 2 && (
          <div>
            <h3 className="text-xl font-bold text-stone-800 mb-2">Roast Level</h3>
            <p className="text-stone-500 text-sm mb-6">
              How dark do you like your roast?
            </p>

            <div className="grid grid-cols-1 gap-3">
              {ROAST_LEVELS.map((roast) => {
                const isSelected = preferences.roastLevel === roast.id;
                return (
                  <button
                    key={roast.id}
                    onClick={() => setPreferences((prev) => ({ ...prev, roastLevel: roast.id }))}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      isSelected
                        ? 'border-amber-700 bg-amber-50'
                        : 'border-amber-100 hover:border-amber-300 bg-white'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${roast.gradient} flex items-center justify-center text-2xl flex-shrink-0`}
                    >
                      {roast.emoji}
                    </div>
                    <div>
                      <div className={`font-semibold ${isSelected ? 'text-amber-800' : 'text-stone-700'}`}>
                        {roast.label}
                      </div>
                      <div className="text-sm text-stone-500">{roast.description}</div>
                    </div>
                    {isSelected && (
                      <div className="ml-auto text-amber-700">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Flavor Notes */}
        {currentStep === 3 && (
          <div>
            <h3 className="text-xl font-bold text-stone-800 mb-2">Flavor Notes</h3>
            <p className="text-stone-500 text-sm mb-6">
              Select any flavor profiles you enjoy (optional — select all that apply)
            </p>

            <div className="grid grid-cols-2 gap-3">
              {FLAVOR_NOTES.map((note) => {
                const isSelected = preferences.flavorNotes.includes(note.id);
                return (
                  <button
                    key={note.id}
                    onClick={() => toggleFlavorNote(note.id)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      isSelected
                        ? 'border-amber-700 bg-amber-700 text-white'
                        : 'border-amber-100 hover:border-amber-300 bg-white text-stone-700'
                    }`}
                  >
                    <div className="text-2xl mb-1">{note.emoji}</div>
                    <div className="font-semibold text-sm">{note.label}</div>
                    <div className={`text-xs mt-0.5 ${isSelected ? 'text-amber-200' : 'text-stone-400'}`}>
                      {note.description}
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-center text-stone-400 text-xs mt-4">
              Skip this step if you don't have a preference
            </p>
          </div>
        )}

        {/* Step 4: Format & Brewing */}
        {currentStep === 4 && (
          <div>
            <h3 className="text-xl font-bold text-stone-800 mb-6">Format & Brewing</h3>

            {/* Format */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-stone-700 mb-3">
                Bean Format
              </label>
              <div className="flex gap-3">
                {[
                  { id: 'whole', label: 'Whole Bean', emoji: '🫘' },
                  { id: 'ground', label: 'Pre-Ground', emoji: '☕' },
                  { id: 'both', label: 'No Preference', emoji: '✨' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setPreferences((prev) => ({ ...prev, format: fmt.id }))}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-200 text-center ${
                      preferences.format === fmt.id
                        ? 'border-amber-700 bg-amber-50 text-amber-800'
                        : 'border-amber-100 hover:border-amber-300 bg-white text-stone-600'
                    }`}
                  >
                    <div className="text-2xl mb-1">{fmt.emoji}</div>
                    <div className="text-xs font-semibold">{fmt.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Brewing Methods */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-3">
                Brewing Method <span className="font-normal text-stone-400">(select all that apply)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {BREWING_METHODS.map((method) => {
                  const isSelected = preferences.brewingMethods.includes(method.id);
                  return (
                    <button
                      key={method.id}
                      onClick={() => toggleBrewingMethod(method.id)}
                      className={`flex items-center gap-2 py-2.5 px-4 rounded-lg border-2 transition-all duration-200 ${
                        isSelected
                          ? 'border-amber-700 bg-amber-700 text-white'
                          : 'border-amber-100 hover:border-amber-300 bg-white text-stone-600'
                      }`}
                    >
                      <span>{method.emoji}</span>
                      <span className="text-sm font-medium">{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Optional Filters */}
        {currentStep === 5 && (
          <div>
            <h3 className="text-xl font-bold text-stone-800 mb-2">Optional Filters</h3>
            <p className="text-stone-500 text-sm mb-6">
              Customize your search to support businesses that matter to you
            </p>

            <div className="space-y-5">
              <ToggleSwitch
                label="Women-Owned Businesses"
                description="Only show roasters that identify as women-owned"
                checked={preferences.womenOwned}
                onChange={(e) =>
                  setPreferences((prev) => ({ ...prev, womenOwned: e.target.checked }))
                }
              />

              <ToggleSwitch
                label="Black-Owned Businesses"
                description="Only show roasters that identify as Black-owned or BIPOC-owned"
                checked={preferences.blackOwned}
                onChange={(e) =>
                  setPreferences((prev) => ({ ...prev, blackOwned: e.target.checked }))
                }
              />

              <div className="border-t border-amber-100 pt-5">
                <ToggleSwitch
                  label="Exclude Regional Chains"
                  description="Filter out regional coffee chains"
                  checked={preferences.excludeRegionalChains}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      excludeRegionalChains: e.target.checked,
                    }))
                  }
                />
              </div>

              <ToggleSwitch
                label="Exclude National Chains"
                description="Always on for best local results — Starbucks, Peet's, etc. are filtered out"
                checked={true}
                onChange={() => {}}
                disabled={true}
              />
            </div>

            <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-800">
                ☕ <strong>We always prioritize small, independent local roasters.</strong> National chains are excluded by default so you can discover amazing local gems in your community.
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-amber-100">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="btn-secondary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Back
          </button>

          <span className="text-stone-400 text-sm">
            Step {currentStep} of {TOTAL_STEPS}
          </span>

          {currentStep < TOTAL_STEPS ? (
            <button
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !canProceedStep1) ||
                (currentStep === 2 && !canProceedStep2)
              }
              className="btn-primary disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceedStep1}
              className="btn-primary disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Find My Coffee ☕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
