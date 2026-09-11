import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Animal,
  Community,
  HelpRequest,
  Post,
  User,
  AdoptionListing,
  FosterRequest,
  FeedingPoint,
  NotificationItem,
  NearbyMarker,
  Story,
  VeterinaryHospital,
  Comment as PostComment
} from '../types';
import { api } from '../services/api';
import {
  signInWithGoogle,
  registerWithEmail,
  loginWithEmail,
  logoutUser,
  subscribeToAuth,
  checkRedirectResult,
  fetchHelpRequestsFromSupabase,
  subscribeToPosts,
  subscribeToStories,
  subscribeToUsers,
  subscribeToCommunities,
  subscribeToAnimals,
  subscribeToHelpRequests,
  createPostInFirestore,
  deletePostInFirestore,
  createStoryInFirestore,
  deleteStoryInFirestore,
  syncUserProfileToFirestore,
  getUserProfileFromFirestore,
  toggleLikePostInFirestore,
  addCommentToPostInFirestore,
  toggleFollowUserInFirestore,
  createCommunityInFirestore,
  toggleJoinCommunityInFirestore,
  createAnimalInFirestore,
  createHelpRequestInFirestore,
  respondToHelpRequestInFirestore,
  updateUserPostAuthorInfoInFirestore
} from '../services/firebase';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface AppContextType {
  user: User | null;
  currentTab: 'home' | 'communities' | 'nearby' | 'help' | 'profile';
  setCurrentTab: (tab: 'home' | 'communities' | 'nearby' | 'help' | 'profile') => void;
  selectedLocation: string;
  setSelectedLocation: (loc: string) => void;
  userCoords: { lat: number; lng: number } | null;
  setUserCoords: (coords: { lat: number; lng: number } | null) => void;
  isLocating: boolean;
  detectUserLocation: () => Promise<boolean>;
  setUserCustomLocation: (locationName: string, coords?: { lat: number; lng: number }) => Promise<void>;
  nearbyRadiusKm: number;
  setNearbyRadiusKm: (radius: number) => void;

  // Navigation Overlays
  activeAnimalId: string | null;
  setActiveAnimalId: (id: string | null) => void;
  activeCommunityId: string | null;
  setActiveCommunityId: (id: string | null) => void;
  activeHelpId: string | null;
  setActiveHelpId: (id: string | null) => void;

  // Modals
  showCreateSheet: boolean;
  setShowCreateSheet: (show: boolean) => void;
  showCreatePost: boolean;
  setShowCreatePost: (show: boolean) => void;
  showCreateHelp: boolean;
  setShowCreateHelp: (show: boolean) => void;
  showAddAnimal: boolean;
  setShowAddAnimal: (show: boolean) => void;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  showContributions: boolean;
  setShowContributions: (show: boolean) => void;
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  showWelcome: boolean;
  setShowWelcome: (show: boolean) => void;
  showAdoptionFosterHub: boolean;
  setShowAdoptionFosterHub: (show: boolean) => void;
  showAIChat: boolean;
  setShowAIChat: (show: boolean) => void;
  showLocationModal: boolean;
  setShowLocationModal: (show: boolean) => void;
  showEditProfileModal: boolean;
  setShowEditProfileModal: (show: boolean) => void;
  showFollowersModal: boolean;
  setShowFollowersModal: (show: boolean) => void;
  followersModalType: 'followers' | 'following';
  setFollowersModalType: (type: 'followers' | 'following') => void;
  followersModalUser: User | null;
  setFollowersModalUser: (user: User | null) => void;
  selectedUserForModal: User | null;
  setSelectedUserForModal: (user: User | null) => void;
  viewingProfileUser: User | null;
  setViewingProfileUser: (user: User | null) => void;

  // Authoritative Data
  registeredUsers: User[];
  posts: Post[];
  stories: Story[];
  communities: Community[];
  animals: Animal[];
  helpRequests: HelpRequest[];
  nearbyMarkers: NearbyMarker[];
  notifications: NotificationItem[];
  adoptions: AdoptionListing[];
  fosters: FosterRequest[];
  feedingPoints: FeedingPoint[];
  isLoading: boolean;
  isAuthLoading: boolean;

  // Auth Actions
  refreshAll: () => Promise<void>;
  registerWithEmailAccount: (email: string, password: string, profileData?: Partial<User>) => Promise<void>;
  loginWithEmailAccount: (email: string, password: string) => Promise<void>;
  signInWithGoogleAccount: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;

  // Social Actions
  toggleLikePost: (postId: string) => Promise<void>;
  addCommentToPost: (postId: string, comment: string) => Promise<void>;
  toggleFollowUser: (targetUserId: string) => Promise<void>;
  openFollowersList: (targetUser: User, type: 'followers' | 'following') => void;
  openUserProfile: (user: User) => void;
  toggleSavePost: (postId: string) => Promise<void>;
  sharePost: (postId: string) => Promise<void>;

  createPost: (postData: { content: string; media?: string[]; type?: string; communityId?: string; animalId?: string; location?: string; poll?: { question: string; options: string[] } }) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  addStory: (story: Story) => Promise<void>;
  deleteStory: (storyId: string) => Promise<void>;
  addNotification: (item: { title: string; message: string; type?: string }) => void;

  // Community Actions
  toggleJoinCommunity: (communityId: string) => Promise<void>;
  createCommunity: (commData: Partial<Community>) => Promise<void>;

  // Animal Actions
  toggleFollowAnimal: (animalId: string) => Promise<void>;
  addAnimal: (animalData: Partial<Animal>) => Promise<string>;
  createAnimal: (animalData: Partial<Animal>) => Promise<string>;
  addAnimalUpdate: (animalId: string, update: { notes: string; title?: string; type?: 'feeding' | 'medical' }) => Promise<void>;

  // Help Actions
  createHelpRequest: (requestData: Partial<HelpRequest>) => Promise<void>;
  respondToHelpRequest: (requestId: string, status: string, note?: string) => Promise<void>;

  // Adoption & Foster Actions
  createAdoptionListing: (data: Partial<AdoptionListing>) => Promise<void>;
  createFosterRequest: (data: Partial<FosterRequest>) => Promise<void>;
  joinFeedingPoint: (pointId: string) => Promise<void>;

  // Notifications
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;

  // Feedback Toasts
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  removeToast: (id: string) => void;

  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Navigation
  handleGoBack: () => boolean;

  // Veterinary Hospitals
  veterinaryHospitals: VeterinaryHospital[];
  isLoadingVets: boolean;
  fetchVeterinaryHospitals: (emergencyOnly?: boolean) => Promise<VeterinaryHospital[]>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState<'home' | 'communities' | 'nearby' | 'help' | 'profile'>('home');
  const [selectedLocation, setSelectedLocation] = useState<string>('Select location');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState<number>(10);

  // Overlays
  const [activeAnimalId, setActiveAnimalId] = useState<string | null>(null);
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);
  const [activeHelpId, setActiveHelpId] = useState<string | null>(null);

  // Modals
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateHelp, setShowCreateHelp] = useState(false);
  const [showAddAnimal, setShowAddAnimal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showContributions, setShowContributions] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showAdoptionFosterHub, setShowAdoptionFosterHub] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersModalType, setFollowersModalType] = useState<'followers' | 'following'>('followers');
  const [followersModalUser, setFollowersModalUser] = useState<User | null>(null);
  const [selectedUserForModal, setSelectedUserForModal] = useState<User | null>(null);
  const [viewingProfileUser, setViewingProfileUser] = useState<User | null>(null);

  // Data states
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [nearbyMarkers, setNearbyMarkers] = useState<NearbyMarker[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [adoptions, setAdoptions] = useState<AdoptionListing[]>([]);
  const [fosters, setFosters] = useState<FosterRequest[]>([]);
  const [feedingPoints, setFeedingPoints] = useState<FeedingPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Veterinary Hospitals
  const [veterinaryHospitals, setVeterinaryHospitals] = useState<VeterinaryHospital[]>([]);
  const [isLoadingVets, setIsLoadingVets] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Theme Persistence (with safe storage check)
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('feeder_theme');
        if (saved === 'dark' || saved === 'system' || saved === 'light') return saved;
      }
    } catch (e) {
      // Ignore storage access restrictions
    }
    return 'light';
  });

  const applyTheme = (t: 'light' | 'dark' | 'system') => {
    try {
      if (typeof document !== 'undefined' && typeof window !== 'undefined') {
        const isDark = t === 'dark' || (t === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    } catch (e) {}
  };

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('feeder_theme', newTheme);
      }
    } catch (e) {}
    applyTheme(newTheme);
  };

  useEffect(() => {
    applyTheme(theme);
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (theme === 'system') applyTheme('system');
    };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  // Tab Navigation History
  const [tabHistory, setTabHistory] = useState<('home' | 'communities' | 'nearby' | 'help' | 'profile')[]>(['home']);

  const handleSetCurrentTab = (newTab: 'home' | 'communities' | 'nearby' | 'help' | 'profile') => {
    if (newTab !== currentTab) {
      setTabHistory(prev => [...prev.slice(-10), newTab]);
      setCurrentTab(newTab);
      try {
        window.history.pushState({ tab: newTab }, '');
      } catch (e) {}
    }
  };

  const handleGoBack = (): boolean => {
    if (selectedUserForModal) { setSelectedUserForModal(null); return true; }
    if (viewingProfileUser) { setViewingProfileUser(null); return true; }
    if (showFollowersModal) { setShowFollowersModal(false); return true; }
    if (showEditProfileModal) { setShowEditProfileModal(false); return true; }
    if (showSettings) { setShowSettings(false); return true; }
    if (showContributions) { setShowContributions(false); return true; }
    if (showSearch) { setShowSearch(false); return true; }
    if (showNotifications) { setShowNotifications(false); return true; }
    if (showLocationModal) { setShowLocationModal(false); return true; }
    if (showAIChat) { setShowAIChat(false); return true; }
    if (showAdoptionFosterHub) { setShowAdoptionFosterHub(false); return true; }
    if (showAddAnimal) { setShowAddAnimal(false); return true; }
    if (showCreateHelp) { setShowCreateHelp(false); return true; }
    if (showCreatePost) { setShowCreatePost(false); return true; }
    if (showCreateSheet) { setShowCreateSheet(false); return true; }
    if (activeAnimalId) { setActiveAnimalId(null); return true; }
    if (activeHelpId) { setActiveHelpId(null); return true; }
    if (activeCommunityId) { setActiveCommunityId(null); return true; }

    if (tabHistory.length > 1) {
      const nextStack = [...tabHistory];
      nextStack.pop();
      const previousTab = nextStack[nextStack.length - 1];
      setTabHistory(nextStack);
      setCurrentTab(previousTab);
      return true;
    }
    return false;
  };

  useEffect(() => {
    const handlePopState = () => {
      handleGoBack();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    selectedUserForModal, showFollowersModal, showEditProfileModal,
    showSettings, showContributions, showSearch, showNotifications,
    showLocationModal, showAIChat, showAdoptionFosterHub, showAddAnimal,
    showCreateHelp, showCreatePost, showCreateSheet,
    activeAnimalId, activeHelpId, activeCommunityId, tabHistory
  ]);

  // Geolocation Detection Flow
  const detectUserLocation = async (): Promise<boolean> => {
    if (!('geolocation' in navigator)) {
      showToast('Geolocation is not supported by your browser.', 'error');
      setShowLocationModal(true);
      return false;
    }

    setIsLocating(true);
    showToast('Detecting your GPS location...', 'info');

    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        async position => {
          try {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            setUserCoords({ lat, lng });

            // Reverse geocode
            try {
              const geo = await api.reverseGeocode(lat, lng);
              const locName = geo.name || `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
              setSelectedLocation(locName);
              showToast(`Location set: ${locName}`, 'success');
            } catch (err) {
              const fallbackName = `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
              setSelectedLocation(fallbackName);
              showToast(`Location coordinates detected: ${fallbackName}`, 'success');
            }

            // Update nearby markers with live GPS coords
            try {
              const markers = await api.getNearby({ lat, lng, radiusKm: nearbyRadiusKm });
              if (markers && markers.length > 0) {
                setNearbyMarkers(markers);
              }
            } catch (e) {}

            setIsLocating(false);
            resolve(true);
          } catch (err) {
            setIsLocating(false);
            resolve(true);
          }
        },
        error => {
          console.warn('Geolocation error:', error);
          setIsLocating(false);
          let errorMsg = 'Could not access GPS.';
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg = 'GPS permission was denied. Please choose your city manually.';
          } else if (error.code === error.TIMEOUT) {
            errorMsg = 'GPS request timed out. Please choose your city manually.';
          }
          showToast(errorMsg, 'error');
          setShowLocationModal(true);
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  };

  const setUserCustomLocation = async (locationName: string, coords?: { lat: number; lng: number }) => {
    setSelectedLocation(locationName);
    let finalCoords = coords;

    if (!finalCoords) {
      try {
        const geoResults = await api.geocode(locationName);
        if (geoResults.results && geoResults.results.length > 0) {
          finalCoords = { lat: geoResults.results[0].lat, lng: geoResults.results[0].lng };
        }
      } catch (err) {
        console.error('Geocode error:', err);
      }
    }

    if (finalCoords) {
      setUserCoords(finalCoords);
      try {
        const markers = await api.getNearby({ lat: finalCoords.lat, lng: finalCoords.lng, radiusKm: nearbyRadiusKm });
        if (markers && markers.length > 0) {
          setNearbyMarkers(markers);
        }
      } catch (e) {}
    }

    showToast(`Location set to ${locationName}`, 'info');
  };

  const fetchVeterinaryHospitals = async (emergencyOnly?: boolean): Promise<VeterinaryHospital[]> => {
    setIsLoadingVets(true);
    try {
      const coords = userCoords;
      const list = await api.getVeterinaryHospitals({
        lat: coords ? coords.lat : undefined,
        lng: coords ? coords.lng : undefined,
        emergencyOnly,
        radiusKm: nearbyRadiusKm
      });
      setVeterinaryHospitals(list);
      return list;
    } catch (err) {
      console.error('Veterinary fetch error:', err);
      return [];
    } finally {
      setIsLoadingVets(false);
    }
  };

  const refreshAll = async () => {
    try {
      if (userCoords) {
        const markers = await api.getNearby({ lat: userCoords.lat, lng: userCoords.lng, radiusKm: nearbyRadiusKm });
        if (markers) setNearbyMarkers(markers);
      }
    } catch (err) {
      console.warn('refreshAll notice:', err);
    }
  };

  // Setup Real-time Supabase Listeners & Auth State
  useEffect(() => {
    // Check for incoming redirect sign-in result (Google OAuth fallback)
    checkRedirectResult().catch(err => {
      console.warn('Redirect check notice:', err);
    });

    // 1. Firebase Auth State Listener (Firebase = Auth ONLY)
    const unsubscribeAuth = subscribeToAuth(async fbUser => {
      if (fbUser) {
        const defaultAvatar = fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fbUser.uid)}`;
        const emailName = fbUser.email ? fbUser.email.split('@')[0] : 'feeder';
        const baselineUser: User = {
          id: fbUser.uid,
          name: fbUser.displayName || emailName || 'Feeder Caregiver',
          username: emailName.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'feeder',
          email: fbUser.email || undefined,
          avatar: defaultAvatar,
          bio: 'Community animal feeder and animal welfare supporter.',
          location: selectedLocation !== 'Select location' ? selectedLocation : '',
          roles: ['Feeder', 'Animal Lover'],
          interests: ['Street Animals', 'Community Care', 'Adoption'],
          postsCount: 0,
          followersCount: 0,
          followingCount: 0,
          followerIds: [],
          followingIds: [],
          joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          isVerified: true
        };

        try {
          // Hydrate real user profile directly from Supabase by verified Firebase UID
          const profile = await getUserProfileFromFirestore(fbUser.uid);
          if (profile) {
            setUser({
              ...baselineUser,
              ...profile,
              followersCount: Array.isArray(profile.followerIds) ? profile.followerIds.length : (profile.followersCount || 0),
              followingCount: Array.isArray(profile.followingIds) ? profile.followingIds.length : (profile.followingCount || 0),
            });
            if (profile.location && selectedLocation === 'Select location') {
              setSelectedLocation(profile.location);
            }
          } else {
            // First-time user signup: sync baseline profile once to Supabase PostgreSQL
            setUser(baselineUser);
            await syncUserProfileToFirestore(baselineUser);
          }
        } catch (authErr) {
          console.warn('[Auth State] Supabase profile restoration notice:', authErr);
          setUser(baselineUser);
        } finally {
          setShowWelcome(false);
          setIsLoading(false);
          setIsAuthLoading(false);
        }
      } else {
        setUser(null);
        setIsLoading(false);
        setIsAuthLoading(false);
      }
    });

    // 2. Real-time Posts Listener
    const unsubscribePosts = subscribeToPosts(
      firestorePosts => {
        const currentUserId = user?.id || '';
        const seen = new Set<string>();
        const deduped: Post[] = [];

        (firestorePosts || []).forEach(p => {
          if (!p || !p.id || seen.has(p.id)) return;
          seen.add(p.id);
          const likedUserIds = Array.isArray(p.likedUserIds) ? p.likedUserIds : [];
          const comments = Array.isArray(p.comments) ? p.comments : [];
          const media = Array.isArray(p.media) ? p.media.filter(Boolean) : [];
          deduped.push({
            ...p,
            userName: p.userName || 'Feeder Friend',
            userAvatar: p.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.userId || 'user')}`,
            userLocation: p.userLocation || '',
            content: p.content || '',
            media,
            likedUserIds,
            likesCount: likedUserIds.length || p.likesCount || 0,
            isLiked: currentUserId ? likedUserIds.includes(currentUserId) : false,
            comments,
            commentsCount: comments.length || p.commentsCount || 0
          });
        });

        setPosts(deduped);
      },
      err => {
        console.warn('Posts listener error:', err);
      }
    );

    // 3. Real-time Stories Listener
    const unsubscribeStories = subscribeToStories(
      firestoreStories => {
        const seen = new Set<string>();
        const deduped: Story[] = [];
        (firestoreStories || []).forEach(s => {
          if (s && s.id && !seen.has(s.id)) {
            seen.add(s.id);
            deduped.push({
              ...s,
              userName: s.userName || 'Feeder',
              userAvatar: s.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(s.userId || 'story')}`,
              location: s.location || '',
              caption: s.caption || ''
            });
          }
        });
        setStories(deduped);
      },
      err => {
        console.warn('Stories listener error:', err);
      }
    );

    // 4. Real-time Registered Users Listener
    const unsubscribeUsers = subscribeToUsers(
      firestoreUsers => {
        if (firestoreUsers && firestoreUsers.length > 0) {
          const normalized = firestoreUsers.map(u => ({
            ...u,
            name: u.name || 'Animal Lover',
            username: u.username || 'feeder',
            avatar: u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.id || 'feeder')}`,
            roles: Array.isArray(u.roles) ? u.roles : ['Feeder'],
            interests: Array.isArray(u.interests) ? u.interests : ['Dogs'],
            followerIds: Array.isArray(u.followerIds) ? u.followerIds : [],
            followingIds: Array.isArray(u.followingIds) ? u.followingIds : []
          }));
          setRegisteredUsers(normalized);
        }
      },
      err => {
        console.warn('Users listener error:', err);
      }
    );

    // 5. Real-time Communities Listener
    const unsubscribeCommunities = subscribeToCommunities(
      firestoreComms => {
        const currentUserId = user?.id || '';
        const list = (firestoreComms || []).map(c => {
          const memberIds: string[] = Array.isArray(c.memberIds) ? c.memberIds : [];
          const isJoined = currentUserId ? memberIds.includes(currentUserId) : false;
          return {
            ...c,
            name: c.name || 'Community Hub',
            description: c.description || '',
            location: c.location || 'Local Area',
            coverImage: c.coverImage || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80',
            icon: c.icon || '🌿',
            memberIds,
            isJoined,
            membersCount: Math.max(1, memberIds.length || c.membersCount || 1)
          };
        });
        setCommunities(list);
      },
      err => {
        console.warn('Communities listener error:', err);
      }
    );

    // 6. Real-time Animals Listener
    const unsubscribeAnimals = subscribeToAnimals(
      firestoreAnimals => {
        const normalized = (firestoreAnimals || []).map(a => {
          const photos = Array.isArray(a.photos) && a.photos.length > 0 ? a.photos.filter(Boolean) : ['https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&auto=format&fit=crop&q=80'];
          return {
            ...a,
            name: a.name || 'Community Animal',
            breed: a.breed || 'Indie',
            avatar: a.avatar || photos[0],
            photos,
            feedingHistory: Array.isArray(a.feedingHistory) ? a.feedingHistory : [],
            medicalUpdates: Array.isArray(a.medicalUpdates) ? a.medicalUpdates : []
          };
        });
        setAnimals(normalized);
      },
      err => {
        console.warn('Animals listener error:', err);
      }
    );

    // 7. Real-time Help Requests Listener
    const unsubscribeHelp = subscribeToHelpRequests(
      firestoreHelp => {
        const normalized = (firestoreHelp || []).map(h => {
          const photos = Array.isArray(h.photos) && h.photos.length > 0 ? h.photos.filter(Boolean) : ['https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&auto=format&fit=crop&q=80'];
          const responders = Array.isArray(h.responders) ? h.responders : [];
          return {
            ...h,
            title: h.title || 'Help Request',
            description: h.description || '',
            location: h.location || 'Neighborhood',
            photos,
            responders,
            urgency: h.urgency || 'urgent',
            status: h.status || 'open'
          };
        });
        setHelpRequests(normalized);
      },
      err => {
        console.warn('Help requests listener error:', err);
      }
    );

    // Safety fallback timer so UI never gets stuck in loading state
    const authTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 1200);

    return () => {
      clearTimeout(authTimeout);
      unsubscribeAuth();
      unsubscribePosts();
      unsubscribeStories();
      unsubscribeUsers();
      unsubscribeCommunities();
      unsubscribeAnimals();
      unsubscribeHelp();
    };
  }, []);

  // Update post/story like state and authenticated data when current user changes
  useEffect(() => {
    if (user?.id) {
      setPosts(prev => prev.map(p => {
        const likedUserIds = Array.isArray(p.likedUserIds) ? p.likedUserIds : [];
        return {
          ...p,
          isLiked: likedUserIds.includes(user.id)
        };
      }));
      setCommunities(prev => prev.map(c => {
        const memberIds = Array.isArray(c.memberIds) ? c.memberIds : [];
        return {
          ...c,
          isJoined: memberIds.includes(user.id)
        };
      }));
      // Fetch authenticated help reports once user session is confirmed
      fetchHelpRequestsFromSupabase().then(reports => {
        if (Array.isArray(reports)) {
          setHelpRequests(reports);
        }
      }).catch(err => {
        console.warn('Help reports fetch notice:', err?.message || err);
      });
    } else {
      setHelpRequests([]);
    }
  }, [user?.id]);

  // Auth Functions
  const registerWithEmailAccount = async (email: string, password: string, profileData: Partial<User> = {}) => {
    try {
      showToast('Creating your account...', 'info');
      await registerWithEmail(email, password, {
        ...profileData,
        location: selectedLocation !== 'Select location' ? selectedLocation : ''
      });
      setShowWelcome(false);
      showToast('Account created successfully! Welcome to Feeder 🐾', 'success');
    } catch (err: any) {
      console.error('Registration error:', err);
      showToast(err.message || 'Registration failed', 'error');
      throw err;
    }
  };

  const loginWithEmailAccount = async (email: string, password: string) => {
    try {
      showToast('Signing in...', 'info');
      await loginWithEmail(email, password);
      setShowWelcome(false);
      showToast('Welcome back! 🐾', 'success');
    } catch (err: any) {
      console.error('Login error:', err);
      showToast(err.message || 'Login failed', 'error');
      throw err;
    }
  };

  const signInWithGoogleAccount = async () => {
    try {
      showToast('Opening Google Sign-In...', 'info');
      await signInWithGoogle();
      setShowWelcome(false);
      showToast('Signed in successfully with Google! 🐾', 'success');
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      showToast(err.message || 'Google Sign-In was cancelled', 'error');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
      setUser(null);
      setShowWelcome(true);
      setActiveAnimalId(null);
      setActiveCommunityId(null);
      setActiveHelpId(null);
      setSelectedUserForModal(null);
      setShowCreatePost(false);
      setShowCreateSheet(false);
      setShowEditProfileModal(false);
      setShowFollowersModal(false);
      showToast('Signed out successfully', 'info');
    } catch (e: any) {
      console.error('Logout error:', e);
      showToast('Logout error', 'error');
    }
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!user) {
      showToast('Please sign in to update your profile', 'error');
      return;
    }

    const previousUser = { ...user };
    const updatedUser: User = {
      ...user,
      ...updates,
      followersCount: Array.isArray(updates.followerIds) ? updates.followerIds.length : (user.followersCount || 0),
      followingCount: Array.isArray(updates.followingIds) ? updates.followingIds.length : (user.followingCount || 0)
    };

    // Optimistic UI update
    setUser(updatedUser);

    try {
      await syncUserProfileToFirestore(updatedUser);

      // Propagate username/avatar updates to posts and stories authored by user
      if (updates.name || updates.avatar || updates.location) {
        updateUserPostAuthorInfoInFirestore(user.id, {
          userName: updates.name,
          userAvatar: updates.avatar,
          userLocation: updates.location
        }).catch(console.warn);
      }

      if (updates.location && updates.location !== selectedLocation) {
        setSelectedLocation(updates.location);
      }

      showToast('Profile saved successfully! 🐾', 'success');
    } catch (err: any) {
      console.error('Profile update failed:', err);
      // Rollback
      setUser(previousUser);
      showToast('Failed to save profile. Please try again.', 'error');
      throw err;
    }
  };

  // Social Actions
  const toggleLikePost = async (postId: string) => {
    if (!user) {
      showToast('Please sign in to like posts', 'info');
      setShowWelcome(true);
      return;
    }

    const currentUserId = user.id;
    const targetPost = posts.find(p => p.id === postId);
    if (!targetPost) return;

    const previousLikedUserIds = Array.isArray(targetPost.likedUserIds) ? [...targetPost.likedUserIds] : [];
    const isCurrentlyLiked = previousLikedUserIds.includes(currentUserId);
    const newLikedUserIds = isCurrentlyLiked
      ? previousLikedUserIds.filter(id => id !== currentUserId)
      : [...previousLikedUserIds, currentUserId];

    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          likedUserIds: newLikedUserIds,
          likesCount: newLikedUserIds.length,
          isLiked: !isCurrentlyLiked
        };
      }
      return p;
    }));

    try {
      await toggleLikePostInFirestore(postId, currentUserId);
    } catch (err: any) {
      console.error('Like error:', err);
      // Rollback on failure
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            likedUserIds: previousLikedUserIds,
            likesCount: previousLikedUserIds.length,
            isLiked: isCurrentlyLiked
          };
        }
        return p;
      }));
      showToast('Could not record like in database', 'error');
    }
  };

  const addCommentToPost = async (postId: string, commentText: string) => {
    if (!user) {
      showToast('Please sign in to comment', 'info');
      setShowWelcome(true);
      return;
    }
    if (!commentText.trim()) return;

    const newComment: PostComment = {
      id: `cm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      postId,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      userBadge: user.roles?.[0] || 'Feeder',
      content: commentText.trim(),
      createdAt: 'Just now',
      likesCount: 0,
      likedUserIds: [],
      isLiked: false
    };

    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const currentComments = Array.isArray(p.comments) ? p.comments : [];
        const updated = [newComment, ...currentComments];
        return {
          ...p,
          comments: updated,
          commentsCount: updated.length
        };
      }
      return p;
    }));

    try {
      await addCommentToPostInFirestore(postId, newComment);
      showToast('Comment posted! 🐾', 'success');
    } catch (err) {
      console.error('Comment error:', err);
      // Rollback
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const currentComments = Array.isArray(p.comments) ? p.comments : [];
          const rolledBack = currentComments.filter(c => c.id !== newComment.id);
          return {
            ...p,
            comments: rolledBack,
            commentsCount: rolledBack.length
          };
        }
        return p;
      }));
      showToast('Failed to post comment', 'error');
    }
  };

  const toggleFollowUser = async (targetUserId: string) => {
    if (!user) {
      showToast('Please sign in to follow feeders', 'info');
      setShowWelcome(true);
      return;
    }
    if (targetUserId === user.id) return;

    const currentUserId = user.id;
    const previousFollowing = Array.isArray(user.followingIds) ? [...user.followingIds] : [];
    const isCurrentlyFollowing = previousFollowing.includes(targetUserId);
    const updatedFollowingIds = isCurrentlyFollowing
      ? previousFollowing.filter(id => id !== targetUserId)
      : [...previousFollowing, targetUserId];

    // Optimistic user update
    setUser({
      ...user,
      followingIds: updatedFollowingIds,
      followingCount: updatedFollowingIds.length
    });

    try {
      const res = await toggleFollowUserInFirestore(currentUserId, targetUserId);
      showToast(res.isFollowing ? 'Following feeder! 🐾' : 'Unfollowed', 'info');
    } catch (err) {
      console.error('Follow error:', err);
      // Rollback
      setUser({
        ...user,
        followingIds: previousFollowing,
        followingCount: previousFollowing.length
      });
      showToast('Follow operation failed', 'error');
    }
  };

  const openFollowersList = (targetUser: User, type: 'followers' | 'following') => {
    setFollowersModalUser(targetUser);
    setFollowersModalType(type);
    setShowFollowersModal(true);
  };

  const openUserProfile = (userToView: User) => {
    if (user && userToView.id === user.id) {
      setViewingProfileUser(null);
    } else {
      setViewingProfileUser(userToView);
    }
    setCurrentTab('profile');
    setSelectedUserForModal(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleSavePost = async (postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const nextSaved = !p.isSaved;
        showToast(nextSaved ? 'Post saved to bookmarks' : 'Removed from bookmarks');
        return { ...p, isSaved: nextSaved };
      }
      return p;
    }));
  };

  const sharePost = async (postId: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, sharesCount: p.sharesCount + 1 } : p));
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
    }
    showToast('Post link copied to clipboard!');
  };

  const createPost = async (postData: {
    content: string;
    media?: string[];
    type?: string;
    communityId?: string;
    animalId?: string;
    location?: string;
    poll?: { question: string; options: string[] }
  }) => {
    if (!user) {
      showToast('Please sign in to publish posts', 'error');
      setShowWelcome(true);
      return;
    }

    try {
      const payload: Partial<Post> = {
        ...postData,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        userLocation: postData.location || user.location || selectedLocation,
        type: (postData.type as any) || 'general',
        media: postData.media || [],
        poll: postData.poll ? {
          question: postData.poll.question,
          options: postData.poll.options.map((opt, i) => ({ id: `opt_${i}`, text: typeof opt === 'string' ? opt : (opt as any).text, votes: 0 })),
          totalVotes: 0
        } : undefined
      };

      const docId = await createPostInFirestore(payload);

      // Optimistically update local posts state immediately
      const newPost: Post = {
        id: docId,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        userLocation: payload.userLocation || user.location || selectedLocation,
        content: payload.content || '',
        media: payload.media || [],
        type: (payload.type as any) || 'general',
        communityId: payload.communityId,
        communityName: payload.communityName || communities.find(c => c.id === payload.communityId)?.name,
        animalId: payload.animalId,
        animalName: payload.animalName || animals.find(a => a.id === payload.animalId)?.name,
        animalAvatar: payload.animalAvatar || animals.find(a => a.id === payload.animalId)?.avatar,
        createdAt: 'Just now',
        likesCount: 0,
        likedUserIds: [],
        commentsCount: 0,
        sharesCount: 0,
        isLiked: false,
        isSaved: false,
        comments: [],
        poll: payload.poll
      };

      setPosts(prev => [newPost, ...prev.filter(p => p.id !== docId)]);
      setUser(prev => prev ? { ...prev, postsCount: (prev.postsCount || 0) + 1 } : null);

      setShowCreatePost(false);
      showToast('Post published to community feed! 🐾', 'success');
    } catch (err: any) {
      console.error('Post creation error:', err);
      showToast(err.message || 'Failed to publish post', 'error');
      throw err;
    }
  };

  const deletePost = async (postId: string) => {
    if (!user) {
      showToast('Please sign in to manage posts', 'error');
      return;
    }

    const targetPost = posts.find(p => p.id === postId);
    if (!targetPost) return;

    if (targetPost.userId !== user.id) {
      showToast('You can only delete your own posts', 'error');
      return;
    }

    // Store previous posts for rollback
    const previousPosts = [...posts];
    setPosts(prev => prev.filter(p => p.id !== postId));
    setUser(prev => prev ? { ...prev, postsCount: Math.max(0, (prev.postsCount || 1) - 1) } : null);

    try {
      await deletePostInFirestore(postId);
      showToast('Post deleted successfully', 'success');
    } catch (err: any) {
      console.error('Post deletion error:', err);
      // Rollback
      setPosts(previousPosts);
      setUser(prev => prev ? { ...prev, postsCount: (prev.postsCount || 0) + 1 } : null);
      showToast(err.message || 'Failed to delete post', 'error');
    }
  };

  const addStory = async (story: Story) => {
    if (!user) {
      showToast('Please sign in to post stories', 'error');
      return;
    }

    try {
      const docId = await createStoryInFirestore({
        ...story,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        location: story.location || user.location || selectedLocation
      });

      const newCreatedStory: Story = {
        ...story,
        id: docId,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        location: story.location || user.location || selectedLocation,
        createdAt: new Date().toISOString()
      };

      setStories(prev => [newCreatedStory, ...prev.filter(s => s.id !== docId)]);
      showToast('Story posted! Live for 24 hours 🌟', 'success');
    } catch (err: any) {
      console.error('Story creation error:', err);
      showToast(err.message || 'Could not post story', 'error');
      throw err;
    }
  };

  const deleteStory = async (storyId: string) => {
    if (!user) {
      showToast('Please sign in to manage stories', 'error');
      return;
    }

    const targetStory = stories.find(s => s.id === storyId);
    if (!targetStory) return;

    if (targetStory.userId !== user.id) {
      showToast('You can only delete your own stories', 'error');
      return;
    }

    const previousStories = [...stories];
    setStories(prev => prev.filter(s => s.id !== storyId));

    try {
      await deleteStoryInFirestore(storyId);
      showToast('Story deleted successfully', 'success');
    } catch (err: any) {
      console.error('Story deletion error:', err);
      setStories(previousStories);
      showToast(err.message || 'Failed to delete story', 'error');
    }
  };

  const addNotification = (item: { title: string; message: string; type?: string }) => {
    const newItem: NotificationItem = {
      id: `notif_${Date.now()}`,
      title: item.title,
      message: item.message,
      body: item.message,
      type: (item.type as any) || 'info',
      createdAt: 'Just now',
      isRead: false
    };
    setNotifications(prev => [newItem, ...prev]);
  };

  const toggleJoinCommunity = async (communityId: string) => {
    if (!user) {
      showToast('Please sign in to join communities', 'error');
      setShowWelcome(true);
      return;
    }

    try {
      const res = await toggleJoinCommunityInFirestore(communityId, user.id);
      showToast(res.isJoined ? 'Joined community!' : 'Left community', 'info');
    } catch (err: any) {
      console.error('Join community error:', err);
      showToast('Could not update community membership', 'error');
    }
  };

  const createCommunity = async (commData: Partial<Community>) => {
    if (!user) {
      showToast('Please sign in to create a community', 'error');
      setShowWelcome(true);
      return;
    }

    try {
      const commId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newComm: Community = {
        id: commId,
        name: commData.name || 'New Community',
        slug: commData.slug || `community-${Date.now()}`,
        icon: commData.icon || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=120&auto=format&fit=crop&q=80',
        coverImage: commData.coverImage || 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&auto=format&fit=crop&q=80',
        description: commData.description || 'Community dedicated to animal welfare.',
        category: commData.category || 'Street Animals',
        membersCount: 1,
        postsCount: 0,
        isJoined: true,
        location: commData.location || user.location || selectedLocation,
        rules: commData.rules || ['Be kind and respectful to all animals and volunteers'],
        createdDate: 'Just now',
        createdBy: user.id,
        memberIds: [user.id]
      };

      await createCommunityInFirestore(newComm);
      setActiveCommunityId(newComm.id);
      showToast(`Community "${newComm.name}" created!`, 'success');
    } catch (err: any) {
      console.error('Create community error:', err);
      showToast('Failed to create community', 'error');
      throw err;
    }
  };

  const toggleFollowAnimal = async (animalId: string) => {
    setAnimals(prev => prev.map(a => {
      if (a.id === animalId) {
        const isFollowing = !a.isFollowing;
        showToast(isFollowing ? `Following ${a.name} updates` : `Unfollowed ${a.name}`, 'info');
        return {
          ...a,
          isFollowing,
          followersCount: isFollowing ? a.followersCount + 1 : Math.max(0, a.followersCount - 1)
        };
      }
      return a;
    }));
  };

  const addAnimal = async (animalData: Partial<Animal>): Promise<string> => {
    if (!user) {
      showToast('Please sign in to add animal profiles', 'error');
      setShowWelcome(true);
      throw new Error('Sign-in required');
    }

    try {
      const docId = await createAnimalInFirestore(animalData);
      showToast(`Profile for ${animalData.name || 'animal'} created! 🐾`, 'success');
      return docId;
    } catch (err: any) {
      console.error('Add animal error:', err);
      showToast('Failed to add animal profile', 'error');
      throw err;
    }
  };

  const addAnimalUpdate = async (animalId: string, update: { notes: string; title?: string; type?: 'feeding' | 'medical' }) => {
    setAnimals(prev => prev.map(a => {
      if (a.id === animalId) {
        const medicalUpdates = a.medicalUpdates || [];
        const feedingHistory = a.feedingHistory || [];
        if (update.type === 'feeding') {
          return {
            ...a,
            feedingHistory: [{ date: 'Today', feederName: user?.name || 'Volunteer', notes: update.notes }, ...feedingHistory]
          };
        } else {
          return {
            ...a,
            medicalUpdates: [{ date: 'Today', title: update.title || 'Medical Note', notes: update.notes, type: update.type }, ...medicalUpdates]
          };
        }
      }
      return a;
    }));
    showToast('Update logged to animal profile! 🐾', 'success');
  };

  const createHelpRequest = async (requestData: Partial<HelpRequest>) => {
    if (!user) {
      showToast('Please sign in to publish urgent rescue requests', 'error');
      setShowWelcome(true);
      return;
    }

    try {
      await createHelpRequestInFirestore({
        ...requestData,
        creatorId: user.id,
        creatorName: user.name,
        creatorAvatar: user.avatar
      });
      showToast('🚨 Urgent help request published to community!', 'success');
    } catch (err: any) {
      console.error('Help request creation error:', err);
      showToast('Failed to create help request', 'error');
      throw err;
    }
  };

  const respondToHelpRequest = async (requestId: string, status: string, note?: string) => {
    if (!user) {
      showToast('Please sign in to respond', 'error');
      setShowWelcome(true);
      return;
    }

    try {
      await respondToHelpRequestInFirestore(requestId, {
        id: `resp_${Date.now()}`,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        status: status as any,
        note,
        timestamp: 'Just now'
      });
      showToast('Your response has been sent! You are marked on the way.', 'success');
    } catch (err: any) {
      console.error('Respond to help error:', err);
      showToast('Failed to record response', 'error');
    }
  };

  const createAdoptionListing = async (data: Partial<AdoptionListing>) => {
    const newAdoption: AdoptionListing = {
      id: `adopt_${Date.now()}`,
      name: data.name || 'Lovely Animal',
      species: data.species || 'Dog',
      breed: data.breed || 'Indie',
      age: data.age || '1 year',
      gender: data.gender || 'Male',
      photos: data.photos || [],
      location: data.location || selectedLocation,
      vaccinated: data.vaccinated ?? true,
      neutered: data.neutered ?? true,
      personality: data.personality || ['Friendly', 'Gentle'],
      description: data.description || '',
      requirements: data.requirements || ['Loving home'],
      status: 'Available',
      creatorName: user?.name || 'Feeder',
      creatorAvatar: user?.avatar || '',
      createdAt: 'Just now'
    };
    setAdoptions(prev => [newAdoption, ...prev]);
    showToast(`Adoption listing for ${newAdoption.name} published!`, 'success');
  };

  const createFosterRequest = async (data: Partial<FosterRequest>) => {
    const newFoster: FosterRequest = {
      id: `foster_${Date.now()}`,
      title: data.title || 'Foster Care Needed',
      animalType: data.animalType || 'Puppy',
      animalCount: data.animalCount || 1,
      photos: data.photos || [],
      location: data.location || selectedLocation,
      duration: data.duration || '2-4 weeks',
      reason: data.reason || 'Medical recovery',
      foodMedicalProvided: data.foodMedicalProvided ?? true,
      status: 'Open',
      creatorName: user?.name || 'Feeder Caregiver',
      creatorAvatar: user?.avatar || '',
      createdAt: 'Just now'
    };
    setFosters(prev => [newFoster, ...prev]);
    showToast('Foster request submitted to nearby caretakers!', 'success');
  };

  const joinFeedingPoint = async (pointId: string) => {
    setFeedingPoints(prev => prev.map(fp => {
      if (fp.id === pointId) {
        return {
          ...fp,
          regularFeedersCount: fp.regularFeedersCount + 1
        };
      }
      return fp;
    }));
    showToast('Joined community feeding shift! 🐾', 'success');
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    showToast('All notifications marked as read', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        user,
        currentTab,
        setCurrentTab: handleSetCurrentTab,
        selectedLocation,
        setSelectedLocation,
        userCoords,
        setUserCoords,
        isLocating,
        detectUserLocation,
        setUserCustomLocation,
        nearbyRadiusKm,
        setNearbyRadiusKm,
        activeAnimalId,
        setActiveAnimalId,
        activeCommunityId,
        setActiveCommunityId,
        activeHelpId,
        setActiveHelpId,
        showCreateSheet,
        setShowCreateSheet,
        showCreatePost,
        setShowCreatePost,
        showCreateHelp,
        setShowCreateHelp,
        showAddAnimal,
        setShowAddAnimal,
        showSearch,
        setShowSearch,
        showNotifications,
        setShowNotifications,
        showSettings,
        setShowSettings,
        showContributions,
        setShowContributions,
        showOnboarding,
        setShowOnboarding,
        showWelcome,
        setShowWelcome,
        showAdoptionFosterHub,
        setShowAdoptionFosterHub,
        showAIChat,
        setShowAIChat,
        showLocationModal,
        setShowLocationModal,
        showEditProfileModal,
        setShowEditProfileModal,
        showFollowersModal,
        setShowFollowersModal,
        followersModalType,
        setFollowersModalType,
        followersModalUser,
        setFollowersModalUser,
        selectedUserForModal,
        setSelectedUserForModal,
        viewingProfileUser,
        setViewingProfileUser,
        registeredUsers,
        posts,
        stories,
        communities,
        animals,
        helpRequests,
        nearbyMarkers,
        notifications,
        adoptions,
        fosters,
        feedingPoints,
        isLoading,
        isAuthLoading,
        refreshAll,
        registerWithEmailAccount,
        loginWithEmailAccount,
        signInWithGoogleAccount,
        logout,
        updateUserProfile,
        toggleLikePost,
        addCommentToPost,
        toggleFollowUser,
        openFollowersList,
        openUserProfile,
        toggleSavePost,
        sharePost,
        createPost,
        deletePost,
        addStory,
        deleteStory,
        addNotification,
        toggleJoinCommunity,
        createCommunity,
        toggleFollowAnimal,
        addAnimal,
        createAnimal: addAnimal,
        addAnimalUpdate,
        createHelpRequest,
        respondToHelpRequest,
        createAdoptionListing,
        createFosterRequest,
        joinFeedingPoint,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        toasts,
        showToast,
        removeToast,
        theme,
        setTheme,
        handleGoBack,
        veterinaryHospitals,
        isLoadingVets,
        fetchVeterinaryHospitals
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
