import React from 'react';
import { Home, Search, Plus, Users, User as UserIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const BottomNav: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    setShowCreateSheet,
    setShowSearch,
    setActiveAnimalId,
    setActiveCommunityId,
    setActiveHelpId,
    setViewingProfileUser,
    user
  } = useApp();

  const handleTabClick = (tab: 'home' | 'communities' | 'profile') => {
    setActiveAnimalId(null);
    setActiveCommunityId(null);
    setActiveHelpId(null);
    if (tab === 'profile' || tab === 'home' || tab === 'communities') {
      setViewingProfileUser(null);
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 pb-safe transition-all shadow-lg shadow-slate-900/5 select-none">
      <div className="w-full max-w-lg mx-auto px-2 h-14 flex items-center justify-between relative">
        {/* 1. Home */}
        <button
          onClick={() => handleTabClick('home')}
          id="nav-home"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentTab === 'home'
              ? 'text-green-700 dark:text-green-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          aria-label="Home"
        >
          <div className="relative">
            <Home className="w-5 h-5 stroke-[2.2]" />
            {currentTab === 'home' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-700 dark:bg-green-400 rounded-full" />
            )}
          </div>
          <span className={`text-[10px] mt-0.5 font-bold ${currentTab === 'home' ? 'text-green-700 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
            Home
          </span>
        </button>

        {/* 2. Search */}
        <button
          onClick={() => setShowSearch(true)}
          id="nav-search"
          className="flex flex-col items-center justify-center flex-1 py-1 transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          aria-label="Search people and places"
        >
          <div className="relative">
            <Search className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[10px] mt-0.5 font-bold text-slate-500 dark:text-slate-400">
            Search
          </span>
        </button>

        {/* 3. Center Raised Create (+) Button */}
        <div className="flex-1 flex justify-center -mt-5">
          <button
            onClick={() => setShowCreateSheet(true)}
            id="nav-create-button"
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 text-white flex items-center justify-center shadow-lg shadow-green-700/35 hover:scale-105 active:scale-95 transition-all duration-150 border-[3px] border-white dark:border-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
            aria-label="Create post or action"
            title="Create Post, Report Rescue, or Add Animal"
          >
            <Plus className="w-6 h-6 stroke-[2.8]" />
          </button>
        </div>

        {/* 4. Community */}
        <button
          onClick={() => handleTabClick('communities')}
          id="nav-communities"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentTab === 'communities'
              ? 'text-green-700 dark:text-green-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          aria-label="Community"
        >
          <div className="relative">
            <Users className="w-5 h-5 stroke-[2.2]" />
            {currentTab === 'communities' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-700 dark:bg-green-400 rounded-full" />
            )}
          </div>
          <span className={`text-[10px] mt-0.5 font-bold ${currentTab === 'communities' ? 'text-green-700 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
            Community
          </span>
        </button>

        {/* 5. Profile */}
        <button
          onClick={() => handleTabClick('profile')}
          id="nav-profile"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentTab === 'profile'
              ? 'text-green-700 dark:text-green-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          aria-label="Profile"
        >
          <div className="relative">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className={`w-5 h-5 rounded-full object-cover border ${
                  currentTab === 'profile' ? 'border-green-600 ring-1 ring-green-600' : 'border-slate-300 dark:border-slate-600'
                }`}
                referrerPolicy="no-referrer"
              />
            ) : (
              <UserIcon className="w-5 h-5 stroke-[2.2]" />
            )}
            {currentTab === 'profile' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-700 dark:bg-green-400 rounded-full" />
            )}
          </div>
          <span className={`text-[10px] mt-0.5 font-bold ${currentTab === 'profile' ? 'text-green-700 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
            Profile
          </span>
        </button>
      </div>
    </nav>
  );
};
