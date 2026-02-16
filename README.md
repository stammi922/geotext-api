# 🌍 GeoText API

**Extract and geocode locations from any text using AI + multi-source verification.**

Turn unstructured text into structured location data with accurate coordinates. Perfect for travel apps, content analysis, and mapping applications.

## Features

- **🤖 AI-Powered Extraction** - Uses Claude to identify locations, handling nicknames, abbreviations, and context
- **🗺️ Multi-Source Geocoding** - Cross-references Google Maps and OpenStreetMap for accuracy
- **✅ Confidence Scoring** - Know how reliable each coordinate is (high/medium/low)
- **⚡ Fast & Reliable** - Built on Next.js, deploys anywhere

## Quick Start

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/stammi922/geotext-api&env=ANTHROPIC_API_KEY,GOOGLE_MAPS_API_KEY&envDescription=API%20keys%20for%20location%20extraction%20and%20geocoding)

### Local Development

```bash
# Clone the repo
git clone https://github.com/stammi922/geotext-api.git
cd geotext-api

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ Yes | Claude API key for location extraction |
| `GOOGLE_MAPS_API_KEY` | ❌ No | Google Maps Geocoding API key (improves accuracy) |

## API Reference

### POST /api/extract-locations

Extract and geocode locations from text.

**Request:**

```bash
curl -X POST https://your-domain.vercel.app/api/extract-locations \
  -H "Content-Type: application/json" \
  -d '{"text": "Visit the Eiffel Tower in Paris and Big Ben in London"}'
```

**Response:**

```json
{
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
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the request was successful |
| `locations` | array | Array of extracted locations |
| `locations[].name` | string | Canonical name of the location |
| `locations[].description` | string | Brief description |
| `locations[].latitude` | number | Latitude coordinate |
| `locations[].longitude` | number | Longitude coordinate |
| `locations[].confidence` | string | `high`, `medium`, or `low` |
| `locations[].sources` | string[] | Geocoding sources used |
| `locations[].raw_mentions` | string[] | Original text mentions |
| `input_length` | number | Character count of input |
| `processing_time_ms` | number | Processing time in milliseconds |

### Confidence Levels

| Level | Description |
|-------|-------------|
| `high` | Multiple sources agree (within ~10km) |
| `medium` | Single authoritative source or moderate agreement |
| `low` | Only LLM estimate or no verification possible |

### GET /api/extract-locations

Returns API documentation and health check.

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `400` - Bad request (missing text, text too long)
- `500` - Server error

All error responses include an `error` field with a description:

```json
{
  "success": false,
  "error": "Text exceeds maximum length of 100,000 characters",
  "locations": [],
  "processing_time_ms": 5
}
```

## Use Cases

- **Travel Apps** - Extract destinations from trip descriptions
- **Content Analysis** - Analyze articles for location mentions
- **Social Media** - Parse location data from posts
- **Research** - Geocode historical documents
- **Mapping** - Convert text itineraries to map points

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **AI:** Claude (Anthropic)
- **Geocoding:** Google Maps + OpenStreetMap/Nominatim
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## Limits

- Maximum input text: 100,000 characters
- Rate limits depend on your API key quotas

## Contributing

Contributions welcome! Please open an issue or PR.

## License

MIT License - feel free to use in your projects!

---

Built with ❤️ by Jonas Stamm
