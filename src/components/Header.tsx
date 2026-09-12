import React from 'react';
import {
  Search,
  Bell,
  MapPin,
  ChevronDown,
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
    setViewingProfileUser,
  } = useApp();

  const unreadCount = (notifications || []).filter(n => !n.isRead).length;
  const urgentCount = (helpRequests || []).filter(h => h.urgency === 'urgent' && h.status !== 'resolved').length;

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
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-all font-sans">
      <div className="max-w-7xl mx-auto px-2.5 xs:px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand Logo & Feeder Name */}
        <div
          onClick={() => handleTabClick('home')}
          className="cursor-pointer hover:opacity-90 transition-opacity flex items-center flex-shrink-0"
          title="Feeder Home"
        >
          <FeederLogo size="sm" showText={true} textColor="text-slate-800 dark:text-white" />
        </div>

        {/* Center / Flexible: Single Primary Location Selector */}
        <div className="flex-1 min-w-0 flex items-center justify-center sm:justify-start max-w-[150px] xs:max-w-[190px] sm:max-w-xs md:max-w-none md:flex-initial">
          <button
            onClick={() => setShowLocationModal(true)}
            className="flex items-center gap-1 sm:gap-1.5 px-2 xs:px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold text-green-800 dark:text-green-300 bg-green-50/90 dark:bg-green-950/60 border border-green-200/80 dark:border-green-800 rounded-full hover:bg-green-100 dark:hover:bg-green-900/80 transition-colors shadow-2xs group max-w-full cursor-pointer"
            title="Change location or adjust radius"
            id="header-location-btn"
          >
            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-700 dark:text-green-400 group-hover:scale-110 transition-transform flex-shrink-0" />
            <span className="truncate max-w-[80px] xs:max-w-[110px] sm:max-w-[150px] md:max-w-[180px]">
              {(selectedLocation || 'Select Location').split(',')[0]}
            </span>
            <ChevronDown className="w-3 h-3 text-green-700 dark:text-green-400 flex-shrink-0" />
          </button>
        </div>

        {/* Center: Desktop Navigation Tabs (md: and above) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700 shadow-2xs">
          {navItems.map(item => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                id={`desktop-nav-${item.id}`}
                className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-green-700 dark:bg-green-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
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

        {/* Right: Notifications on Mobile & Full Controls on Desktop */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Desktop Search Bar button */}
          <button
            onClick={() => setShowSearch(true)}
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-750 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs transition-colors border border-slate-200/60 dark:border-slate-700 cursor-pointer"
            title="Search people and places"
            id="desktop-search-button"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-slate-400 dark:text-slate-400">Search people & places...</span>
            <kbd className="text-[10px] bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-slate-400 font-mono">⌘K</kbd>
          </button>

          {/* Unified Notification Bell Icon (Accessible on Mobile and Desktop) */}
          <button
            onClick={() => setShowNotifications(true)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full relative flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-green-600/30 cursor-pointer"
            aria-label="Notifications"
            title="Notifications"
            id="header-notifications-button"
          >
            <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[15px] h-3.5 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Profile Avatar (Tablet / Desktop shortcut) */}
          {user && (
            <button
              onClick={() => handleTabClick('profile')}
              className="hidden sm:flex items-center gap-2 pl-1 pr-2 py-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={`View ${user.name}'s profile`}
            >
              <img
                src={user.avatar}
                alt={user.name}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-2xs"
                referrerPolicy="no-referrer"
              />
              <span className="hidden xl:inline text-xs font-bold text-slate-700 dark:text-slate-200 max-w-[100px] truncate">
                {user.name.split(' ')[0]}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
