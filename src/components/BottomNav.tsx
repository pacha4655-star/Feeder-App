import React from 'react';
import { Home, Users, Plus, MapPin, User as UserIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const BottomNav: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    setShowCreateSheet,
    setActiveAnimalId,
    setActiveCommunityId,
    setActiveHelpId,
    setViewingProfileUser
  } = useApp();

  const handleTabClick = (tab: 'home' | 'communities' | 'nearby' | 'help' | 'profile') => {
    // Reset detail overlays when switching primary tabs
    setActiveAnimalId(null);
    setActiveCommunityId(null);
    setActiveHelpId(null);
    if (tab === 'profile' || tab === 'home') {
      setViewingProfileUser(null);
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-100 pb-safe transition-all shadow-lg shadow-slate-900/5 select-none">
      <div className="w-full max-w-lg mx-auto px-2 h-14 flex items-center justify-between relative">
        {/* Home */}
        <button
          onClick={() => handleTabClick('home')}
          id="nav-home"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentTab === 'home' ? 'text-green-600' : 'text-slate-400 hover:text-slate-600'
          }`}
          aria-label="Home"
        >
          <div className="relative">
            <Home className="w-5 h-5 stroke-[2.2]" />
            {currentTab === 'home' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-600 rounded-full" />
            )}
          </div>
          <span className={`text-[10px] mt-0.5 font-bold ${currentTab === 'home' ? 'text-green-600' : 'text-slate-500'}`}>
            Home
          </span>
        </button>

        {/* Communities */}
        <button
          onClick={() => handleTabClick('communities')}
          id="nav-communities"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentTab === 'communities' ? 'text-green-600' : 'text-slate-400 hover:text-slate-600'
          }`}
          aria-label="Communities"
        >
          <div className="relative">
            <Users className="w-5 h-5 stroke-[2.2]" />
            {currentTab === 'communities' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-600 rounded-full" />
            )}
          </div>
          <span className={`text-[10px] mt-0.5 font-bold ${currentTab === 'communities' ? 'text-green-600' : 'text-slate-500'}`}>
            Communities
          </span>
        </button>

        {/* Center Raised (+) Button */}
        <div className="flex-1 flex justify-center -mt-5">
          <button
            onClick={() => setShowCreateSheet(true)}
            id="nav-create-button"
            className="w-12 h-12 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center shadow-lg shadow-green-600/35 hover:scale-105 active:scale-95 transition-all duration-150 border-[3px] border-white focus:outline-none focus:ring-2 focus:ring-green-500/40"
            aria-label="Create new post or action"
            title="Create Post or Report Rescue"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Nearby */}
        <button
          onClick={() => handleTabClick('nearby')}
          id="nav-nearby"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentTab === 'nearby' ? 'text-green-600' : 'text-slate-400 hover:text-slate-600'
          }`}
          aria-label="Nearby Map"
        >
          <div className="relative">
            <MapPin className="w-5 h-5 stroke-[2.2]" />
            {currentTab === 'nearby' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-600 rounded-full" />
            )}
          </div>
          <span className={`text-[10px] mt-0.5 font-bold ${currentTab === 'nearby' ? 'text-green-600' : 'text-slate-500'}`}>
            Nearby
          </span>
        </button>

        {/* Profile */}
        <button
          onClick={() => handleTabClick('profile')}
          id="nav-profile"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentTab === 'profile' ? 'text-green-600' : 'text-slate-400 hover:text-slate-600'
          }`}
          aria-label="Profile"
        >
          <div className="relative">
            <UserIcon className="w-5 h-5 stroke-[2.2]" />
            {currentTab === 'profile' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-600 rounded-full" />
            )}
          </div>
          <span className={`text-[10px] mt-0.5 font-bold ${currentTab === 'profile' ? 'text-green-600' : 'text-slate-500'}`}>
            Profile
          </span>
        </button>
      </div>
    </nav>
  );
};
