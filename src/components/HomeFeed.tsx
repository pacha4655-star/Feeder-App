import React, { useState, useMemo } from 'react';
import { StoriesBar } from './StoriesBar';
import { PostCard } from './PostCard';
import { useApp } from '../context/AppContext';
import { Post } from '../types';
import { ChevronRight, Sparkles, Image as ImageIcon, Video } from 'lucide-react';

export const HomeFeed: React.FC = () => {
  const { posts, helpRequests, setActiveHelpId, setShowCreatePost, selectedLocation, user } = useApp();
  const [activeFeedTab, setActiveFeedTab] = useState<'for-you' | 'following' | 'nearby'>('for-you');

  // Find urgent request to highlight in hero notice
  const urgentNotice = helpRequests.find(h => h.urgency === 'urgent' && h.status !== 'resolved');

  // Filter posts based on selected tab and strictly deduplicate by id
  const displayedPosts = useMemo(() => {
    const followingIds = Array.isArray(user?.followingIds) ? user!.followingIds : [];

    const filtered = (posts || []).filter(p => {
      if (!p) return false;
      if (activeFeedTab === 'following') {
        return followingIds.includes(p.userId);
      }
      if (activeFeedTab === 'nearby') {
        if (!selectedLocation || selectedLocation === 'Select location') return true;
        const mainLoc = selectedLocation.split(',')[0].trim().toLowerCase();
        const postLoc = (p.userLocation || '').toLowerCase();
        return postLoc.includes(mainLoc);
      }
      return true;
    });

    const seen = new Set<string>();
    const unique: Post[] = [];
    filtered.forEach((p, idx) => {
      const id = p.id || `post_${idx}`;
      if (!seen.has(id)) {
        seen.add(id);
        unique.push({ ...p, id });
      }
    });
    return unique;
  }, [posts, activeFeedTab, selectedLocation, user?.followingIds]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-2.5 sm:space-y-3.5 font-sans">
      {/* 1. Stories horizontal reel */}
      <section className="bg-white dark:bg-slate-900 border-y sm:border border-slate-200/80 dark:border-slate-800 sm:rounded-2xl p-2.5 sm:p-3 shadow-2xs overflow-hidden">
        <StoriesBar />
      </section>

      {/* 2. Compact Social Create Post Prompt Bar */}
      <section className="bg-white dark:bg-slate-900 border-y sm:border border-slate-200/80 dark:border-slate-800 sm:rounded-2xl p-3 sm:p-3.5 shadow-2xs">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <img
            src={user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
            alt={user?.name || 'You'}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0 shadow-2xs"
            referrerPolicy="no-referrer"
          />
          <button
            type="button"
            onClick={() => setShowCreatePost(true)}
            className="flex-1 text-left px-3.5 py-2 sm:py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-750 text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium transition-colors border border-slate-200/60 dark:border-slate-700 cursor-pointer truncate"
            id="home-feed-create-post-input"
          >
            What are you sharing today?
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5 pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => setShowCreatePost(true)}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl hover:bg-green-50 dark:hover:bg-green-950/40 hover:text-green-700 dark:hover:text-green-400 transition-colors cursor-pointer"
          >
            <ImageIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-xs font-semibold truncate">Photo</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCreatePost(true)}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-700 dark:hover:text-purple-400 transition-colors cursor-pointer"
          >
            <Video className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <span className="text-xs font-semibold truncate">Video</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCreatePost(true)}
            id="home-feed-primary-post-btn"
            className="flex items-center justify-center gap-1 py-1.5 px-3 rounded-xl bg-green-700 hover:bg-green-800 active:scale-95 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
          >
            <span className="truncate">Post</span>
          </button>
        </div>
      </section>

      {/* 3. Feed Tabs: For You, Following, Nearby */}
      <section className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-y sm:border border-slate-200/80 dark:border-slate-800 sm:rounded-2xl p-1.5 shadow-2xs sticky top-14 sm:top-16 z-20">
        <div className="flex items-center gap-1 w-full bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700">
          <button
            onClick={() => setActiveFeedTab('for-you')}
            id="feed-tab-for-you"
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-center select-none truncate cursor-pointer ${
              activeFeedTab === 'for-you'
                ? 'bg-green-700 dark:bg-green-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700'
            }`}
          >
            For You
          </button>
          <button
            onClick={() => setActiveFeedTab('following')}
            id="feed-tab-following"
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-center select-none truncate cursor-pointer ${
              activeFeedTab === 'following'
                ? 'bg-green-700 dark:bg-green-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700'
            }`}
          >
            Following
          </button>
          <button
            onClick={() => setActiveFeedTab('nearby')}
            id="feed-tab-nearby"
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-center select-none truncate cursor-pointer ${
              activeFeedTab === 'nearby'
                ? 'bg-green-700 dark:bg-green-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700'
            }`}
          >
            Nearby
          </button>
        </div>
      </section>

      {/* Urgent Request Banner Alert */}
      {urgentNotice && (
        <section className="mx-2.5 sm:mx-0 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/60 rounded-2xl p-3 flex items-center gap-3 shadow-2xs">
          <div className="bg-red-500 w-2 h-2 rounded-full animate-pulse flex-shrink-0" />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
              Urgent Help
            </span>
            <span className="text-[11px] text-red-800 dark:text-red-200 leading-tight font-semibold truncate">
              {urgentNotice.title}
            </span>
            <span className="text-[10px] text-red-600/80 dark:text-red-300/80 mt-0.5">
              {urgentNotice.location} • {urgentNotice.responders?.length || 0} responding
            </span>
          </div>
          <button
            onClick={() => setActiveHelpId(urgentNotice.id)}
            className="flex-shrink-0 text-xs font-bold text-red-700 dark:text-red-300 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 px-2.5 py-1 rounded-full hover:bg-red-50 dark:hover:bg-slate-700 flex items-center gap-0.5 shadow-xs cursor-pointer"
          >
            <span>Respond</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </section>
      )}

      {/* 4. Posts Feed List */}
      <div className="space-y-3 sm:space-y-3.5">
        {displayedPosts.length > 0 ? (
          displayedPosts.map(post => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="bg-white dark:bg-slate-900 border-y sm:border border-slate-200/80 dark:border-slate-800 sm:rounded-2xl p-8 text-center shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-800 flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
              <Sparkles className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white">No posts in this feed yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              {activeFeedTab === 'following'
                ? 'Follow more caregivers and feeders to see their updates here.'
                : 'Be the first to share an animal update or feeding report!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
