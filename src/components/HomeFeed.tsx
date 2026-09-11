import React, { useState, useMemo } from 'react';
import { StoriesBar } from './StoriesBar';
import { PostCard } from './PostCard';
import { useApp } from '../context/AppContext';
import { Post } from '../types';
import { AlertCircle, ChevronRight, Sparkles, PlusCircle } from 'lucide-react';

export const HomeFeed: React.FC = () => {
  const { posts, helpRequests, setActiveHelpId, setCurrentTab, setShowCreatePost, selectedLocation, user } = useApp();
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
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
      {/* Stories horizontal reel */}
      <StoriesBar />

      {/* Feed Tabs: For You, Following, Nearby */}
      <div className="border-b border-slate-100 px-3 sm:px-4 py-2 bg-white/95 backdrop-blur-md sticky top-14 sm:top-16 z-20">
        <div className="flex items-center gap-1 w-full bg-slate-100/90 p-1 rounded-2xl border border-slate-200/50">
          <button
            onClick={() => setActiveFeedTab('for-you')}
            id="feed-tab-for-you"
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all text-center select-none truncate ${
              activeFeedTab === 'for-you'
                ? 'bg-green-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            For You
          </button>
          <button
            onClick={() => setActiveFeedTab('following')}
            id="feed-tab-following"
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all text-center select-none truncate ${
              activeFeedTab === 'following'
                ? 'bg-green-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            Following
          </button>
          <button
            onClick={() => setActiveFeedTab('nearby')}
            id="feed-tab-nearby"
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all text-center select-none truncate ${
              activeFeedTab === 'nearby'
                ? 'bg-green-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            Nearby
          </button>
        </div>
      </div>

      {/* Urgent Request Banner Alert */}
      {urgentNotice && (
        <div className="mx-3 my-2.5 bg-red-50 border border-red-100 rounded-2xl p-3 flex items-center gap-3">
          <div className="bg-red-500 w-2 h-2 rounded-full animate-pulse flex-shrink-0" />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
              Urgent Help
            </span>
            <span className="text-[11px] text-red-800 leading-tight font-semibold truncate">
              {urgentNotice.title}
            </span>
            <span className="text-[10px] text-red-600/70 mt-0.5">
              {urgentNotice.location} • {urgentNotice.responders?.length || 0} active
            </span>
          </div>
          <button
            onClick={() => setActiveHelpId(urgentNotice.id)}
            className="flex-shrink-0 text-xs font-bold text-red-700 bg-white border border-red-200 px-2.5 py-1 rounded-full hover:bg-red-50 flex items-center gap-0.5 shadow-xs"
          >
            <span>Respond</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Posts List */}
      <div className="p-3 sm:p-4 space-y-3">
        {displayedPosts.length > 0 ? (
          displayedPosts.map(post => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="text-center py-7 sm:py-9 px-4 sm:px-6 bg-slate-50/90 rounded-2xl border border-slate-100/80 my-1">
            <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 border border-green-100 flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
              <Sparkles className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-slate-800">No posts in this feed yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              {activeFeedTab === 'following'
                ? 'Follow more caregivers and feeders to see their updates here.'
                : 'Be the first to share an animal update or feeding report!'}
            </p>
            <button
              onClick={() => setShowCreatePost(true)}
              className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
              id="empty-feed-create-post-btn"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Post</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
