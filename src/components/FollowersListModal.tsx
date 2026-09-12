import React, { useState, useEffect } from 'react';
import { X, UserPlus, UserCheck, Users, Loader2 } from 'lucide-react';
import { User } from '../types';
import { useApp } from '../context/AppContext';
import { resolveApiUrl } from '../utils/apiConfig';

interface FollowersListModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'followers' | 'following';
  targetUser: User | null;
  onSelectUser: (user: User) => void;
}

export const FollowersListModal: React.FC<FollowersListModalProps> = ({
  isOpen,
  onClose,
  type,
  targetUser,
  onSelectUser
}) => {
  const { user: currentUser, registeredUsers, toggleFollowUser } = useApp();
  const [liveUsers, setLiveUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !targetUser?.id) {
      setLiveUsers([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchLiveList = async () => {
      setLoading(true);
      try {
        const endpoint = `/api/users/${encodeURIComponent(targetUser.id)}/${type}`;
        const targetUrl = resolveApiUrl(endpoint);
        const res = await fetch(targetUrl);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json && Array.isArray(json[type])) {
            setLiveUsers(json[type]);
          }
        }
      } catch (err) {
        console.warn('[FollowersListModal] Notice fetching user list:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLiveList();

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetUser?.id, type]);

  if (!isOpen || !targetUser) return null;

  const userIds = type === 'followers'
    ? (targetUser.followerIds || [])
    : (targetUser.followingIds || []);

  // Combine live users from API with any registeredUsers matching the IDs
  const combinedMap = new Map<string, User>();
  for (const u of registeredUsers) {
    if (userIds.includes(u.id)) {
      combinedMap.set(u.id, u);
    }
  }
  for (const u of liveUsers) {
    if (u.id) {
      combinedMap.set(u.id, {
        ...(combinedMap.get(u.id) || {}),
        ...u,
      });
    }
  }
  const matchedUsers = Array.from(combinedMap.values());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 flex items-center justify-center font-bold text-xs">
              <Users className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                {type === 'followers' ? 'Followers' : 'Following'} ({Math.max(userIds.length, matchedUsers.length)})
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Real registered animal caregivers and friends</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of registered users */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && matchedUsers.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-green-600" />
              <span className="text-xs">Loading {type}...</span>
            </div>
          ) : matchedUsers.length > 0 ? (
            matchedUsers.map(u => {
              const isSelf = currentUser?.id === u.id;
              const isFollowing = currentUser?.followingIds?.includes(u.id) || false;

              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-100 dark:border-slate-700"
                >
                  <div 
                    className="flex items-center gap-3 cursor-pointer min-w-0"
                    onClick={() => {
                      onClose();
                      onSelectUser(u);
                    }}
                  >
                    <img
                      src={u.avatar}
                      alt={u.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate hover:text-green-700 dark:hover:text-green-400">
                        {u.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        @{u.username || 'feeder'} • {u.location || 'Neighborhood'}
                      </p>
                    </div>
                  </div>

                  {!isSelf && (
                    <button
                      onClick={() => toggleFollowUser(u.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                        isFollowing
                          ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-red-50 hover:text-red-600'
                          : 'bg-green-600 text-white hover:bg-green-700 shadow-xs'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-3 h-3" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center">
              <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                No {type} yet
              </p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                {type === 'followers'
                  ? 'As other registered users follow this account, they will be listed here with live database synchronization.'
                  : 'Follow other caregivers and street animal feeders to build your network.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
