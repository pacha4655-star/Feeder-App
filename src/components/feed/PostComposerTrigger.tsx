'use client';

import React from 'react';
import { Image as ImageIcon, Utensils, PawPrint, Users, User } from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';

interface PostComposerTriggerProps {
  user: UserSession | null;
  onOpen: (type?: string) => void;
}

export default function PostComposerTrigger({ user, onOpen }: PostComposerTriggerProps) {
  const firstName = user?.fullName ? user.fullName.split(' ')[0] : null;
  const avatarUrl = user?.avatarUrl;

  const handleClick = (type = 'NORMAL') => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    onOpen(type);
  };

  return (
    <div
      className="card"
      style={{
        background: 'var(--bg-card)',
        borderRadius: '14px',
        border: '1px solid var(--border-subtle)',
        padding: '14px 16px',
        marginBottom: '16px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {/* Top row: Avatar + Pill Input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={firstName || 'User'}
            className="avatar-img"
            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
              flexShrink: 0,
            }}
          >
            <User size={20} />
          </div>
        )}
        <div
          onClick={() => handleClick('NORMAL')}
          role="button"
          tabIndex={0}
          style={{
            flex: 1,
            background: 'var(--bg-secondary)',
            borderRadius: '9999px',
            padding: '10px 18px',
            color: 'var(--text-muted)',
            fontSize: '13.5px',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#E4E6E9')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)')}
        >
          {firstName ? `What would you like to share, ${firstName}?` : 'What would you like to share? Sign in to post...'}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '12px 0 8px 0' }} />

      {/* Bottom actions row: 4 buttons with signature green icons */}
      <div className="composer-actions-row composer-actions-grid">
        <button
          type="button"
          onClick={() => handleClick('PHOTO')}
          className="composer-action-btn"
        >
          <ImageIcon size={18} color="var(--brand-primary)" />
          <span>Photo / Video</span>
        </button>

        <button
          type="button"
          onClick={() => handleClick('FEEDING_UPDATE')}
          className="composer-action-btn"
        >
          <Utensils size={18} color="var(--brand-primary)" />
          <span>Feeding Update</span>
        </button>

        <button
          type="button"
          onClick={() => handleClick('HELP_REQUEST')}
          className="composer-action-btn"
        >
          <PawPrint size={18} color="var(--brand-primary)" />
          <span>Ask for Help</span>
        </button>

        <button
          type="button"
          onClick={() => handleClick('NORMAL')}
          className="composer-action-btn"
        >
          <Users size={18} color="var(--brand-primary)" />
          <span>Community Post</span>
        </button>
      </div>
    </div>
  );
}
