'use client';

import React, { useState } from 'react';
import PostCard from '@/components/feed/PostCard';
import PostComposerModal from '@/components/feed/PostComposerModal';
import { Users2, ShieldCheck, MapPin, Plus, FileText, Info, Lock } from 'lucide-react';
import { formatFullDate } from '@/lib/utils/date';
import type { UserSession } from '@/lib/auth/session';

interface CommunityDetailClientProps {
  community: any;
  initialPosts: any[];
  user: UserSession | null;
}

export default function CommunityDetailClient({
  community,
  initialPosts,
  user,
}: CommunityDetailClientProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'rules'>('posts');
  const [isJoined, setIsJoined] = useState(community.is_joined);
  const [memberCount, setMemberCount] = useState(community.actual_members || community.member_count);
  const [posts, setPosts] = useState(initialPosts);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const handleToggleJoin = async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    try {
      const res = await fetch(`/api/communities/${community.id}/join`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setIsJoined(data.isJoined);
        setMemberCount(data.isJoined ? memberCount + 1 : Math.max(0, memberCount - 1));
      }
    } catch {}
  };

  return (
    <div>
      {/* 1. Community Header Banner */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: '16px' }}>
        <div
          style={{
            height: '180px',
            backgroundImage: `url(${community.cover_image || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80'})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div style={{ padding: '16px 20px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <img
              src={community.avatar_image || 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=150&auto=format&fit=crop&q=80'}
              alt=""
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '16px',
                objectFit: 'cover',
                border: '4px solid var(--bg-card)',
                marginTop: '-50px',
                boxShadow: 'var(--shadow-md)',
              }}
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleToggleJoin}
                className={isJoined ? 'btn-secondary' : 'btn-primary'}
                style={{ padding: '8px 20px', fontSize: '14px' }}
              >
                {isJoined ? '✓ Joined' : '+ Join Group'}
              </button>

              {isJoined && (
                <button
                  onClick={() => setIsComposerOpen(true)}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  <Plus size={16} /> Post
                </button>
              )}
            </div>
          </div>

          <div style={{ marginTop: '10px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800 }}>{community.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>👥 {memberCount} welfare members</span>
              {community.location_area && (
                <>
                  <span>&bull;</span>
                  <span>📍 {community.location_area}</span>
                </>
              )}
              {community.is_private === 1 && (
                <>
                  <span>&bull;</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#b91c1c' }}>
                    <Lock size={12} /> Private Group
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="feed-tabs-bar" style={{ marginTop: '16px', marginBottom: 0 }}>
            <button
              className={`feed-filter-chip ${activeTab === 'posts' ? 'active' : ''}`}
              onClick={() => setActiveTab('posts')}
            >
              Feed Posts ({posts.length})
            </button>
            <button
              className={`feed-filter-chip ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              About & Mission
            </button>
            <button
              className={`feed-filter-chip ${activeTab === 'rules' ? 'active' : ''}`}
              onClick={() => setActiveTab('rules')}
            >
              Community Guidelines & Rules
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tab Contents */}
      {activeTab === 'posts' && (
        <div>
          {posts.length === 0 ? (
            <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
              <Users2 size={40} color="var(--brand-primary)" style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontWeight: 700, fontSize: '16px' }}>No posts in this group yet</div>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '6px 0 14px 0' }}>
                Share the first animal feeding or rescue update with fellow members!
              </p>
              <button className="btn-primary" onClick={() => setIsComposerOpen(true)}>
                Create Group Post
              </button>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={user}
              />
            ))
          )}
        </div>
      )}

      {activeTab === 'about' && (
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={20} color="var(--brand-primary)" />
            <span>About this Community</span>
          </h2>
          <p style={{ fontSize: '14.5px', lineHeight: 1.7, color: 'var(--text-main)', marginBottom: '16px' }}>
            {community.description}
          </p>
          <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '13px' }}>
            <div><strong>Location Coverage:</strong> {community.location_area}</div>
            <div style={{ marginTop: '4px' }}><strong>Category:</strong> {community.category}</div>
            <div style={{ marginTop: '4px' }}><strong>Created:</strong> {formatFullDate(community.created_at)}</div>
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="var(--brand-accent)" />
            <span>Community Rules & Safety Standards</span>
          </h2>
          <div style={{ fontSize: '14px', lineHeight: 1.8, color: 'var(--text-main)', whiteSpace: 'pre-line' }}>
            {community.rules_text || '1. Treat all volunteers, animals, and neighbors with respect.\n2. Do not feed cooked bones, chocolate, onion, or spoiled food.\n3. Keep feeding spots hygienic.\n4. Report emergency injuries directly via the SOS channel.'}
          </div>
        </div>
      )}

      {/* Post Composer modal pre-filled for this community */}
      <PostComposerModal
        user={user}
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        onPostCreated={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
