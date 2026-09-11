import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Search, X, Check, Globe, Compass, Loader2, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

const POPULAR_CITIES = [
  { name: 'London, UK', lat: 51.5074, lng: -0.1278 },
  { name: 'New York, USA', lat: 40.7128, lng: -74.0060 },
  { name: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Sydney, Australia', lat: -33.8688, lng: 151.2093 },
  { name: 'Toronto, Canada', lat: 43.6532, lng: -79.3832 },
  { name: 'Paris, France', lat: 48.8566, lng: 2.3522 },
  { name: 'Berlin, Germany', lat: 52.5200, lng: 13.4050 },
  { name: 'São Paulo, Brazil', lat: -23.5505, lng: -46.6333 },
  { name: 'Dubai, UAE', lat: 25.2048, lng: 55.2708 },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Mumbai, India', lat: 19.0760, lng: 72.8777 },
  { name: 'Nairobi, Kenya', lat: -1.2921, lng: 36.8219 },
];

const RADIUS_OPTIONS = [
  { label: '2 km', value: 2 },
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: '25 km', value: 25 },
  { label: 'All', value: 999 },
];

export const LocationModal: React.FC = () => {
  const {
    showLocationModal,
    setShowLocationModal,
    selectedLocation,
    userCoords,
    isLocating,
    detectUserLocation,
    setUserCustomLocation,
    nearbyRadiusKm,
    setNearbyRadiusKm,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ name: string; displayName: string; lat: number; lng: number }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.geocode(searchQuery.trim());
        setSearchResults(res.results || []);
      } catch (err) {
        console.error('Error searching location:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!showLocationModal) return null;

  const handleSelectLocation = async (locName: string, coords?: { lat: number; lng: number }) => {
    await setUserCustomLocation(locName, coords);
    setShowLocationModal(false);
  };

  const handleDetectGPS = async () => {
    const success = await detectUserLocation();
    if (success) {
      setShowLocationModal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-6 duration-200"
        id="location-modal-container"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Choose Your Location</h2>
              <p className="text-[11px] text-slate-500">Connect with nearby feeders, rescues & animals</p>
            </div>
          </div>
          <button
            onClick={() => setShowLocationModal(false)}
            className="w-8 h-8 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
            id="close-location-modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Current Active Location Info Banner */}
          <div className="p-3 bg-green-50/70 border border-green-200/70 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                📍
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-green-700">Current Area</div>
                <div className="text-xs font-bold text-slate-800 truncate max-w-[200px]">{selectedLocation}</div>
                {userCoords && (
                  <div className="text-[10px] text-slate-500">
                    GPS: {userCoords.lat.toFixed(4)}°, {userCoords.lng.toFixed(4)}°
                  </div>
                )}
              </div>
            </div>
            <span className="px-2 py-0.5 bg-green-600 text-white text-[10px] font-semibold rounded-full">
              Active
            </span>
          </div>

          {/* GPS Auto-Detect Button */}
          <button
            onClick={handleDetectGPS}
            disabled={isLocating}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-green-700 hover:bg-green-800 text-white rounded-2xl text-xs font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
            id="gps-detect-btn"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Accessing GPS Satellite...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4" />
                <span>Use My Exact Current GPS Location</span>
              </>
            )}
          </button>

          {/* Search Location Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search neighborhood, city, or country..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100/80 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-green-600 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
              id="location-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown/List */}
          {searchQuery && (
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-slate-400 px-1 uppercase tracking-wider flex items-center justify-between">
                <span>Search Results</span>
                {isSearching && <Loader2 className="w-3 h-3 animate-spin text-green-600" />}
              </div>
              {searchResults.length > 0 ? (
                <div className="bg-slate-50 rounded-2xl p-1 border border-slate-200/70 max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.map((item, idx) => (
                    <button
                      key={`${item.name}-${idx}`}
                      onClick={() => handleSelectLocation(item.name, { lat: item.lat, lng: item.lng })}
                      className="w-full text-left p-2 hover:bg-white rounded-xl text-xs flex items-center justify-between transition-colors group"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="font-semibold text-slate-800 truncate group-hover:text-green-700">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{item.displayName}</div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-green-600 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              ) : !isSearching ? (
                <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl">
                  No matching cities found. Press enter or click to use "<strong>{searchQuery}</strong>".
                  <div className="mt-2">
                    <button
                      onClick={() => handleSelectLocation(searchQuery)}
                      className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-bold text-[11px] hover:bg-green-200"
                    >
                      Set as {searchQuery}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Discovery Radius Selector */}
          <div>
            <div className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center justify-between">
              <span>Discovery Radius</span>
              <span className="text-green-700 font-semibold">{nearbyRadiusKm === 999 ? 'No limit' : `${nearbyRadiusKm} km`}</span>
            </div>
            <div className="flex gap-1.5">
              {RADIUS_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => setNearbyRadiusKm(opt.value)}
                  className={`flex-1 py-1 rounded-xl text-xs font-semibold transition-colors border ${
                    nearbyRadiusKm === opt.value
                      ? 'bg-green-700 text-white border-green-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Popular Neighborhoods & Cities */}
          <div>
            <div className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
              <Compass className="w-3 h-3 text-slate-400" />
              <span>Popular Locations</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {POPULAR_CITIES.map(city => {
                const isCurrent = selectedLocation.toLowerCase().includes(city.name.toLowerCase());
                return (
                  <button
                    key={city.name}
                    onClick={() => handleSelectLocation(city.name, { lat: city.lat, lng: city.lng })}
                    className={`text-left p-2 rounded-xl text-xs font-medium border transition-colors flex items-center justify-between ${
                      isCurrent
                        ? 'bg-green-50 border-green-300 text-green-800 font-bold'
                        : 'bg-white border-slate-200/70 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{city.name}</span>
                    {isCurrent && <Check className="w-3.5 h-3.5 text-green-700 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            Works for all users worldwide
          </span>
          <button
            onClick={() => setShowLocationModal(false)}
            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
