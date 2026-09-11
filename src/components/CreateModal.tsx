import React from 'react';
import { X, Edit3, AlertTriangle, PawPrint, Home, HeartHandshake, Utensils } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const CreateModal: React.FC = () => {
  const {
    showCreateSheet,
    setShowCreateSheet,
    setShowCreatePost,
    setShowCreateHelp,
    setShowAddAnimal,
    setShowAdoptionFosterHub
  } = useApp();

  if (!showCreateSheet) return null;

  const actions = [
    {
      id: 'post',
      title: 'Create Post',
      desc: 'Share stories, questions, photos or advice',
      icon: <Edit3 className="w-5 h-5 text-[#2E7D32]" />,
      bg: 'bg-[#E8F5E9]',
      onClick: () => {
        setShowCreateSheet(false);
        setShowCreatePost(true);
      }
    },
    {
      id: 'help',
      title: 'Report Urgent Need',
      desc: 'Injured animal, transport, or medical help',
      icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
      bg: 'bg-red-50',
      badge: 'URGENT',
      onClick: () => {
        setShowCreateSheet(false);
        setShowCreateHelp(true);
      }
    },
    {
      id: 'animal',
      title: 'Add Animal Profile',
      desc: 'Create verified profile for community or pet',
      icon: <PawPrint className="w-5 h-5 text-amber-600" />,
      bg: 'bg-amber-50',
      onClick: () => {
        setShowCreateSheet(false);
        setShowAddAnimal(true);
      }
    },
    {
      id: 'adopt',
      title: 'Adoption & Foster Hub',
      desc: 'Find homes or temporary foster families',
      icon: <Home className="w-5 h-5 text-sky-600" />,
      bg: 'bg-sky-50',
      onClick: () => {
        setShowCreateSheet(false);
        setShowAdoptionFosterHub(true);
      }
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs font-['Plus_Jakarta_Sans',sans-serif]">
      <div
        className="fixed inset-0"
        onClick={() => setShowCreateSheet(false)}
      />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-100 animate-in slide-in-from-bottom duration-200 z-10">
        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
        
        <div className="flex items-center justify-between pb-3 border-b border-[#E8EDE9]">
          <div>
            <h3 className="text-base font-extrabold text-gray-900">What would you like to do?</h3>
            <p className="text-xs text-gray-500">Take action for animals in your neighborhood</p>
          </div>
          <button
            onClick={() => setShowCreateSheet(false)}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2.5 py-3">
          {actions.map(act => (
            <button
              key={act.id}
              onClick={act.onClick}
              className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-[#F8FAF8] border border-gray-100 hover:border-[#34A853] transition-all text-left group"
            >
              <div className={`w-11 h-11 rounded-2xl ${act.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                {act.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#2E7D32]">
                    {act.title}
                  </h4>
                  {act.badge && (
                    <span className="text-[10px] font-extrabold text-red-600 bg-red-100 px-1.5 py-0.2 rounded">
                      {act.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">{act.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
