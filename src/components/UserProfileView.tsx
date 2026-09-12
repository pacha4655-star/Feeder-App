import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings,
  ArrowLeft,
  Edit3,
  Share2,
  MapPin,
  Grid,
  Image as ImageIcon,
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
  Camera,
  Info,
  Activity,
  Award
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
    viewingProfileUser,
    setViewingProfileUser,
    setShowSettings,
    setShowAddAnimal,
    setShowEditProfileModal,
    setShowCreatePost,
    openFollowersList,
    toggleFollowUser,
    setActiveAnimalId,
    showToast,
    setCurrentTab
  } = useApp();

  // Active viewing profile: either selected other user or logged-in current user
  const targetUser = viewingProfileUser || currentUser;
  const isSelf = !viewingProfileUser || (currentUser && viewingProfileUser.id === currentUser.id);

  // Content tabs: About | Posts | Updates (matching reference structure)
  const [activeTab, setActiveTab] = useState<'about' | 'posts' | 'updates'>('posts');

  // Post display mode within the Posts tab: 'feed' (full cards) or 'grid' (thumbnails)
  const [postViewMode, setPostViewMode] = useState<'grid' | 'feed'>('grid');
  
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

  // Filter user updates (e.g. medical updates, feedings, or text updates)
  const userUpdates = useMemo(() => {
    return allUserPosts.filter(p => 
      (p.content && (p.content.toLowerCase().includes('fed') || p.content.toLowerCase().includes('update') || p.content.toLowerCase().includes('rescue'))) ||
      p.animalId
    );
  }, [allUserPosts]);

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

  // Fallback brand cover if user hasn't set one yet
  const fallbackCoverImage = 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80';
  const coverImageSrc = displayUser.coverPhoto || fallbackCoverImage;

  return (
    <div className="w-full max-w-2xl sm:max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs font-sans overflow-hidden transition-colors">
      {/* ========================================================================= */}
      {/* TOP HEADER (Compact one-row navigation)                                   */}
      {/* ========================================================================= */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 sm:px-6 py-2.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
        {/* LEFT: Back button */}
        <div className="flex items-center min-w-[40px]">
          {!isSelf ? (
            <button
              onClick={handleBack}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:text-green-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors -ml-1 focus:outline-none focus:ring-2 focus:ring-green-500/30 cursor-pointer"
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

        {/* CENTER: Profile Username / Name */}
        <div className="flex-1 min-w-0 text-center px-2">
          <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
            @{displayUser.username || 'feeder'}
          </h1>
        </div>

        {/* RIGHT: Settings for Self OR Share for Other */}
        <div className="flex items-center justify-end min-w-[40px]">
          {isSelf ? (
            <button
              onClick={() => setShowSettings(true)}
              className="w-9 h-9 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-green-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-green-600/30 cursor-pointer"
              aria-label="Profile settings"
              id="profile-header-settings-button"
              title="Settings"
            >
              <Settings className="w-5 h-5 stroke-[2]" />
            </button>
          ) : (
            <button
              onClick={handleShareProfile}
              className="w-9 h-9 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-green-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-green-600/30 cursor-pointer"
              aria-label="Share profile"
              id="profile-header-share-button"
              title="Share profile"
            >
              <Share2 className="w-4.5 h-4.5 stroke-[2.2]" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. COVER / BACKGROUND IMAGE                                               */}
      {/* ========================================================================= */}
      <div className="relative w-full h-32 xs:h-36 sm:h-48 md:h-56 bg-slate-200 dark:bg-slate-800 overflow-hidden select-none">
        <img
          src={coverImageSrc}
          alt={`${displayUser.name}'s cover`}
          className="w-full h-full object-cover object-center"
          referrerPolicy="no-referrer"
        />
        {/* Ambient Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent pointer-events-none" />

        {/* Change Cover Photo button for Current User */}
        {isSelf && (
          <button
            onClick={() => setShowEditProfileModal(true)}
            id="profile-edit-cover-button"
            className="absolute bottom-2.5 right-2.5 sm:bottom-3.5 sm:right-3.5 px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/80 active:scale-95 text-white text-[11px] font-bold backdrop-blur-sm transition-all flex items-center gap-1.5 shadow-sm border border-white/20 cursor-pointer"
            title="Change cover photo"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Edit Cover</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. PROFILE HEADER CONTENT (Follows reference visual hierarchy)             */}
      {/* ========================================================================= */}
      <div className="px-4 sm:px-6 pb-4">
        {/* Overlapping Profile Photo */}
        <div className="relative -mt-10 xs:-mt-12 sm:-mt-14 mb-2 flex items-end justify-between">
          <div className="relative flex-shrink-0">
            <img
              src={displayUser.avatar}
              alt={displayUser.name}
              className="w-20 h-20 xs:w-24 xs:h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-white dark:ring-slate-900 border-2 border-green-600/40 shadow-md bg-white dark:bg-slate-800"
              referrerPolicy="no-referrer"
            />
            {displayUser.isVerified && (
              <span
                className="absolute bottom-1 right-1 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-slate-900 shadow-sm"
                title="Verified Feeder"
              >
                ✓
              </span>
            )}
          </div>
        </div>

        {/* Name + Verification Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {displayUser.name}
          </h2>
          {displayUser.roles && displayUser.roles.length > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800/60">
              🐾 {displayUser.roles[0]}
            </span>
          )}
        </div>

        {/* Username / Location / Joined Date */}
        <div className="flex items-center gap-2.5 sm:gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 flex-wrap">
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            @{displayUser.username || 'feeder'}
          </span>
          {displayUser.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span className="truncate">{displayUser.location}</span>
            </span>
          )}
          {displayUser.joinedDate && (
            <span className="flex items-center gap-1 text-slate-400">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              <span>{displayUser.joinedDate}</span>
            </span>
          )}
        </div>

        {/* Profile Statistics (Posts, Followers, Following) */}
        <div className="mt-3.5 py-2.5 px-3 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 grid grid-cols-3 text-center">
          {/* Posts Count */}
          <button
            onClick={() => setActiveTab('posts')}
            className="flex flex-col items-center justify-center group cursor-pointer"
          >
            <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
              {allUserPosts.length}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
              Posts
            </span>
          </button>

          {/* Followers Count */}
          <button
            onClick={() => openFollowersList(displayUser, 'followers')}
            className="flex flex-col items-center justify-center group cursor-pointer border-x border-slate-200/60 dark:border-slate-700/60"
          >
            <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
              {realFollowersCount}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
              Followers
            </span>
          </button>

          {/* Following Count */}
          <button
            onClick={() => openFollowersList(displayUser, 'following')}
            className="flex flex-col items-center justify-center group cursor-pointer"
          >
            <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
              {realFollowingCount}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
              Following
            </span>
          </button>
        </div>

        {/* Action Buttons: [Edit Profile] [Share] OR [Follow] [Share] */}
        <div className="mt-3 flex items-center gap-2 sm:gap-3">
          {isSelf ? (
            <>
              <button
                onClick={() => setShowEditProfileModal(true)}
                id="profile-edit-button"
                className="flex-1 h-9 sm:h-10 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-200" />
                <span>Edit Profile</span>
              </button>
              <button
                onClick={handleShareProfile}
                id="profile-share-button"
                className="flex-1 h-9 sm:h-10 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 active:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border border-slate-200/70 dark:border-slate-700 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                <span>Share</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleFollowToggle}
                id="profile-follow-toggle-button"
                className={`flex-1 h-9 sm:h-10 px-4 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
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
                className="flex-1 h-9 sm:h-10 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 active:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border border-slate-200/70 dark:border-slate-700 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                <span>Share</span>
              </button>
            </>
          )}
        </div>

        {/* Bio (Directly below actions per reference hierarchy) */}
        {displayUser.bio && (
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-3 leading-relaxed whitespace-pre-line">
            {displayUser.bio}
          </p>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. PROFILE TABS (About | Posts | Updates)                                 */}
      {/* ========================================================================= */}
      <div className="border-t border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center justify-around border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
          {/* About Tab */}
          <button
            onClick={() => setActiveTab('about')}
            id="profile-tab-about"
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'about'
                ? 'text-green-700 dark:text-green-400 bg-white dark:bg-slate-900'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Info className="w-4 h-4 stroke-[2]" />
            <span>About</span>
            {activeTab === 'about' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600 dark:bg-green-500" />
            )}
          </button>

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

          {/* Updates Tab */}
          <button
            onClick={() => setActiveTab('updates')}
            id="profile-tab-updates"
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'updates'
                ? 'text-green-700 dark:text-green-400 bg-white dark:bg-slate-900'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-4 h-4 stroke-[2]" />
            <span>Updates</span>
            <span className="text-[10px] opacity-70 font-semibold">({userUpdates.length})</span>
            {activeTab === 'updates' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600 dark:bg-green-500" />
            )}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 4. TAB CONTENT AREA                                                       */}
        {/* ========================================================================= */}
        <div className="p-2 sm:p-4">
          {/* ----------------------------------------------------------------------- */}
          {/* TAB 1: ABOUT                                                            */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'about' && (
            <div className="space-y-3.5">
              {/* Caregiver Badges & Verified Status */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-green-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Verified Feeder Caregiver
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Authenticated member of the Feeder community
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/60 px-2.5 py-1 rounded-full border border-green-200 dark:border-green-800">
                    {displayUser.karmaPoints || 100} Karma
                  </span>
                </div>

                {/* Roles & Interests */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700 flex flex-wrap gap-1.5">
                  {(displayUser.roles || ['Feeder', 'Animal Lover']).map((role, idx) => (
                    <span
                      key={`role_${idx}`}
                      className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                      🐾 {role}
                    </span>
                  ))}
                  {(displayUser.interests || ['Street Animals', 'Adoption']).map((interest, idx) => (
                    <span
                      key={`interest_${idx}`}
                      className="px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-green-50/80 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-green-200/60 dark:border-green-800/40"
                    >
                      #{interest}
                    </span>
                  ))}
                </div>
              </div>

              {/* Companion Animal / Dog Card */}
              {(displayUser.petName || displayUser.petPhoto) ? (
                <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex-shrink-0">
                      <img
                        src={displayUser.petPhoto || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&auto=format&fit=crop&q=80'}
                        alt={displayUser.petName || 'Companion Animal'}
                        className="w-12 h-12 rounded-xl object-cover border border-amber-300 dark:border-amber-700 shadow-2xs"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute -bottom-1 -right-1 text-[10px] bg-white dark:bg-slate-900 rounded-full px-1 shadow-2xs border border-amber-200 dark:border-amber-800">
                        🐾
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {displayUser.petName}
                        </h4>
                        <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.2 rounded-md">
                          {displayUser.petSpecies || 'Companion'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {displayUser.petBreed || 'Companion Animal'}{displayUser.petAge ? ` • ${displayUser.petAge}` : ''}
                      </p>
                    </div>
                  </div>
                  {isSelf && (
                    <button
                      onClick={() => setShowEditProfileModal(true)}
                      className="h-7 px-2.5 text-[11px] font-bold text-amber-900 dark:text-amber-200 hover:text-amber-950 bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 rounded-lg border border-amber-200 dark:border-amber-800 transition-colors flex items-center gap-1 flex-shrink-0 cursor-pointer"
                      title="Edit companion animal info"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
              ) : isSelf ? (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-sm flex-shrink-0">
                      🐶
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Add Companion Animal</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Feature your pet or feeder dog on your profile</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEditProfileModal(true)}
                    className="h-7 px-3 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 hover:bg-amber-200 rounded-lg transition-colors flex items-center gap-1 flex-shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                    <span>Add</span>
                  </button>
                </div>
              ) : null}

              {/* Registered Animals Under Care */}
              {userAnimals.length > 0 && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <PawPrint className="w-3.5 h-3.5 text-green-600" />
                      <span>Registered Animals Under Care ({userAnimals.length})</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {userAnimals.map(a => (
                      <div
                        key={a.id}
                        onClick={() => setActiveAnimalId(a.id)}
                        className="bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-2.5 text-center hover:shadow-md transition-all cursor-pointer group shadow-2xs"
                      >
                        <img
                          src={a.avatar}
                          alt={a.name}
                          className="w-14 h-14 rounded-full object-cover mx-auto mb-1.5 border-2 border-white dark:border-slate-800 shadow-xs group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">{a.name}</h5>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{a.breed}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 2: POSTS                                                            */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'posts' && (
            <div>
              {/* Posts View Mode Switch (Grid vs Feed) */}
              {allUserPosts.length > 0 && (
                <div className="flex items-center justify-end gap-1 mb-2 px-1">
                  <button
                    onClick={() => setPostViewMode('grid')}
                    className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      postViewMode === 'grid'
                        ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title="Grid view"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPostViewMode('feed')}
                    className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      postViewMode === 'feed'
                        ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title="Feed view"
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                </div>
              )}

              {loadingUserPosts ? (
                <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                  <span>Loading posts...</span>
                </div>
              ) : allUserPosts.length > 0 ? (
                postViewMode === 'grid' ? (
                  /* 3-Column Social Media Grid */
                  <div className="grid grid-cols-3 gap-1 sm:gap-1.5 md:gap-2">
                    {allUserPosts.map((post, idx) => {
                      const hasMedia = Array.isArray(post.media) && post.media.length > 0;
                      const mediaUrl = hasMedia ? post.media[0] : null;
                      const isMulti = hasMedia && post.media.length > 1;

                      return (
                        <div
                          key={post.id ? `grid_post_${post.id}` : `grid_post_${idx}`}
                          onClick={() => setSelectedGridPost(post)}
                          className="group relative aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg sm:rounded-xl overflow-hidden cursor-pointer border border-slate-200/60 dark:border-slate-700 shadow-2xs hover:shadow-xs transition-all"
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
                            <div className="w-full h-full p-2 sm:p-3 flex flex-col justify-between bg-gradient-to-br from-green-50/80 to-slate-100 dark:from-slate-800 dark:to-slate-850 text-slate-800 dark:text-slate-200">
                              <div className="flex items-center justify-between text-green-700 dark:text-green-400 opacity-70">
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
                  /* Full Feed Cards */
                  <div className="space-y-3">
                    {allUserPosts.map((post, idx) => (
                      <PostCard key={post.id ? `feed_post_${post.id}` : `feed_post_${idx}`} post={post} />
                    ))}
                  </div>
                )
              ) : (
                /* Empty Posts State */
                <div className="py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-400 flex items-center justify-center mx-auto text-xl mb-2.5">
                    📝
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">No posts yet</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
                    {isSelf
                      ? 'Share your animal feedings, rescue updates, or companion animal moments with the community.'
                      : `@${displayUser.username || 'user'} has not published any posts yet.`}
                  </p>
                  {isSelf && (
                    <button
                      onClick={() => setShowCreatePost(true)}
                      id="profile-empty-create-post-btn"
                      className="mt-3.5 h-9 px-4 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Create Post</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 3: UPDATES                                                          */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'updates' && (
            <div>
              {userUpdates.length > 0 ? (
                <div className="space-y-3">
                  {userUpdates.map((post, idx) => (
                    <PostCard key={post.id ? `update_${post.id}` : `update_${idx}`} post={post} />
                  ))}
                </div>
              ) : (
                <div className="py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto text-xl mb-2">
                    📢
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">No updates shared yet</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
                    {isSelf
                      ? 'Post street animal feeding logs, medical rescues, or adoption statuses to show them here.'
                      : `@${displayUser.username || 'user'} has not posted feeding updates yet.`}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. SELECTED POST MODAL / DETAIL VIEW (When tapping a grid post)           */}
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
              <span className="text-xs font-bold text-slate-800 dark:text-white">Post by {displayUser.name}</span>
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
