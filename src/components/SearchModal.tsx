import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, UserCheck, ShieldCheck, MapPin, ChevronRight, UserX, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User } from '../types';
import { api } from '../services/api';

export const SearchModal: React.FC = () => {
  const {
    showSearch,
    setShowSearch,
    openUserProfile,
    registeredUsers,
    user: currentUser,
  } = useApp();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on modal open
  useEffect(() => {
    if (showSearch) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
      setResults([]);
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

  // Debounced Search Effect
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    const cleanQ = trimmed.replace(/^@/, '').toLowerCase();

    // Immediate instant local match from registeredUsers while backend query executes
    const localMatches = (registeredUsers || []).filter(u => {
      const name = (u.name || '').toLowerCase();
      const username = (u.username || '').toLowerCase();
      const bio = (u.bio || '').toLowerCase();
      return name.includes(cleanQ) || username.includes(cleanQ) || bio.includes(cleanQ);
    });

    if (localMatches.length > 0) {
      setResults(localMatches.slice(0, 20));
      setHasSearched(true);
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        const backendUsers = await api.searchUsers(trimmed);
        if (!abortController.signal.aborted) {
          // Merge backend users with local matches by unique firebase_uid / id
          const seen = new Set<string>();
          const merged: User[] = [];

          // Backend users have priority (fresh from Supabase)
          for (const u of backendUsers) {
            const uid = u.id || (u as any).firebase_uid;
            if (uid && !seen.has(uid)) {
              seen.add(uid);
              // Preserve followerIds or followingIds if already known in memory
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

          // Then add any local matches that also fit
          for (const u of localMatches) {
            if (u.id && !seen.has(u.id)) {
              seen.add(u.id);
              merged.push(u);
            }
          }

          setResults(merged.slice(0, 20));
          setHasSearched(true);
          setLoading(false);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.warn('[SearchModal] Backend search notice:', err);
          // Keep local matches if available
          setResults(localMatches.slice(0, 20));
          setHasSearched(true);
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [query, registeredUsers]);

  if (!showSearch) return null;

  const handleSelectUser = (targetUser: User) => {
    // Open user's real profile in UserDetailModal
    openUserProfile(targetUser);
    setShowSearch(false);
  };

  return (
    <div
      onClick={() => setShowSearch(false)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif] animate-in fade-in duration-200"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-top-4 duration-200 mt-2 sm:mt-8"
      >
        {/* Search Header Bar */}
        <div className="bg-white p-4 sm:p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                ref={inputRef}
                type="text"
                id="people-search-input"
                autoFocus
                placeholder="Search people by name, @username, or bio..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 sm:py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
              />
              <div className="absolute right-3 top-2.5 sm:top-3 flex items-center gap-1">
                {loading && (
                  <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                )}
                {!loading && query && (
                  <button
                    onClick={() => setQuery('')}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowSearch(false)}
              className="text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Search Results Area */}
        <div className="flex-1 bg-white overflow-y-auto p-4 sm:p-5 space-y-3">
          {/* Empty Query State */}
          {!query.trim() && (
            <div className="text-center py-10 px-4 text-slate-400">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Search Feeder Caregivers & Rescuers</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Find Feeder users by their name, @username, or public bio to connect and follow.
              </p>
              <div className="mt-5">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Try searching:
                </p>
                <div className="flex flex-wrap justify-center gap-1.5 max-w-sm mx-auto">
                  {['Pacha', 'Digital', 'Animal lover', 'Feeder', 'Rescuer'].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => setQuery(suggestion)}
                      className="px-3 py-1 bg-slate-100 hover:bg-green-50 hover:text-green-800 hover:border-green-200 border border-transparent text-slate-600 rounded-full text-xs font-medium transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No Results Found State */}
          {hasSearched && !loading && results.length === 0 && query.trim() && (
            <div className="text-center py-12 px-4 text-slate-400">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <UserX className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">No users found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                No Feeder caregivers matched "{query}". Try searching by a different name, @username, or keyword.
              </p>
            </div>
          )}

          {/* Results List */}
          {results.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 pb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Caregivers & Feeders ({results.length})
                </span>
                {loading && (
                  <span className="text-[10px] text-green-600 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Updating...
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {results.map(u => {
                  const isSelf = currentUser?.id === u.id;
                  const isFollowing = currentUser?.followingIds?.includes(u.id);

                  return (
                    <div
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className="p-3 sm:p-3.5 rounded-2xl border border-slate-100 hover:border-green-300 hover:bg-green-50/40 bg-white flex items-center justify-between cursor-pointer transition-all shadow-2xs hover:shadow-xs group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border border-slate-200 flex-shrink-0 group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-green-800 transition-colors truncate">
                              {u.name}
                            </h4>
                            {u.isVerified && (
                              <ShieldCheck className="w-3.5 h-3.5 text-green-600 flex-shrink-0" title="Verified Feeder" />
                            )}
                            {isSelf && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600">
                                You
                              </span>
                            )}
                            {isFollowing && !isSelf && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-green-100 text-green-800 flex items-center gap-0.5">
                                <UserCheck className="w-2.5 h-2.5" /> Following
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium truncate">
                            @{u.username || 'feeder'}
                            {u.location && (
                              <span className="ml-1.5 text-slate-400 font-normal">
                                • {u.location}
                              </span>
                            )}
                          </p>
                          {u.bio && (
                            <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5 leading-relaxed">
                              {u.bio}
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-green-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
