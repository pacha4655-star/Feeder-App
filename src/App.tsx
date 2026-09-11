import React, { Component, ReactNode, ErrorInfo } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { AppProvider, useApp } from './context/AppContext';
import { setupServiceWorkerMessageListener } from './services/fcmClient';
import { isNativeApp } from './utils/apiConfig';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeFeed } from './components/HomeFeed';
import { CommunitiesView } from './components/CommunitiesView';
import { NearbyMapView } from './components/NearbyMapView';
import { HelpUrgentView } from './components/HelpUrgentView';
import { UserProfileView } from './components/UserProfileView';
import { AnimalProfileView } from './components/AnimalProfileView';
import { CreateModal } from './components/CreateModal';
import { CreatePostModal } from './components/CreatePostModal';
import { CreateHelpModal } from './components/CreateHelpModal';
import { AddAnimalModal } from './components/AddAnimalModal';
import { AdoptionFosterHubModal } from './components/AdoptionFosterHubModal';
import { SearchModal } from './components/SearchModal';
import { NotificationsModal } from './components/NotificationsModal';
import { SettingsModal } from './components/SettingsModal';
import { ContributionsModal } from './components/ContributionsModal';
import { LocationModal } from './components/LocationModal';
import { AIChatModal } from './components/AIChatModal';
import { ToastContainer } from './components/ToastContainer';
import { EditProfileModal } from './components/EditProfileModal';
import { FollowersListModal } from './components/FollowersListModal';
import { UserDetailModal } from './components/UserDetailModal';
import {
  AlertTriangle,
  Heart,
  Sparkles,
  MapPin,
  Phone,
  ShieldCheck,
  Plus,
  ChevronRight,
  Navigation,
  Compass,
  ArrowRight,
  Loader2
} from 'lucide-react';

