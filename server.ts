import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { backendRouter } from './src/server/routes';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Enable CORS for mobile apps, Capacitor WebView origins, and cross-origin clients
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Info');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Set COOP to same-origin-allow-popups for Firebase Google Auth popup compatibility
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

// Health check endpoints for cloud deployment platforms (Render, Railway, AWS, etc.)
app.get(['/health', '/api/health'], (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'feeder-backend',
    version: '1.0.0'
  });
});

// Enable JSON body parser with generous limit for media uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve Firebase Messaging Service Worker with root scope permission and no-cache
app.get('/firebase-messaging-sw.js', (_req, res) => {
  res.setHeader('Content-Type', 'text/javascript');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.resolve(process.cwd(), 'public', 'firebase-messaging-sw.js'));
});

// Mount authenticated Firebase -> Supabase backend bridge routes
app.use('/api', backendRouter);

import { handleChatMessage } from './src/server/aiChatService';

// Initialize server-side Gemini client with valid API key check
const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
const ai = geminiApiKey && geminiApiKey.length > 5
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Haversine distance formula (in km)
function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Built-in worldwide major cities reference cache (global coverage across all continents)
const WORLD_CITIES = [
  { name: 'London, UK', displayName: 'London, Greater London, England, United Kingdom', lat: 51.5074, lng: -0.1278 },
  { name: 'New York, NY', displayName: 'New York City, New York, United States', lat: 40.7128, lng: -74.0060 },
  { name: 'Tokyo, Japan', displayName: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Sydney, Australia', displayName: 'Sydney, New South Wales, Australia', lat: -33.8688, lng: 151.2093 },
  { name: 'Toronto, Canada', displayName: 'Toronto, Ontario, Canada', lat: 43.6532, lng: -79.3832 },
  { name: 'Paris, France', displayName: 'Paris, Île-de-France, France', lat: 48.8566, lng: 2.3522 },
  { name: 'Berlin, Germany', displayName: 'Berlin, Germany', lat: 52.5200, lng: 13.4050 },
  { name: 'São Paulo, Brazil', displayName: 'São Paulo, State of São Paulo, Brazil', lat: -23.5505, lng: -46.6333 },
  { name: 'Dubai, UAE', displayName: 'Dubai, United Arab Emirates', lat: 25.2048, lng: 55.2708 },
  { name: 'Singapore', displayName: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Mumbai, India', displayName: 'Mumbai, Maharashtra, India', lat: 19.0760, lng: 72.8777 },
  { name: 'Nairobi, Kenya', displayName: 'Nairobi, Kenya', lat: -1.2921, lng: 36.8219 },
  { name: 'Cairo, Egypt', displayName: 'Cairo, Egypt', lat: 30.0444, lng: 31.2357 },
  { name: 'Mexico City, Mexico', displayName: 'Mexico City, Mexico', lat: 19.4326, lng: -99.1332 },
  { name: 'Seoul, South Korea', displayName: 'Seoul, South Korea', lat: 37.5665, lng: 126.9780 },
  { name: 'San Francisco, CA', displayName: 'San Francisco, California, United States', lat: 37.7749, lng: -122.4194 },
];

// --- REAL-WORLD LOCATION SERVICES ---
app.get('/api/location/reverse-geocode', async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Valid lat and lng query params are required' });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const response = await fetch(nominatimUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'FeederAnimalCareApp/2.0 (global.animalcommunity.app)',
        'Accept-Language': 'en'
      }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data: any = await response.json();
      const addr = data.address || {};
      const neighborhood =
        addr.suburb ||
        addr.neighbourhood ||
        addr.residential ||
        addr.village ||
        addr.city_district ||
        addr.town ||
        addr.county;
      const city = addr.city || addr.town || addr.municipality || addr.state_district || addr.state;
      const country = addr.country || '';

      const name = neighborhood && city ? `${neighborhood}, ${city}` : city || neighborhood || country || 'Current Location';
      const displayName = data.display_name || `${name}, ${country}`;

      return res.json({
        name,
        displayName,
        lat,
        lng
      });
    }
  } catch (err) {
    // Network or timeout error fallback
  }

  const latLabel = lat >= 0 ? `${lat.toFixed(3)}° N` : `${Math.abs(lat).toFixed(3)}° S`;
  const lngLabel = lng >= 0 ? `${lng.toFixed(3)}° E` : `${Math.abs(lng).toFixed(3)}° W`;

  return res.json({
    name: `Location (${latLabel}, ${lngLabel})`,
    displayName: `GPS: ${latLabel}, ${lngLabel}`,
    lat,
    lng
  });
});

