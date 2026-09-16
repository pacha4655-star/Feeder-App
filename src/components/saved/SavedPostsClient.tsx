'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bookmark, ArrowLeft } from 'lucide-react';
import type { PostWithAuthor } from '@/lib/services/feed-ranking';
import type { UserSession } from '@/lib/auth/session';
import PostCard from '@/components/feed/PostCard';

interface SavedPostsClientProps {
  user: UserSession | null;
  initialPosts: PostWithAuthor[];
}

export default function SavedPostsClient({ user, initialPosts }: SavedPostsClientProps) {
  const [posts, setPosts] = useState<PostWithAuthor[]>(initialPosts);

  if (!user) {
    return (
      <div className="card" style={{ padding: '60px 24px', textAlign: 'center', maxWidth: '640px', margin: '40px auto' }}>
        <Bookmark size={48} color="var(--primary)" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Save Posts for Later</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px auto' }}>
          Sign in to keep track of urgent SOS rescue updates, feeding spots, and community welfare stories.
        </p>
        <Link href="/login" className="btn-primary" style={{ display: 'inline-flex', padding: '10px 24px' }}>
          Sign In to Feeder.life
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(5, 150, 105, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <Bookmark size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Saved Posts & Bookmarks</h1>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              {posts.length} {posts.length === 1 ? 'item' : 'items'} saved to your personal library
            </div>
          </div>
        </div>

        <Link
          href="/"
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} />
          Back to Feed
        </Link>
      </div>

      {/* List or Empty State */}
      {posts.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <Bookmark size={44} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>No saved posts yet.</h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto 20px auto', lineHeight: 1.5 }}>
            Whenever you see an urgent animal rescue, feeding log, or community guide you want to follow up on, click the Bookmark icon to save it here.
          </p>
          <Link href="/" className="btn-primary" style={{ display: 'inline-flex' }}>
            Browse Feed
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={user}
              onPostUpdated={() => {
                // If unsaved, could filter out or update state
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
