import React from 'react';
import { Bell, AlertCircle, Heart, MessageSquare, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const NotificationsModal: React.FC = () => {
  const {
    showNotifications,
    setShowNotifications,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    setActiveHelpId,
    setActiveAnimalId,
    setCurrentTab
  } = useApp();

  if (!showNotifications) return null;

  const handleNotificationClick = (n: any) => {
    markNotificationAsRead(n.id);
    setShowNotifications(false);
    if (n.entityType === 'help' && n.entityId) {
      setActiveHelpId(n.entityId);
      setCurrentTab('help');
    } else if (n.entityType === 'animal' && n.entityId) {
      setActiveAnimalId(n.entityId);
    } else if (n.entityType === 'community') {
      setCurrentTab('communities');
    } else {
      setCurrentTab('home');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'urgent_help':
      case 'urgent_nearby':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'feeding_logged':
      case 'feeding':
        return <Heart className="w-4 h-4 text-green-700 dark:text-green-400" />;
      case 'comment':
      case 'like':
        return <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />;
    }
  };

  return (
    <div
      onClick={() => setShowNotifications(false)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans animate-in fade-in duration-200"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[82vh] animate-in slide-in-from-bottom-6 duration-200"
      >
        {/* Top Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 px-5 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white">Notifications</h3>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={markAllNotificationsAsRead}
              className="text-xs font-bold text-green-700 dark:text-green-400 hover:text-green-800 hover:underline transition-colors cursor-pointer"
            >
              Mark all as read
            </button>
            <button
              onClick={() => setShowNotifications(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 flex-1 overflow-y-auto">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-4 flex items-start gap-3.5 cursor-pointer transition-colors ${
                !n.isRead
                  ? 'bg-green-50/40 dark:bg-green-950/30 hover:bg-green-50/70 dark:hover:bg-green-950/50'
                  : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                n.type === 'urgent_help' || n.type === 'urgent_nearby'
                  ? 'bg-red-100 dark:bg-red-950/60'
                  : 'bg-green-100 dark:bg-green-950/60'
              }`}>
                {getIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs sm:text-sm ${!n.isRead ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-200'}`}>
                    {n.title}
                  </h4>
                  <span className="text-[10px] text-slate-400">{n.createdAt}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">{n.message || n.body}</p>
              </div>

              {!n.isRead && (
                <span className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400 mt-2 flex-shrink-0" />
              )}
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="text-center py-16 px-6">
              <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No new notifications</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
