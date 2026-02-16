import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Types
export interface ExtractedLocation {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  confidence: 'high' | 'medium' | 'low';
  sources: string[];
  raw_mentions: string[];
}

export interface ExtractionResponse {
  success: boolean;
  locations: ExtractedLocation[];
  input_length: number;
  processing_time_ms: number;
  error?: string;
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Geocoding with Nominatim (OpenStreetMap) - free, no API key
async function geocodeWithNominatim(query: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'GeoText-API/1.0 (https://github.com/geotext-api)',
        },
      }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error('Nominatim geocoding error:', error);
    return null;
  }
}

// Geocoding with Google Maps API (if available)
async function geocodeWithGoogle(query: string): Promise<{ lat: number; lon: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`
    );
    const data = await response.json();
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lon: location.lng,
      };
    }
    return null;
  } catch (error) {
    console.error('Google geocoding error:', error);
    return null;
  }
}

// Multi-source geocoding with confidence scoring
async function geocodeLocation(
  name: string,
  llmCoords?: { lat: number; lon: number }
): Promise<{ lat: number; lon: number; confidence: 'high' | 'medium' | 'low'; sources: string[] }> {
  const sources: string[] = [];
  const coords: { lat: number; lon: number }[] = [];

  // Try LLM coordinates first
  if (llmCoords && llmCoords.lat && llmCoords.lon) {
    coords.push(llmCoords);
    sources.push('llm');
  }

  // Try Google Maps
  const googleResult = await geocodeWithGoogle(name);
  if (googleResult) {
    coords.push(googleResult);
    sources.push('google');
  }

  // Try Nominatim (OpenStreetMap)
  const nominatimResult = await geocodeWithNominatim(name);
  if (nominatimResult) {
    coords.push(nominatimResult);
    sources.push('nominatim');
  }

  // Determine final coordinates and confidence
  if (coords.length === 0) {
    return { lat: 0, lon: 0, confidence: 'low', sources: [] };
  }

  // Calculate average coordinates
  const avgLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
  const avgLon = coords.reduce((sum, c) => sum + c.lon, 0) / coords.length;

  // Calculate confidence based on source agreement
  let confidence: 'high' | 'medium' | 'low' = 'low';
  
  if (sources.length >= 2) {
    // Check if sources agree (within ~10km)
    const maxDist = Math.max(
      ...coords.map((c) =>
        Math.sqrt(Math.pow(c.lat - avgLat, 2) + Math.pow(c.lon - avgLon, 2))
      )
    );
    if (maxDist < 0.1) {
      confidence = 'high';
    } else if (maxDist < 0.5) {
      confidence = 'medium';
    }
  } else if (sources.includes('google') || sources.includes('nominatim')) {
    confidence = 'medium';
  }

  return {
    lat: Math.round(avgLat * 1000000) / 1000000,
    lon: Math.round(avgLon * 1000000) / 1000000,
    confidence,
    sources,
  };
}

// Extract locations using Claude
async function extractLocationsWithLLM(text: string): Promise<{
  name: string;
  description: string;
  raw_mention: string;
  llm_lat?: number;
  llm_lon?: number;
}[]> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Extract all geographic locations, points of interest, and destinations from the following text. For each location, provide:
1. The canonical name of the location
2. A brief description (1 sentence max)
3. The exact text mention from the input
4. If you're confident, provide approximate latitude and longitude

Return ONLY valid JSON in this format (no markdown, no explanation):
{
  "locations": [
    {
      "name": "Great Barrier Reef",
      "description": "World's largest coral reef system off the coast of Queensland, Australia",
      "raw_mention": "the Great Barrier Reef",
      "llm_lat": -18.2871,
      "llm_lon": 147.6992
    }
  ]
}

If no locations are found, return: {"locations": []}

TEXT TO ANALYZE:
${text}`,
      },
    ],
  });

  try {
    const content = response.content[0];
    if (content.type !== 'text') {
      return [];
    }
    
    // Clean up response - remove markdown code blocks if present
    let jsonStr = content.text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }
    
    const parsed = JSON.parse(jsonStr);
    return parsed.locations || [];
  } catch (error) {
    console.error('Error parsing LLM response:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        {
          success: false,
          locations: [],
          input_length: 0,
          processing_time_ms: Date.now() - startTime,
          error: 'Missing or invalid "text" field in request body',
        } as ExtractionResponse,
        { status: 400 }
      );
    }

    if (text.length > 100000) {
      return NextResponse.json(
        {
          success: false,
          locations: [],
          input_length: text.length,
          processing_time_ms: Date.now() - startTime,
          error: 'Text exceeds maximum length of 100,000 characters',
        } as ExtractionResponse,
        { status: 400 }
      );
    }

    // Step 1: Extract locations with LLM
    const llmLocations = await extractLocationsWithLLM(text);

    // Step 2: Geocode each location with multi-source verification
    const locations: ExtractedLocation[] = await Promise.all(
      llmLocations.map(async (loc) => {
        const geocoded = await geocodeLocation(
          loc.name,
          loc.llm_lat && loc.llm_lon
            ? { lat: loc.llm_lat, lon: loc.llm_lon }
            : undefined
        );

        return {
          name: loc.name,
          description: loc.description,
          latitude: geocoded.lat,
          longitude: geocoded.lon,
          confidence: geocoded.confidence,
          sources: geocoded.sources,
          raw_mentions: [loc.raw_mention],
        };
      })
    );

    // Deduplicate locations by name (merge mentions)
    const deduped = locations.reduce((acc, loc) => {
      const existing = acc.find(
        (l) => l.name.toLowerCase() === loc.name.toLowerCase()
      );
      if (existing) {
        existing.raw_mentions.push(...loc.raw_mentions);
        // Keep higher confidence
        if (
          (loc.confidence === 'high' && existing.confidence !== 'high') ||
          (loc.confidence === 'medium' && existing.confidence === 'low')
        ) {
          existing.confidence = loc.confidence;
          existing.latitude = loc.latitude;
          existing.longitude = loc.longitude;
          existing.sources = loc.sources;
        }
      } else {
        acc.push(loc);
      }
      return acc;
    }, [] as ExtractedLocation[]);

    return NextResponse.json({
      success: true,
      locations: deduped,
      input_length: text.length,
      processing_time_ms: Date.now() - startTime,
    } as ExtractionResponse);
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      {
        success: false,
        locations: [],
        input_length: 0,
        processing_time_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Internal server error',
      } as ExtractionResponse,
      { status: 500 }
    );
  }
}

// GET endpoint for health check and API info
export async function GET() {
  return NextResponse.json({
    name: 'GeoText API',
    version: '1.0.0',
    description: 'Extract and geocode locations from text using AI + multi-source verification',
    endpoints: {
      'POST /api/extract-locations': {
        description: 'Extract locations from text',
        body: { text: 'string (required, max 100k chars)' },
        response: {
          success: 'boolean',
          locations: 'ExtractedLocation[]',
          input_length: 'number',
          processing_time_ms: 'number',
        },
      },
    },
    confidence_levels: {
      high: 'Multiple sources agree (within ~10km)',
      medium: 'Single authoritative source or moderate agreement',
      low: 'Only LLM estimate or no verification possible',
    },
    sources: ['llm (Claude)', 'google (Google Maps)', 'nominatim (OpenStreetMap)'],
  });
}
