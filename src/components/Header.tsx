import React from 'react';
import {
  Search,
  Bell,
  MapPin,
  ChevronDown,
  Navigation,
  Loader2,
  Home,
  Users,
  AlertTriangle,
  Plus,
  User as UserIcon
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FeederLogo } from './FeederLogo';

export const Header: React.FC = () => {
  const {
    user,
    currentTab,
    setCurrentTab,
    selectedLocation,
    setShowLocationModal,
    setShowSearch,
    setShowNotifications,
    setShowCreateSheet,
    setActiveAnimalId,
    setActiveCommunityId,
    setActiveHelpId,
    notifications,
    helpRequests,
    detectUserLocation,
    isLocating,
    setViewingProfileUser,
  } = useApp();

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const urgentCount = helpRequests.filter(h => h.urgency === 'urgent' && h.status !== 'resolved').length;

  const handleTabClick = (tab: 'home' | 'communities' | 'nearby' | 'help' | 'profile') => {
    setActiveAnimalId(null);
    setActiveCommunityId(null);
    setActiveHelpId(null);
    if (tab === 'profile' || tab === 'home') {
      setViewingProfileUser(null);
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navItems: { id: 'home' | 'communities' | 'nearby' | 'help' | 'profile'; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-4 h-4" /> },
    { id: 'communities', label: 'Communities', icon: <Users className="w-4 h-4" /> },
    { id: 'nearby', label: 'Nearby Map', icon: <MapPin className="w-4 h-4" /> },
    { id: 'help', label: 'Help / Urgent', icon: <AlertTriangle className="w-4 h-4" />, badge: urgentCount },
    { id: 'profile', label: 'Profile', icon: <UserIcon className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 transition-all font-sans">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand Logo & Feeder Name */}
        <div
          onClick={() => handleTabClick('home')}
          className="cursor-pointer hover:opacity-90 transition-opacity flex items-center flex-shrink-0"
          title="Feeder Home"
        >
          <FeederLogo size="sm" showText={true} textColor="text-slate-800" />
        </div>

        {/* Center / Flexible: Current Location Selector */}
        <div className="flex-1 min-w-0 flex items-center justify-center sm:justify-start max-w-[140px] xs:max-w-[180px] sm:max-w-xs md:max-w-none md:flex-initial">
          <div className="flex items-center gap-1 max-w-full">
            <button
              onClick={() => setShowLocationModal(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold text-green-800 bg-green-50/90 border border-green-200/80 rounded-full hover:bg-green-100 transition-colors shadow-2xs group max-w-full"
              title="Change location or adjust radius"
              id="header-location-btn"
            >
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-700 group-hover:scale-110 transition-transform flex-shrink-0" />
              <span className="truncate max-w-[65px] xs:max-w-[100px] sm:max-w-[150px] md:max-w-[180px]">
                {selectedLocation.split(',')[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-green-700 flex-shrink-0" />
            </button>

            {/* Quick GPS detect button on tablet / desktop */}
            <button
              onClick={() => detectUserLocation()}
              disabled={isLocating}
              className="hidden md:flex w-7 h-7 rounded-full items-center justify-center text-slate-400 hover:text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50 flex-shrink-0"
              title="Detect current GPS coordinates"
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-green-600" />
              ) : (
                <Navigation className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Center: Desktop / Tablet Navigation Tabs (md: and above) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 shadow-2xs">
          {navItems.map(item => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                id={`desktop-nav-${item.id}`}
                className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-green-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
                      isActive ? 'bg-white text-red-600' : 'bg-red-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Right: Actions, AI, Notifications, Create button, User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Desktop Search Bar button */}
          <button
            onClick={() => setShowSearch(true)}
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-700 text-xs transition-colors border border-slate-200/60"
            title="Search people on Feeder"
            id="desktop-search-button"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-slate-400">Search people...</span>
            <kbd className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-400 font-mono">⌘K</kbd>
          </button>

          {/* Mobile / Tablet Search Icon */}
          <button
            onClick={() => setShowSearch(true)}
            className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            aria-label="Search people"
            title="Search people"
            id="header-search-button"
          >
            <Search className="w-4 h-4 stroke-[2.2]" />
          </button>

          {/* Notifications Button with Badge */}
          <button
            onClick={() => setShowNotifications(true)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full relative flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-green-600/30"
            aria-label="Notifications"
            title="Notifications"
            id="header-notifications-button"
          >
            <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[15px] h-3.5 px-1 rounded-full bg-green-600 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Create Button (Tablet / Desktop) */}
          <button
            onClick={() => setShowCreateSheet(true)}
            id="desktop-create-post-btn"
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all"
            title="Create Post, Report Rescue, or Add Animal"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Post</span>
          </button>

          {/* User Profile Avatar (Tablet / Desktop shortcut) */}
          {user && (
            <button
              onClick={() => handleTabClick('profile')}
              className="hidden sm:flex items-center gap-2 pl-1 pr-2 py-0.5 rounded-full hover:bg-slate-100 transition-colors"
              title={`View ${user.name}'s profile`}
            >
              <img
                src={user.avatar}
                alt={user.name}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-200 shadow-2xs"
                referrerPolicy="no-referrer"
              />
              <span className="hidden xl:inline text-xs font-bold text-slate-700 max-w-[100px] truncate">
                {user.name.split(' ')[0]}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
