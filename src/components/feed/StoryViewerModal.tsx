'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, Trash2, Users, Send, Loader2, Pause, Play } from 'lucide-react';
import type { StoryView, StoryViewer } from '@/lib/services/story';
import { formatTime } from '@/lib/utils/date';
import type { UserSession } from '@/lib/auth/session';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface StoryViewerModalProps {
  stories: StoryView[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserSession | null;
  onStoryDeleted?: (storyId: string) => void;
}

export default function StoryViewerModal({
  stories,
  initialIndex,
  isOpen,
  onClose,
  currentUser,
  onStoryDeleted,
}: StoryViewerModalProps) {
  useBodyScrollLock(isOpen);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);
  const [showViewersDrawer, setShowViewersDrawer] = useState(false);
  const [viewers, setViewers] = useState<StoryViewer[]>([]);
  const [isLoadingViewers, setIsLoadingViewers] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mediaLoadError, setMediaLoadError] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setProgress(0);
    setUserReaction(null);
    setReactionCounts({});
    setShowViewersDrawer(false);
    setMediaLoadError(false);
  }, [initialIndex]);

  const currentStory = stories[currentIndex];

  useEffect(() => {
    if (currentStory) {
      setUserReaction(currentStory.user_reaction || null);
      setReactionCounts(currentStory.reactions || {});
      setMediaLoadError(false);
    }
  }, [currentStory]);

  // Mark viewed
  useEffect(() => {
    if (isOpen && currentStory && currentUser) {
      fetch(`/api/stories/${currentStory.id}/view`, { method: 'POST' }).catch(() => {});
    }
  }, [isOpen, currentIndex, currentStory, currentUser]);

  // Auto-advance timer (5 seconds for photos, video will use its own duration or 5s)
  useEffect(() => {
    if (!isOpen || !currentStory || isPaused || showViewersDrawer) return;

    setProgress(0);
    const interval = 50; // update progress every 50ms
    const totalDuration = currentStory.media_type === 'VIDEO' ? 8000 : 5000;
    const step = (interval / totalDuration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((i) => i + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isOpen, currentIndex, currentStory, stories.length, isPaused, showViewersDrawer, onClose]);

  if (!isOpen || !currentStory) return null;

  const isAuthor = currentUser ? currentStory.author_id === currentUser.id : false;
  const isStaff = currentUser ? ['PLATFORM_ADMIN', 'PLATFORM_MODERATOR', 'MODERATOR'].includes(currentUser.role) : false;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handleReaction = async (reactionType: 'HEART' | 'PAW' | 'CARE' | 'APPLAUSE') => {
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

    try {
      const res = await fetch(`/api/stories/${currentStory.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction: reactionType }),
      });
      const data = await res.json();
      if (data.success) {
        setUserReaction(data.reaction);
        setReactionCounts((prev) => ({
          ...prev,
          [reactionType]: data.count,
        }));
      }
    } catch {}
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSendingReply || !currentUser) return;

    setIsSendingReply(true);
    try {
      const res = await fetch(`/api/stories/${currentStory.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: replyText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyText('');
        setReplySuccess(true);
        setTimeout(() => setReplySuccess(false), 3000);
      }
    } catch {} finally {
      setIsSendingReply(false);
    }
  };

  const handleDeleteStory = async () => {
    if (!confirm('Are you sure you want to delete this welfare story?')) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/stories/${currentStory.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        if (onStoryDeleted) onStoryDeleted(currentStory.id);
        if (stories.length <= 1) {
          onClose();
        } else {
          setCurrentIndex((prev) => (prev > 0 ? prev - 1 : 0));
        }
      }
    } catch {} finally {
      setIsDeleting(false);
    }
  };

  const handleOpenViewers = async () => {
    setIsPaused(true);
    setShowViewersDrawer(true);
    setIsLoadingViewers(true);

    try {
      const res = await fetch(`/api/stories/${currentStory.id}`);
      const data = await res.json();
      if (data.success) {
        setViewers(data.viewers || []);
      }
    } catch {} finally {
      setIsLoadingViewers(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        background: 'rgba(0, 0, 0, 0.94)',
        backdropFilter: 'blur(16px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Viewer Box */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '430px',
          height: '92vh',
          maxHeight: '780px',
          background: '#09090b',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Progress Bars */}
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', gap: '4px', zIndex: 30 }}>
          {stories.map((s, idx) => (
            <div
              key={s.id}
              style={{
                flex: 1,
                height: '3px',
                background: 'rgba(255, 255, 255, 0.25)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: 'white',
                  width:
                    idx < currentIndex
                      ? '100%'
                      : idx === currentIndex
                      ? `${progress}%`
                      : '0%',
                  transition: idx === currentIndex ? 'width 50ms linear' : 'none',
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Header */}
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: 12,
            right: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 30,
            padding: '4px',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src={currentStory.author_avatar || '/avatars/default.png'}
              alt=""
              style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2px solid #059669', objectFit: 'cover' }}
            />
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '14px', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                {currentStory.author_name}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
                @{currentStory.author_username} &bull; {formatTime(currentStory.created_at)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setIsPaused(!isPaused)}
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                border: 'none',
                color: 'white',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
            </button>

            {(isAuthor || isStaff) && (
              <button
                onClick={handleDeleteStory}
                disabled={isDeleting}
                style={{
                  background: 'rgba(220, 38, 38, 0.7)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title="Delete Story"
              >
                {isDeleting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                border: 'none',
                color: 'white',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              aria-label="Close story viewer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Media Zone */}
        <div style={{ flex: 1, width: '100%', height: '100%', position: 'relative', background: '#000' }}>
          {mediaLoadError ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
                background: '#111827',
                gap: '8px',
                padding: '20px',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '36px' }}>⚠️</span>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#f3f4f6' }}>Media unavailable</span>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>This welfare story media could not be loaded.</span>
            </div>
          ) : currentStory.media_type === 'VIDEO' ? (
            <video
              src={currentStory.media_url}
              autoPlay
              playsInline
              loop
              onError={() => setMediaLoadError(true)}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <img
              src={currentStory.media_url}
              alt=""
              onError={() => setMediaLoadError(true)}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          )}

          {/* Left/Right click zones */}
          <div
            onClick={handlePrev}
            style={{ position: 'absolute', top: 60, bottom: 120, left: 0, width: '35%', cursor: 'pointer', zIndex: 20 }}
            aria-label="Previous story"
          />
          <div
            onClick={handleNext}
            style={{ position: 'absolute', top: 60, bottom: 120, right: 0, width: '35%', cursor: 'pointer', zIndex: 20 }}
            aria-label="Next story"
          />
        </div>

        {/* Bottom Panel: Caption + Reactions + Replies / Author Analytics */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0) 100%)',
            padding: '16px 16px 20px 16px',
            zIndex: 30,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Caption */}
          {currentStory.caption && (
            <div
              style={{
                color: 'white',
                fontSize: '13.5px',
                lineHeight: 1.4,
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
              }}
            >
              {currentStory.caption}
            </div>
          )}

          {/* Reaction Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { type: 'HEART', icon: '❤️', label: 'Heart' },
                { type: 'PAW', icon: '🐾', label: 'Paw' },
                { type: 'CARE', icon: '🙏', label: 'Care' },
                { type: 'APPLAUSE', icon: '👏', label: 'Clap' },
              ].map((rx) => {
                const isSelected = userReaction === rx.type;
                const count = reactionCounts[rx.type] || 0;
                return (
                  <button
                    key={rx.type}
                    onClick={() => handleReaction(rx.type as any)}
                    style={{
                      background: isSelected ? 'rgba(5, 150, 105, 0.4)' : 'rgba(255, 255, 255, 0.15)',
                      border: isSelected ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '9999px',
                      padding: '5px 10px',
                      color: 'white',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{rx.icon}</span>
                    {count > 0 && <span style={{ fontSize: '11px', fontWeight: 700 }}>{count}</span>}
                  </button>
                );
              })}
            </div>

            {/* Author Viewer Button */}
            {isAuthor && (
              <button
                onClick={handleOpenViewers}
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '20px',
                  padding: '5px 12px',
                  color: 'white',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                }}
              >
                <Users size={14} />
                <span>{currentStory.viewer_count || 0} Views</span>
              </button>
            )}
          </div>

          {/* Direct Reply Input for non-authors */}
          {!isAuthor && currentUser && (
            <form onSubmit={handleSendReply} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${currentStory.author_name}...`}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '20px',
                  padding: '8px 16px',
                  color: 'white',
                  fontSize: '13px',
                  outline: 'none',
                }}
                maxLength={200}
              />
              <button
                type="submit"
                disabled={!replyText.trim() || isSendingReply}
                style={{
                  background: replyText.trim() ? '#059669' : 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  cursor: replyText.trim() ? 'pointer' : 'default',
                }}
              >
                {isSendingReply ? <Loader2 className="animate-spin" size={16} /> : <Send size={15} />}
              </button>
            </form>
          )}

          {replySuccess && (
            <div style={{ color: '#34d399', fontSize: '11.5px', textAlign: 'center', fontWeight: 600 }}>
              ✓ Reply sent directly to {currentStory.author_name}&apos;s inbox!
            </div>
          )}
        </div>

        {/* Viewers Drawer Modal (For Story Author) */}
        {showViewersDrawer && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: '60%',
              background: '#18181b',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              padding: '16px',
              zIndex: 40,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -10px 25px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} color="#10b981" />
                <span>Story Viewers ({viewers.length})</span>
              </div>
              <button
                onClick={() => {
                  setShowViewersDrawer(false);
                  setIsPaused(false);
                }}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {isLoadingViewers ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>
                  <Loader2 className="animate-spin" size={20} style={{ margin: '0 auto 8px auto' }} />
                  <span style={{ fontSize: '13px' }}>Loading real viewers...</span>
                </div>
              ) : viewers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: '13px' }}>
                  No views yet. Share this story with your welfare circle!
                </div>
              ) : (
                viewers.map((v) => (
                  <div key={v.user_id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={v.avatar_url || '/avatars/default.png'}
                      alt=""
                      style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'white', fontSize: '13px', fontWeight: 600 }}>{v.full_name}</div>
                      <div style={{ color: '#9ca3af', fontSize: '11px' }}>@{v.username}</div>
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '11px' }}>{formatTime(v.viewed_at)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
