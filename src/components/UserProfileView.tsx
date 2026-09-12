import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings,
  ArrowLeft,
  Edit3,
  Share2,
  MapPin,
  Grid,
  Image as ImageIcon,
  Bookmark,
  PawPrint,
  Plus,
  UserPlus,
  UserCheck,
  ShieldCheck,
  Heart,
  MessageCircle,
  X,
  Sparkles,
  Calendar,
  Layers,
  FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PostCard } from './PostCard';
import { getUserProfileFromSupabase } from '../services/profileService';
import { fetchUserPostsFromSupabase } from '../services/postService';
import { User, Post } from '../types';

export const UserProfileView: React.FC = () => {
  const {
    user: currentUser,
    animals,
    posts: globalPosts,
    communities,
    registeredUsers,
    viewingProfileUser,
    setViewingProfileUser,
    setShowSettings,
    setShowAddAnimal,
    setShowEditProfileModal,
    setShowCreatePost,
    openFollowersList,
    openUserProfile,
    toggleFollowUser,
    setActiveAnimalId,
    setActiveCommunityId,
    showToast,
    setCurrentTab
  } = useApp();

  // Active viewing profile: either selected other user or logged-in current user
  const targetUser = viewingProfileUser || currentUser;
  const isSelf = !viewingProfileUser || (currentUser && viewingProfileUser.id === currentUser.id);

  // Content tabs: Posts (grid), Media (photos only), Saved (only for self), Animals
  const [activeTab, setActiveTab] = useState<'posts' | 'media' | 'saved' | 'animals'>('posts');
  
  // Real-time live profile data & posts fetched for other user
  const [liveProfile, setLiveProfile] = useState<User | null>(null);
  const [userSpecificPosts, setUserSpecificPosts] = useState<Post[] | null>(null);
  const [loadingUserPosts, setLoadingUserPosts] = useState(false);

  // Selected post overlay when tapping a thumbnail in the 3-column grid
  const [selectedGridPost, setSelectedGridPost] = useState<Post | null>(null);

  // Fetch updated profile and posts when target user changes
  useEffect(() => {
    if (!targetUser?.id) return;

    let isMounted = true;

    if (!isSelf) {
      setLoadingUserPosts(true);
      // Fetch fresh profile from Supabase
      getUserProfileFromSupabase(targetUser.id)
        .then(fresh => {
          if (isMounted && fresh) {
            setLiveProfile(fresh);
          }
        })
        .catch(err => {
          console.warn('[UserProfileView] Error fetching target user profile:', err);
        });

      // Fetch user's real posts from Supabase
      fetchUserPostsFromSupabase(targetUser.id, currentUser?.id)
        .then(fetchedPosts => {
          if (isMounted) {
            setUserSpecificPosts(fetchedPosts);
            setLoadingUserPosts(false);
          }
        })
        .catch(err => {
          console.warn('[UserProfileView] Error fetching target user posts:', err);
          if (isMounted) {
            setLoadingUserPosts(false);
          }
        });
    } else {
      setLiveProfile(null);
      setUserSpecificPosts(null);
    }

    return () => {
      isMounted = false;
    };
  }, [targetUser?.id, isSelf, currentUser?.id]);

  if (!currentUser && !targetUser) return null;

  // Active user to display: merge live profile if available
  const displayUser: User = (liveProfile && !isSelf)
    ? { ...targetUser!, ...liveProfile }
    : (targetUser || currentUser!);

  // Real user posts:
  // For target user: use userSpecificPosts if available, or filter from globalPosts
  // For current user: filter from globalPosts where userId === currentUser.id
  const allUserPosts: Post[] = useMemo(() => {
    if (!isSelf && userSpecificPosts !== null) {
      return userSpecificPosts;
    }
    const uid = displayUser.id;
    return globalPosts.filter(p => p.userId === uid);
  }, [isSelf, userSpecificPosts, displayUser.id, globalPosts]);

  // Posts with photo or video media
  const mediaPosts = useMemo(() => {
    return allUserPosts.filter(p => Array.isArray(p.media) && p.media.length > 0);
  }, [allUserPosts]);

  // Saved bookmarks (only relevant for current user)
  const savedPosts = useMemo(() => {
    return globalPosts.filter(p => p.isSaved);
  }, [globalPosts]);

  // Animals associated with this user
  const userAnimals = useMemo(() => {
    return animals.filter(a => a.ownerId === displayUser.id || a.ownerName === displayUser.name);
  }, [animals, displayUser.id, displayUser.name]);

  // Real follower and following counts derived from actual database records
  const realFollowersCount = displayUser.followerIds
    ? displayUser.followerIds.length
    : (displayUser.followersCount || 0);

  const realFollowingCount = displayUser.followingIds
    ? displayUser.followingIds.length
    : (displayUser.followingCount || 0);

  // Real follow status between current user and target user
  const isFollowing = useMemo(() => {
    if (isSelf) return false;
    if (currentUser?.followingIds && Array.isArray(currentUser.followingIds)) {
      return currentUser.followingIds.includes(displayUser.id);
    }
    if (displayUser.followerIds && Array.isArray(displayUser.followerIds)) {
      return displayUser.followerIds.includes(currentUser?.id || '');
    }
    return false;
  }, [isSelf, currentUser?.followingIds, currentUser?.id, displayUser.followerIds, displayUser.id]);

  // Handle follow/unfollow toggle
  const handleFollowToggle = async () => {
    if (isSelf) return;
    try {
      await toggleFollowUser(displayUser.id);
      // Optimistically update live profile follower state
      setLiveProfile(prev => {
        const base = prev || displayUser;
        const willFollow = !isFollowing;
        const currFollowers = base.followerIds || [];
        const nextFollowers = willFollow
          ? [...currFollowers, currentUser?.id || '']
          : currFollowers.filter(id => id !== currentUser?.id);
        return {
          ...base,
          followerIds: nextFollowers,
          followersCount: nextFollowers.length,
        };
      });
    } catch (err) {
      console.error('[UserProfileView] Follow error:', err);
    }
  };

  // Handle share profile
  const handleShareProfile = async () => {
    const shareUrl = `${window.location.origin}?profile=${encodeURIComponent(displayUser.id)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayUser.name} on Feeder`,
          text: `Connect with ${displayUser.name} on Feeder Community!`,
          url: shareUrl,
        });
        return;
      } catch (e) {
        // Fallback to clipboard
      }
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Profile link copied to clipboard!', 'success');
      } catch (e) {
        showToast('Profile URL ready to share.');
      }
    }
  };

  // Back button action
  const handleBack = () => {
    if (!isSelf) {
      setViewingProfileUser(null);
    } else {
      setCurrentTab('home');
    }
  };

  return (
    <div className="w-full max-w-2xl sm:max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs font-sans overflow-hidden">
      {/* ========================================================================= */}
      {/* 1. HEADER (ONE ROW on mobile, compact, no horizontal scroll, no clipping) */}
      {/* ========================================================================= */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 sm:px-6 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
        {/* LEFT: Back button (when viewing another user or from subview) */}
        <div className="flex items-center min-w-[40px]">
          {!isSelf ? (
            <button
              onClick={handleBack}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:text-green-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors -ml-1 focus:outline-none focus:ring-2 focus:ring-green-500/30"
              aria-label="Go back"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
          ) : (
            <span className="text-xs font-extrabold tracking-wider text-green-700 dark:text-green-400 uppercase hidden xs:inline">
              FEEDER
            </span>
          )}
        </div>

        {/* CENTER: Profile Name / Feeder Identity */}
        <div className="flex-1 min-w-0 text-center px-2">
          <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
            {displayUser.name}
          </h1>
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate -mt-0.5">
            @{displayUser.username || 'feeder'}
          </p>
        </div>

        {/* RIGHT: Settings icon for Current User OR Share icon for Other User */}
        <div className="flex items-center justify-end min-w-[40px]">
          {isSelf ? (
            <button
              onClick={() => setShowSettings(true)}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-green-700 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-green-600/30 cursor-pointer"
              aria-label="Profile settings"
              id="profile-header-settings-button"
              title="Profile settings"
            >
              <Settings className="w-5 h-5 stroke-[2]" />
            </button>
          ) : (
            <button
              onClick={handleShareProfile}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-green-700 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-green-600/30 cursor-pointer"
              aria-label="Share profile"
              id="profile-header-share-button"
              title="Share profile"
            >
              <Share2 className="w-4 h-4 stroke-[2.2]" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PROFILE TOP SECTION (Social profile layout with photo & statistics)    */}
      {/* ========================================================================= */}
      <div className="px-4 sm:px-6 pt-4 pb-3">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* LEFT: Profile Avatar */}
          <div className="relative flex-shrink-0">
            <img
              src={displayUser.avatar}
              alt={displayUser.name}
              className="w-20 h-20 sm:w-22 sm:h-22 rounded-full object-cover ring-4 ring-green-100 border-2 border-green-600 shadow-sm bg-slate-100"
              referrerPolicy="no-referrer"
            />
            {displayUser.isVerified && (
              <span
                className="absolute bottom-0 right-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-white shadow-xs"
                title="Verified Feeder"
              >
                ✓
              </span>
            )}
          </div>

          {/* RIGHT: Real Profile Statistics */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-3 gap-1 sm:gap-2 text-center">
              {/* Posts Count */}
              <button
                onClick={() => setActiveTab('posts')}
                className="flex flex-col items-center justify-center py-1 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
              >
                <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
                  {allUserPosts.length}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  Posts
                </span>
              </button>

              {/* Followers Count */}
              <button
                onClick={() => openFollowersList(displayUser, 'followers')}
                className="flex flex-col items-center justify-center py-1 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
              >
                <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
                  {realFollowersCount}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 group-hover:text-green-700 dark:group-hover:text-green-400 mt-0.5 transition-colors">
                  Followers
                </span>
              </button>

              {/* Following Count */}
              <button
                onClick={() => openFollowersList(displayUser, 'following')}
                className="flex flex-col items-center justify-center py-1 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
              >
                <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
                  {realFollowingCount}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 group-hover:text-green-700 dark:group-hover:text-green-400 mt-0.5 transition-colors">
                  Following
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* User Identity & Bio Details */}
        <div className="mt-3 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              {displayUser.name}
            </h2>
            {displayUser.roles && displayUser.roles.length > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800/60">
                🐾 {displayUser.roles[0]}
              </span>
            )}
          </div>

          {/* Location & Joined Date */}
          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 flex-wrap">
            {displayUser.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>{displayUser.location}</span>
              </span>
            )}
            {displayUser.joinedDate && (
              <span className="flex items-center gap-1 text-slate-400">
                <Calendar className="w-3 h-3" />
                <span>{displayUser.joinedDate}</span>
              </span>
            )}
          </div>

          {/* Real Bio */}
          {displayUser.bio && (
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-2 leading-relaxed whitespace-pre-line">
              {displayUser.bio}
            </p>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 3. PROFILE ACTION BUTTONS                                                  */}
        {/* ========================================================================= */}
        <div className="mt-3.5 flex items-center gap-2 sm:gap-3">
          {isSelf ? (
            <>
              <button
                onClick={() => setShowEditProfileModal(true)}
                id="profile-edit-button"
                className="flex-1 h-9 sm:h-9.5 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-200" />
                <span>Edit Profile</span>
              </button>
              <button
                onClick={handleShareProfile}
                id="profile-share-button"
                className="flex-1 h-9 sm:h-9.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 active:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border border-slate-200/70 dark:border-slate-700 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                <span>Share Profile</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleFollowToggle}
                id="profile-follow-toggle-button"
                className={`flex-1 h-9 sm:h-9.5 px-4 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                  isFollowing
                    ? 'bg-slate-100 dark:bg-slate-800 hover:bg-red-50 hover:text-red-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                    : 'bg-green-700 hover:bg-green-800 text-white shadow-green-700/20'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Follow</span>
                  </>
                )}
              </button>
              <button
                onClick={handleShareProfile}
                id="profile-other-share-button"
                className="flex-1 h-9 sm:h-9.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 active:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border border-slate-200/70 dark:border-slate-700 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                <span>Share Profile</span>
              </button>
            </>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 4. COMPANION ANIMAL / PET PROFILE (Clean secondary position)               */}
        {/* ========================================================================= */}
        {isSelf && (
          <div className="mt-3">
            {currentUser?.petName || currentUser?.petPhoto ? (
              <div className="p-2.5 sm:p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative flex-shrink-0">
                    <img
                      src={currentUser.petPhoto || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&auto=format&fit=crop&q=80'}
                      alt={currentUser.petName || 'Companion Animal'}
                      className="w-10 h-10 rounded-xl object-cover border border-amber-300"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute -bottom-1 -right-1 text-[10px] bg-white rounded-full px-1 shadow-2xs border border-amber-200">
                      🐾
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-slate-900 truncate">
                        {currentUser.petName}
                      </h3>
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md">
                        {currentUser.petSpecies || 'Companion'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {currentUser.petBreed || 'Companion Animal'}{currentUser.petAge ? ` • ${currentUser.petAge}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditProfileModal(true)}
                  className="h-7 px-2.5 text-[11px] font-bold text-amber-900 hover:text-amber-950 bg-white hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors flex items-center gap-1 flex-shrink-0"
                  title="Edit companion animal info"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-sm flex-shrink-0">
                    🐶
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">Add Your Dog / Pet Photo</p>
                    <p className="text-[10px] text-slate-500 truncate">Feature your companion animal on your profile</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditProfileModal(true)}
                  className="h-7 px-3 text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors flex items-center gap-1 flex-shrink-0"
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                  <span>Add</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. CONTENT TABS (Posts | Media | Saved | Animals)                         */}
      {/* ========================================================================= */}
      <div className="border-t border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center justify-around border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
          {/* Posts Tab */}
          <button
            onClick={() => setActiveTab('posts')}
            id="profile-tab-posts"
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'posts'
                ? 'text-green-700 dark:text-green-400 bg-white dark:bg-slate-900'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Grid className="w-4 h-4 stroke-[2]" />
            <span>Posts</span>
            <span className="text-[10px] opacity-70 font-semibold">({allUserPosts.length})</span>
            {activeTab === 'posts' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600 dark:bg-green-500" />
            )}
          </button>

          {/* Media Tab */}
          <button
            onClick={() => setActiveTab('media')}
            id="profile-tab-media"
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'media'
                ? 'text-green-700 dark:text-green-400 bg-white dark:bg-slate-900'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <ImageIcon className="w-4 h-4 stroke-[2]" />
            <span>Media</span>
            <span className="text-[10px] opacity-70 font-semibold">({mediaPosts.length})</span>
            {activeTab === 'media' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600 dark:bg-green-500" />
            )}
          </button>

          {/* Saved Tab (Only for current user) */}
          {isSelf && (
            <button
              onClick={() => setActiveTab('saved')}
              id="profile-tab-saved"
              className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-bold transition-all relative cursor-pointer ${
                activeTab === 'saved'
                  ? 'text-green-700 dark:text-green-400 bg-white dark:bg-slate-900'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Bookmark className="w-4 h-4 stroke-[2]" />
              <span>Saved</span>
              <span className="text-[10px] opacity-70 font-semibold">({savedPosts.length})</span>
              {activeTab === 'saved' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600 dark:bg-green-500" />
              )}
            </button>
          )}

          {/* Animals Tab */}
          <button
            onClick={() => setActiveTab('animals')}
            id="profile-tab-animals"
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'animals'
                ? 'text-green-700 dark:text-green-400 bg-white dark:bg-slate-900'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <PawPrint className="w-4 h-4 stroke-[2]" />
            <span>Animals</span>
            <span className="text-[10px] opacity-70 font-semibold">({userAnimals.length})</span>
            {activeTab === 'animals' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600 dark:bg-green-500" />
            )}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 6. TAB CONTENT                                                            */}
        {/* ========================================================================= */}
        <div className="p-1 sm:p-2">
          {/* 6A: Posts Tab (3-Column Social Grid) */}
          {activeTab === 'posts' && (
            <div>
              {allUserPosts.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 sm:gap-1.5 md:gap-2">
                  {allUserPosts.map((post, idx) => {
                    const hasMedia = Array.isArray(post.media) && post.media.length > 0;
                    const mediaUrl = hasMedia ? post.media[0] : null;
                    const isMulti = hasMedia && post.media.length > 1;

                    return (
                      <div
                        key={post.id ? `grid_post_${post.id}` : `grid_post_${idx}`}
                        onClick={() => setSelectedGridPost(post)}
                        className="group relative aspect-square bg-slate-100 rounded-lg sm:rounded-xl overflow-hidden cursor-pointer border border-slate-200/60 shadow-2xs hover:shadow-xs transition-shadow"
                      >
                        {hasMedia && mediaUrl ? (
                          <>
                            <img
                              src={mediaUrl}
                              alt={post.content || 'Post thumbnail'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              referrerPolicy="no-referrer"
                            />
                            {isMulti && (
                              <span className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white p-1 rounded-md">
                                <Layers className="w-3 h-3 stroke-[2.5]" />
                              </span>
                            )}
                          </>
                        ) : (
                          // Text-only post thumbnail: clean card presentation with subtle gradient
                          <div className="w-full h-full p-2 sm:p-3 flex flex-col justify-between bg-gradient-to-br from-green-50/80 to-slate-100 text-slate-800">
                            <div className="flex items-center justify-between text-green-700 opacity-60">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span className="text-[9px] font-bold uppercase tracking-wider">Note</span>
                            </div>
                            <p className="text-[11px] sm:text-xs font-medium line-clamp-3 leading-snug">
                              {post.content}
                            </p>
                            <span className="text-[9px] text-slate-400 font-semibold truncate">
                              {post.createdAt}
                            </span>
                          </div>
                        )}

                        {/* Hover Overlay with Likes & Comments Count */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 sm:gap-4 text-white text-xs font-bold">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3.5 h-3.5 fill-white" />
                            <span>{post.likesCount || 0}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3.5 h-3.5 fill-white" />
                            <span>{post.commentsCount || 0}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Empty Posts State */
                <div className="py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-700 flex items-center justify-center mx-auto text-xl mb-2.5">
                    📝
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">No posts yet</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                    {isSelf
                      ? 'Share your animal feedings, rescue updates, or pet moments with the community.'
                      : `${displayUser.name} has not published any posts yet.`}
                  </p>
                  {isSelf && (
                    <button
                      onClick={() => setShowCreatePost(true)}
                      id="profile-empty-create-post-btn"
                      className="mt-3.5 h-9 px-4 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Create Post</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 6B: Media Tab */}
          {activeTab === 'media' && (
            <div>
              {mediaPosts.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 sm:gap-1.5 md:gap-2">
                  {mediaPosts.map((post, idx) => {
                    const mediaUrl = post.media && post.media[0];
                    const isMulti = post.media && post.media.length > 1;

                    return (
                      <div
                        key={post.id ? `media_${post.id}` : `media_${idx}`}
                        onClick={() => setSelectedGridPost(post)}
                        className="group relative aspect-square bg-slate-100 rounded-lg sm:rounded-xl overflow-hidden cursor-pointer border border-slate-200/60 shadow-2xs"
                      >
                        <img
                          src={mediaUrl}
                          alt={post.content || 'Media thumbnail'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          referrerPolicy="no-referrer"
                        />
                        {isMulti && (
                          <span className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white p-1 rounded-md">
                            <Layers className="w-3 h-3 stroke-[2.5]" />
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-xs font-bold">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3.5 h-3.5 fill-white" />
                            <span>{post.likesCount || 0}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3.5 h-3.5 fill-white" />
                            <span>{post.commentsCount || 0}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto text-xl mb-2">
                    🖼️
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">No media photos yet</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                    {isSelf
                      ? 'Photos and videos attached to your posts will appear here.'
                      : `${displayUser.name} has not shared photos yet.`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 6C: Saved Tab (Bookmarks) */}
          {activeTab === 'saved' && isSelf && (
            <div>
              {savedPosts.length > 0 ? (
                <div className="p-2 sm:p-3 space-y-3">
                  {savedPosts.map((p, idx) => (
                    <PostCard key={p.id ? `saved_${p.id}` : `saved_${idx}`} post={p} />
                  ))}
                </div>
              ) : (
                <div className="py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-xl mb-2">
                    🔖
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">No saved posts</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                    Tap the bookmark icon on any community post to save it for quick reference here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 6D: Animals Tab */}
          {activeTab === 'animals' && (
            <div className="p-2 sm:p-4">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700">
                  {isSelf ? 'My Registered Animals' : `${displayUser.name}'s Animals`} ({userAnimals.length})
                </span>
                {isSelf && (
                  <button
                    onClick={() => setShowAddAnimal(true)}
                    id="profile-tab-add-animal-btn"
                    className="h-7 px-3 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                    <span>Add Animal</span>
                  </button>
                )}
              </div>

              {userAnimals.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {userAnimals.map(a => (
                    <div
                      key={a.id}
                      onClick={() => setActiveAnimalId(a.id)}
                      className="bg-white border border-slate-200/80 rounded-2xl p-3 text-center hover:shadow-md transition-all cursor-pointer group shadow-2xs"
                    >
                      <img
                        src={a.avatar}
                        alt={a.name}
                        className="w-16 h-16 rounded-full object-cover mx-auto mb-2 border-2 border-white shadow-xs group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                      <h4 className="text-xs font-bold text-slate-900 truncate">{a.name}</h4>
                      <p className="text-[11px] text-slate-500 truncate">{a.breed}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold rounded-full bg-green-50 text-green-800 border border-green-200">
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <span className="text-2xl block mb-2">🐾</span>
                  {isSelf
                    ? 'No companion animals registered under your profile yet.'
                    : `${displayUser.name} has not registered any companion animals.`}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. SELECTED POST MODAL / DETAIL VIEW (When tapping a grid post)           */}
      {/* ========================================================================= */}
      {selectedGridPost && (
        <div
          onClick={() => setSelectedGridPost(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col relative"
          >
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between rounded-t-3xl">
              <span className="text-xs font-bold text-slate-800 dark:text-white">Post from {displayUser.name}</span>
              <button
                onClick={() => setSelectedGridPost(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close post"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 sm:p-4">
              <PostCard post={selectedGridPost} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
