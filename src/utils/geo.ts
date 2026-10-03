import { GeoCoordinates } from '../types/bus';

// Known GPS Coordinates for College Bus Stops
export const KNOWN_STOP_COORDINATES: Record<string, GeoCoordinates> = {
  'stop-tbm-1': { lat: 12.9248, lng: 80.1281 }, // Tambaram West
  'stop-tbm-2': { lat: 12.9372, lng: 80.1384 }, // Tambaram Sanatorium (MEPZ)
  'stop-chr-1': { lat: 12.9516, lng: 80.1415 }, // Chromepet (MIT Gate)
  'stop-pal-1': { lat: 12.9675, lng: 80.1492 }, // Pallavaram (Railway Station)
  'stop-tbm-3': { lat: 12.9210, lng: 80.1420 }, // Tambaram East (Camp Road)
  'stop-sel-1': { lat: 12.9150, lng: 80.1550 }, // Selaiyur
  'stop-med-1': { lat: 12.9180, lng: 80.1920 }, // Medavakkam Junction
  'stop-per-1': { lat: 12.9050, lng: 80.2080 }, // Perumbakkam
  'stop-vel-1': { lat: 12.9790, lng: 80.2180 }, // Velachery (Vijayanagar)
  'stop-vel-2': { lat: 12.9680, lng: 80.2120 }, // Kaiveli
  'stop-sho-1': { lat: 12.8980, lng: 80.2280 }, // Sholinganallur
  'stop-sai-1': { lat: 13.0210, lng: 80.2220 }, // Saidapet
  'stop-gui-1': { lat: 13.0070, lng: 80.2030 }, // Guindy
  'stop-kat-1': { lat: 12.9990, lng: 80.1960 }, // Kathipara
  'stop-vad-1': { lat: 13.0520, lng: 80.2120 }, // Vadapalani
  'stop-por-1': { lat: 13.0330, lng: 80.1580 }, // Porur
  'stop-thi-1': { lat: 13.0850, lng: 80.1980 }, // Thirumangalam
  'stop-mog-1': { lat: 13.0820, lng: 80.1770 }, // Mogappair
  'stop-amb-1': { lat: 13.1140, lng: 80.1550 }, // Ambattur
  'stop-poo-1': { lat: 13.0480, lng: 80.0980 }, // Poonamallee
  'stop-cam-1': { lat: 12.8231, lng: 80.0442 }, // Engineering College Main Gate
};

/**
 * Calculates the great-circle distance between two points on the earth
 * using the Haversine formula.
 * @returns distance in meters
 */
export function haversineDistanceMeters(
  coord1: GeoCoordinates,
  coord2: GeoCoordinates
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (coord1.lat * Math.PI) / 180;
  const phi2 = (coord2.lat * Math.PI) / 180;
  const deltaPhi = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const deltaLambda = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Returns the GPS coordinates for a given stop id, falling back to a deterministic offset
 */
export function getStopCoordinates(stopId: string): GeoCoordinates {
  if (KNOWN_STOP_COORDINATES[stopId]) {
    return KNOWN_STOP_COORDINATES[stopId];
  }
  // Default fallback near Chennai campus corridor
  return { lat: 12.9248, lng: 80.1281 };
}

/**
 * Calculates simulated coordinates at an exact distance (in meters) approaching a target coordinate.
 */
export function offsetCoordinatesByDistance(
  target: GeoCoordinates,
  distanceMeters: number,
  bearingDegrees: number = 210 // approach bearing heading toward campus
): GeoCoordinates {
  const R = 6371e3;
  const brng = (bearingDegrees * Math.PI) / 180;
  const lat1 = (target.lat * Math.PI) / 180;
  const lon1 = (target.lng * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceMeters / R) +
      Math.cos(lat1) * Math.sin(distanceMeters / R) * Math.cos(brng)
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(distanceMeters / R) * Math.cos(lat1),
      Math.cos(distanceMeters / R) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    lat: Number(((lat2 * 180) / Math.PI).toFixed(6)),
    lng: Number(((lon2 * 180) / Math.PI).toFixed(6)),
  };
}
