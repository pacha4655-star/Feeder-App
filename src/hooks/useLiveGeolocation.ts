import { useState, useEffect, useRef, useCallback } from 'react';
import { resolveApiUrl } from '../utils/apiConfig';

export interface LiveGpsState {
  coords: { lat: number; lng: number } | null;
  accuracy: number | null; // in meters
  heading: number | null;
  speed: number | null;
  status: 'idle' | 'locating' | 'granted' | 'denied' | 'unavailable' | 'timeout' | 'unsupported';
  errorMessage: string | null;
  lastUpdated: Date | null;
  address: string | null;
}

export function useLiveGeolocation(autoStart: boolean = false) {
  const [gpsState, setGpsState] = useState<LiveGpsState>({
    coords: null,
    accuracy: null,
    heading: null,
    speed: null,
    status: 'idle',
    errorMessage: null,
    lastUpdated: null,
    address: null,
  });

  const watcherIdRef = useRef<number | null>(null);
  const isReverseGeocodingRef = useRef(false);
  const lastGeocodedCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  // Reverse geocodes coordinates to a human-readable location address
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (isReverseGeocodingRef.current) return;

    // Skip if within ~50 meters of last geocoded location
    if (lastGeocodedCoordsRef.current) {
      const dLat = Math.abs(lastGeocodedCoordsRef.current.lat - lat);
      const dLng = Math.abs(lastGeocodedCoordsRef.current.lng - lng);
      if (dLat < 0.0005 && dLng < 0.0005) return;
    }

    isReverseGeocodingRef.current = true;
    try {
      const targetUrl = resolveApiUrl(`/api/location/reverse-geocode?lat=${lat}&lng=${lng}`);
      const res = await fetch(targetUrl);
      if (res.ok) {
        const data = await res.json();
        lastGeocodedCoordsRef.current = { lat, lng };
        setGpsState(prev => ({
          ...prev,
          address: data.displayName || data.name || null,
        }));
      }
    } catch (e) {
      console.warn('[Live GPS] Reverse geocoding notice:', e);
    } finally {
      isReverseGeocodingRef.current = false;
    }
  }, []);

  const handlePositionSuccess = useCallback((pos: GeolocationPosition) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const accuracy = pos.coords.accuracy;
    const heading = pos.coords.heading;
    const speed = pos.coords.speed;

    setGpsState(prev => ({
      ...prev,
      coords: { lat, lng },
      accuracy,
      heading,
      speed,
      status: 'granted',
      errorMessage: null,
      lastUpdated: new Date(pos.timestamp),
    }));

    // Trigger reverse geocode
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  const handlePositionError = useCallback((err: GeolocationPositionError) => {
    let status: LiveGpsState['status'] = 'unavailable';
    let errorMessage = 'Unable to determine your GPS location.';

    switch (err.code) {
      case err.PERMISSION_DENIED:
        status = 'denied';
        errorMessage = 'Location permission was denied. Please enable location permissions in your browser or device settings to access live GPS features.';
        break;
      case err.POSITION_UNAVAILABLE:
        status = 'unavailable';
        errorMessage = 'GPS position is currently unavailable. Ensure your device location/GPS is turned on.';
        break;
      case err.TIMEOUT:
        status = 'timeout';
        errorMessage = 'Location request timed out. Please try again.';
        break;
    }

    setGpsState(prev => ({
      ...prev,
      status,
      errorMessage,
    }));
  }, []);

  // Starts watching live GPS position
  const startLiveTracking = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsState(prev => ({
        ...prev,
        status: 'unsupported',
        errorMessage: 'Geolocation is not supported by your browser.',
      }));
      return;
    }

    // Clear any existing watcher
    if (watcherIdRef.current !== null) {
      navigator.geolocation.clearWatch(watcherIdRef.current);
      watcherIdRef.current = null;
    }

    setGpsState(prev => ({ ...prev, status: 'locating', errorMessage: null }));

    const id = navigator.geolocation.watchPosition(
      handlePositionSuccess,
      handlePositionError,
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 3000,
      }
    );

    watcherIdRef.current = id;
  }, [handlePositionSuccess, handlePositionError]);

  // Stops watching live GPS position
  const stopLiveTracking = useCallback(() => {
    if (watcherIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watcherIdRef.current);
      watcherIdRef.current = null;
    }
  }, []);

  // Requests a single GPS snapshot
  const requestCurrentPosition = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsState(prev => ({
        ...prev,
        status: 'unsupported',
        errorMessage: 'Geolocation is not supported by your browser.',
      }));
      return;
    }

    setGpsState(prev => ({ ...prev, status: 'locating', errorMessage: null }));

    navigator.geolocation.getCurrentPosition(
      handlePositionSuccess,
      handlePositionError,
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  }, [handlePositionSuccess, handlePositionError]);

  useEffect(() => {
    if (autoStart) {
      startLiveTracking();
    }
    return () => {
      stopLiveTracking();
    };
  }, [autoStart, startLiveTracking, stopLiveTracking]);

  return {
    ...gpsState,
    startLiveTracking,
    stopLiveTracking,
    requestCurrentPosition,
  };
}