// Desktop Companion Sidebar for Home Feed
const DesktopHomeSidebar: React.FC = () => {
  const {
    helpRequests,
    setActiveHelpId,
    setShowCreateHelp,
    setShowAIChat,
    registeredUsers,
    openUserProfile,
    user,
    selectedLocation,
    veterinaryHospitals
  } = useApp();

  const urgentAlerts = helpRequests
    .filter(h => h.urgency === 'urgent' && h.status !== 'resolved')
    .slice(0, 3);

  const suggestedPeople = registeredUsers
    .filter(u => u.id !== user?.id)
    .slice(0, 3);

  const emergencyVets = (veterinaryHospitals || [])
    .filter(v => v.isEmergency)
    .slice(0, 2);

  return (
    <aside className="w-80 xl:w-96 flex-shrink-0 hidden lg:flex flex-col gap-4 sticky top-20 self-start font-sans">
      {/* Community Location & Quick Stats Widget */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <MapPin className="w-4 h-4 text-green-600" />
            <span className="truncate max-w-[180px]">{selectedLocation}</span>
          </div>
          <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
            Active Hub
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Community feedings & emergency alerts synchronized in real-time for your selected neighborhood.
        </p>
      </div>

      {/* Urgent Help Alerts Widget */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Urgent Rescue Alerts
            </h3>
          </div>
          <button
            onClick={() => setShowCreateHelp(true)}
            className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3 stroke-[2.5]" />
            <span>Report</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {urgentAlerts.length > 0 ? (
            urgentAlerts.map(alert => {
              const photoUrl = Array.isArray(alert.photos) && alert.photos[0] ? alert.photos[0] : 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&auto=format&fit=crop&q=80';
              const respondersCount = Array.isArray(alert.responders) ? alert.responders.length : 0;
              return (
                <div
                  key={alert.id}
                  onClick={() => setActiveHelpId(alert.id)}
                  className="p-2.5 rounded-xl border border-red-100 bg-red-50/40 hover:bg-red-50/80 transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-2.5">
                    <img
                      src={photoUrl}
                      alt={alert.title || 'Urgent Help'}
                      className="w-11 h-11 rounded-lg object-cover flex-shrink-0 border border-red-200"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-red-700 transition-colors">
                        {alert.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{alert.location || 'Local area'}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] font-semibold text-red-600">
                          {respondersCount} on the way
                        </span>
                        <span className="text-[10px] font-bold text-red-700 bg-white px-2 py-0.5 rounded-full border border-red-200 flex items-center gap-0.5">
                          Respond <ChevronRight className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-slate-400 py-3 text-center">No open emergencies in this zone.</p>
          )}
        </div>
      </div>

      {/* Pawsy AI Animal Welfare Guide Card */}
      <div className="bg-gradient-to-br from-green-800 to-green-700 text-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-sm">
              🐾
            </span>
            <div>
              <h3 className="text-xs font-bold tracking-tight">Pawsy AI Companion</h3>
              <p className="text-[10px] text-green-200">Global Multilingual Animal Care</p>
            </div>
          </div>
          <p className="text-[11px] text-green-100 mt-2 leading-relaxed">
            Need emergency first-aid guidance, safe street animal feeding charts, or neonatal care advice?
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-green-100/90 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-green-300 flex-shrink-0" />
            <span>Tap the floating 🐾 icon anytime for instant assistance</span>
          </div>
        </div>
      </div>

      {/* Suggested Caregivers & Feeders */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
          Local Feeders to Connect With
        </h3>
        <div className="space-y-2.5">
          {suggestedPeople.map(person => (
            <div
              key={person.id}
              onClick={() => openUserProfile(person)}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={person.avatar}
                  alt={person.name}
                  className="w-9 h-9 rounded-full object-cover border border-slate-200 flex-shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-800 truncate group-hover:text-green-700">
                      {person.name}
                    </span>
                    {person.isVerified && <ShieldCheck className="w-3 h-3 text-green-600 flex-shrink-0" />}
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {person.roles?.[0] || 'Community Feeder'}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Emergency 24/7 Veterinary Hospitals */}
      {emergencyVets.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className="text-xs">🏥</span>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              24/7 Emergency Care
            </h3>
          </div>
          <div className="space-y-2">
            {emergencyVets.map(vet => (
              <div key={vet.id} className="p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                <p className="font-bold text-slate-800 truncate">{vet.name}</p>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">{vet.address}</p>
                <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-200/60">
                  <span className="text-[10px] font-semibold text-red-600">🚨 Open 24/7</span>
                  <a
                    href={`tel:${vet.phone}`}
                    className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-white px-2 py-0.5 rounded-full border border-slate-200 hover:bg-green-50 transition-colors"
                  >
                    <Phone className="w-2.5 h-2.5" />
                    <span>Call</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};

class ErrorBoundary extends (React.Component as new (props: any) => {
  props: { children: React.ReactNode };
  state: { hasError: boolean; error: Error | null; errorInfo: any };
  setState: (state: any) => void;
}) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Feeder runtime error captured by boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state?.hasError) {
      return (
        <div className="min-h-screen bg-[#F3F7F5] flex flex-col items-center justify-center p-4 sm:p-6 text-center font-sans">
          <div className="w-16 h-16 rounded-3xl bg-green-100 text-green-700 flex items-center justify-center text-3xl mb-4 shadow-sm">
            🐾
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2">
            Feeder Community Platform
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mb-4 leading-relaxed">
            A temporary display hiccup occurred while synchronizing animal welfare data. Click below to reload the community feed.
          </p>

          {this.state.error && (
            <div className="max-w-lg w-full bg-red-50 text-red-800 p-3 rounded-2xl border border-red-200 text-left text-xs mb-4 font-mono overflow-x-auto">
              <p className="font-bold mb-1">Diagnostic Notice:</p>
              <p className="truncate">{this.state.error.message || String(this.state.error)}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                window.location.reload();
              }}
              className="px-6 py-2.5 bg-green-700 hover:bg-green-800 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md transition-all active:scale-95"
            >
              Reload Feeder App
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
              }}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-2xl hover:bg-slate-50 transition-all active:scale-95 shadow-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainAppContent: React.FC = () => {
  const {
    user,
    isAuthLoading,
    currentTab,
    setCurrentTab,
    activeAnimalId,
    setActiveAnimalId,
    showAIChat,
    setShowAIChat,
    showEditProfileModal,
    setShowEditProfileModal,
    showFollowersModal,
    setShowFollowersModal,
    followersModalType,
    followersModalUser,
    selectedUserForModal,
    setSelectedUserForModal,
    showCreateHelp,
    setShowCreateHelp,
    showCreatePost,
    setShowCreatePost,
    showAddAnimal,
    setShowAddAnimal,
    showCreateModal,
    setShowCreateModal,
    showAdoptionFosterHub,
    setShowAdoptionFosterHub,
    showSearch,
    setShowSearch,
    showNotifications,
    setShowNotifications,
    showSettings,
    setShowSettings,
    showContributions,
    setShowContributions,
    showLocationModal,
    setShowLocationModal,
    viewingProfileUser,
    setViewingProfileUser,
    openUserProfile,
    updateUserProfile,
    setActiveHelpId,
  } = useApp();

  // Keep a ref to latest state for the hardware back button listener
  const backStateRef = React.useRef({
    showAIChat,
    showEditProfileModal,
    showFollowersModal,
    selectedUserForModal,
    showCreateHelp,
    showCreatePost,
    showAddAnimal,
    showCreateModal,
    showAdoptionFosterHub,
    showSearch,
    showNotifications,
    showSettings,
    showContributions,
    showLocationModal,
    activeAnimalId,
    viewingProfileUser,
    currentTab,
  });

  backStateRef.current = {
    showAIChat,
    showEditProfileModal,
    showFollowersModal,
    selectedUserForModal,
    showCreateHelp,
    showCreatePost,
    showAddAnimal,
    showCreateModal,
    showAdoptionFosterHub,
    showSearch,
    showNotifications,
    showSettings,
    showContributions,
    showLocationModal,
    activeAnimalId,
    viewingProfileUser,
    currentTab,
  };

  // Hardware back button navigation on Android
  React.useEffect(() => {
    if (!isNativeApp()) return;

    let removeListener: (() => void) | null = null;
    CapacitorApp.addListener('backButton', () => {
      const s = backStateRef.current;
      if (s.showAIChat) { setShowAIChat(false); return; }
      if (s.showEditProfileModal) { setShowEditProfileModal(false); return; }
      if (s.showFollowersModal) { setShowFollowersModal(false); return; }
      if (s.selectedUserForModal) { setSelectedUserForModal(null); return; }
      if (s.showCreateHelp) { setShowCreateHelp(false); return; }
      if (s.showCreatePost) { setShowCreatePost(false); return; }
      if (s.showAddAnimal) { setShowAddAnimal(false); return; }
      if (s.showCreateModal) { setShowCreateModal(false); return; }
      if (s.showAdoptionFosterHub) { setShowAdoptionFosterHub(false); return; }
      if (s.showSearch) { setShowSearch(false); return; }
      if (s.showNotifications) { setShowNotifications(false); return; }
      if (s.showSettings) { setShowSettings(false); return; }
      if (s.showContributions) { setShowContributions(false); return; }
      if (s.showLocationModal) { setShowLocationModal(false); return; }
      if (s.activeAnimalId) { setActiveAnimalId(null); return; }
      if (s.viewingProfileUser) { setViewingProfileUser(null); return; }
      if (s.currentTab !== 'home') { setCurrentTab('home'); return; }

      // When on the root home feed with no modals open, exit app gracefully
      CapacitorApp.exitApp();
    }).then(handle => {
      removeListener = () => handle.remove();
    });

    return () => {
      if (removeListener) removeListener();
    };
  }, [
    setShowAIChat,
    setShowEditProfileModal,
    setShowFollowersModal,
    setSelectedUserForModal,
    setShowCreateHelp,
    setShowCreatePost,
    setShowAddAnimal,
    setShowCreateModal,
    setShowAdoptionFosterHub,
    setShowSearch,
    setShowNotifications,
    setShowSettings,
    setShowContributions,
    setShowLocationModal,
    setActiveAnimalId,
    setViewingProfileUser,
    setCurrentTab
  ]);

  // Listen for FCM notification click routing (?emergency=ID or postMessage from service worker)
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const emergencyParam = params.get('emergency');
      if (emergencyParam) {
        setActiveHelpId(emergencyParam);
        setCurrentTab('help');
      }
    } catch (e) {}

    const unsubSw = setupServiceWorkerMessageListener((helpRequestId) => {
      if (helpRequestId) {
        setActiveHelpId(helpRequestId);
        setCurrentTab('help');
      }
    });

    return () => {
      unsubSw();
    };
  }, [setActiveHelpId, setCurrentTab]);

  // If Firebase auth is still resolving session, display a smooth loading indicator
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#F3F7F5] flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-green-800 to-green-600 flex items-center justify-center text-white text-2xl shadow-xl shadow-green-900/20 mb-4 animate-pulse">
          🐾
        </div>
        <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-green-700" />
          <span>Connecting to Feeder Community...</span>
        </div>
      </div>
    );
  }

  // If user is not logged in, show Responsive Welcome & Onboarding flow
  if (!user) {
    return (
      <div className="min-h-[100dvh] w-full bg-[#F3F7F5] flex flex-col items-center justify-center px-3 py-4 sm:px-6 sm:py-8 lg:p-10 font-sans">
        <WelcomeScreen />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F7F5] text-slate-800 flex flex-col font-sans antialiased selection:bg-green-600/20 selection:text-green-800">
      {/* Unified Responsive Header */}
      {!activeAnimalId && <Header />}

      {/* Main Responsive App Content Area */}
      <main className={`${currentTab === 'profile' ? 'w-full' : 'flex-1 w-full'} max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 pb-20 md:pb-6`}>
        {activeAnimalId ? (
          <AnimalProfileView
            animalId={activeAnimalId}
            onBack={() => setActiveAnimalId(null)}
          />
        ) : (
          <>
            {currentTab === 'home' && (
              <div className="flex items-start justify-center gap-6 xl:gap-8">
                {/* Main Home Feed Column */}
                <div className="flex-1 max-w-2xl w-full mx-auto lg:mx-0">
                  <HomeFeed />
                </div>

                {/* Desktop Right Companion Sidebar */}
                <DesktopHomeSidebar />
              </div>
            )}
            {currentTab === 'communities' && <CommunitiesView />}
            {currentTab === 'nearby' && <NearbyMapView />}
            {currentTab === 'help' && <HelpUrgentView />}
            {currentTab === 'profile' && <UserProfileView />}
          </>
        )}
      </main>

      {/* Mobile-only Bottom Navigation (hidden on md: and above) */}
      {!activeAnimalId && <BottomNav />}

      {/* Floating Quick AI Pawsy Button (Single chatbot experience across the app) */}
      {!activeAnimalId && (
        <button
          onClick={() => setShowAIChat(true)}
          className="fixed right-4 sm:right-6 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 z-30 w-12 h-12 rounded-full bg-gradient-to-tr from-green-800 to-green-600 text-white shadow-lg shadow-green-900/30 flex items-center justify-center text-lg hover:scale-110 active:scale-95 transition-all border-2 border-white group focus:outline-none focus:ring-2 focus:ring-green-500/50 select-none"
          title="Ask Pawsy AI"
          aria-label="Ask Pawsy AI"
          id="floating-pawsy-ai-btn"
        >
          <span>🐾</span>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
        </button>
      )}

      {/* Modals and Sheets */}
      <CreateModal />
      <CreatePostModal />
      <CreateHelpModal />
      <AddAnimalModal />
      <AdoptionFosterHubModal />
      <SearchModal />
      <NotificationsModal />
      <SettingsModal />
      <ContributionsModal />
      <LocationModal />
      <AIChatModal />
      <ToastContainer />
      <EditProfileModal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        currentUser={user}
        onSave={updateUserProfile}
      />
      <FollowersListModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        type={followersModalType}
        targetUser={followersModalUser}
        onSelectUser={openUserProfile}
      />
      <UserDetailModal
        isOpen={!!selectedUserForModal}
        user={selectedUserForModal}
        onClose={() => setSelectedUserForModal(null)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainAppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
