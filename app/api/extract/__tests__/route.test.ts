/**
 * GeoText API - Comprehensive Test Suite
 * Tests all scenarios for location extraction endpoint
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn()
    }
  }))
}));

describe('/api/extract - Location Extraction API', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  describe('✅ Success Cases - Single Location', () => {
    it('should extract single famous landmark (Eiffel Tower)', async () => {
      const request = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: JSON.stringify({ text: 'Visit the Eiffel Tower in Paris' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.locations).toHaveLength(1);
      expect(data.locations[0]).toMatchObject({
        name: expect.stringMatching(/Eiffel Tower/i),
        confidence: expect.stringMatching(/high|medium/),
        coordinates: {
          lat: expect.any(Number),
          lon: expect.any(Number)
        }
      });
    });

    it('should extract single city (Tokyo)', async () => {
      const request = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: JSON.stringify({ text: 'I want to travel to Tokyo next summer' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.locations).toHaveLength(1);
      expect(data.locations[0].name).toMatch(/Tokyo/i);
      expect(data.locations[0].coordinates.lat).toBeCloseTo(35.6762, 1);
      expect(data.locations[0].coordinates.lon).toBeCloseTo(139.6503, 1);
    });

    it('should extract address (street level)', async () => {
      const request = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: JSON.stringify({ 
          text: 'Meet me at 1600 Pennsylvania Avenue NW, Washington, DC'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.locations).toHaveLength(1);
      expect(data.locations[0].name).toMatch(/Pennsylvania Avenue|White House/i);
    });
  });

  describe('✅ Success Cases - Multiple Locations', () => {
    it('should extract 2 locations from simple text', async () => {
      const request = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: JSON.stringify({ 
          text: 'Visit the Eiffel Tower in Paris and Big Ben in London'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.locations).toHaveLength(2);
      expect(data.locations.map((l: any) => l.name)).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/Eiffel Tower|Paris/i),
          expect.stringMatching(/Big Ben|London/i)
        ])
      );
    });

    it('should extract 5+ locations from travel itinerary', async () => {
      const request = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: JSON.stringify({ 
          text: `Day 1: Arrive in Rome and visit the Colosseum
Day 2: Take the train to Florence and see the Duomo
Day 3: Continue to Venice and explore St. Mark's Square
Day 4: Head to Milan for shopping
Day 5: Cross the border to Zurich, Switzerland`
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.locations.length).toBeGreaterThanOrEqual(5);
      
      const locationNames = data.locations.map((l: any) => l.name.toLowerCase());
      expect(locationNames.some((n: string) => n.includes('rome') || n.includes('colosseum'))).toBe(true);
      expect(locationNames.some((n: string) => n.includes('florence') || n.includes('duomo'))).toBe(true);
      expect(locationNames.some((n: string) => n.includes('venice'))).toBe(true);
      expect(locationNames.some((n: string) => n.includes('milan'))).toBe(true);
      expect(locationNames.some((n: string) => n.includes('zurich'))).toBe(true);
    });

    it('should handle mixed landmarks + cities', async () => {
      const request = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: JSON.stringify({ 
          text: 'See the Statue of Liberty, then fly to Los Angeles, visit Disneyland, and end in San Francisco at the Golden Gate Bridge'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.locations.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('✅ Success Cases - International & Multilingual', () => {
    it('should extract German city names', async () => {
      const request = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: JSON.stringify({ 
          text: 'Ich reise nach München, dann nach Berlin und schließlich nach Hamburg'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.locations.length).toBeGreaterThanOrEqual(3);
    });

    it('should extract Asian locations', async () => {
      const request = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: JSON.stringify({ 
          text: 'Trip to Bangkok, Seoul, and Shanghai'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.locations).toHaveLength(3);
    });

    it('should extract Middle Eastern locations', async () => {
      const request = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: JSON.stringify({ 
          text: 'Business trip: Dubai, Tel Aviv, and Istanbul'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.locations).toHaveLength(3);
    });
  });

  describe('✅ Edge Cases - No Locations', () => {
    it('should return empty array when no locations mentioned', async () => {
      const request = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: JSON.stringify({ 
          text: 'I love reading books and playing piano'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.locations).toEqual([]);
    });

    it('should handle empty text', async () => {
      const request = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: JSON.stringify({ text: '' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.locations).toEqual([]);
    });

    it('should handle whitespace-only text', async () => {
      const request = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: JSON.stringify({ text: '   \n\n   \t   ' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.locations).toEqual([]);
    });
  });

  describe('✅ Edge Cases - Ambiguous Locations', () => {
    it('should handle "Paris" (could be Paris, France or Paris, Texas)', async () => {
      const request = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: JSON.stringify({ text: 'Going to Paris next month' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.locations).toHaveLength(1);
      // Should default to Paris, France (more famous)
      expect(data.locations[0].coordinates.lat).toBeCloseTo(48.8566, 1);
    });

    it('should handle common city names (Springfield, Portland, etc.)', async () => {
      const request = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: JSON.stringify({ text: 'Visit Portland' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.locations).toHaveLength(1);
      // Should pick most well-known Portland (Oregon or Maine)
      expect(data.locations[0].confidence).toBe('medium');
    });
  });

  describe('✅ Edge Cases - Very Long Text', () => {
    it('should handle 1000+ word text with many locations', async () => {
      const longText = `
        ${'Lorem ipsum dolor sit amet. '.repeat(100)}
        Visit Paris, London, Berlin, Rome, Madrid, Barcelona, Vienna, Prague, Amsterdam, Brussels.
        ${'More filler text. '.repeat(100)}
        Then continue to Tokyo, Seoul, Beijing, Bangkok, Singapore, Mumbai, Dubai, Istanbul.
        ${'Even more text. '.repeat(100)}
      `;

      const request = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: JSON.stringify({ text: longText }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.locations.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('❌ Error Handling - Input Validation', () => {
    it('should return 400 if text field is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: JSON.stringify({ notText: 'invalid' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should return 400 if request body is invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: 'not json',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should return 400 if text is not a string', async () => {
      const request = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: JSON.stringify({ text: 12345 }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe('❌ Error Handling - Missing API Keys', () => {
    it('should return 500 if ANTHROPIC_API_KEY is missing', async () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      const request = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: JSON.stringify({ text: 'Visit Paris' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toMatch(/API key/i);

      // Restore
      process.env.ANTHROPIC_API_KEY = originalKey;
    });
  });

  describe('✅ Response Format Validation', () => {
    it('should return valid response structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: JSON.stringify({ text: 'Visit Paris' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('locations');
      expect(Array.isArray(data.locations)).toBe(true);
      
      if (data.locations.length > 0) {
        const location = data.locations[0];
        expect(location).toHaveProperty('name');
        expect(location).toHaveProperty('confidence');
        expect(location).toHaveProperty('coordinates');
        expect(location.coordinates).toHaveProperty('lat');
        expect(location.coordinates).toHaveProperty('lon');
        expect(['high', 'medium', 'low']).toContain(location.confidence);
        expect(typeof location.coordinates.lat).toBe('number');
        expect(typeof location.coordinates.lon).toBe('number');
      }
    });

    it('should set correct Content-Type header', async () => {
      const request = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: JSON.stringify({ text: 'Visit Paris' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);

      expect(response.headers.get('Content-Type')).toContain('application/json');
    });
  });

  describe('✅ Confidence Scoring', () => {
    it('should assign "high" confidence to famous landmarks', async () => {
      const request = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: JSON.stringify({ text: 'Visit the Eiffel Tower' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.locations[0].confidence).toBe('high');
    });

    it('should assign "medium" confidence to less specific locations', async () => {
      const request = new NextRequest('http://localhost:3000/api/extract', {
        method: 'POST',
        body: JSON.stringify({ text: 'Somewhere in Bavaria' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      if (data.locations.length > 0) {
        expect(['medium', 'low']).toContain(data.locations[0].confidence);
      }
    });
  });
});
