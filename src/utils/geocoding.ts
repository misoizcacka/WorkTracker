// frontend/src/utils/geocoding.ts

import { Platform } from 'react-native';

const GEOAPIFY_API_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_KEY;

// TypeScript types for Geoapify Autocomplete API response
export interface GeoapifyFeatureProperties {
  name: string;
  formatted: string;
  country: string;
  city: string;
  postcode: string;
  street: string;
  housenumber: string;
  lon: number;
  lat: number;
  // Add other properties as needed
}

export interface GeoapifyFeature {
  type: 'Feature';
  properties: GeoapifyFeatureProperties;
  // Add other properties as needed
}

export interface GeoapifyAutocompleteResponse {
  type: 'FeatureCollection';
  features: GeoapifyFeature[];
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: number | undefined;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

// Geoapify API wrapper
export async function fetchGeoapifySuggestions(
  text: string,
  lang: string = 'en',
  limit: number = 10
): Promise<GeoapifyAutocompleteResponse | { error: string }> {
  if (!GEOAPIFY_API_KEY) {
    console.error('Geoapify API key is not set.');
    return { error: 'Geoapify API key is not set.' };
  }

  if (!text) {
    return { type: 'FeatureCollection', features: [] } as GeoapifyAutocompleteResponse; // Return empty for empty text
  }

  const baseUrl = 'https://api.geoapify.com/v1/geocode/autocomplete';
  const params = new URLSearchParams({
    text,
    apiKey: GEOAPIFY_API_KEY as string,
    limit: limit.toString(),
    lang,
  });

  try {
    const response = await fetch(`${baseUrl}?${params.toString()}`);
    if (!response.ok) {
      if (response.status === 429) {
        return { error: 'Rate limit exceeded. Please try again later.' };
      }
      const errorData = await response.json();
      return { error: errorData.message || `API error: ${response.statusText}` };
    }
    const data: GeoapifyAutocompleteResponse = await response.json();
    return data;
  } catch (err) {
    console.error('Network or parsing error:', err);
    return { error: 'Network or parsing error.' };
  }
}
