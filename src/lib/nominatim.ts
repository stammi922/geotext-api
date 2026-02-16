export interface GeocodingResult {
  lat: number;
  lon: number;
}

/**
 * Geocode a location using Nominatim (OpenStreetMap) - free, no API key required.
 * Respects Nominatim usage policy with User-Agent header.
 */
export async function geocodeWithNominatim(
  query: string
): Promise<GeocodingResult | null> {
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

/**
 * Geocode a location using Google Maps Geocoding API.
 * Requires GOOGLE_MAPS_API_KEY environment variable.
 */
export async function geocodeWithGoogle(
  query: string
): Promise<GeocodingResult | null> {
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
