import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  Phone,
  Search,
  ChevronRight,
  X,
  Loader2,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  Clock,
  Globe,
  Copy,
  Check,
  List,
  Map as MapIcon,
  SlidersHorizontal,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLiveGeolocation } from '../hooks/useLiveGeolocation';
import { LiveOpenStreetMap, MapMarkerItem } from './LiveOpenStreetMap';
import { PetEmergencyModal } from './PetEmergencyModal';
import { RealPetPlace } from '../server/placesService';
import { api } from '../services/api';

type FilterCategory = 'all' | 'veterinary' | 'pet_shop' | 'shelter' | 'grooming';

export const NearbyMapView: React.FC = () => {
  const {
    nearbyMarkers,
    selectedLocation,
    setSelectedLocation,
    userCoords: contextCoords,
    setUserCustomLocation,
    nearbyRadiusKm,
    setNearbyRadiusKm,
  } = useApp();

  const {
    coords: gpsCoords,
    accuracy,
    address: gpsAddress,
    status: gpsStatus,
    errorMessage: gpsError,
    lastUpdated,
    startLiveTracking,
    requestCurrentPosition,
  } = useLiveGeolocation(true);

  // Manual search / active coordinates state
  const [manualCoords, setManualCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [manualAddress, setManualAddress] = useState<string | null>(null);

  // Effective coordinates: manual search location overrides device GPS if user explicitly searched
  const activeCoords = manualCoords || gpsCoords || contextCoords;

  // Category filter state
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');

  // Mobile view toggle between Map and List
  const [mobileViewMode, setMobileViewMode] = useState<'map' | 'list'>('map');

  // Distance unit: km or mi
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'mi'>(() => {
    if (typeof navigator !== 'undefined' && navigator.language) {
      const lang = navigator.language.toLowerCase();
      if (lang.includes('us') || lang.includes('gb')) return 'mi';
    }
    return 'km';
  });

  // Places data state
  const [realPlaces, setRealPlaces] = useState<RealPetPlace[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'name'>('distance');

  // Global search input & suggestions state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ name: string; displayName: string; lat: number; lng: number }[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced geocoding search for any city/location in the world
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const res = await api.geocode(searchQuery.trim());
        setSearchResults(res.results || []);
        setShowSearchDropdown(true);
      } catch (err) {
        console.warn('[Nearby Map] Geocoding error:', err);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle selecting a global location from search
  const handleSelectSearchResult = (item: { name: string; displayName: string; lat: number; lng: number }) => {
    // 1. Clear old places immediately to avoid mixing
    setRealPlaces([]);
    setSelectedPlaceId(null);
    setPlacesError(null);

    // 2. Set new coords
    setManualCoords({ lat: item.lat, lng: item.lng });
    setManualAddress(item.name);
    setSelectedLocation(item.name);
    setUserCustomLocation(item.name, { lat: item.lat, lng: item.lng });
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  // Reset to device GPS
  const handleResetToDeviceGps = () => {
    setRealPlaces([]);
    setSelectedPlaceId(null);
    setManualCoords(null);
    setManualAddress(null);
    setPlacesError(null);
    requestCurrentPosition();
    startLiveTracking();
  };

  // Fetch real nearby places from backend OpenStreetMap Overpass service
  const fetchPlaces = useCallback(async () => {
    if (!activeCoords) return;

    setIsLoadingPlaces(true);
    setPlacesError(null);
    try {
      const radius = nearbyRadiusKm === 999 ? 25 : nearbyRadiusKm;
      const data = await api.getNearbyPlaces({
        lat: activeCoords.lat,
        lng: activeCoords.lng,
        radiusKm: radius,
        category: activeCategory,
      });

      if (data && Array.isArray(data.places)) {
        setRealPlaces(data.places);
      } else {
        setRealPlaces([]);
      }
    } catch (err: any) {
      console.warn('[Nearby Map] Error fetching live places:', err);
      setPlacesError('Unable to load nearby places right now. Please try again.');
    } finally {
      setIsLoadingPlaces(false);
    }
  }, [activeCoords, activeCategory, nearbyRadiusKm]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  // Sync address with context
  useEffect(() => {
    if (gpsAddress && !manualAddress && selectedLocation === 'Select location') {
      setSelectedLocation(gpsAddress);
    }
  }, [gpsAddress, manualAddress, selectedLocation, setSelectedLocation]);

  // Sorted places
  const sortedPlaces = useMemo(() => {
    const list = [...realPlaces];
    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list.sort((a, b) => a.distanceKm - b.distanceKm);
    }
    return list;
  }, [realPlaces, sortBy]);

  // Map markers for Leaflet OpenStreetMap
  const mapMarkers: MapMarkerItem[] = useMemo(() => {
    const list: MapMarkerItem[] = [];

    // Real nearby places from OpenStreetMap
    sortedPlaces.forEach(p => {
      const dist = distanceUnit === 'mi' ? p.distanceFormattedMi : p.distanceFormatted;
      list.push({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        title: p.name,
        type: p.type,
        categoryLabel: p.categoryLabel,
        address: p.address,
        phone: p.phone,
        distanceFormatted: dist,
        openHours: p.openHours,
        isOpen: p.isOpen,
        website: p.website,
        directionUrl: p.directionUrl,
      });
    });

    // Community animal & emergency markers (only when filter is 'all')
    if (activeCategory === 'all') {
      (nearbyMarkers || []).forEach((m, idx) => {
        if (m.lat && m.lng) {
          const distKm = m.distanceKm;
          const formatted = distKm !== undefined
            ? distanceUnit === 'mi'
              ? `${(distKm * 0.621371).toFixed(1)} mi`
              : `${distKm.toFixed(1)} km`
            : undefined;

          list.push({
            id: m.id || `comm_${idx}`,
            lat: m.lat,
            lng: m.lng,
            title: m.title,
            type: (m.type as any) || 'animal',
            categoryLabel: 'Community Report',
            address: m.location,
            distanceFormatted: formatted,
          });
        }
      });
    }

    return list;
  }, [sortedPlaces, nearbyMarkers, activeCategory, distanceUnit]);

  // Currently selected place object
  const selectedPlace = useMemo(() => {
    return realPlaces.find(p => p.id === selectedPlaceId) || null;
  }, [realPlaces, selectedPlaceId]);

  // Scroll to selected place in list
  useEffect(() => {
    if (selectedPlaceId && listContainerRef.current) {
      const cardElem = document.getElementById(`place-card-${selectedPlaceId}`);
      if (cardElem) {
        cardElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedPlaceId]);

  // Copy address to clipboard
  const handleCopyAddress = (id: string, text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const categories: { id: FilterCategory; label: string; icon: string }[] = [
    { id: 'all', label: 'All Places', icon: '🐾' },
    { id: 'veterinary', label: 'Veterinary', icon: '🩺' },
    { id: 'pet_shop', label: 'Pet Shops', icon: '🛍️' },
    { id: 'shelter', label: 'Shelters & Rescues', icon: '🏠' },
    { id: 'grooming', label: 'Grooming & Care', icon: '✂️' },
  ];

  const hasExpandedResults = realPlaces.some(p => p.isExpandedRadius);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 pb-24 font-sans text-slate-800">
      {/* 1. URGENT PET EMERGENCY BANNER */}
      <div className="bg-gradient-to-r from-red-700 via-rose-600 to-amber-600 rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 text-left w-full sm:w-auto">
          <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl flex-shrink-0 animate-pulse">
            🚨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight">PET EMERGENCY OR ACCIDENT?</h2>
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase">Live 24/7</span>
            </div>
            <p className="text-xs text-red-100 mt-0.5">
              Locate nearest verified emergency veterinary hospitals worldwide and dispatch urgent community aid.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowEmergencyModal(true)}
          className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 text-red-700 font-extrabold text-xs sm:text-sm rounded-xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2 flex-shrink-0"
        >
          <ShieldAlert className="w-4 h-4 text-red-600" />
          <span>OPEN PET EMERGENCY</span>
        </button>
      </div>

      {/* 2. GLOBAL DISCOVERY CONTROLS & SEARCH BAR */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-xs space-y-3">
        {/* Top row: Current Area Status + Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Location details */}
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                activeCoords
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <MapPin className="w-5 h-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-extrabold text-slate-900 truncate max-w-md">
                  {manualAddress || gpsAddress || (activeCoords ? `Coordinates: ${activeCoords.lat.toFixed(4)}°, ${activeCoords.lng.toFixed(4)}°` : 'Acquiring GPS location...')}
                </span>

                {manualCoords ? (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Custom Location Active
                  </span>
                ) : gpsCoords ? (
                  <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                    Device GPS Active
                  </span>
                ) : null}
              </div>

              {activeCoords ? (
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-1 flex-wrap">
                  <span>Lat: <strong className="text-slate-700">{activeCoords.lat.toFixed(4)}°</strong></span>
                  <span>•</span>
                  <span>Lng: <strong className="text-slate-700">{activeCoords.lng.toFixed(4)}°</strong></span>
                  {!manualCoords && accuracy && (
                    <>
                      <span>•</span>
                      <span className={accuracy > 80 ? 'text-amber-600 font-bold' : 'text-green-700 font-bold'}>
                        Accuracy: ~{Math.round(accuracy)}m
                      </span>
                    </>
                  )}
                  {lastUpdated && !manualCoords && (
                    <>
                      <span>•</span>
                      <span className="text-slate-400 text-[10px]">
                        Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-1">
                  {gpsStatus === 'locating'
                    ? 'Locating device via GPS satellites...'
                    : gpsStatus === 'denied'
                    ? 'Location permission is required to find nearby places.'
                    : gpsError || 'Please allow browser location access or search your city below.'}
                </p>
              )}
            </div>
          </div>

          {/* Quick Controls: Radius, Unit toggle, Mobile View Toggle, GPS Button */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0 self-end md:self-center">
            {/* Mobile View Toggle (Map vs List) */}
            <div className="lg:hidden flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setMobileViewMode('map')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                  mobileViewMode === 'map' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Map</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileViewMode('list')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                  mobileViewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List ({realPlaces.length})</span>
              </button>
            </div>

            {/* Radius Selector */}
            <select
              value={nearbyRadiusKm}
              onChange={e => setNearbyRadiusKm(Number(e.target.value))}
              className="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value={2}>2 {distanceUnit}</option>
              <option value={5}>5 {distanceUnit}</option>
              <option value={10}>10 {distanceUnit}</option>
              <option value={25}>25 {distanceUnit}</option>
              <option value={50}>50 {distanceUnit}</option>
            </select>

            {/* Distance Unit Toggle (km / mi) */}
            <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setDistanceUnit('km')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  distanceUnit === 'km' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                km
              </button>
              <button
                type="button"
                onClick={() => setDistanceUnit('mi')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  distanceUnit === 'mi' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                mi
              </button>
            </div>

            {/* Refresh Places */}
            <button
              type="button"
              onClick={fetchPlaces}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition-all active:scale-95"
              title="Refresh live directory"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingPlaces ? 'animate-spin text-green-700' : ''}`} />
            </button>

            {/* Use My GPS Location button */}
            <button
              type="button"
              onClick={handleResetToDeviceGps}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                !manualCoords && gpsCoords
                  ? 'bg-green-700 text-white hover:bg-green-800'
                  : 'bg-slate-900 hover:bg-black text-white'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>{manualCoords ? 'Use Current Location' : 'Current Location'}</span>
            </button>
          </div>
        </div>

        {/* Global Location Search Input */}
        <div ref={searchContainerRef} className="relative pt-1">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search city, neighborhood, postal code / ZIP worldwide (e.g. London, Tokyo, Brooklyn, Paris, Chennai)..."
              className="w-full pl-9 pr-9 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-green-600 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
            />
            {isSearchingLocation ? (
              <Loader2 className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-green-700 animate-spin" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setShowSearchDropdown(false); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>

          {/* Search Dropdown */}
          {showSearchDropdown && (
            <div className="absolute top-full left-0 right-0 z-30 mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((item, idx) => (
                  <button
                    key={`${item.name}-${idx}`}
                    type="button"
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full text-left p-3 hover:bg-green-50/60 transition-colors flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-extrabold text-slate-800 group-hover:text-green-700 truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {item.displayName}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-green-600 flex-shrink-0" />
                  </button>
                ))
              ) : !isSearchingLocation ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No matching locations found. Try searching by city name and country (e.g. "Toronto, Canada").
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* GPS Permission Warning if denied */}
        {gpsStatus === 'denied' && !manualCoords && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-extrabold text-amber-900">Location permission is required to find nearby places.</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                You can search any city, neighborhood, or postal code in the search bar above to view real animal-care facilities anywhere in the world.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. CATEGORY SELECTOR PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {categories.map(cat => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                setSelectedPlaceId(null);
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-2 shadow-2xs ${
                isActive
                  ? 'bg-green-700 text-white shadow-md shadow-green-700/20 scale-[1.02]'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              {isActive && (
                <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                  {realPlaces.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Expanded radius notification */}
      {hasExpandedResults && !isLoadingPlaces && (
        <div className="px-4 py-2.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl text-xs text-blue-900 flex items-center gap-2">
          <Compass className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>Notice: Results expanded to nearest verified facilities within 25 km of your location.</span>
        </div>
      )}

      {/* 4. MAIN MAP & PLACES LIST LAYOUT (RESPONSIVE DUAL SPLIT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN ON DESKTOP (5 cols): FINDER / RESULTS LIST */}
        <div className={`lg:col-span-5 space-y-4 ${mobileViewMode === 'map' ? 'hidden lg:block' : 'block'}`}>
          {/* Selected Place Details Card */}
          {selectedPlace && (
            <div className="bg-gradient-to-br from-green-900 via-slate-900 to-slate-950 rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-white shadow-xl space-y-3 animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-green-300">
                    {selectedPlace.categoryLabel}
                  </span>
                  <h3 className="text-base sm:text-lg font-black mt-1 leading-snug">
                    {selectedPlace.name}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPlaceId(null)}
                  className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white"
                  aria-label="Close place details"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Distance badge & open status */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-extrabold text-green-300 bg-green-950/60 px-2.5 py-1 rounded-xl border border-green-800/60">
                  📍 {distanceUnit === 'mi' ? selectedPlace.distanceFormattedMi : selectedPlace.distanceFormatted} away
                </span>

                {selectedPlace.isOpen === true && (
                  <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-800/60">
                    ● Open 24/7
                  </span>
                )}
              </div>

              {/* Verified Address */}
              <div className="text-xs text-slate-300 flex items-start gap-1.5 leading-relaxed">
                <MapPin className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span>{selectedPlace.address}</span>
              </div>

              {/* Hours if available */}
              {selectedPlace.openHours && (
                <div className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-300 flex-shrink-0" />
                  <span>{selectedPlace.openHours}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                {selectedPlace.phone ? (
                  <a
                    href={`tel:${selectedPlace.phone}`}
                    className="py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleCopyAddress(selectedPlace.id, selectedPlace.address)}
                    className="py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    {copiedId === selectedPlace.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === selectedPlace.id ? 'Copied!' : 'Copy Address'}</span>
                  </button>
                )}

                <a
                  href={selectedPlace.directionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 bg-green-500 hover:bg-green-400 text-slate-950 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition-all text-center"
                >
                  <Navigation className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
                  <span>Get Directions ↗</span>
                </a>
              </div>

              {selectedPlace.website && (
                <a
                  href={selectedPlace.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-xs font-bold text-slate-300 hover:text-white underline pt-1"
                >
                  Visit Official Website ↗
                </a>
              )}
            </div>
          )}

          {/* List Card Container */}
          <div
            ref={listContainerRef}
            className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  Verified Places ({sortedPlaces.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Real locations from live global POI network
                </p>
              </div>

              {/* Sort By Toggle */}
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3 h-3 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-hidden cursor-pointer"
                >
                  <option value="distance">Nearest First</option>
                  <option value="name">A-Z Name</option>
                </select>
              </div>
            </div>

            {/* Places List Items */}
            {isLoadingPlaces ? (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-green-700 mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  Finding nearby animal-care places...
                </p>
              </div>
            ) : sortedPlaces.length > 0 ? (
              <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                {sortedPlaces.map(place => {
                  const isSelected = selectedPlaceId === place.id;
                  const isHospital = place.type === 'hospital' || place.type === 'emergency_vet';
                  const isPetShop = place.type === 'pet_shop';
                  const isShelter = place.type === 'shelter' || place.type === 'rescue';
                  const isGrooming = place.type === 'grooming';

                  const dist = distanceUnit === 'mi' ? place.distanceFormattedMi : place.distanceFormatted;

                  return (
                    <div
                      key={place.id}
                      id={`place-card-${place.id}`}
                      onClick={() => setSelectedPlaceId(place.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-green-600 bg-green-50/50 ring-2 ring-green-600/20 shadow-xs'
                          : 'border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        {/* Header: Category Badge + Distance */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span
                            className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              place.type === 'emergency_vet'
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : isHospital
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : isPetShop
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : isShelter
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : isGrooming
                                ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                : 'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {place.categoryLabel}
                          </span>

                          <span className="text-[11px] font-extrabold text-green-800 bg-white px-2 py-0.5 rounded-full border border-green-200 shadow-2xs">
                            📍 {dist}
                          </span>
                        </div>

                        {/* Name */}
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                          {place.name}
                        </h4>

                        {/* Address */}
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {place.address}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-200/70">
                        {place.phone && (
                          <a
                            href={`tel:${place.phone}`}
                            onClick={e => e.stopPropagation()}
                            className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 shadow-2xs transition-colors"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Call</span>
                          </a>
                        )}

                        <a
                          href={place.directionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-black text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 shadow-2xs transition-colors text-center"
                        >
                          <Navigation className="w-3 h-3 text-green-400" />
                          <span>Get Directions ↗</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center space-y-2.5">
                <Compass className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  No verified places found nearby.
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Try expanding the search radius or search another city/neighborhood above.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNearbyRadiusKm(25)}
                    className="px-4 py-1.5 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    Expand to 25 {distanceUnit}
                  </button>
                </div>
              </div>
            )}

            {placesError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 space-y-1">
                <p className="font-bold">{placesError}</p>
                <button
                  type="button"
                  onClick={fetchPlaces}
                  className="text-[11px] font-bold text-red-700 underline"
                >
                  Retry Search
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN ON DESKTOP (7 cols): LARGE INTERACTIVE MAP */}
        <div className={`lg:col-span-7 bg-white rounded-2xl sm:rounded-3xl p-2 sm:p-3 border border-slate-100 shadow-xs space-y-2 ${mobileViewMode === 'list' ? 'hidden lg:block' : 'block'}`}>
          <LiveOpenStreetMap
            userCoords={gpsCoords}
            centerCoords={manualCoords}
            accuracyMeters={accuracy}
            markers={mapMarkers}
            selectedMarkerId={selectedPlaceId}
            onMarkerSelect={m => {
              setSelectedPlaceId(m.id);
            }}
            heightClass="h-[420px] sm:h-[560px]"
          />

          {/* Map Footer Summary */}
          <div className="px-2 py-1.5 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>Real-time data from OpenStreetMap Global Network</span>
            </span>

            <span>
              Showing <strong className="text-slate-800">{sortedPlaces.length}</strong> real places
            </span>
          </div>
        </div>
      </div>

      {/* Pet Emergency Modal */}
      <PetEmergencyModal
        isOpen={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
      />
    </div>
  );
};
