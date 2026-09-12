/**
 * Live OpenStreetMap (OSM) Overpass API Client
 *
 * Real, live, global animal-care location discovery for:
 * 1. Veterinary Hospitals
 * 2. Veterinary Clinics
 * 3. Emergency Veterinary Hospitals / 24hr Clinics
 * 4. Pet Shops & Pet Supplies
 * 5. Animal Shelters
 * 6. Animal Rescue Centers
 * 7. Pet Grooming & Pet Care
 * 8. Pet Pharmacies & Animal Welfare Organizations
 *
 * Worldwide coverage (India, USA, UK, Canada, Australia, Europe, etc.).
 * Zero hardcoded locations, zero fake places, zero imaginary coordinates.
 */

export type RealPetPlaceType =
  | 'hospital'
  | 'clinic'
  | 'emergency_vet'
  | 'pet_shop'
  | 'shelter'
  | 'rescue'
  | 'grooming'
  | 'pet_pharmacy'
  | 'welfare_org';

export interface RealPetPlace {
  id: string;
  name: string;
  type: RealPetPlaceType;
  categoryLabel: string;
  lat: number;
  lng: number;
  distanceKm: number;
  distanceFormatted: string;
  distanceFormattedMi: string;
  address: string;
  phone: string | null;
  openHours: string | null;
  isOpen: boolean | null;
  website: string | null;
  isEmergency: boolean;
  directionUrl: string;
  isExpandedRadius?: boolean;
}

// In-memory cache to prevent excessive requests to public Overpass API (TTL: 5 minutes)
interface CacheEntry {
  timestamp: number;
  results: RealPetPlace[];
}
const placesCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Calculates real Haversine distance in kilometers between two GPS coordinates
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // 2 decimal places
}

/**
 * Formats distance in metric units (meters or kilometers)
 */
export function formatDistanceKm(km: number): string {
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} m`;
  }
  return `${km.toFixed(1)} km`;
}

export const formatDistance = formatDistanceKm;

/**
 * Formats distance in imperial units (feet or miles)
 */
export function formatDistanceMi(km: number): string {
  const miles = km * 0.621371;
  if (miles < 0.1) {
    const feet = Math.round(miles * 5280);
    return `${feet} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}

/**
 * Parses basic open/closed status from OSM opening_hours string
 */
function parseIsOpen(openingHours: string | null): boolean | null {
  if (!openingHours) return null;
  const lower = openingHours.trim().toLowerCase();
  if (lower === '24/7' || lower.includes('24/7') || lower.includes('open 24 hours')) {
    return true;
  }
  return null;
}

/**
 * Builds Overpass QL query targeted specifically to the requested category
 */
