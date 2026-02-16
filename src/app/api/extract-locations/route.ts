import { NextRequest, NextResponse } from 'next/server';
import { extractLocationsWithLLM } from '@/lib/gemini';
import { geocodeWithGoogle, geocodeWithNominatim, GeocodingResult } from '@/lib/nominatim';
import { haversineDistance } from '@/lib/distance';

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
  model_used?: string;
  error?: string;
}

const DISTANCE_THRESHOLD_KM = 10;

// Dual geocoding with Haversine-based confidence scoring
async function geocodeLocation(
  name: string,
  llmCoords?: { lat: number; lon: number }
): Promise<{
  lat: number;
  lon: number;
  confidence: 'high' | 'medium' | 'low';
  sources: string[];
  agreement_distance_km?: number;
}> {
  // Geocode with both services in parallel
  const [googleResult, nominatimResult] = await Promise.all([
    geocodeWithGoogle(name),
    geocodeWithNominatim(name),
  ]);

  const geocodingSources: string[] = [];
  const coords: GeocodingResult[] = [];

  if (googleResult) {
    coords.push(googleResult);
    geocodingSources.push('google');
  }
  if (nominatimResult) {
    coords.push(nominatimResult);
    geocodingSources.push('nominatim');
  }

  // Include LLM coordinates as a supplementary source
  if (llmCoords && llmCoords.lat && llmCoords.lon) {
    coords.push(llmCoords);
    geocodingSources.push('llm');
  }

  if (coords.length === 0) {
    return { lat: 0, lon: 0, confidence: 'low', sources: [] };
  }

  // Dual geocoding confidence check using Haversine distance
  let confidence: 'high' | 'medium' | 'low' = 'low';
  let agreementDistanceKm: number | undefined;
  let finalLat: number;
  let finalLon: number;

  if (googleResult && nominatimResult) {
    agreementDistanceKm = haversineDistance(
      googleResult.lat,
      googleResult.lon,
      nominatimResult.lat,
      nominatimResult.lon
    );

    if (agreementDistanceKm < DISTANCE_THRESHOLD_KM) {
      // Both services agree - high confidence, use average
      confidence = 'high';
      finalLat = (googleResult.lat + nominatimResult.lat) / 2;
      finalLon = (googleResult.lon + nominatimResult.lon) / 2;
    } else {
      // Services disagree - medium confidence, prefer Google (more accurate)
      confidence = 'medium';
      finalLat = googleResult.lat;
      finalLon = googleResult.lon;
    }
  } else if (googleResult) {
    // Only Google succeeded
    confidence = 'medium';
    finalLat = googleResult.lat;
    finalLon = googleResult.lon;
  } else if (nominatimResult) {
    // Only Nominatim succeeded
    confidence = 'medium';
    finalLat = nominatimResult.lat;
    finalLon = nominatimResult.lon;
  } else {
    // Only LLM coordinates available
    confidence = 'low';
    finalLat = coords[0].lat;
    finalLon = coords[0].lon;
  }

  return {
    lat: Math.round(finalLat * 1000000) / 1000000,
    lon: Math.round(finalLon * 1000000) / 1000000,
    confidence,
    sources: geocodingSources,
    agreement_distance_km:
      agreementDistanceKm !== undefined
        ? Math.round(agreementDistanceKm * 100) / 100
        : undefined,
  };
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

    // Stage 1: Extract locations with LLM (Gemini Flash → Haiku fallback)
    const { locations: llmLocations, model_used } =
      await extractLocationsWithLLM(text);

    // Stage 2: Dual geocoding with Haversine-based confidence scoring
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
      model_used,
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
    version: '2.0.0',
    description:
      'Extract and geocode locations from text using staged AI validation + multi-source geocoding',
    endpoints: {
      'POST /api/extract-locations': {
        description: 'Extract locations from text',
        body: { text: 'string (required, max 100k chars)' },
        response: {
          success: 'boolean',
          locations: 'ExtractedLocation[]',
          input_length: 'number',
          processing_time_ms: 'number',
          model_used: 'string',
        },
      },
    },
    staged_validation: {
      stage1_llm: 'Gemini 2.0 Flash (primary) → Claude Haiku 4.5 (fallback)',
      stage2_geocoding: 'Google Maps + Nominatim dual validation',
      stage3_confidence: 'Haversine distance-based agreement scoring',
    },
    confidence_levels: {
      high: 'Google & Nominatim agree within 10km (Haversine)',
      medium: 'Single geocoding source or services disagree',
      low: 'Only LLM estimate or no geocoding available',
    },
    sources: [
      'gemini-flash (Gemini 2.0 Flash)',
      'claude-haiku (Claude Haiku 4.5)',
      'google (Google Maps)',
      'nominatim (OpenStreetMap)',
    ],
  });
}
