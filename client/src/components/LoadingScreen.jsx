import { useState, useEffect } from 'react';

const STEPS = [
  { icon: '📍', text: 'Finding local coffee roasters near you…' },
  { icon: '🌐', text: 'Exploring roaster websites for products…' },
  { icon: '🤖', text: 'Matching coffees to your taste profile…' },
  { icon: '☕', text: 'Almost ready with your recommendations…' },
];

export default function LoadingScreen() {
  const [stepIndex, setStepIndex] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIndex((i) => (i < STEPS.length - 1 ? i + 1 : i));
    }, 4000);
    const dotTimer = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 500);
    return () => {
      clearInterval(stepTimer);
      clearInterval(dotTimer);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-10">
      {/* Animated coffee cup */}
      <div className="relative flex flex-col items-center">
        <div className="flex gap-3 mb-1 h-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 bg-amber-400 rounded-full opacity-0 animate-steam"
              style={{
                animationDelay: `${i * 0.4}s`,
                height: '24px',
              }}
            />
          ))}
        </div>
        <div className="text-7xl animate-float select-none">☕</div>
      </div>

      {/* Step indicators */}
      <div className="w-full max-w-sm space-y-3">
        {STEPS.map((step, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500 ${
              idx === stepIndex
                ? 'bg-amber-800 text-white shadow-md scale-105'
                : idx < stepIndex
                ? 'bg-amber-100 text-amber-700 opacity-60'
                : 'bg-white text-stone-400 opacity-40'
            }`}
          >
            <span className="text-xl">{step.icon}</span>
            <span className="text-sm font-medium">
              {step.text}
              {idx === stepIndex ? dots : ''}
            </span>
            {idx < stepIndex && (
              <span className="ml-auto text-amber-600 font-bold">✓</span>
            )}
          </div>
        ))}
      </div>

      <p className="text-stone-400 text-sm">This usually takes 15–30 seconds</p>
    </div>
  );
}
