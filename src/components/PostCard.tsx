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
  PawPrint,
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
            className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-full text-[11px] font-semibold flex items-center gap-1 transition-colors"
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
    user,
    showToast
  } = useApp();

  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloadingPoster, setIsDownloadingPoster] = useState(false);

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
    if (!window.confirm('Are you sure you want to permanently delete this post from Cloud Firestore?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deletePost(post.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const hasMedia = post.media && post.media.length > 0;

  return (
    <>
      <article className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 hover:border-slate-200 transition-all font-sans shadow-xs">
        {/* Header: User Avatar, Name, Location/Time, Community Pill, More Menu */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenAuthorProfile}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 hover:opacity-90 transition-opacity"
              title={`View ${post.userName}'s profile`}
            >
              <img
                src={post.userAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                alt={post.userName}
                className="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0"
                referrerPolicy="no-referrer"
              />
            </button>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={handleOpenAuthorProfile}
                  className="text-xs font-bold text-slate-800 leading-tight hover:text-green-700 transition-colors text-left"
                >
                  {post.userName}
                </button>
                {post.type === 'help' && (
                  <span className="px-2 py-0.5 text-[9px] font-bold text-red-700 bg-red-50 rounded-full border border-red-200 uppercase flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" /> Urgent Rescue
                  </span>
                )}
                {post.type === 'feeding' && (
                  <span className="px-2 py-0.5 text-[9px] font-bold text-green-700 bg-green-50 rounded-full border border-green-200 flex items-center gap-1">
                    🐾 Feeding Update
                  </span>
                )}
                {post.type === 'adoption' && (
                  <span className="px-2 py-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 rounded-full border border-amber-200 flex items-center gap-1">
                    🏡 Adoption
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {post.userLocation && (
                  <>
                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" /> {post.userLocation}
                    </span>
                    <span className="text-slate-300">•</span>
                  </>
                )}
                <span className="text-[11px] text-slate-400">{post.createdAt}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute right-0 top-8 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => {
                      toggleSavePost(post.id);
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center gap-2.5 text-slate-700"
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>{post.isSaved ? 'Remove Bookmark' : 'Save Post'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowShareModal(true);
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center gap-2.5 text-slate-700"
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
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center gap-2.5 text-slate-700"
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
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-green-50 flex items-center gap-2.5 text-green-700 font-semibold"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Generate Poster (PNG)</span>
                  </button>

                  {isAuthor && (
                    <>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-50 flex items-center gap-2.5 text-red-600 font-semibold transition-colors disabled:opacity-50"
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

        {/* Tags Row: Community and/or Animal */}
        {(post.communityName || post.animalName) && (
          <div className="flex items-center gap-2 flex-wrap mb-2.5">
            {post.communityName && (
              <button
                onClick={() => post.communityId && setActiveCommunityId(post.communityId)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-green-800 bg-green-50 hover:bg-green-100 rounded-full transition-colors border border-green-200"
              >
                <span>{post.communityIcon || '🌿'}</span>
                <span>{post.communityName}</span>
              </button>
            )}

            {post.animalName && (
              <button
                onClick={() => post.animalId && setActiveAnimalId(post.animalId)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors border border-slate-200"
              >
                {post.animalAvatar ? (
                  <img
                    src={post.animalAvatar}
                    alt={post.animalName}
                    className="w-3.5 h-3.5 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>🐾</span>
                )}
                <span>About {post.animalName}</span>
              </button>
            )}
          </div>
        )}

        {/* Post Content Text */}
        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line mb-3">
          {post.content}
        </p>

        {/* Media Carousel / Grid */}
        {hasMedia && (
          <div className="rounded-2xl overflow-hidden mb-3 border border-slate-100 bg-slate-900/5">
            {post.media.length === 1 ? (
              <div className="aspect-[4/3] w-full max-h-[460px] overflow-hidden bg-slate-950 relative flex items-center justify-center">
                <PostMediaItem url={post.media[0]} postType={post.type} alt="Post media" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1 max-h-[380px] overflow-hidden bg-slate-950">
                {post.media.map((url, i) => (
                  <div key={i} className="aspect-square overflow-hidden bg-slate-950 relative flex items-center justify-center">
                    <PostMediaItem url={url} postType={post.type} alt={`Post media ${i + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Bar (Like, Comment, Share, Bookmark) */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600 font-semibold">
          <div className="flex items-center gap-4">
            <button
              onClick={() => toggleLikePost(post.id)}
              id={`like-post-${post.id}`}
              className={`flex items-center gap-1.5 py-1 px-2 rounded-xl hover:bg-red-50 transition-colors ${
                post.isLiked ? 'text-red-600 font-bold' : 'text-slate-600 hover:text-red-600'
              }`}
            >
              <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-red-600 stroke-red-600' : ''}`} />
              <span>{post.likesCount}</span>
            </button>

            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 py-1 px-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{post.commentsCount}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShareModal(true)}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => toggleSavePost(post.id)}
              className={`p-1.5 rounded-xl hover:bg-slate-100 transition-colors ${
                post.isSaved ? 'text-green-700' : 'text-slate-500'
              }`}
              title={post.isSaved ? 'Saved' : 'Save'}
            >
              <Bookmark className={`w-4 h-4 ${post.isSaved ? 'fill-green-700' : ''}`} />
            </button>
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
            {/* New Comment Input */}
            <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600 focus:bg-white transition-all text-slate-800"
              />
              <button
                type="submit"
                disabled={!commentInput.trim()}
                className="p-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-40 transition-colors shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Existing Comments */}
            {post.comments && post.comments.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {post.comments.map(c => (
                  <div key={c.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <img
                          src={c.userAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=c'}
                          alt={c.userName}
                          className="w-5 h-5 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span className="font-bold text-slate-800">{c.userName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{c.createdAt}</span>
                    </div>
                    <p className="text-slate-700 pl-7">{c.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 text-center py-2">No comments yet. Be the first to comment!</p>
            )}
          </div>
        )}
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
