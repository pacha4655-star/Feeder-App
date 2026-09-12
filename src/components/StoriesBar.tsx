import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Video } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Story } from '../types';
import { CreateStoryModal } from './CreateStoryModal';
import { StoryViewerModal } from './StoryViewerModal';

interface StoriesBarProps {
  stories?: Story[];
}

export const StoriesBar: React.FC<StoriesBarProps> = ({ stories: propStories }) => {
  const { user, stories: appStories } = useApp();
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set());
  const [, setTick] = useState(0);

  // Periodic re-check to filter out expired stories as time passes
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Filter and sort active real user stories only
  const activeStories = useMemo(() => {
    const raw = propStories || appStories || [];
    const now = Date.now();

    return raw
      .filter(s => {
        if (!s || !s.id || !s.userId || !s.mediaUrl) return false;
        // Check expiration
        if (s.expiresAt) {
          const expTime = new Date(s.expiresAt).getTime();
          if (!isNaN(expTime) && expTime <= now) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA; // Recent active stories first
      });
  }, [propStories, appStories]);

  // Current authenticated user's active stories
  const myStories = useMemo(() => {
    if (!user?.id) return [];
    return activeStories.filter(s => s.userId === user.id);
  }, [activeStories, user?.id]);

  const hasMyStory = myStories.length > 0;

  // Other users' active stories
  const otherStories = useMemo(() => {
    return activeStories.filter(s => !user?.id || s.userId !== user.id);
  }, [activeStories, user?.id]);

  // Group other users' stories so each unique author gets one distinct story circle
  const otherUserStories = useMemo(() => {
    const seenUsers = new Set<string>();
    const result: Story[] = [];
    otherStories.forEach(s => {
      if (!seenUsers.has(s.userId)) {
        seenUsers.add(s.userId);
        result.push(s);
      }
    });
    return result;
  }, [otherStories]);

  // Full sequential list of active stories for StoryViewerModal navigation
  const viewerStories = useMemo(() => {
    return [...myStories, ...otherStories];
  }, [myStories, otherStories]);

  const handleOpenStory = (index: number, storyId: string) => {
    setViewedStoryIds(prev => new Set(prev).add(storyId));
    setActiveStoryIndex(index);
  };

  const handleUserStoryClick = () => {
    if (hasMyStory) {
      // Open current user's active story in viewer
      handleOpenStory(0, myStories[0].id);
    } else {
      // Open story creation modal
      setShowCreateStory(true);
    }
  };

  const defaultAvatar = (seed: string) =>
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed || 'feeder')}`;

  return (
    <>
      <div className="bg-transparent font-sans w-full overflow-hidden">
        <div className="flex items-center gap-3 sm:gap-4 md:gap-5 overflow-x-auto no-scrollbar scroll-smooth flex-nowrap w-full">
          {/* 1. Your Story item */}
          <div className="flex flex-col items-center flex-shrink-0 group">
            <div className="relative">
              <button
                onClick={handleUserStoryClick}
                className="focus:outline-none block"
                title={hasMyStory ? 'View your story' : 'Add to your story'}
                id="user-story-avatar-btn"
              >
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all ${
                    hasMyStory
                      ? 'bg-gradient-to-tr from-green-600 via-emerald-500 to-teal-500 p-[2px] shadow-xs group-hover:scale-105'
                      : 'border-2 border-dashed border-green-600 bg-slate-50 dark:bg-slate-800 group-hover:border-green-700 p-0.5'
                  }`}
                >
                  <div className="w-full h-full bg-white dark:bg-slate-900 rounded-full p-0.5 overflow-hidden">
                    <img
                      src={user?.avatar || defaultAvatar(user?.id || 'guest')}
                      alt="Your story"
                      className="w-full h-full object-cover rounded-full"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = defaultAvatar(user?.id || 'guest');
                      }}
                    />
                  </div>
                </div>
              </button>

              {/* Plus button badge to add a new story */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateStory(true);
                }}
                className="absolute bottom-0 right-0 w-5 h-5 bg-green-600 hover:bg-green-700 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-white shadow-xs hover:scale-110 active:scale-95 transition-transform"
                title="Add a new story"
                id="create-story-trigger"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
              </button>
            </div>
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-1.5 truncate max-w-[64px] sm:max-w-[72px] text-center leading-tight">
              Your Story
            </span>
          </div>

          {/* 2. Real User Stories ONLY (No static categories, no placeholders) */}
          {otherUserStories.map((story) => {
            const hasSeen = viewedStoryIds.has(story.id);
            const globalIndex = viewerStories.findIndex(s => s.id === story.id);

            return (
              <button
                key={`user_story_${story.id}`}
                onClick={() => handleOpenStory(globalIndex >= 0 ? globalIndex : 0, story.id)}
                className="flex flex-col items-center flex-shrink-0 group focus:outline-none"
                title={`${story.userName}'s story`}
                id={`story-user-${story.userId}`}
              >
                <div className="relative">
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all ${
                      hasSeen
                        ? 'border-2 border-slate-300 dark:border-slate-700 p-0.5'
                        : 'bg-gradient-to-tr from-green-600 via-emerald-500 to-amber-500 p-[2px] shadow-xs group-hover:scale-105'
                    }`}
                  >
                    <div className="w-full h-full bg-white dark:bg-slate-900 rounded-full p-0.5 overflow-hidden">
                      <img
                        src={story.userAvatar || defaultAvatar(story.userId)}
                        alt={story.userName}
                        className="w-full h-full object-cover rounded-full"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = defaultAvatar(story.userId);
                        }}
                      />
                    </div>
                  </div>

                  {story.mediaType === 'video' && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-purple-600 text-white rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                      <Video className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>

                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-1.5 truncate max-w-[64px] sm:max-w-[72px] text-center leading-tight">
                  {story.userName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal to create a new Story */}
      <CreateStoryModal
        isOpen={showCreateStory}
        onClose={() => setShowCreateStory(false)}
      />

      {/* Full-screen / Modal Story Viewer */}
      {activeStoryIndex !== null && viewerStories.length > 0 && (
        <StoryViewerModal
          isOpen={true}
          stories={viewerStories}
          initialIndex={activeStoryIndex}
          onClose={() => setActiveStoryIndex(null)}
        />
      )}
    </>
  );
};