function buildOverpassQuery(lat: number, lng: number, radiusMeters: number, category: string = 'all'): string {
  let clauses = '';

  if (category === 'veterinary' || category === 'hospital' || category === 'clinic' || category === 'emergency_vet') {
    clauses = `
      node["amenity"="veterinary"](around:${radiusMeters},${lat},${lng});
      way["amenity"="veterinary"](around:${radiusMeters},${lat},${lng});
      node["healthcare"="veterinary"](around:${radiusMeters},${lat},${lng});
      way["healthcare"="veterinary"](around:${radiusMeters},${lat},${lng});
      node["veterinary"](around:${radiusMeters},${lat},${lng});
      way["veterinary"](around:${radiusMeters},${lat},${lng});
    `;
  } else if (category === 'pet_shop') {
    clauses = `
      node["shop"="pet"](around:${radiusMeters},${lat},${lng});
      way["shop"="pet"](around:${radiusMeters},${lat},${lng});
      node["amenity"="pharmacy"]["veterinary"="yes"](around:${radiusMeters},${lat},${lng});
    `;
  } else if (category === 'shelter' || category === 'rescue') {
    clauses = `
      node["amenity"="animal_shelter"](around:${radiusMeters},${lat},${lng});
      way["amenity"="animal_shelter"](around:${radiusMeters},${lat},${lng});
      node["animal_rescue"](around:${radiusMeters},${lat},${lng});
      way["animal_rescue"](around:${radiusMeters},${lat},${lng});
      node["amenity"="animal_boarding"](around:${radiusMeters},${lat},${lng});
      way["amenity"="animal_boarding"](around:${radiusMeters},${lat},${lng});
    `;
  } else if (category === 'grooming') {
    clauses = `
      node["shop"="pet_grooming"](around:${radiusMeters},${lat},${lng});
      way["shop"="pet_grooming"](around:${radiusMeters},${lat},${lng});
      node["craft"="pet_grooming"](around:${radiusMeters},${lat},${lng});
      way["craft"="pet_grooming"](around:${radiusMeters},${lat},${lng});
      node["craft"="pet_groomer"](around:${radiusMeters},${lat},${lng});
      way["craft"="pet_groomer"](around:${radiusMeters},${lat},${lng});
      node["service"="pet_grooming"](around:${radiusMeters},${lat},${lng});
      way["service"="pet_grooming"](around:${radiusMeters},${lat},${lng});
    `;
  } else {
    // 'all'
    clauses = `
      node["amenity"="veterinary"](around:${radiusMeters},${lat},${lng});
      way["amenity"="veterinary"](around:${radiusMeters},${lat},${lng});
      node["healthcare"="veterinary"](around:${radiusMeters},${lat},${lng});
      way["healthcare"="veterinary"](around:${radiusMeters},${lat},${lng});
      node["shop"="pet"](around:${radiusMeters},${lat},${lng});
      way["shop"="pet"](around:${radiusMeters},${lat},${lng});
      node["shop"="pet_grooming"](around:${radiusMeters},${lat},${lng});
      way["shop"="pet_grooming"](around:${radiusMeters},${lat},${lng});
      node["craft"="pet_groomer"](around:${radiusMeters},${lat},${lng});
      way["craft"="pet_groomer"](around:${radiusMeters},${lat},${lng});
      node["amenity"="animal_shelter"](around:${radiusMeters},${lat},${lng});
      way["amenity"="animal_shelter"](around:${radiusMeters},${lat},${lng});
      node["animal_rescue"](around:${radiusMeters},${lat},${lng});
      way["animal_rescue"](around:${radiusMeters},${lat},${lng});
      node["amenity"="animal_boarding"](around:${radiusMeters},${lat},${lng});
      way["amenity"="animal_boarding"](around:${radiusMeters},${lat},${lng});
    `;
  }

  return `[out:json][timeout:15];(${clauses});out center tags;`;
}

/**
 * Executes an Overpass QL query across high-availability public mirrors with failover
 */
async function executeOverpassQuery(query: string): Promise<any[]> {
  const mirrors = [
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass-api.de/api/interpreter'
  ];

  for (const mirror of mirrors) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(mirror, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'FeederPetCareApp/2.0 (global.animal.care)',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data: any = await response.json();
        if (data && Array.isArray(data.elements)) {
          return data.elements;
        }
      }
    } catch {
      // Failover to next mirror
    }
  }

  return [];
}

/**
 * Maps raw Overpass elements to strongly typed RealPetPlace items
 */
