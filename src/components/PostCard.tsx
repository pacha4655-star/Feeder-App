import React, { useState } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  MapPin,
  Send,
  Download,
  FileText,
  AlertTriangle,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Post } from '../types';
import { useApp } from '../context/AppContext';
import { ShareModal } from './ShareModal';
import { downloadMediaFile, generateAndDownloadPoster } from '../utils/downloadHelper';
import { isMediaVideo } from '../utils/mediaHelper';

interface PostMediaItemProps {
  url: string;
  postType?: string;
  alt?: string;
}

const PostMediaItem: React.FC<PostMediaItemProps> = ({ url, postType, alt }) => {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const isVideo = isMediaVideo(url, postType);

  if (isVideo) {
    return (
      <video
        key={`post-vid-${url}-${reloadKey}`}
        src={url}
        controls
        playsInline
        className="w-full h-full object-cover"
        onLoadedData={() => setLoading(false)}
        onError={(e) => {
          console.error('[Post Video Error]', { url, error: e });
          setLoading(false);
          setHasError(true);
        }}
      />
    );
  }

  return (
    <>
      {loading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-green-500" />
        </div>
      )}
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-4 text-center gap-2">
          <AlertCircle className="w-6 h-6 text-amber-400" />
          <span className="text-xs">Failed to load media</span>
          <button
            onClick={() => {
              setLoading(true);
              setHasError(false);
              setReloadKey(k => k + 1);
            }}
            className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-full text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      ) : (
        <img
          key={`post-img-${url}-${reloadKey}`}
          src={url}
          alt={alt || 'Post media'}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
          referrerPolicy="no-referrer"
          onLoad={() => {
            setLoading(false);
            setHasError(false);
          }}
          onError={(e) => {
            console.error('[Post Image Error]', { url, src: e.currentTarget.currentSrc });
            setLoading(false);
            setHasError(true);
          }}
        />
      )}
    </>
  );
};

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const {
    toggleLikePost,
    toggleSavePost,
    addCommentToPost,
    deletePost,
    setActiveAnimalId,
    setActiveCommunityId,
    registeredUsers,
    openUserProfile,
    user
  } = useApp();

  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [, setIsDownloadingPoster] = useState(false);

  const isAuthor = user && user.id === post.userId;
  const authorName = post.userName || 'Community Feeder';
  const authorAvatar = post.userAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user';

  const handleOpenAuthorProfile = () => {
    const matched = registeredUsers.find(u => u.id === post.userId);
    if (matched) {
      openUserProfile(matched);
    } else {
      openUserProfile({
        id: post.userId,
        name: authorName,
        username: (authorName || 'feeder').toLowerCase().replace(/[^a-z0-9_]/g, ''),
        avatar: authorAvatar,
        bio: `Active animal feeder in ${post.userLocation || 'the community'}.`,
        location: post.userLocation || 'Local Neighborhood',
        roles: [post.type === 'help' ? 'Rescuer' : 'Feeder'],
        interests: ['Animal Welfare', 'Street Feeding'],
        postsCount: 1,
        followersCount: 0,
        followingCount: 0,
        followerIds: [],
        followingIds: [],
        joinedDate: 'Community Feeder',
        isVerified: true
      });
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    addCommentToPost(post.id, commentInput.trim());
    setCommentInput('');
    if (!showComments) setShowComments(true);
  };

  const handleDownloadMedia = async (url: string) => {
    await downloadMediaFile(url, `feeder-post-${post.id.slice(0, 8)}.jpg`);
  };

  const handleDownloadOfficialPoster = async () => {
    setIsDownloadingPoster(true);
    try {
      await generateAndDownloadPoster({
        type: post.type === 'help' ? 'rescue' : post.type === 'adoption' ? 'adoption' : 'post',
        title: post.animalName ? `Help ${post.animalName}` : `${post.userName}'s Update`,
        animalName: post.animalName,
        location: post.userLocation || 'Neighborhood',
        description: post.content,
        imageUrl: post.media?.[0],
        urgency: post.type === 'help' ? 'Urgent' : undefined,
        contactName: post.userName
      });
    } catch (err) {
      console.error('Poster download failed', err);
    } finally {
      setIsDownloadingPoster(false);
    }
  };

  const handleDelete = async () => {
    setShowMoreMenu(false);
    if (!window.confirm('Are you sure you want to permanently delete this post?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deletePost(post.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const hasMedia = Array.isArray(post.media) && post.media.length > 0;
  const commentsCount = post.commentsCount || (post.comments?.length || 0);

  return (
    <>
      <article className="bg-white dark:bg-slate-900 border-y sm:border border-slate-200/80 dark:border-slate-800 sm:rounded-2xl hover:border-slate-300 dark:hover:border-slate-700 transition-all font-sans shadow-2xs overflow-hidden">
        
        {/* ================================================================= */}
        {/* 1. POST HEADER (Author Avatar, Name, @username, Time, More action)*/}
        {/* ================================================================= */}
        <div className="p-3 sm:p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={handleOpenAuthorProfile}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 hover:opacity-90 transition-opacity flex-shrink-0 cursor-pointer"
              title={`View ${post.userName}'s profile`}
            >
              <img
                src={authorAvatar}
                alt={authorName}
                className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-2xs"
                referrerPolicy="no-referrer"
              />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={handleOpenAuthorProfile}
                  className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight hover:text-green-700 dark:hover:text-green-400 transition-colors text-left truncate cursor-pointer"
                >
                  {authorName}
                </button>
                {post.type === 'help' && (
                  <span className="px-2 py-0.5 text-[9px] font-bold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 rounded-full border border-red-200 dark:border-red-900 uppercase flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" /> Urgent Rescue
                  </span>
                )}
                {post.type === 'feeding' && (
                  <span className="px-2 py-0.5 text-[9px] font-bold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/60 rounded-full border border-green-200 dark:border-green-800 flex items-center gap-1">
                    🐾 Feeding
                  </span>
                )}
                {post.type === 'adoption' && (
                  <span className="px-2 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 rounded-full border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                    🏡 Adoption
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {post.userLocation && (
                  <>
                    <span className="flex items-center gap-0.5 truncate max-w-[130px] sm:max-w-[180px]">
                      <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" /> {post.userLocation}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                  </>
                )}
                <span className="text-slate-400">{post.createdAt || 'Recent'}</span>
              </div>
            </div>
          </div>

          {/* More Action Menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute right-0 top-8 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => {
                      toggleSavePost(post.id);
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/70 flex items-center gap-2.5 text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>{post.isSaved ? 'Remove Bookmark' : 'Save Post'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowShareModal(true);
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/70 flex items-center gap-2.5 text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share Post</span>
                  </button>

                  {hasMedia && (
                    <button
                      onClick={() => {
                        handleDownloadMedia(post.media[0]);
                        setShowMoreMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/70 flex items-center gap-2.5 text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Image</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      handleDownloadOfficialPoster();
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-green-50 dark:hover:bg-green-950/40 flex items-center gap-2.5 text-green-700 dark:text-green-400 font-semibold cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Generate Poster (PNG)</span>
                  </button>

                  {isAuthor && (
                    <>
                      <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2.5 text-red-600 dark:text-red-400 font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                        id={`delete-post-${post.id}`}
                      >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        <span>Delete Post</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. CAPTION & TAGS (Positioned above media per social standard)    */}
        {/* ================================================================= */}
        <div className="px-3.5 sm:px-4 pb-2.5 text-xs sm:text-sm leading-relaxed">
          {post.content && (
            <p className="text-slate-800 dark:text-slate-200 whitespace-pre-line">
              {post.content}
            </p>
          )}

          {/* Associated Community or Animal tags */}
          {(post.communityName || post.animalName) && (
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {post.communityName && (
                <button
                  onClick={() => post.communityId && setActiveCommunityId(post.communityId)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-green-800 dark:text-green-300 bg-green-50 dark:bg-green-950/60 hover:bg-green-100 dark:hover:bg-green-900/60 rounded-full transition-colors border border-green-200 dark:border-green-800 cursor-pointer"
                >
                  <span>{post.communityIcon || '🌿'}</span>
                  <span>{post.communityName}</span>
                </button>
              )}

              {post.animalName && (
                <button
                  onClick={() => post.animalId && setActiveAnimalId(post.animalId)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-full transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  <span>🐾</span>
                  <span>About {post.animalName}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* 3. POST MEDIA (Edge-to-edge / Full visual prominence)             */}
        {/* ================================================================= */}
        {hasMedia && (
          <div className="w-full bg-slate-950 overflow-hidden border-y border-slate-100 dark:border-slate-800 relative">
            {post.media.length === 1 ? (
              <div className="aspect-[4/3] sm:aspect-[16/10] w-full max-h-[500px] overflow-hidden bg-slate-950 relative flex items-center justify-center">
                <PostMediaItem url={post.media[0]} postType={post.type} alt="Post media" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-0.5 max-h-[420px] overflow-hidden bg-slate-950">
                {post.media.map((url, i) => (
                  <div key={i} className="aspect-square overflow-hidden bg-slate-950 relative flex items-center justify-center">
                    <PostMediaItem url={url} postType={post.type} alt={`Post media ${i + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* 4. ENGAGEMENT METRICS LINE (Likes count & comments count)         */}
        {/* ================================================================= */}
        <div className="px-3.5 sm:px-4 py-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] shadow-2xs">
              <Heart className="w-2.5 h-2.5 fill-white stroke-white" />
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {post.likesCount} {post.likesCount === 1 ? 'like' : 'likes'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {commentsCount > 0 && (
              <button
                onClick={() => setShowComments(!showComments)}
                className="hover:underline cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                {commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}
              </button>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 5. SOCIAL ACTION BAR (Like, Comment, Share, Bookmark with text)   */}
        {/* ================================================================= */}
        <div className="px-1.5 sm:px-3 py-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-slate-600 dark:text-slate-300">
          {/* Like */}
          <button
            onClick={() => toggleLikePost(post.id)}
            id={`like-post-${post.id}`}
            className={`flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
              post.isLiked
                ? 'text-red-600 dark:text-red-400 bg-red-50/70 dark:bg-red-950/30'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
            title={post.isLiked ? 'Unlike' : 'Like'}
          >
            <Heart className={`w-4 h-4 transition-transform active:scale-125 ${post.isLiked ? 'fill-red-600 stroke-red-600' : ''}`} />
            <span>Like</span>
          </button>

          {/* Comment */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Comment"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Comment</span>
          </button>

          {/* Share */}
          <button
            onClick={() => setShowShareModal(true)}
            className="flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>

          {/* Bookmark */}
          <button
            onClick={() => toggleSavePost(post.id)}
            className={`p-1.5 sm:px-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
              post.isSaved ? 'text-green-700 dark:text-green-400' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            title={post.isSaved ? 'Saved' : 'Save'}
          >
            <Bookmark className={`w-4 h-4 ${post.isSaved ? 'fill-green-700 dark:fill-green-400' : ''}`} />
          </button>
        </div>

        {/* ================================================================= */}
        {/* 6. COMMENTS PREVIEW & INLINE COMMENT INPUT                        */}
        {/* ================================================================= */}
        <div className="px-3.5 sm:px-4 pb-3 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
          {commentsCount > 0 && !showComments && (
            <button
              onClick={() => setShowComments(true)}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium py-1 transition-colors cursor-pointer"
            >
              View all {commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}
            </button>
          )}

          {showComments && (
            <div className="space-y-2 mb-3">
              {/* Existing Comments List */}
              {post.comments && post.comments.length > 0 ? (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {post.comments.map(c => (
                    <div key={c.id} className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-750 text-xs">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={c.userAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=c'}
                            alt={c.userName}
                            className="w-4 h-4 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <span className="font-bold text-slate-800 dark:text-white">{c.userName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{c.createdAt}</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 pl-5.5">{c.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 py-1">No comments yet. Be the first to reply!</p>
              )}
            </div>
          )}

          {/* Inline Comment Input Form */}
          <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 mt-1">
            <input
              type="text"
              value={commentInput}
              onChange={e => setCommentInput(e.target.value)}
              placeholder="Add a comment for caregivers..."
              className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-green-600 focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-800 dark:text-white placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!commentInput.trim()}
              className="p-2 bg-green-700 hover:bg-green-800 text-white rounded-xl disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
              title="Post comment"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </article>

      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          post={post}
        />
      )}
    </>
  );
};
