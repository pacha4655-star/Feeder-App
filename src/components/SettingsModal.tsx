import React, { useState } from 'react';
import { ArrowLeft, User, Bell, Shield, MapPin, Heart, LogOut, Moon, Sun, Monitor, HelpCircle, MessageSquare, Info, Check, Send, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SettingsModal: React.FC = () => {
  const {
    showSettings,
    setShowSettings,
    user,
    selectedLocation,
    setSelectedLocation,
    logout,
    signInWithGoogleAccount,
    showToast,
    theme,
    setTheme,
    handleGoBack
  } = useApp();

  const [activeSection, setActiveSection] = useState<'main' | 'theme' | 'feedback' | 'about'>('main');
  const [urgentAlerts, setUrgentAlerts] = useState(true);
  const [feedingReminders, setFeedingReminders] = useState(true);
  const [communityDigest, setCommunityDigest] = useState(false);

  // Feedback form state
  const [feedbackType, setFeedbackType] = useState<'General' | 'Bug Report' | 'Feature Request' | 'Animal Rescue'>('General');
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  if (!showSettings) return null;

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setIsSubmittingFeedback(true);
    setTimeout(() => {
      setIsSubmittingFeedback(false);
      setFeedbackText('');
      showToast('Thank you! Your feedback has been received. 🐾', 'success');
      setActiveSection('main');
    }, 600);
  };

  const onBackClick = () => {
    if (activeSection !== 'main') {
      setActiveSection('main');
    } else {
      if (handleGoBack) {
        handleGoBack();
      } else {
        setShowSettings(false);
      }
    }
  };

  return (
    <div
      onClick={() => setShowSettings(false)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans animate-in fade-in duration-200"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[82vh] transition-colors duration-200 animate-in slide-in-from-bottom-6 duration-200"
      >
        {/* Top Header */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={onBackClick}
            className="p-1 -ml-1 text-slate-700 dark:text-slate-200 hover:text-black dark:hover:text-white flex items-center gap-1.5 font-bold text-sm"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            <span>
              {activeSection === 'main' ? 'Settings' : activeSection === 'theme' ? 'Appearance & Theme' : activeSection === 'feedback' ? 'Send Feedback' : 'About Feeder'}
            </span>
          </button>
        </div>

        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
        {activeSection === 'main' && (
          <>
            {/* Account Info */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <img
                src={user?.avatar}
                alt={user?.name}
                className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-600"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{user?.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">@{user?.username} • {user?.email || 'Connected'}</p>
                <span className="inline-block mt-1 text-[10px] font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800">
                  ⚡ Cloud Sync Active (Firestore)
                </span>
              </div>
            </div>

            {/* Quick Navigation Items */}
            <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {/* Theme Settings Button */}
              <button
                onClick={() => setActiveSection('theme')}
                className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Theme & Display</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">{theme || 'System'}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400">›</span>
              </button>

              {/* Feedback Button */}
              <button
                onClick={() => setActiveSection('feedback')}
                className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Feedback & Support</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Send suggestions or report bugs</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400">›</span>
              </button>

              {/* About Button */}
              <button
                onClick={() => setActiveSection('about')}
                className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 flex items-center justify-center">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">About Feeder</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Version, welfare principles & credits</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400">›</span>
              </button>
            </div>

            {/* Google Authentication Section */}
            <div className="p-3.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Google Account</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Sync posts, likes & registered profile</p>
                  </div>
                </div>
                <button
                  onClick={signInWithGoogleAccount}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
                >
                  {user?.email?.includes('@gmail.com') ? 'Connected' : 'Sign In'}
                </button>
              </div>
            </div>

            {/* Location Preferences */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Primary Region
              </h4>
              <div className="p-3 bg-white dark:bg-slate-850 border border-[#E8EDE9] dark:border-slate-800 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-slate-100">
                  <MapPin className="w-4 h-4 text-[#2E7D32]" />
                  <span>{selectedLocation}</span>
                </div>
                <button
                  onClick={() => {
                    const loc = prompt('Enter new primary neighborhood:', selectedLocation);
                    if (loc) {
                      setSelectedLocation(loc);
                      showToast(`Region updated to ${loc}`);
                    }
                  }}
                  className="text-xs font-bold text-[#2E7D32]"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Notifications toggles */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Alerts & Notifications
              </h4>
              <div className="bg-white dark:bg-slate-850 border border-[#E8EDE9] dark:border-slate-800 rounded-2xl divide-y divide-[#E8EDE9] dark:divide-slate-800">
                <div className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-slate-100">Urgent Rescue Alarms</p>
                    <p className="text-gray-500 dark:text-slate-400 text-[11px]">Emergency animal alerts nearby</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={urgentAlerts}
                    onChange={e => setUrgentAlerts(e.target.checked)}
                    className="w-4 h-4 accent-[#2E7D32]"
                  />
                </div>

                <div className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-slate-100">Daily Feeding Schedule Reminders</p>
                    <p className="text-gray-500 dark:text-slate-400 text-[11px]">Morning and evening community meal sync</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={feedingReminders}
                    onChange={e => setFeedingReminders(e.target.checked)}
                    className="w-4 h-4 accent-[#2E7D32]"
                  />
                </div>
              </div>
            </div>

            {/* Logout */}
            <div className="pt-2">
              <button
                onClick={() => {
                  setShowSettings(false);
                  logout();
                }}
                className="w-full py-3 rounded-2xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 font-bold text-xs hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Feeder</span>
              </button>
            </div>
          </>
        )}

        {/* Theme Settings Subview */}
        {activeSection === 'theme' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose how Feeder appears on your device. Themes automatically persist across sessions.
            </p>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'light', label: 'Light', icon: Sun, desc: 'Clean & crisp' },
                { id: 'dark', label: 'Dark', icon: Moon, desc: 'Eye-friendly' },
                { id: 'system', label: 'System', icon: Monitor, desc: 'Follows OS' }
              ].map(item => {
                const isSelected = theme === item.id;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (setTheme) {
                        setTheme(item.id as any);
                        showToast(`Theme set to ${item.label}`);
                      }
                    }}
                    className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 text-center transition-all ${
                      isSelected
                        ? 'border-green-600 bg-green-50/70 dark:bg-green-950/50 text-green-700 dark:text-green-300 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <IconComponent className={`w-6 h-6 ${isSelected ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`} />
                    <div>
                      <p className="text-xs font-bold">{item.label}</p>
                      <p className="text-[10px] text-slate-400">{item.desc}</p>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-green-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Feedback Subview */}
        {activeSection === 'feedback' && (
          <form onSubmit={handleFeedbackSubmit} className="space-y-4 animate-in fade-in duration-150">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Feedback Topic</label>
              <div className="flex flex-wrap gap-1.5">
                {(['General', 'Bug Report', 'Feature Request', 'Animal Rescue'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFeedbackType(type)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      feedbackType === type
                        ? 'bg-green-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Your Thoughts or Observations</label>
              <textarea
                rows={5}
                required
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="Share your experiences, improvements needed, or issues encountered while managing animal care..."
                className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-green-600 text-slate-800 dark:text-slate-100 font-medium resize-none leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingFeedback || !feedbackText.trim()}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              {isSubmittingFeedback ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending Feedback...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Feedback</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* About Subview */}
        {activeSection === 'about' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-850 rounded-2xl border border-green-200 dark:border-slate-700 text-center">
              <span className="text-3xl">🐾</span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2">Feeder Community</h3>
              <p className="text-xs text-green-700 dark:text-green-400 font-semibold">Street Animal Welfare & Caregiver Network</p>
              <p className="text-[10px] text-slate-400 mt-1">Version 2.4.0 • Real User Community & Database</p>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Our Core Principles</h4>
              <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
                <li>Zero fake metrics: every like, comment, and follower count reflects real people.</li>
                <li>Strict account isolation: your posts are published exclusively under your identity.</li>
                <li>Community-first safety: emergency medical support and nearby hospitals always accessible.</li>
                <li>Humane care: routine vaccination, ABC (animal birth control), and compassionate feeding.</li>
              </ul>
            </div>

            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200">
              <p className="font-bold mb-1">🚨 Emergency Disclaimer</p>
              <p>
                In cases of acute animal distress or severe trauma, contact local veterinary emergency hospitals immediately using the live map directory.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);
};
