import React, { useState } from 'react';
import { Search, Plus, Check, ArrowLeft, Shield, Users, MessageSquare, Share2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Community } from '../types';
import { PostCard } from './PostCard';
import { CreateCommunityModal } from './CreateCommunityModal';

export const CommunitiesView: React.FC = () => {
  const {
    communities,
    toggleJoinCommunity,
    activeCommunityId,
    setActiveCommunityId,
    posts,
    setShowCreatePost
  } = useApp();

  const [activeTab, setActiveTab] = useState<'my' | 'discover'>('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Find active community if opened
  const activeCommunity = communities.find(c => c.id === activeCommunityId);

  // Filter communities
  const filtered = communities.filter(c => {
    const matchesSearch = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeTab === 'my') return c.isJoined;
    return true;
  });

  // If a community detail is open, show Community Detail View
  if (activeCommunity) {
    const communityPosts = posts.filter(p => p.communityId === activeCommunity.id);

    return (
      <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden font-sans">
        {/* Detail Top Header */}
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800">
          <button
            onClick={() => setActiveCommunityId(null)}
            className="p-1 text-slate-700 hover:text-black flex items-center gap-1.5 font-bold text-xs"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>All Communities</span>
          </button>
          <span className="font-bold text-sm text-slate-900 truncate max-w-[250px]">
            {activeCommunity.name}
          </span>
          <button
            onClick={() => {
              if (navigator.clipboard) navigator.clipboard.writeText(window.location.href);
            }}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Cover Photo & Icon */}
        <div className="relative">
          <div className="h-36 w-full overflow-hidden bg-gray-100">
            <img
              src={activeCommunity.coverImage}
              alt={activeCommunity.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="px-4 -mt-8 flex items-end justify-between">
            <div className="w-16 h-16 rounded-2xl border-3 border-white overflow-hidden shadow-md bg-white">
              <img
                src={activeCommunity.icon}
                alt={activeCommunity.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <button
              onClick={() => toggleJoinCommunity(activeCommunity.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                activeCommunity.isJoined
                  ? 'bg-[#E8F5E9] text-[#1B5E20] border border-[#C8E6C9]'
                  : 'bg-[#2E7D32] text-white hover:bg-[#1B5E20]'
              }`}
            >
              {activeCommunity.isJoined ? '✓ Joined' : '+ Join Community'}
            </button>
          </div>
        </div>

        {/* Title and stats */}
        <div className="px-4 pt-3 pb-4 border-b border-[#E8EDE9]">
          <h2 className="text-xl font-extrabold text-[#192A1D]">{activeCommunity.name}</h2>
          <p className="text-xs text-[#2E7D32] font-semibold mt-0.5">
            {activeCommunity.membersCount.toLocaleString()} members • {activeCommunity.location || 'Chennai'}
          </p>
          <p className="text-xs text-gray-600 mt-2 leading-relaxed">
            {activeCommunity.description}
          </p>

          {/* Rules / Guidance */}
          {activeCommunity.rules && activeCommunity.rules.length > 0 && (
            <div className="mt-3 bg-[#F1F8F2] p-3 rounded-2xl border border-[#E8EDE9]">
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#1B5E20] uppercase tracking-wider mb-1.5">
                <Shield className="w-3.5 h-3.5 text-[#2E7D32]" />
                <span>Community Guidelines</span>
              </div>
              <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
                {activeCommunity.rules.map((r, idx) => (
                  <li key={idx} className="leading-snug">{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick Post button to this community */}
          <button
            onClick={() => setShowCreatePost(true)}
            className="w-full mt-3 py-2 px-4 rounded-xl border border-dashed border-[#2E7D32] text-[#2E7D32] font-bold text-xs hover:bg-[#E8F5E9] flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Post to {activeCommunity.name}</span>
          </button>
        </div>

        {/* Community Posts */}
        <div>
          <div className="px-4 py-2.5 bg-gray-50 border-b border-[#E8EDE9] text-xs font-bold uppercase tracking-wider text-gray-600">
            Community Discussions & Updates
          </div>
          {communityPosts.length > 0 ? (
            communityPosts.map((post, idx) => <PostCard key={post.id ? `comm_post_${post.id}` : `comm_post_${idx}`} post={post} />)
          ) : (
            <div className="text-center py-12 px-6">
              <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No posts in this community yet.</p>
              <button
                onClick={() => setShowCreatePost(true)}
                className="mt-3 text-xs font-bold text-[#2E7D32] underline"
              >
                Start the conversation
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Primary Communities List Screen
  return (
    <div className="w-full max-w-5xl mx-auto bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden font-sans">
      {/* High Density Communities Header */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-green-700 to-green-600 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">Communities</h2>
            <p className="text-xs text-green-100 mt-0.5">Connect with local animal lovers, feeders & care groups</p>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search communities..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white/20 placeholder:text-white/70 text-white rounded-xl w-full sm:w-56 focus:w-64 transition-all focus:outline-none focus:bg-white focus:text-slate-800 focus:placeholder:text-slate-400"
            />
            <Search className="w-3.5 h-3.5 text-white/80 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* Tabs: My Communities / Discover */}
      <div className="flex border-b border-slate-100 px-4 sm:px-6 py-2.5 bg-white/95 backdrop-blur-md sticky top-14 sm:top-16 z-20">
        <div className="flex gap-1.5 w-full sm:w-auto bg-slate-100/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all text-center ${
              activeTab === 'my'
                ? 'bg-green-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            My Communities
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all text-center ${
              activeTab === 'discover'
                ? 'bg-green-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Discover All
          </button>
        </div>
      </div>

      {/* Community Responsive Grid */}
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map(comm => (
            <div
              key={comm.id}
              className="flex items-center gap-3 p-3 border border-slate-100 rounded-2xl bg-white hover:bg-slate-50/80 hover:border-green-200 transition-all shadow-2xs group"
            >
              <div
                onClick={() => setActiveCommunityId(comm.id)}
                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
              >
                <img
                  src={comm.icon}
                  alt={comm.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 flex-shrink-0 group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-slate-800 truncate block group-hover:text-green-700 transition-colors">
                    {comm.name}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {(comm.membersCount / 1000).toFixed(1)}k members
                  </span>
                </div>
              </div>

              {/* Join / Joined button */}
              <button
                onClick={() => toggleJoinCommunity(comm.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 ${
                  comm.isJoined
                    ? 'text-green-700 bg-green-50 border border-green-200 hover:bg-green-100'
                    : 'text-slate-700 bg-white border border-slate-200 hover:border-green-600 hover:text-green-600 shadow-2xs'
                }`}
              >
                {comm.isJoined ? 'Joined' : 'Join'}
              </button>
            </div>
          ))}
        </div>

        {/* + Create Community Button */}
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="w-full mt-4 p-3.5 bg-green-50/60 rounded-2xl border-2 border-green-200/80 border-dashed text-center cursor-pointer hover:bg-green-100/60 transition-colors flex items-center justify-center gap-2"
          id="create-community-trigger"
        >
          <Plus className="w-4 h-4 text-green-700 stroke-[2.5]" />
          <span className="text-green-700 text-xs sm:text-sm font-bold">Create New Community</span>
        </button>

        {filtered.length === 0 && (
          <div className="text-center py-16 px-6 bg-slate-50/50 rounded-2xl border border-slate-100 mt-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No communities found</p>
            <p className="text-xs text-slate-400 mt-0.5">Try searching with a different term or create your own group!</p>
          </div>
        )}
      </div>

      <CreateCommunityModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
};
