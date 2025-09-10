import { useEffect, useState } from 'react';

interface IpApiResponse {
  country_code?: string;
  country_calling_code?: string;
  country?: string;
  country_name?: string;
}

/**
 * Custom hook that fetches the visitor's geolocation information from ipapi.co
 * and exposes useful fields (e.g. ISO-2 country code).
 */
export function useGeoLocation() {
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [callingCode, setCallingCode] = useState<string | null>(null);

  useEffect(() => {
    // Only run in the browser – defensive check just in case
    if (typeof window === 'undefined') return;

    const fetchGeo = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) throw new Error(`Failed to fetch geo info – ${response.status}`);
        const data: IpApiResponse = await response.json();
        if (data.country_code) setCountryCode(data.country_code.toUpperCase());
        if (data.country_calling_code) setCallingCode(data.country_calling_code);
      } catch (err) {
        // Silently fail – we will just fall back to defaults
        console.error('[useGeoLocation] Error fetching geo info', err);
      }
    };

    fetchGeo();
  }, []);

  return { countryCode, callingCode };
} 