export default function DocsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-slate-900">API Documentation</h1>
          <p className="mt-2 text-slate-600">Complete guide to the GeoText API</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Quick Start */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Quick Start</h2>
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <p className="text-slate-700 mb-4">
              1. Create an API key in your dashboard
              <br />
              2. Include it in the X-API-Key header
              <br />
              3. Send a POST request to /api/extract-locations
            </p>

            <div className="bg-slate-900 text-slate-100 p-4 rounded font-mono text-sm overflow-x-auto">
              <pre>{`curl https://api.geotext.dev/api/extract-locations \\
  -H "X-API-Key: geotext_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Meeting in Paris and London next week"}'`}</pre>
            </div>
          </div>
        </section>

        {/* Endpoints */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Endpoints</h2>

          <div className="space-y-6">
            {/* POST /api/extract-locations */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                POST /api/extract-locations
              </h3>
              <p className="text-slate-600 mb-4">Extract and geocode locations from text</p>

              <div className="mb-4">
                <h4 className="font-semibold text-slate-900 mb-2">Request Body</h4>
                <div className="bg-slate-50 p-3 rounded text-sm font-mono">
                  <div>
                    <span className="text-blue-600">{'{'}</span>
                  </div>
                  <div className="ml-4">
                    <span className="text-slate-600">"text":</span>
                    <span className="text-green-600"> "string (required)"</span>
                  </div>
                  <div>
                    <span className="text-blue-600">{'}'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Response</h4>
                <div className="bg-slate-50 p-3 rounded text-sm font-mono overflow-x-auto">
                  <pre>{`{
  "success": true,
  "locations": [
    {
      "name": "Paris",
      "description": "Capital of France",
      "latitude": 48.8566,
      "longitude": 2.3522,
      "confidence": "high",
      "sources": ["google", "nominatim"]
    }
  ],
  "input_length": 42,
  "processing_time_ms": 234
}`}</pre>
                </div>
              </div>
            </div>

            {/* GET /api/keys */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">GET /api/keys</h3>
              <p className="text-slate-600 mb-4">List your API keys (requires authentication)</p>

              <div className="bg-slate-50 p-3 rounded text-sm font-mono overflow-x-auto">
                <pre>{`{
  "keys": [
    {
      "id": 1,
      "key_prefix": "geotext_live_...",
      "name": "Production",
      "created_at": "2026-02-16T12:00:00Z"
    }
  ]
}`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* Authentication */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Authentication</h2>
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <p className="text-slate-700 mb-4">
              Include your API key in the X-API-Key header:
            </p>
            <div className="bg-slate-900 text-slate-100 p-4 rounded font-mono text-sm">
              X-API-Key: geotext_live_...
            </div>
            <p className="text-slate-600 mt-4">
              You can create API keys in your{' '}
              <a href="/dashboard" className="text-blue-600 hover:underline">
                dashboard
              </a>
              . Never share your API keys!
            </p>
          </div>
        </section>

        {/* Rate Limiting */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Rate Limiting</h2>
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <p className="text-slate-700 mb-4">Rate limits depend on your plan:</p>
            <ul className="space-y-2 text-slate-700">
              <li>
                <strong>Free:</strong> 100 requests/month
              </li>
              <li>
                <strong>Starter:</strong> 10,000 requests/month (100 req/min)
              </li>
              <li>
                <strong>Pro:</strong> 100,000 requests/month (1000 req/min)
              </li>
            </ul>
          </div>
        </section>

        {/* Support */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Support</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <p className="text-blue-900 mb-2">Need help?</p>
            <p className="text-blue-800">
              Email us at support@geotext-api.com or check our{' '}
              <a href="#" className="underline">
                FAQ
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
