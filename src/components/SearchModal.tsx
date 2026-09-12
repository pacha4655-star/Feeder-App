import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Loader2,
  UserCheck,
  ShieldCheck,
  MapPin,
  ChevronRight,
  UserX,
  Users,
  Navigation,
  Phone,
  Building2,
  Stethoscope,
  Store,
  Home,
  Map
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User, RealPetPlace, NearbyMarker } from '../types';
import { api } from '../services/api';
import { useLiveGeolocation } from '../hooks/useLiveGeolocation';

export const SearchModal: React.FC = () => {
  const {
    showSearch,
    setShowSearch,
    openUserProfile,
    registeredUsers,
    user: currentUser,
    nearbyMarkers,
    setCurrentTab
  } = useApp();

  const [activeTab, setActiveTab] = useState<'people' | 'places'>('people');
  const [query, setQuery] = useState('');
  const [peopleResults, setPeopleResults] = useState<User[]>([]);
  const [placesResults, setPlacesResults] = useState<RealPetPlace[]>([]);
  const [markerResults, setMarkerResults] = useState<NearbyMarker[]>([]);
  const [placeCategory, setPlaceCategory] = useState<'all' | 'clinic' | 'hospital' | 'shelter' | 'pet_shop'>('all');
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { coords: gpsCoords } = useLiveGeolocation(false);

  // Focus input on modal open
  useEffect(() => {
    if (showSearch) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
      setPeopleResults([]);
      setPlacesResults([]);
      setMarkerResults([]);
      setHasSearched(false);
      setLoading(false);
    }
  }, [showSearch]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch, setShowSearch]);

  // Initial load of nearby places when user clicks Places tab
  useEffect(() => {
    if (activeTab === 'places' && showSearch && !query.trim() && placesResults.length === 0) {
      if (gpsCoords) {
        setLoading(true);
        api.getNearbyPlaces({
          lat: gpsCoords.lat,
          lng: gpsCoords.lng,
          radiusKm: 15,
          category: placeCategory === 'all' ? 'all' : placeCategory
        })
          .then(res => {
            if (res?.places) {
              setPlacesResults(res.places.slice(0, 20));
            }
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      }
    }
  }, [activeTab, showSearch, gpsCoords, placeCategory]);

  // Search logic for People & Places
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      if (activeTab === 'people') {
        setPeopleResults([]);
        setHasSearched(false);
      } else {
        setHasSearched(false);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    const cleanQ = trimmed.toLowerCase();

    if (activeTab === 'people') {
      const cleanUsernameQ = cleanQ.replace(/^@/, '');
      const localMatches = (registeredUsers || []).filter(u => {
        const name = (u.name || '').toLowerCase();
        const username = (u.username || '').toLowerCase();
        const bio = (u.bio || '').toLowerCase();
        return name.includes(cleanUsernameQ) || username.includes(cleanUsernameQ) || bio.includes(cleanUsernameQ);
      });

      if (localMatches.length > 0) {
        setPeopleResults(localMatches.slice(0, 20));
        setHasSearched(true);
      }

      const abortController = new AbortController();
      const timeoutId = setTimeout(async () => {
        try {
          const backendUsers = await api.searchUsers(trimmed);
          if (!abortController.signal.aborted) {
            const seen = new Set<string>();
            const merged: User[] = [];

            for (const u of backendUsers) {
              const uid = u.id || (u as any).firebase_uid;
              if (uid && !seen.has(uid)) {
                seen.add(uid);
                const localMatch = (registeredUsers || []).find(lu => lu.id === uid);
                merged.push({
                  ...u,
                  followerIds: localMatch?.followerIds || u.followerIds || [],
                  followingIds: localMatch?.followingIds || u.followingIds || [],
                  followersCount: localMatch?.followersCount ?? u.followersCount ?? 0,
                  followingCount: localMatch?.followingCount ?? u.followingCount ?? 0,
                });
              }
            }

            for (const u of localMatches) {
              if (u.id && !seen.has(u.id)) {
                seen.add(u.id);
                merged.push(u);
              }
            }

            setPeopleResults(merged.slice(0, 20));
            setHasSearched(true);
            setLoading(false);
          }
        } catch (err) {
          if (!abortController.signal.aborted) {
            setPeopleResults(localMatches.slice(0, 20));
            setHasSearched(true);
            setLoading(false);
          }
        }
      }, 250);

      return () => {
        clearTimeout(timeoutId);
        abortController.abort();
      };
    } else {
      // Places search
      // 1. Instant local filter on nearbyMarkers
      const matchedMarkers = (nearbyMarkers || []).filter(m => {
        const title = (m.title || '').toLowerCase();
        const sub = (m.subtitle || '').toLowerCase();
        const loc = (m.location || '').toLowerCase();
        const type = (m.type || '').toLowerCase();
        const categoryMatch = placeCategory === 'all' || type.includes(placeCategory);
        return categoryMatch && (title.includes(cleanQ) || sub.includes(cleanQ) || loc.includes(cleanQ) || type.includes(cleanQ));
      });
      setMarkerResults(matchedMarkers);

      // 2. Query places API if coords available
      const abortController = new AbortController();
      const timeoutId = setTimeout(async () => {
        if (gpsCoords) {
          try {
            const res = await api.getNearbyPlaces({
              lat: gpsCoords.lat,
              lng: gpsCoords.lng,
              radiusKm: 25,
              category: placeCategory === 'all' ? 'all' : placeCategory
            });
            if (!abortController.signal.aborted && res?.places) {
              const filtered = res.places.filter(p => {
                const name = (p.name || '').toLowerCase();
                const addr = (p.address || '').toLowerCase();
                const cat = (p.categoryLabel || '').toLowerCase();
                return name.includes(cleanQ) || addr.includes(cleanQ) || cat.includes(cleanQ);
              });
              setPlacesResults(filtered);
              setHasSearched(true);
              setLoading(false);
            }
          } catch (e) {
            if (!abortController.signal.aborted) {
              setHasSearched(true);
              setLoading(false);
            }
          }
        } else {
          setHasSearched(true);
          setLoading(false);
        }
      }, 300);

      return () => {
        clearTimeout(timeoutId);
        abortController.abort();
      };
    }
  }, [query, activeTab, registeredUsers, nearbyMarkers, placeCategory, gpsCoords]);

  if (!showSearch) return null;

  const handleSelectUser = (targetUser: User) => {
    openUserProfile(targetUser);
    setShowSearch(false);
  };

  const getPlaceIcon = (type: string) => {
    if (type.includes('hospital') || type.includes('emergency')) {
      return <Building2 className="w-5 h-5 text-red-600 dark:text-red-400" />;
    }
    if (type.includes('clinic') || type.includes('vet')) {
      return <Stethoscope className="w-5 h-5 text-green-600 dark:text-green-400" />;
    }
    if (type.includes('shelter') || type.includes('rescue')) {
      return <Home className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    }
    if (type.includes('shop') || type.includes('store')) {
      return <Store className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
    }
    return <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
  };

  const totalPlaceCount = (markerResults.length > 0 ? markerResults.length : 0) + (placesResults.length > 0 ? placesResults.length : 0);

  return (
    <div
      onClick={() => setShowSearch(false)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif] animate-in fade-in duration-200"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[88vh] animate-in slide-in-from-top-4 duration-200 mt-2 sm:mt-6"
      >
        {/* Search Header Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                ref={inputRef}
                type="text"
                id="search-input"
                autoFocus
                placeholder={activeTab === 'people' ? 'Search people by name, @username, or bio...' : 'Search clinics, hospitals, shelters, or places...'}
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 sm:py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-800 dark:text-white placeholder:text-slate-400"
              />
              <div className="absolute right-3 top-2.5 sm:top-3 flex items-center gap-1">
                {loading && (
                  <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                )}
                {!loading && query && (
                  <button
                    onClick={() => setQuery('')}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowSearch(false)}
              className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {/* Segmented [ People | Places ] Navigation */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                setActiveTab('people');
                setQuery('');
              }}
              id="search-tab-people"
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'people'
                  ? 'bg-green-700 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>People</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('places');
                setQuery('');
              }}
              id="search-tab-places"
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'places'
                  ? 'bg-green-700 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Places</span>
            </button>
          </div>

          {/* Secondary Filter Chips for Places */}
          {activeTab === 'places' && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'clinic', label: 'Vet Clinics' },
                { id: 'hospital', label: 'Hospitals' },
                { id: 'shelter', label: 'Shelters' },
                { id: 'pet_shop', label: 'Pet Shops' }
              ].map(chip => (
                <button
                  key={chip.id}
                  onClick={() => setPlaceCategory(chip.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    placeCategory === chip.id
                      ? 'bg-green-100 dark:bg-green-950/70 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-800'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search Results Area */}
        <div className="flex-1 bg-white dark:bg-slate-900 overflow-y-auto p-4 sm:p-5 space-y-3">
          {/* ==================== TAB 1: PEOPLE ==================== */}
          {activeTab === 'people' && (
            <>
              {/* Empty Query State for People */}
              {!query.trim() && (
                <div className="text-center py-10 px-4 text-slate-400">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-green-50 dark:bg-green-950/40 flex items-center justify-center text-green-600 dark:text-green-400">
                    <Users className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">Search Feeder Caregivers & Rescuers</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                    Find Feeder users by their name, @username, or public bio to connect and follow.
                  </p>
                  <div className="mt-5">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Try searching:
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5 max-w-sm mx-auto">
                      {['Pacha', 'Animal lover', 'Feeder', 'Rescuer'].map(suggestion => (
                        <button
                          key={suggestion}
                          onClick={() => setQuery(suggestion)}
                          className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-green-50 dark:hover:bg-green-950/40 hover:text-green-800 dark:hover:text-green-300 hover:border-green-200 border border-transparent text-slate-600 dark:text-slate-300 rounded-full text-xs font-medium transition-colors cursor-pointer"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* No Results Found for People */}
              {hasSearched && !loading && peopleResults.length === 0 && query.trim() && (
                <div className="text-center py-12 px-4 text-slate-400">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <UserX className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">No users found</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                    No Feeder caregivers matched "{query}". Try searching by a different name, @username, or keyword.
                  </p>
                </div>
              )}

              {/* People Results List */}
              {peopleResults.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1 pb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Caregivers & Feeders ({peopleResults.length})
                    </span>
                    {loading && (
                      <span className="text-[10px] text-green-600 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Updating...
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {peopleResults.map(u => {
                      const isSelf = currentUser?.id === u.id;
                      const isFollowing = currentUser?.followingIds?.includes(u.id);

                      return (
                        <div
                          key={u.id}
                          onClick={() => handleSelectUser(u)}
                          className="p-3 sm:p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-green-300 dark:hover:border-green-700 hover:bg-green-50/40 dark:hover:bg-slate-800/80 bg-white dark:bg-slate-800/40 flex items-center justify-between cursor-pointer transition-all shadow-2xs hover:shadow-xs group"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0 group-hover:scale-105 transition-transform"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-green-800 dark:group-hover:text-green-400 transition-colors truncate">
                                  {u.name}
                                </h4>
                                {u.isVerified && (
                                  <ShieldCheck className="w-3.5 h-3.5 text-green-600 flex-shrink-0" title="Verified Feeder" />
                                )}
                                {isSelf && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                    You
                                  </span>
                                )}
                                {isFollowing && !isSelf && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300 flex items-center gap-0.5">
                                    <UserCheck className="w-2.5 h-2.5" /> Following
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                                @{u.username || 'feeder'}
                                {u.location && (
                                  <span className="ml-1.5 text-slate-400 font-normal">
                                    • {u.location}
                                  </span>
                                )}
                              </p>
                              {u.bio && (
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1 mt-0.5 leading-relaxed">
                                  {u.bio}
                                </p>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-green-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ==================== TAB 2: PLACES ==================== */}
          {activeTab === 'places' && (
            <>
              {/* If no query and no results yet */}
              {!query.trim() && placesResults.length === 0 && markerResults.length === 0 && (
                <div className="text-center py-10 px-4 text-slate-400">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-green-50 dark:bg-green-950/40 flex items-center justify-center text-green-600 dark:text-green-400">
                    <MapPin className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">Discover Pet Places & Care Services</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                    Search veterinary clinics, emergency hospitals, animal shelters, pet shops, and feeder spots.
                  </p>
                  <div className="mt-5">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Popular searches:
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5 max-w-sm mx-auto">
                      {['Clinic', 'Hospital', 'Shelter', 'Pet Shop', 'Veterinary'].map(suggestion => (
                        <button
                          key={suggestion}
                          onClick={() => setQuery(suggestion)}
                          className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-green-50 dark:hover:bg-green-950/40 hover:text-green-800 dark:hover:text-green-300 hover:border-green-200 border border-transparent text-slate-600 dark:text-slate-300 rounded-full text-xs font-medium transition-colors cursor-pointer"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* No Places Results */}
              {hasSearched && !loading && totalPlaceCount === 0 && query.trim() && (
                <div className="text-center py-12 px-4 text-slate-400">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">No places found</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                    No animal care places matched "{query}". Try checking the interactive Nearby Map tab.
                  </p>
                </div>
              )}

              {/* Places Results */}
              {(placesResults.length > 0 || markerResults.length > 0) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1 pb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Locations & Facilities ({totalPlaceCount})
                    </span>
                    {loading && (
                      <span className="text-[10px] text-green-600 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Searching...
                      </span>
                    )}
                  </div>

                  {/* Marker Results (from community & local DB) */}
                  {markerResults.map(m => (
                    <div
                      key={`marker-${m.id}`}
                      className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-green-300 dark:hover:border-green-700 bg-white dark:bg-slate-800/40 flex flex-col gap-2.5 transition-all shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            {getPlaceIcon(m.type)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                {m.title}
                              </h4>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300">
                                {m.badge || m.type}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 line-clamp-1">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span>{m.location || m.subtitle}</span>
                            </p>
                          </div>
                        </div>
                        {m.distanceKm !== undefined && (
                          <span className="text-xs font-bold text-green-700 dark:text-green-400 flex-shrink-0">
                            {m.distanceKm.toFixed(1)} km
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-50 dark:border-slate-800/80">
                        {m.coordinates && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${m.coordinates.lat},${m.coordinates.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 dark:bg-green-950/50 text-green-800 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/60 text-xs font-semibold transition-colors"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            Directions
                          </a>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Real Pet Places (OpenStreetMap Live Facilities) */}
                  {placesResults.map(p => (
                    <div
                      key={`place-${p.id}`}
                      className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-green-300 dark:hover:border-green-700 bg-white dark:bg-slate-800/40 flex flex-col gap-2.5 transition-all shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            {getPlaceIcon(p.type)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                {p.name}
                              </h4>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                                {p.categoryLabel}
                              </span>
                              {p.isEmergency && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
                                  24/7 Emergency
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-start gap-1 leading-relaxed">
                              <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{p.address}</span>
                            </p>
                          </div>
                        </div>
                        {p.distanceFormatted && (
                          <span className="text-xs font-bold text-green-700 dark:text-green-400 flex-shrink-0">
                            {p.distanceFormatted}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-50 dark:border-slate-800/80">
                        {p.phone && (
                          <a
                            href={`tel:${p.phone}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-green-600" />
                            Call
                          </a>
                        )}
                        <a
                          href={p.directionUrl || `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 dark:bg-green-950/50 text-green-800 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/60 text-xs font-semibold transition-colors"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          Directions
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bottom Shortcut to Nearby Live Map */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setCurrentTab('nearby');
                  }}
                  className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800/80 border border-green-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-slate-600 text-green-800 dark:text-green-300 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                >
                  <Map className="w-4 h-4 text-green-600" />
                  <span>Explore All Locations on Interactive Map</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
