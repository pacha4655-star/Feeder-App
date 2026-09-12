import React, { useState, useEffect } from 'react';
import { X, MapPin, Calendar, Heart, MessageCircle, UserPlus, UserCheck, ShieldCheck } from 'lucide-react';
import { User, Post } from '../types';
import { useApp } from '../context/AppContext';
import { getUserProfileFromSupabase } from '../services/profileService';

interface UserDetailModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({ user: targetUser, isOpen, onClose }) => {
  const { user: currentUser, posts, toggleFollowUser, toggleLikePost } = useApp();
  const [liveProfile, setLiveProfile] = useState<User | null>(null);

  useEffect(() => {
    if (!isOpen || !targetUser?.id) {
      setLiveProfile(null);
      return;
    }

    let isMounted = true;
    getUserProfileFromSupabase(targetUser.id).then(full => {
      if (isMounted && full) {
        setLiveProfile(full);
      }
    }).catch(err => {
      console.warn('[UserDetailModal] Notice fetching user profile:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetUser?.id]);

  if (!isOpen || !targetUser) return null;

  const displayUser = liveProfile ? { ...targetUser, ...liveProfile } : targetUser;
  const isSelf = currentUser?.id === displayUser.id;
  const isFollowing = currentUser?.followingIds?.includes(displayUser.id) || false;
  
  // Real followers count directly derived from actual followerIds or database record
  const followerCount = displayUser.followerIds ? displayUser.followerIds.length : (displayUser.followersCount || 0);
  const followingCount = displayUser.followingIds ? displayUser.followingIds.length : (displayUser.followingCount || 0);

  // Real posts created by this user
  const userPosts = posts.filter(p => p.userId === displayUser.id);

  const handleFollowClick = async () => {
    if (isSelf) return;
    await toggleFollowUser(displayUser.id);
    setLiveProfile(prev => {
      const base = prev || displayUser;
      const willBeFollowing = !isFollowing;
      const currentFollowers = base.followerIds || [];
      const updatedFollowers = willBeFollowing
        ? [...currentFollowers, currentUser?.id || '']
        : currentFollowers.filter(id => id !== currentUser?.id);
      return {
        ...base,
        followerIds: updatedFollowers,
        followersCount: updatedFollowers.length,
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <span>Profile</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 dark:text-slate-400 font-normal">@{displayUser.username || displayUser.name.toLowerCase().replace(/\s+/g, '')}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* User Profile Card */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={displayUser.avatar}
                alt={displayUser.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-green-500 shadow-xs flex-shrink-0"
                referrerPolicy="no-referrer"
              />
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    {displayUser.name}
                  </h3>
                  {displayUser.isVerified && (
                    <ShieldCheck className="w-4 h-4 text-green-600" title="Verified Feeder / Rescuer" />
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  @{displayUser.username || 'animal_caregiver'}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {displayUser.location || 'Neighborhood Feeder'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-0.5">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {displayUser.joinedDate || 'Joined 2026'}
                  </span>
                </div>
              </div>
            </div>

            {/* Follow / Edit Button */}
            {!isSelf && (
              <button
                onClick={handleFollowClick}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  isFollowing
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-red-50 hover:text-red-600 border border-slate-200 dark:border-slate-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Follow</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Bio */}
          {displayUser.bio && (
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
              {displayUser.bio}
            </p>
          )}

          {/* Real Follower & Following Stats */}
          <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-slate-800 text-center">
            <div>
              <div className="text-sm font-black text-slate-900 dark:text-white">{userPosts.length}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Posts</div>
            </div>
            <div>
              <div className="text-sm font-black text-slate-900 dark:text-white">{followerCount}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Followers</div>
            </div>
            <div>
              <div className="text-sm font-black text-slate-900 dark:text-white">{followingCount}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Following</div>
            </div>
          </div>

          {/* Roles & Tags */}
          {displayUser.roles && displayUser.roles.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Roles</h4>
              <div className="flex flex-wrap gap-1.5">
                {displayUser.roles.map(r => (
                  <span
                    key={r}
                    className="px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 text-xs font-semibold border border-green-200 dark:border-green-800/60"
                  >
                    🐾 {r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* User's Real Posts */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
              <span>Recent Activity ({userPosts.length})</span>
              <span className="text-[10px] text-slate-400 font-normal">Real database posts</span>
            </h4>

            {userPosts.length > 0 ? (
              <div className="space-y-2.5">
                {userPosts.map((post, idx) => (
                  <div key={post.id ? `ud_post_${post.id}` : `ud_post_${idx}`} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 space-y-2">
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed line-clamp-3">
                      {post.content}
                    </p>
                    {post.media && post.media.length > 0 && (
                      <div className="rounded-xl overflow-hidden max-h-40">
                        <img src={post.media[0]} alt="Post media" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                      <span className="text-[10px] text-slate-400">{post.createdAt}</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleLikePost(post.id)}
                          className={`flex items-center gap-1 hover:text-red-600 transition-colors ${
                            post.isLiked ? 'text-red-600 font-bold' : ''
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${post.isLiked ? 'fill-red-600' : ''}`} />
                          <span>{post.likesCount}</span>
                        </button>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{post.commentsCount}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">No posts published yet by {displayUser.name}.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
