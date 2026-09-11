import React from 'react';
import { ArrowLeft, Award, Heart, Utensils, ShieldAlert, Sparkles, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ContributionsModal: React.FC = () => {
  const {
    showContributions,
    setShowContributions,
    user
  } = useApp();

  if (!showContributions || !user) return null;

  const karmaPoints = user.karmaPoints ?? (user.postsCount * 10 + user.followersCount * 5);
  const mealsFed = user.mealsFedCount ?? Math.max(1, user.postsCount * 4);
  const rescuesCount = user.rescuesSupportedCount ?? 0;
  const animalsCount = user.registeredAnimalsCount ?? 0;

  const badges = [
    { title: 'Community Guardian', desc: 'Active animal feeder for > 6 months', icon: '🌟', date: 'Earned' },
    { title: 'First Responder', desc: 'Responded to urgent medical alerts', icon: '🚨', date: 'Active' },
    { title: 'Vaccine Advocate', desc: 'Logged and tracked Rabies vaccinations', icon: '💉', date: 'Active' },
    { title: 'Puppy Foster Angel', desc: 'Safely hosted fostered pups', icon: '🐾', date: 'Active' }
  ];

  return (
    <div
      onClick={() => setShowContributions(false)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans animate-in fade-in duration-200"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[82vh] animate-in slide-in-from-bottom-6 duration-200"
      >
        {/* Top Header */}
        <div className="sticky top-0 z-10 bg-white px-5 py-3.5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowContributions(false)}
              className="p-1 -ml-1 text-slate-700 hover:text-black flex items-center gap-1 font-bold text-xs"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span>My Contributions</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
              Karma: {karmaPoints}
            </span>
            <button
              onClick={() => setShowContributions(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Karma Hero Card */}
          <div className="bg-gradient-to-br from-green-800 to-green-600 text-white p-5 rounded-3xl shadow-md relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-green-200">
                Community Impact Score
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold">{karmaPoints}</span>
                <span className="text-xs text-green-100">Feeder Karma</span>
              </div>
              <p className="text-xs text-green-100 mt-2 leading-relaxed">
                Your verified community actions help street animals stay fed, vaccinated, and protected.
              </p>
            </div>
            <Sparkles className="w-28 h-28 text-white/10 absolute -bottom-4 -right-4 pointer-events-none" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <Utensils className="w-5 h-5 text-green-700 mb-1" />
              <div className="text-lg font-extrabold text-slate-900">{mealsFed}</div>
              <div className="text-xs text-slate-500">Meals Served</div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <Heart className="w-5 h-5 text-red-600 mb-1" />
              <div className="text-lg font-extrabold text-slate-900">{rescuesCount}</div>
              <div className="text-xs text-slate-500">Rescues Supported</div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <Award className="w-5 h-5 text-amber-600 mb-1" />
              <div className="text-lg font-extrabold text-slate-900">{animalsCount}</div>
              <div className="text-xs text-slate-500">Animals Monitored</div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <ShieldAlert className="w-5 h-5 text-blue-600 mb-1" />
              <div className="text-lg font-extrabold text-slate-900">Verified</div>
              <div className="text-xs text-slate-500">Community Rank</div>
            </div>
          </div>

          {/* Badges */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
              Badges & Recognition
            </h3>
            <div className="space-y-2">
              {badges.map((b, i) => (
                <div
                  key={i}
                  className="p-3 bg-white border border-slate-100 rounded-2xl flex items-center gap-3 shadow-2xs hover:border-green-200 transition-colors"
                >
                  <div className="w-11 h-11 rounded-2xl bg-green-50 flex items-center justify-center text-xl flex-shrink-0">
                    {b.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900">{b.title}</h4>
                      <span className="text-[10px] text-slate-400">{b.date}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
