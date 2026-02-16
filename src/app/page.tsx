'use client';

import { useState } from 'react';

interface ExtractedLocation {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  confidence: 'high' | 'medium' | 'low';
  sources: string[];
  raw_mentions: string[];
}

interface ExtractionResponse {
  success: boolean;
  locations: ExtractedLocation[];
  input_length: number;
  processing_time_ms: number;
  error?: string;
}

const SAMPLE_TEXT = `Our road trip through Europe was incredible! We started in Paris, climbing the Eiffel Tower 
for breathtaking views. Then we drove through the Swiss Alps, stopping at the Matterhorn viewpoint 
before descending to Lake Como in Italy. The highlight was definitely the Amalfi Coast - we stayed 
in Positano and took a boat to the Blue Grotto on Capri. We ended our journey in Barcelona, 
wandering through La Sagrada Família and enjoying tapas in the Gothic Quarter.`;

export default function Home() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [result, setResult] = useState<ExtractionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractLocations = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/extract-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to extract locations');
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌍</span>
            <div>
              <h1 className="text-xl font-bold text-white">GeoText API</h1>
              <p className="text-sm text-slate-400">Location Extraction & Geocoding</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/stammi922/geotext-api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition-colors"
            >
              GitHub
            </a>
            <a
              href="/api/extract-locations"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              API Docs
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero */}
        <section className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Extract Locations from Any Text
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
            AI-powered location extraction with multi-source geocoding.
            Get accurate coordinates for any place mentioned in your text.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <div className="bg-slate-800 rounded-lg px-4 py-2 text-sm">
              <span className="text-green-400">✓</span>
              <span className="text-slate-300 ml-2">LLM-powered extraction</span>
            </div>
            <div className="bg-slate-800 rounded-lg px-4 py-2 text-sm">
              <span className="text-green-400">✓</span>
              <span className="text-slate-300 ml-2">Multi-source geocoding</span>
            </div>
            <div className="bg-slate-800 rounded-lg px-4 py-2 text-sm">
              <span className="text-green-400">✓</span>
              <span className="text-slate-300 ml-2">Confidence scoring</span>
            </div>
          </div>
        </section>

        {/* Demo */}
        <section className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 md:p-8 mb-16">
          <h3 className="text-2xl font-bold text-white mb-6">Try it out</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Input */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Input Text
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-64 bg-slate-900 border border-slate-600 rounded-lg p-4 text-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Paste any text containing location mentions..."
              />
              <div className="flex justify-between items-center mt-3">
                <span className="text-sm text-slate-500">
                  {text.length.toLocaleString()} characters
                </span>
                <button
                  onClick={extractLocations}
                  disabled={loading || !text.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>Extract Locations</>
                  )}
                </button>
              </div>
            </div>

            {/* Output */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Extracted Locations
              </label>
              <div className="h-64 bg-slate-900 border border-slate-600 rounded-lg p-4 overflow-auto">
                {error && (
                  <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-200">
                    {error}
                  </div>
                )}
                
                {!result && !error && !loading && (
                  <p className="text-slate-500 text-center mt-20">
                    Click &quot;Extract Locations&quot; to see results
                  </p>
                )}

                {result && result.locations.length === 0 && (
                  <p className="text-slate-500 text-center mt-20">
                    No locations found in the text
                  </p>
                )}

                {result && result.locations.length > 0 && (
                  <div className="space-y-3">
                    {result.locations.map((loc, i) => (
                      <div
                        key={i}
                        className="bg-slate-800 rounded-lg p-3 border border-slate-700"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-white">{loc.name}</h4>
                            <p className="text-sm text-slate-400">{loc.description}</p>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded border ${getConfidenceColor(loc.confidence)}`}
                          >
                            {loc.confidence}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="text-slate-500">
                            📍 {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                          </span>
                          <span className="text-slate-500">
                            Sources: {loc.sources.join(', ') || 'none'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {result && (
                <div className="mt-3 text-sm text-slate-500">
                  Found {result.locations.length} location(s) in {result.processing_time_ms}ms
                </div>
              )}
            </div>
          </div>
        </section>

        {/* API Documentation */}
        <section className="mb-16">
          <h3 className="text-2xl font-bold text-white mb-6">Quick Start</h3>
          
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="border-b border-slate-700 px-4 py-3 flex items-center gap-2">
              <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">POST</span>
              <code className="text-slate-300">/api/extract-locations</code>
            </div>
            <pre className="p-4 overflow-x-auto text-sm">
              <code className="text-slate-300">{`curl -X POST https://your-domain.vercel.app/api/extract-locations \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Visit the Eiffel Tower in Paris and Big Ben in London"}'`}</code>
            </pre>
          </div>

          <div className="mt-6 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="border-b border-slate-700 px-4 py-3">
              <span className="text-slate-400">Response</span>
            </div>
            <pre className="p-4 overflow-x-auto text-sm">
              <code className="text-slate-300">{`{
  "success": true,
  "locations": [
    {
      "name": "Eiffel Tower",
      "description": "Iconic iron tower in Paris, France",
      "latitude": 48.8584,
      "longitude": 2.2945,
      "confidence": "high",
      "sources": ["llm", "google", "nominatim"],
      "raw_mentions": ["the Eiffel Tower in Paris"]
    },
    {
      "name": "Big Ben",
      "description": "Famous clock tower at the Houses of Parliament in London",
      "latitude": 51.5007,
      "longitude": -0.1246,
      "confidence": "high",
      "sources": ["llm", "google", "nominatim"],
      "raw_mentions": ["Big Ben in London"]
    }
  ],
  "input_length": 54,
  "processing_time_ms": 1234
}`}</code>
            </pre>
          </div>
        </section>

        {/* Features */}
        <section className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <div className="text-3xl mb-4">🤖</div>
            <h4 className="text-lg font-semibold text-white mb-2">AI-Powered Extraction</h4>
            <p className="text-slate-400 text-sm">
              Uses Claude to identify location mentions, handles nicknames, abbreviations, and context.
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <div className="text-3xl mb-4">🗺️</div>
            <h4 className="text-lg font-semibold text-white mb-2">Multi-Source Geocoding</h4>
            <p className="text-slate-400 text-sm">
              Cross-references Google Maps and OpenStreetMap for accurate, verified coordinates.
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <div className="text-3xl mb-4">✅</div>
            <h4 className="text-lg font-semibold text-white mb-2">Confidence Scoring</h4>
            <p className="text-slate-400 text-sm">
              Know how reliable each coordinate is: high (multi-source), medium (single), or low (estimate).
            </p>
          </div>
        </section>

        {/* Pricing */}
        <section className="text-center mb-16">
          <h3 className="text-2xl font-bold text-white mb-6">Pricing</h3>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-8 max-w-md mx-auto">
            <div className="text-4xl font-bold text-white mb-2">Self-Hosted</div>
            <div className="text-slate-400 mb-6">Deploy your own instance</div>
            <ul className="text-left space-y-2 mb-6">
              <li className="flex items-center gap-2 text-slate-300">
                <span className="text-green-400">✓</span> Unlimited requests
              </li>
              <li className="flex items-center gap-2 text-slate-300">
                <span className="text-green-400">✓</span> Your own API keys
              </li>
              <li className="flex items-center gap-2 text-slate-300">
                <span className="text-green-400">✓</span> Full source code
              </li>
              <li className="flex items-center gap-2 text-slate-300">
                <span className="text-green-400">✓</span> One-click Vercel deploy
              </li>
            </ul>
            <a
              href="https://vercel.com/new/clone?repository-url=https://github.com/stammi922/geotext-api"
              className="block bg-white text-slate-900 font-semibold px-6 py-3 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Deploy to Vercel →
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-slate-500 text-sm border-t border-slate-700 pt-8">
          <p>Built with ❤️ for developers who work with location data</p>
          <p className="mt-2">
            <a href="https://github.com/stammi922/geotext-api" className="hover:text-slate-300">
              MIT License
            </a>
            {' · '}
            <a href="/api/extract-locations" className="hover:text-slate-300">
              API Reference
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