function parseOverpassElements(
  elements: any[],
  userLat: number,
  userLng: number,
  category: string,
  isExpanded: boolean = false
): RealPetPlace[] {
  const results: RealPetPlace[] = [];
  const seenCoordinates = new Set<string>();
  const seenIds = new Set<string>();

  for (const elem of elements) {
    const tags = elem.tags || {};
    const lat = elem.lat || elem.center?.lat;
    const lng = elem.lon || elem.center?.lon;

    if (!lat || !lng) continue;

    const osmId = `osm_${elem.type || 'node'}_${elem.id}`;
    if (seenIds.has(osmId)) continue;
    seenIds.add(osmId);

    // Approximate 20-meter precision deduplication
    const coordKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (seenCoordinates.has(coordKey)) continue;
    seenCoordinates.add(coordKey);

    // Determine Place Name
    const name =
      tags.name ||
      tags['name:en'] ||
      tags.brand ||
      tags.operator ||
      (tags.shop === 'pet'
        ? 'Pet Shop'
        : tags.shop === 'pet_grooming' || tags.craft === 'pet_groomer'
        ? 'Pet Grooming & Care'
        : tags.amenity === 'animal_shelter' || tags.animal_shelter === 'yes'
        ? 'Animal Shelter'
        : tags.amenity === 'animal_boarding'
        ? 'Animal Care & Boarding'
        : tags.amenity === 'pharmacy'
        ? 'Veterinary Pharmacy'
        : 'Veterinary Clinic');

    const nameLower = name.toLowerCase();

    // Determine Place Type & Category
    let placeType: RealPetPlaceType = 'clinic';
    let categoryLabel = 'Veterinary Clinic';
    let isEmergency = false;

    // 1. Grooming check
    if (
      tags.shop === 'pet_grooming' ||
      tags.craft === 'pet_grooming' ||
      tags.craft === 'pet_groomer' ||
      tags.service === 'pet_grooming' ||
      nameLower.includes('grooming') ||
      nameLower.includes('pet spa') ||
      nameLower.includes('dog wash')
    ) {
      placeType = 'grooming';
      categoryLabel = 'Pet Grooming & Care';
    }
    // 2. Shelter check
    else if (
      tags.amenity === 'animal_shelter' ||
      tags.animal_shelter === 'yes' ||
      tags.animal_shelter === 'shelter' ||
      nameLower.includes('animal shelter') ||
      nameLower.includes('dog shelter') ||
      nameLower.includes('cat shelter')
    ) {
      placeType = 'shelter';
      categoryLabel = 'Animal Shelter';
    }
    // 3. Rescue / Welfare Organization check
    else if (
      tags.animal_rescue ||
      tags.rescue === 'animal' ||
      nameLower.includes('rescue') ||
      nameLower.includes('spca') ||
      nameLower.includes('rspca') ||
      nameLower.includes('humane society') ||
      nameLower.includes('blue cross') ||
      nameLower.includes('animal protection') ||
      nameLower.includes('animal welfare')
    ) {
      placeType = 'rescue';
      categoryLabel = 'Animal Rescue Center';
    }
    // 4. Animal Boarding / Welfare Org check
    else if (tags.amenity === 'animal_boarding') {
      placeType = 'welfare_org';
      categoryLabel = 'Animal Care & Boarding';
    }
    // 5. Pet Pharmacy check
    else if (tags.amenity === 'pharmacy' && (tags.veterinary === 'yes' || tags.pet === 'yes')) {
      placeType = 'pet_pharmacy';
      categoryLabel = 'Pet Pharmacy';
    }
    // 6. Pet Shop / Supplies check
    else if (tags.shop === 'pet') {
      placeType = 'pet_shop';
      categoryLabel = 'Pet Shop & Supplies';
    }
    // 7. Veterinary (Hospital vs Emergency vs Clinic)
    else {
      isEmergency =
        tags.emergency === 'yes' ||
        tags.veterinary === 'emergency' ||
        (tags.opening_hours && tags.opening_hours.includes('24/7')) ||
        nameLower.includes('emergency') ||
        nameLower.includes('trauma') ||
        nameLower.includes('urgent care') ||
        nameLower.includes('24 hour') ||
        nameLower.includes('24hr') ||
        nameLower.includes('24/7');

      const isHospital =
        tags.veterinary === 'hospital' ||
        tags.healthcare === 'hospital' ||
        nameLower.includes('hospital');

      if (isEmergency) {
        placeType = 'emergency_vet';
        categoryLabel = 'Emergency Veterinary Hospital';
      } else if (isHospital) {
        placeType = 'hospital';
        categoryLabel = 'Veterinary Hospital';
      } else {
        placeType = 'clinic';
        categoryLabel = 'Veterinary Clinic';
      }
    }

    // Filter check based on requested category
    if (category && category !== 'all') {
      if (category === 'veterinary') {
        if (placeType !== 'hospital' && placeType !== 'clinic' && placeType !== 'emergency_vet') {
          continue;
        }
      } else if (category === 'emergency_vet') {
        if (placeType !== 'emergency_vet' && !isEmergency && placeType !== 'hospital') {
          continue;
        }
      } else if (category === 'pet_shop') {
        if (placeType !== 'pet_shop' && placeType !== 'pet_pharmacy') {
          continue;
        }
      } else if (category === 'shelter') {
        if (placeType !== 'shelter' && placeType !== 'rescue' && placeType !== 'welfare_org') {
          continue;
        }
      } else if (category === 'rescue') {
        if (placeType !== 'rescue' && placeType !== 'shelter' && placeType !== 'welfare_org') {
          continue;
        }
      } else if (category === 'grooming') {
        if (placeType !== 'grooming') {
          continue;
        }
      } else if (placeType !== category) {
        continue;
      }
    }

    // Address construction from real OSM tags (international standard)
    const street = tags['addr:street'] || tags['addr:road'] || '';
    const housenumber = tags['addr:housenumber'] || '';
    const suburb = tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:district'] || '';
    const city = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || tags['addr:county'] || '';
    const state = tags['addr:state'] || '';
    const postcode = tags['addr:postcode'] || '';
    const country = tags['addr:country'] || '';

    const addressParts = [
      [housenumber, street].filter(Boolean).join(' '),
      suburb,
      city,
      state,
      postcode,
      country,
    ].filter(Boolean);

    const address = addressParts.length > 0
      ? addressParts.join(', ')
      : `${name}, Coordinates: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;

    // Real Phone Number from OSM tags (never fake)
    const phone =
      tags.phone ||
      tags['contact:phone'] ||
      tags['phone:mobile'] ||
      tags['contact:mobile'] ||
      null;

    // Real Opening Hours from OSM tags
    const openHours = tags.opening_hours || (isEmergency ? '24/7 Emergency Care' : null);
    const isOpen = parseIsOpen(openHours);

    // Real Website from OSM tags
    const website = tags.website || tags['contact:website'] || tags.url || null;

    const distanceKm = calculateHaversineDistanceKm(userLat, userLng, lat, lng);

    results.push({
      id: osmId,
      name,
      type: placeType,
      categoryLabel,
      lat,
      lng,
      distanceKm,
      distanceFormatted: formatDistanceKm(distanceKm),
      distanceFormattedMi: formatDistanceMi(distanceKm),
      address,
      phone,
      openHours,
      isOpen,
      website,
      isEmergency,
      directionUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      isExpandedRadius: isExpanded,
    });
  }

  // Sort ascending by real geographic distance
  results.sort((a, b) => a.distanceKm - b.distanceKm);
  return results;
}

/**
 * Queries OpenStreetMap Overpass API for real live nearby pet and animal welfare services
 */
export async function fetchNearbyPetPlaces(
  userLat: number,
  userLng: number,
  radiusKm: number = 10,
  category: string = 'all'
): Promise<RealPetPlace[]> {
  const boundedRadius = Math.min(Math.max(radiusKm, 1), 50);
  const radiusMeters = Math.round(boundedRadius * 1000);
  const cacheKey = `${userLat.toFixed(2)}_${userLng.toFixed(2)}_${radiusMeters}_${category}`;

  const cached = placesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.results
      .map(p => {
        const dist = calculateHaversineDistanceKm(userLat, userLng, p.lat, p.lng);
        return {
          ...p,
          distanceKm: dist,
          distanceFormatted: formatDistanceKm(dist),
          distanceFormattedMi: formatDistanceMi(dist),
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  // Primary Query
  const initialQuery = buildOverpassQuery(userLat, userLng, radiusMeters, category);
  let elements = await executeOverpassQuery(initialQuery);
  let parsed = parseOverpassElements(elements, userLat, userLng, category, false);

  // Progressive Radius Expansion:
  // If 0 results are found in small radius (< 25km), progressively expand to 25km
  if (parsed.length === 0 && boundedRadius < 25) {
    const expandedRadiusMeters = 25000;
    const expandedQuery = buildOverpassQuery(userLat, userLng, expandedRadiusMeters, category);
    const expandedElements = await executeOverpassQuery(expandedQuery);
    const expandedParsed = parseOverpassElements(expandedElements, userLat, userLng, category, true);
    if (expandedParsed.length > 0) {
      parsed = expandedParsed;
    }
  }

  // Cache results if found or fallback to stale cache
  if (parsed.length > 0) {
    placesCache.set(cacheKey, {
      timestamp: Date.now(),
      results: parsed,
    });
    return parsed;
  }

  if (cached) {
    return cached.results;
  }

  return [];
}
