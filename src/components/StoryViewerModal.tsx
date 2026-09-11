import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Heart,
  Share2,
  Download,
  MapPin,
  Volume2,
  VolumeX,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Story } from '../types';
import { useApp } from '../context/AppContext';
import { downloadMediaFile } from '../utils/downloadHelper';
import { isMediaVideo } from '../utils/mediaHelper';
import { ShareModal } from './ShareModal';

interface StoryViewerModalProps {
  isOpen: boolean;
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
  onStoryLiked?: (storyId: string) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  isOpen,
  stories,
  initialIndex = 0,
  onClose
}) => {
  const { user, deleteStory, showToast } = useApp();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const STORY_DURATION = 5000; // 5 seconds per image

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setProgress(0);
      setLiked(false);
      setMediaLoading(true);
      setMediaError(null);
    }
  }, [isOpen, initialIndex]);

  const currentStory = stories[currentIndex];

  useEffect(() => {
    if (currentStory) {
      setLikesCount(currentStory.likesCount || 0);
      setMediaLoading(true);
      setMediaError(null);
      setProgress(0);
    }
  }, [currentStory, reloadKey]);

  // Story progress timer
  useEffect(() => {
    if (!isOpen || isPaused || showShareModal || !currentStory || mediaLoading || mediaError) return;

    const interval = 50; // update every 50ms
    const step = (interval / STORY_DURATION) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isOpen, isPaused, showShareModal, currentIndex, currentStory, mediaLoading, mediaError]);

  if (!isOpen || !currentStory) return null;

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
      setLiked(false);
      setMediaLoading(true);
      setMediaError(null);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
      setLiked(false);
      setMediaLoading(true);
      setMediaError(null);
    }
  };

  const handleLike = () => {
    setLiked(!liked);
    setLikesCount(prev => (!liked ? prev + 1 : Math.max(0, prev - 1)));
    showToast(!liked ? 'Liked story!' : 'Unliked');
  };

  const handleDownload = async () => {
    if (currentStory.mediaUrl) {
      await downloadMediaFile(currentStory.mediaUrl, `feeder-story-${currentStory.userName.toLowerCase().replace(/\s+/g, '-')}.jpg`);
    }
  };

  const handleDeleteStory = async () => {
    if (!window.confirm('Delete this story?')) return;
    setIsDeleting(true);
    try {
      await deleteStory(currentStory.id);
      if (stories.length <= 1) {
        onClose();
      } else {
        handleNext();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const isAuthor = user && user.id === currentStory.userId;
  const isVideo = isMediaVideo(currentStory.mediaUrl, currentStory.mediaType);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200 select-none">
        <div className="relative w-full max-w-sm aspect-[9/16] max-h-[92vh] bg-slate-950 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between border border-white/10">
          {/* Progress Bars at top */}
          <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-1.5">
            {stories.map((s, index) => {
              let fillWidth = '0%';
              if (index < currentIndex) fillWidth = '100%';
              else if (index === currentIndex) fillWidth = `${progress}%`;

              return (
                <div
                  key={s.id}
                  className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-xs"
                >
                  <div
                    className="h-full bg-white transition-all duration-75 ease-linear"
                    style={{ width: fillWidth }}
                  />
                </div>
              );
            })}
          </div>

          {/* Top Bar: Author, Timestamp, Location, and Controls */}
          <div className="absolute top-6 left-3 right-3 z-30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src={currentStory.userAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=story'}
                alt={currentStory.userName}
                className="w-9 h-9 rounded-full object-cover border-2 border-green-500"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=fallback';
                }}
              />
              <div className="text-white drop-shadow-md">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold">{currentStory.userName}</span>
                  {currentStory.userBadge && (
                    <span className="text-[9px] font-bold bg-green-600 px-1.5 py-0.2 rounded-full">
                      {currentStory.userBadge}
                    </span>
                  )}
                </div>
                {currentStory.location && (
                  <p className="text-[10px] text-white/80 flex items-center gap-0.5">
                    <MapPin className="w-2.5 h-2.5" /> {currentStory.location}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-white">
              {isVideo && (
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 bg-black/40 hover:bg-black/70 backdrop-blur-md rounded-full transition-colors"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}

              <button
                onClick={handleDownload}
                className="p-1.5 bg-black/40 hover:bg-black/70 backdrop-blur-md rounded-full transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowShareModal(true)}
                className="p-1.5 bg-black/40 hover:bg-black/70 backdrop-blur-md rounded-full transition-colors"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>

              {isAuthor && (
                <button
                  onClick={handleDeleteStory}
                  disabled={isDeleting}
                  className="p-1.5 bg-red-600/80 hover:bg-red-700 backdrop-blur-md rounded-full transition-colors text-white"
                  title="Delete Your Story"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              )}

              <button
                onClick={onClose}
                className="p-1.5 bg-black/40 hover:bg-black/70 backdrop-blur-md rounded-full transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Media Player Area */}
          <div className="relative flex-1 w-full h-full bg-black flex items-center justify-center overflow-hidden">
            {/* Loading Spinner */}
            {mediaLoading && !mediaError && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950 text-white/70 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                <span className="text-xs font-medium">Loading story media...</span>
              </div>
            )}

            {/* Error Overlay */}
            {mediaError && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-white/90 gap-3">
                <AlertCircle className="w-10 h-10 text-amber-400" />
                <p className="text-sm font-semibold">Unable to display media</p>
                <p className="text-xs text-slate-400 break-all max-w-[240px]">{mediaError}</p>
                <button
                  onClick={() => {
                    setMediaLoading(true);
                    setMediaError(null);
                    setReloadKey(k => k + 1);
                  }}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-full flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            )}

            {/* Render Video or Image */}
            {isVideo ? (
              <video
                key={`story-vid-${currentStory.id}-${reloadKey}`}
                ref={videoRef}
                src={currentStory.mediaUrl}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted={isMuted}
                playsInline
                onLoadedData={() => setMediaLoading(false)}
                onError={(e) => {
                  console.error('[Story Video Error]', {
                    src: currentStory.mediaUrl,
                    mediaType: currentStory.mediaType,
                    error: e
                  });
                  setMediaLoading(false);
                  setMediaError('Video playback failed.');
                }}
              />
            ) : (
              <img
                key={`story-img-${currentStory.id}-${reloadKey}`}
                src={currentStory.mediaUrl}
                alt={currentStory.caption || 'Story'}
                className={`w-full h-full object-cover transition-opacity duration-300 ${mediaLoading ? 'opacity-0' : 'opacity-100'}`}
                referrerPolicy="no-referrer"
                onLoad={() => {
                  setMediaLoading(false);
                  setMediaError(null);
                }}
                onError={(e) => {
                  console.error('[Story Image Error]', {
                    src: currentStory.mediaUrl,
                    mediaType: currentStory.mediaType,
                    currentSrc: e.currentTarget.currentSrc
                  });
                  setMediaLoading(false);
                  setMediaError('Image failed to load.');
                }}
              />
            )}

            {/* Left & Right Tap Navigation Zones */}
            <div className="absolute inset-0 flex z-20">
              <div
                className="w-1/3 h-full cursor-pointer"
                onClick={handlePrev}
                title="Previous"
              />
              <div
                className="w-1/3 h-full"
                onMouseDown={() => setIsPaused(true)}
                onMouseUp={() => setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
              />
              <div
                className="w-1/3 h-full cursor-pointer"
                onClick={handleNext}
                title="Next"
              />
            </div>

            {/* Gradient Scrim for Bottom Caption */}
            <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none z-20" />
          </div>

          {/* Bottom Caption & Interactive Action Bar */}
          <div className="absolute bottom-3 left-3 right-3 z-30 space-y-2">
            {currentStory.caption && (
              <p className="text-white text-xs font-semibold drop-shadow-md leading-relaxed line-clamp-2 px-1">
                {currentStory.caption}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleLike}
                className={`p-2.5 rounded-full backdrop-blur-md border transition-all ${
                  liked
                    ? 'bg-red-600/90 border-red-500 text-white shadow-lg'
                    : 'bg-white/20 border-white/30 text-white hover:bg-white/30'
                }`}
              >
                <Heart className={`w-4 h-4 ${liked ? 'fill-white' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={`Story by ${currentStory.userName}`}
        text={currentStory.caption || `Check out ${currentStory.userName}'s story on Feeder!`}
        url={window.location.href}
      />
    </>
  );
};
