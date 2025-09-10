/**
 * Calculate the distance between two points on Earth using the Haversine formula
 * @param lat1 Latitude of the first point
 * @param lon1 Longitude of the first point
 * @param lat2 Latitude of the second point
 * @param lon2 Longitude of the second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Earth radius in kilometers
  const R = 6371;
  
  // Convert latitude and longitude from degrees to radians
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  // Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  
  return distance;
}

/**
 * Convert degrees to radians
 * @param deg Value in degrees
 * @returns Value in radians
 */
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Get the bounding box coordinates around a point with a specified radius
 * @param latitude Latitude of the center point
 * @param longitude Longitude of the center point
 * @param radiusKm Radius in kilometers
 * @returns Bounding box coordinates: [minLat, minLng, maxLat, maxLng]
 */
export function getBoundingBox(
  latitude: number,
  longitude: number,
  radiusKm: number
): [number, number, number, number] {
  // Earth's radius in kilometers
  const R = 6371;
  
  // Convert latitude and longitude from degrees to radians
  const lat = deg2rad(latitude);
  const lon = deg2rad(longitude);
  
  // Angular distance in radians on a great circle
  const angularDistance = radiusKm / R;
  
  // Minimum and maximum latitudes
  const minLat = lat - angularDistance;
  const maxLat = lat + angularDistance;
  
  // Delta longitude
  const deltaLon = Math.asin(Math.sin(angularDistance) / Math.cos(lat));
  
  // Minimum and maximum longitudes
  const minLon = lon - deltaLon;
  const maxLon = lon + deltaLon;
  
  // Convert back to degrees
  return [
    rad2deg(minLat),
    rad2deg(minLon),
    rad2deg(maxLat),
    rad2deg(maxLon)
  ];
}

/**
 * Convert radians to degrees
 * @param rad Value in radians
 * @returns Value in degrees
 */
function rad2deg(rad: number): number {
  return rad * (180 / Math.PI);
}