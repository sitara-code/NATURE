/**
 * Geospatial utilities for Zoo Sentinel
 * Implements Haversine distance, Ray-Casting Point-in-Polygon geofence testing,
 * centroid calculations, and hazard radius polygons.
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Calculates great-circle distance between two points in kilometers.
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return haversineDistanceKm(lat1, lon1, lat2, lon2) * 1000;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Point-in-Polygon (Ray-Casting Algorithm).
 * Tests if coordinate [lat, lng] is inside a polygon [[lat, lng], ...].
 */
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  if (!polygon || polygon.length < 3) {
    return false;
  }

  const [lat, lng] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Generates an N-sided polygon approximating a circle around a center point with radius in kilometers.
 */
export function createCirclePolygon(centerLat: number, centerLng: number, radiusKm: number, points = 32): [number, number][] {
  const coordinates: [number, number][] = [];
  const radiusRatio = radiusKm / EARTH_RADIUS_KM;

  const centerLatRad = toRad(centerLat);
  const centerLngRad = toRad(centerLng);

  for (let i = 0; i < points; i++) {
    const angle = (i * 2 * Math.PI) / points;
    const pointLatRad = Math.asin(
      Math.sin(centerLatRad) * Math.cos(radiusRatio) +
        Math.cos(centerLatRad) * Math.sin(radiusRatio) * Math.cos(angle)
    );
    const pointLngRad =
      centerLngRad +
      Math.atan2(
        Math.sin(angle) * Math.sin(radiusRatio) * Math.cos(centerLatRad),
        Math.cos(radiusRatio) - Math.sin(centerLatRad) * Math.sin(pointLatRad)
      );

    const lat = (pointLatRad * 180) / Math.PI;
    const lng = (pointLngRad * 180) / Math.PI;
    coordinates.push([Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
  }

  return coordinates;
}

/**
 * Helper to build a regular rectangular or polygonal geofence around a center coordinate given radius in meters.
 */
export function createGeofenceBox(centerLat: number, centerLng: number, radiusMeters: number): [number, number][] {
  const radiusKm = radiusMeters / 1000;
  // Box offset approx (1 deg lat = 111km)
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.cos(toRad(centerLat)));

  return [
    [Number((centerLat + dLat).toFixed(6)), Number((centerLng - dLng).toFixed(6))],
    [Number((centerLat + dLat).toFixed(6)), Number((centerLng + dLng).toFixed(6))],
    [Number((centerLat - dLat).toFixed(6)), Number((centerLng + dLng).toFixed(6))],
    [Number((centerLat - dLat).toFixed(6)), Number((centerLng - dLng).toFixed(6))],
  ];
}

/**
 * Calculates centroid of an array of points.
 */
export function calculateCentroid(points: Array<{ latitude: number; longitude: number }>): {
  latitude: number;
  longitude: number;
} {
  if (points.length === 0) {
    return { latitude: 0, longitude: 0 };
  }

  let sumLat = 0;
  let sumLng = 0;
  for (const pt of points) {
    sumLat += pt.latitude;
    sumLng += pt.longitude;
  }

  return {
    latitude: Number((sumLat / points.length).toFixed(6)),
    longitude: Number((sumLng / points.length).toFixed(6)),
  };
}
