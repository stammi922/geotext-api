/**
 * GeoText API - Comprehensive Test Suite
 * Tests all scenarios for location extraction endpoint with staged validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock our lib modules at the boundary
const mockExtractLocationsWithLLM = vi.fn();
const mockGeocodeWithGoogle = vi.fn();
const mockGeocodeWithNominatim = vi.fn();

vi.mock('@/lib/gemini', () => ({
  extractLocationsWithLLM: (...args: unknown[]) =>
    mockExtractLocationsWithLLM(...args),
}));

vi.mock('@/lib/nominatim', () => ({
  geocodeWithGoogle: (...args: unknown[]) => mockGeocodeWithGoogle(...args),
  geocodeWithNominatim: (...args: unknown[]) =>
    mockGeocodeWithNominatim(...args),
}));

// Import the handler after mocks are set up
import { POST } from '../../../../src/app/api/extract-locations/route';

describe('/api/extract-locations - Staged Validation API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key';
  });

  // -- Input validation --

  describe('Input validation', () => {
    it('should return 400 if text field is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/extract-locations',
        {
          method: 'POST',
          body: JSON.stringify({ notText: 'invalid' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const response = await POST(request);
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should return 400 if text is not a string', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/extract-locations',
        {
          method: 'POST',
          body: JSON.stringify({ text: 12345 }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const response = await POST(request);
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should return 400 if text exceeds max length', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/extract-locations',
        {
          method: 'POST',
          body: JSON.stringify({ text: 'x'.repeat(100001) }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const response = await POST(request);
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toMatch(/100,000/);
    });
  });

  // -- Gemini Flash extraction --

  describe('Gemini Flash extraction (primary)', () => {
    it('should extract locations using Gemini Flash', async () => {
      mockExtractLocationsWithLLM.mockResolvedValue({
        locations: [
          {
            name: 'Eiffel Tower',
            description: 'Iconic iron lattice tower in Paris',
            raw_mention: 'the Eiffel Tower',
            llm_lat: 48.8584,
            llm_lon: 2.2945,
          },
        ],
        model_used: 'gemini-2.0-flash',
      });
      mockGeocodeWithGoogle.mockResolvedValue({ lat: 48.8584, lon: 2.2945 });
      mockGeocodeWithNominatim.mockResolvedValue({
        lat: 48.8583,
        lon: 2.2944,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/extract-locations',
        {
          method: 'POST',
          body: JSON.stringify({ text: 'Visit the Eiffel Tower in Paris' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.locations).toHaveLength(1);
      expect(data.locations[0].name).toBe('Eiffel Tower');
      expect(data.model_used).toBe('gemini-2.0-flash');
    });

    it('should return empty locations for text with no places', async () => {
      mockExtractLocationsWithLLM.mockResolvedValue({
        locations: [],
        model_used: 'gemini-2.0-flash',
      });

      const request = new NextRequest(
        'http://localhost:3000/api/extract-locations',
        {
          method: 'POST',
          body: JSON.stringify({
            text: 'I love reading books and playing piano',
          }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.locations).toEqual([]);
      expect(data.model_used).toBe('gemini-2.0-flash');
    });
  });

  // -- Haiku fallback --

  describe('Haiku fallback', () => {
    it('should report model used as claude-haiku when Gemini fails', async () => {
      mockExtractLocationsWithLLM.mockResolvedValue({
        locations: [
          {
            name: 'Tokyo',
            description: 'Capital city of Japan',
            raw_mention: 'Tokyo',
            llm_lat: 35.6762,
            llm_lon: 139.6503,
          },
        ],
        model_used: 'claude-haiku-4.5',
      });
      mockGeocodeWithGoogle.mockResolvedValue({ lat: 35.6762, lon: 139.6503 });
      mockGeocodeWithNominatim.mockResolvedValue({
        lat: 35.6764,
        lon: 139.65,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/extract-locations',
        {
          method: 'POST',
          body: JSON.stringify({ text: 'I want to travel to Tokyo' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.locations).toHaveLength(1);
      expect(data.locations[0].name).toBe('Tokyo');
      expect(data.model_used).toBe('claude-haiku-4.5');
    });
  });

  // -- Dual geocoding confidence --

  describe('Dual geocoding confidence scoring', () => {
    it('should assign high confidence when Google and Nominatim agree (<10km)', async () => {
      mockExtractLocationsWithLLM.mockResolvedValue({
        locations: [
          {
            name: 'Big Ben',
            description: 'Famous clock tower in London',
            raw_mention: 'Big Ben',
          },
        ],
        model_used: 'gemini-2.0-flash',
      });
      mockGeocodeWithGoogle.mockResolvedValue({ lat: 51.5007, lon: -0.1246 });
      mockGeocodeWithNominatim.mockResolvedValue({
        lat: 51.5008,
        lon: -0.1245,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/extract-locations',
        {
          method: 'POST',
          body: JSON.stringify({ text: 'Visit Big Ben in London' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(data.locations[0].confidence).toBe('high');
      expect(data.locations[0].sources).toContain('google');
      expect(data.locations[0].sources).toContain('nominatim');
    });

    it('should assign medium confidence when services disagree (>10km)', async () => {
      mockExtractLocationsWithLLM.mockResolvedValue({
        locations: [
          {
            name: 'Springfield',
            description: 'A common US city name',
            raw_mention: 'Springfield',
          },
        ],
        model_used: 'gemini-2.0-flash',
      });
      // Google: Springfield IL, Nominatim: Springfield MA (~1000km apart)
      mockGeocodeWithGoogle.mockResolvedValue({ lat: 39.7817, lon: -89.6501 });
      mockGeocodeWithNominatim.mockResolvedValue({
        lat: 42.1015,
        lon: -72.5898,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/extract-locations',
        {
          method: 'POST',
          body: JSON.stringify({ text: 'Visit Springfield' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(data.locations[0].confidence).toBe('medium');
      // Should prefer Google result when disagreeing
      expect(data.locations[0].latitude).toBeCloseTo(39.7817, 1);
    });

    it('should assign medium confidence when only Google succeeds', async () => {
      mockExtractLocationsWithLLM.mockResolvedValue({
        locations: [
          {
            name: 'Obscure Place',
            description: 'A small village',
            raw_mention: 'Obscure Place',
          },
        ],
        model_used: 'gemini-2.0-flash',
      });
      mockGeocodeWithGoogle.mockResolvedValue({ lat: 40.0, lon: -74.0 });
      mockGeocodeWithNominatim.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/extract-locations',
        {
          method: 'POST',
          body: JSON.stringify({ text: 'Visit Obscure Place' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(data.locations[0].confidence).toBe('medium');
      expect(data.locations[0].sources).toContain('google');
      expect(data.locations[0].sources).not.toContain('nominatim');
    });

    it('should assign low confidence when both geocoding services fail', async () => {
      mockExtractLocationsWithLLM.mockResolvedValue({
        locations: [
          {
            name: 'FakePlace123',
            description: 'Non-existent location',
            raw_mention: 'FakePlace123',
            llm_lat: 10,
            llm_lon: 20,
          },
        ],
        model_used: 'gemini-2.0-flash',
      });
      mockGeocodeWithGoogle.mockResolvedValue(null);
      mockGeocodeWithNominatim.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/extract-locations',
        {
          method: 'POST',
          body: JSON.stringify({ text: 'Visit FakePlace123' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(data.locations[0].confidence).toBe('low');
    });
  });

  // -- Multiple locations --

  describe('Multiple locations', () => {
    it('should extract and geocode multiple locations in parallel', async () => {
      mockExtractLocationsWithLLM.mockResolvedValue({
        locations: [
          {
            name: 'Paris',
            description: 'Capital of France',
            raw_mention: 'Paris',
          },
          {
            name: 'London',
            description: 'Capital of England',
            raw_mention: 'London',
          },
        ],
        model_used: 'gemini-2.0-flash',
      });
      // Google and Nominatim agree for both cities
      mockGeocodeWithGoogle
        .mockResolvedValueOnce({ lat: 48.8566, lon: 2.3522 })
        .mockResolvedValueOnce({ lat: 51.5074, lon: -0.1278 });
      mockGeocodeWithNominatim
        .mockResolvedValueOnce({ lat: 48.8567, lon: 2.3523 })
        .mockResolvedValueOnce({ lat: 51.5075, lon: -0.1277 });

      const request = new NextRequest(
        'http://localhost:3000/api/extract-locations',
        {
          method: 'POST',
          body: JSON.stringify({ text: 'Travel from Paris to London' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(data.locations).toHaveLength(2);
      expect(data.locations[0].confidence).toBe('high');
      expect(data.locations[1].confidence).toBe('high');
    });
  });

  // -- Deduplication --

  describe('Deduplication', () => {
    it('should merge duplicate locations by name (case-insensitive)', async () => {
      mockExtractLocationsWithLLM.mockResolvedValue({
        locations: [
          {
            name: 'Paris',
            description: 'Capital of France',
            raw_mention: 'Paris',
          },
          {
            name: 'paris',
            description: 'City of Lights',
            raw_mention: 'paris',
          },
        ],
        model_used: 'gemini-2.0-flash',
      });
      mockGeocodeWithGoogle.mockResolvedValue({ lat: 48.8566, lon: 2.3522 });
      mockGeocodeWithNominatim.mockResolvedValue({
        lat: 48.8567,
        lon: 2.3523,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/extract-locations',
        {
          method: 'POST',
          body: JSON.stringify({ text: 'Visit Paris, the beautiful paris' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(data.locations).toHaveLength(1);
      expect(data.locations[0].raw_mentions).toHaveLength(2);
    });
  });

  // -- Response format --

  describe('Response format', () => {
    it('should return correct response structure with model_used', async () => {
      mockExtractLocationsWithLLM.mockResolvedValue({
        locations: [
          {
            name: 'Rome',
            description: 'Capital of Italy',
            raw_mention: 'Rome',
          },
        ],
        model_used: 'gemini-2.0-flash',
      });
      mockGeocodeWithGoogle.mockResolvedValue({ lat: 41.9028, lon: 12.4964 });
      mockGeocodeWithNominatim.mockResolvedValue({
        lat: 41.9029,
        lon: 12.4965,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/extract-locations',
        {
          method: 'POST',
          body: JSON.stringify({ text: 'Visit Rome' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('locations');
      expect(data).toHaveProperty('input_length');
      expect(data).toHaveProperty('processing_time_ms');
      expect(data).toHaveProperty('model_used', 'gemini-2.0-flash');

      const loc = data.locations[0];
      expect(loc).toHaveProperty('name');
      expect(loc).toHaveProperty('description');
      expect(loc).toHaveProperty('latitude');
      expect(loc).toHaveProperty('longitude');
      expect(loc).toHaveProperty('confidence');
      expect(loc).toHaveProperty('sources');
      expect(loc).toHaveProperty('raw_mentions');
      expect(['high', 'medium', 'low']).toContain(loc.confidence);
      expect(typeof loc.latitude).toBe('number');
      expect(typeof loc.longitude).toBe('number');
    });

    it('should include processing time', async () => {
      mockExtractLocationsWithLLM.mockResolvedValue({
        locations: [],
        model_used: 'gemini-2.0-flash',
      });

      const request = new NextRequest(
        'http://localhost:3000/api/extract-locations',
        {
          method: 'POST',
          body: JSON.stringify({ text: 'no locations here' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(data.processing_time_ms).toBeGreaterThanOrEqual(0);
    });
  });
});