app.get('/api/location/geocode', async (req, res) => {
  const q = ((req.query.q as string) || '').trim();
  if (!q) {
    return res.json({ results: WORLD_CITIES.slice(0, 10) });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8&addressdetails=1`;
    const response = await fetch(nominatimUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'FeederAnimalCareApp/2.0 (global.animalcommunity.app)',
        'Accept-Language': 'en'
      }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data: any = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const results = data.map((item: any) => {
          const addr = item.address || {};
          const neighborhood = addr.suburb || addr.neighbourhood || addr.city_district || addr.residential;
          const city = addr.city || addr.town || addr.county || addr.state;
          const country = addr.country || '';

          const shortName = neighborhood && city
            ? `${neighborhood}, ${city}`
            : city
            ? `${city}${country ? `, ${country}` : ''}`
            : item.name || q;

          return {
            name: shortName,
            displayName: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          };
        });
        return res.json({ results });
      }
    }
  } catch (err) {
    // Timeout or network fallback
  }

  // Check cached world cities
  const matches = WORLD_CITIES.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    c.displayName.toLowerCase().includes(q.toLowerCase())
  );

  if (matches.length > 0) {
    return res.json({ results: matches });
  }

  // Never return fake or hardcoded coordinates for unrecognised queries
  return res.json({ results: [] });
});

import { fetchNearbyPetPlaces } from './src/server/placesService';

// --- REAL-WORLD LIVE PLACES API (OPENSTREETMAP OVERPASS) ---
app.get('/api/location/nearby-places', async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const category = (req.query.category as any) || 'all';
  const radiusKm = parseFloat(req.query.radiusKm as string) || 10;

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Valid lat and lng query params are required' });
  }

  try {
    const places = await fetchNearbyPetPlaces(lat, lng, radiusKm, category);
    return res.json({
      success: true,
      places,
      count: places.length,
      userLocation: { lat, lng },
      radiusKm,
    });
  } catch (err: any) {
    console.error('[API Nearby Places] Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch nearby places' });
  }
});

app.get('/api/location/veterinary', async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const emergencyOnly = req.query.emergencyOnly === 'true';
  const radiusKm = parseFloat(req.query.radiusKm as string) || 25;

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Valid lat and lng query params are required' });
  }

  try {
    const category = emergencyOnly ? 'hospital' : 'clinic';
    const places = await fetchNearbyPetPlaces(lat, lng, radiusKm, category);
    const filtered = emergencyOnly ? places.filter(p => p.isEmergency || p.type === 'hospital') : places;

    return res.json({
      hospitals: filtered,
      userLocation: { lat, lng },
      total: filtered.length,
    });
  } catch (err: any) {
    console.error('[API Veterinary] Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch veterinary hospitals' });
  }
});

// --- GLOBAL MULTILINGUAL AI CHATBOT (PAWSY AI) ---
app.post('/api/chat', async (req, res) => {
  const { message, history, context } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message string is required' });
  }

  try {
    const chatResult = await handleChatMessage(message, history, context, ai);
    return res.json(chatResult);
  } catch (err: any) {
    console.error('[Chat Endpoint] Error:', err);
    return res.status(500).json({
      error: 'Sorry, I could not process that right now. Please try again.',
      reply: 'Sorry, I had a momentary communication issue. Please try your message again, or check the Nearby Map / Urgent Help section.',
      suggestions: ['🚨 Urgent Help', '🩺 Nearby Vets'],
      actions: []
    });
  }
});

// --- VITE MIDDLEWARE / PRODUCTION STATIC ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: `API endpoint '${req.path}' not found` });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Feeder Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
