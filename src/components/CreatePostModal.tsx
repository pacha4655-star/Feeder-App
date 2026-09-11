import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Image as ImageIcon,
  Video,
  Upload,
  MapPin,
  X,
  PawPrint,
  Users,
  AlertTriangle,
  Loader2,
  Check,
  ShieldAlert,
  Camera
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { uploadMediaFile, deleteMediaFromStorage } from '../services/storageService';
import { checkIfAiGenerated, verifyImageAuthenticityWithServer, AI_RESTRICTION_NOTICE } from '../utils/aiMediaGuard';
import { AiConfirmationModal } from './AiConfirmationModal';

interface PendingMedia {
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
}

export const CreatePostModal: React.FC = () => {
  const {
    showCreatePost,
    setShowCreatePost,
    communities,
    createPost,
    selectedLocation,
    user,
    showToast
  } = useApp();

  const [content, setContent] = useState('');
  const [selectedCommunityId, setSelectedCommunityId] = useState(communities[0]?.id || '');
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>('');
  const [postLocation, setPostLocation] = useState(selectedLocation !== 'Select location' ? selectedLocation : '');
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>([]);
  const [postType, setPostType] = useState<'general' | 'feeding' | 'help' | 'adoption' | 'update'>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showAiConfirmModal, setShowAiConfirmModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  if (!showCreatePost) return null;

  const handleFiles = async (files: FileList | File[]) => {
    const validFiles: PendingMedia[] = [];
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        showToast(`Skipped ${file.name}: only images and videos are supported.`, 'error');
        continue;
      }
      if (file.size > MAX_SIZE) {
        showToast(`Skipped ${file.name}: file exceeds 50MB limit.`, 'error');
        continue;
      }

      // Check for explicit AI generation provenance metadata
      if (file.type.startsWith('image/')) {
        const aiCheck = await checkIfAiGenerated(file);
        if (aiCheck.isAiDetected) {
          showToast('AI-generated photos are not allowed. Please upload a real photograph.', 'error');
          continue;
        }
      }

      validFiles.push({
        file,
        previewUrl: URL.createObjectURL(file),
        type: file.type.startsWith('video/') ? 'video' : 'image'
      });
    }

    if (validFiles.length > 0) {
      setPendingMedia(prev => [...prev, ...validFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    // Reset file input value so selecting the same file again works
    if (e.target) e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removePendingMedia = (index: number) => {
    setPendingMedia(prev => {
      const target = prev[index];
      if (target && target.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeExistingMedia = (index: number) => {
    setExistingMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Revoke all pending blob URLs
    pendingMedia.forEach(m => {
      try {
        URL.revokeObjectURL(m.previewUrl);
      } catch (e) {}
    });
    setContent('');
    setPendingMedia([]);
    setExistingMediaUrls([]);
    setUploadProgress(null);
    setIsSubmitting(false);
    setStatusText(null);
    setShowAiConfirmModal(false);
    setShowCreatePost(false);
  };

  const handlePublishClick = () => {
    if (isSubmitting) return;

    const totalMediaCount = pendingMedia.length + existingMediaUrls.length;
    if (!content.trim() && totalMediaCount === 0) {
      showToast('Please add text content or upload media.', 'error');
      return;
    }

    if (!user) {
      showToast('Your session has expired. Please sign in again.', 'error');
      return;
    }

    // If media is attached, require explicit AI photograph attestation confirmation
    if (totalMediaCount > 0) {
      setShowAiConfirmModal(true);
    } else {
      performPostPublish();
    }
  };

  const performPostPublish = async () => {
    setShowAiConfirmModal(false);
    if (isSubmitting) return;

    if (!user) {
      showToast('Your session has expired. Please sign in again.', 'error');
      return;
    }

    console.log('[Post Upload] Publishing post started. User UID:', user.id);
    console.log('[Post Upload] Pending media count:', pendingMedia.length, 'Existing media count:', existingMediaUrls.length);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSubmitting(true);
    const finalMediaUrls: string[] = [...existingMediaUrls];
    const newlyUploadedUrls: string[] = [];

    try {
      // 1. Authenticate and perform server-side visual AI analysis for all images BEFORE upload
      for (let i = 0; i < pendingMedia.length; i++) {
        const item = pendingMedia[i];
        if (item.type === 'image') {
          setStatusText(`Checking image authenticity with AI vision (${i + 1}/${pendingMedia.length})...`);
          setUploadProgress(null);

          const verification = await verifyImageAuthenticityWithServer(item.file);
          if (!verification.verified) {
            console.warn('[Post Upload] Image rejected by server authenticity detector:', verification);
            showToast(verification.userMessage || 'AI-generated photos are not allowed. Please upload a real photograph.', 'error');
            setIsSubmitting(false);
            setStatusText(null);
            return;
          }
        }
      }

      setStatusText('Image verified. Publishing to Supabase Storage...');

      // 2. Upload each pending media file to Supabase Storage
      for (let i = 0; i < pendingMedia.length; i++) {
        const item = pendingMedia[i];
        const mediaLabel = item.type === 'video' ? 'video' : 'photo';
        console.log(`[Post Upload] Starting upload of ${mediaLabel} ${i + 1}/${pendingMedia.length}...`);
        setStatusText(`Uploading ${mediaLabel} ${i + 1} of ${pendingMedia.length}...`);
        setUploadProgress(0);

        const downloadUrl = await uploadMediaFile(
          item.file,
          'posts',
          (progress) => {
            setUploadProgress(progress);
            setStatusText(`Uploading ${mediaLabel} (${i + 1}/${pendingMedia.length}) • ${progress}%`);
          },
          controller
        );

        console.log(`[Post Upload] ${mediaLabel} ${i + 1} uploaded successfully, download URL:`, downloadUrl);
        finalMediaUrls.push(downloadUrl);
        newlyUploadedUrls.push(downloadUrl);
      }

      // 2. Create the Supabase post
      console.log('[Post Upload] Creating Supabase post document...');
      setStatusText('Publishing post to feed...');
      setUploadProgress(null);

      await createPost({
        content: content.trim(),
        media: finalMediaUrls,
        type: postType,
        communityId: selectedCommunityId || undefined,
        animalId: selectedAnimalId || undefined,
        location: postLocation || user?.location || selectedLocation
      });

      console.log('[Post Upload] Post published successfully');
      showToast('Post published to community! 🐾', 'success');

      // 3. Clean up and close
      pendingMedia.forEach(m => {
        try {
          URL.revokeObjectURL(m.previewUrl);
        } catch (e) {}
      });
      setContent('');
      setPendingMedia([]);
      setExistingMediaUrls([]);
      setShowCreatePost(false);
    } catch (e: any) {
      console.error('[Post Upload] Failed to publish post:', e);

      // Clean up orphaned storage media if post database insert failed
      if (newlyUploadedUrls.length > 0) {
        console.log('[Post Upload] Cleaning up orphaned storage files...');
        for (const url of newlyUploadedUrls) {
          try {
            await deleteMediaFromStorage(url);
          } catch (cleanErr) {
            console.warn('[Post Upload] Cleanup notice:', cleanErr);
          }
        }
      }

      showToast(e.message || 'Could not publish post. Please try again.', 'error');
    } finally {
      abortControllerRef.current = null;
      setIsSubmitting(false);
      setUploadProgress(null);
      setStatusText(null);
    }
  };

  const postTypes = [
    { id: 'general', label: 'General', icon: '🐾' },
    { id: 'feeding', label: 'Feeding Update', icon: '🍖' },
    { id: 'help', label: 'Urgent Rescue', icon: '🚨' },
    { id: 'adoption', label: 'Adoption Call', icon: '🏡' },
    { id: 'update', label: 'Health / Vet', icon: '🏥' },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-sans animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="p-1 -ml-1 text-slate-600 hover:text-black flex items-center gap-1 font-bold text-xs disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <span className="font-extrabold text-sm text-slate-900">Create Community Post</span>
            </div>

            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {/* Post Author Preview */}
            {user && (
              <div className="flex items-center gap-2.5">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{user.name}</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Publishing as verified feeder</p>
                </div>
              </div>
            )}

            {/* Post Type Selector */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Post Type
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {postTypes.map(pt => (
                  <button
                    key={pt.id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setPostType(pt.id as any)}
                    className={`px-2 py-1.5 rounded-xl text-xs font-bold transition-all border flex flex-col items-center gap-0.5 ${
                      postType === pt.id
                        ? 'border-green-600 bg-green-50 text-green-800 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-sm">{pt.icon}</span>
                    <span className="text-[10px] truncate">{pt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Textarea */}
            <div>
              <textarea
                value={content}
                disabled={isSubmitting}
                onChange={e => setContent(e.target.value)}
                placeholder="What's happening with community animals in your area? Share feeding updates, health notes, or rescue calls..."
                rows={4}
                className="w-full p-3.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-green-600 focus:bg-white transition-all resize-none text-slate-800 placeholder:text-slate-400 disabled:opacity-60"
              />
            </div>

            {/* Attached Media Previews */}
            {(pendingMedia.length > 0 || existingMediaUrls.length > 0) && (
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Attached Media ({pendingMedia.length + existingMediaUrls.length})
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Existing media */}
                  {existingMediaUrls.map((url, i) => (
                    <div key={`existing-${i}`} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 group">
                      <img src={url} alt={`Upload ${i}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      {!isSubmitting && (
                        <button
                          type="button"
                          onClick={() => removeExistingMedia(i)}
                          className="absolute top-1.5 right-1.5 p-1 bg-black/70 text-white rounded-full hover:bg-black transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {/* Pending local media */}
                  {pendingMedia.map((item, i) => (
                    <div key={`pending-${i}`} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 group bg-slate-100">
                      {item.type === 'video' ? (
                        <video src={item.previewUrl} className="w-full h-full object-cover" />
                      ) : (
                        <img src={item.previewUrl} alt={`Selected ${i}`} className="w-full h-full object-cover" />
                      )}
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-bold">
                        {item.type === 'video' ? 'Video' : 'Photo'}
                      </div>
                      {!isSubmitting && (
                        <button
                          type="button"
                          onClick={() => removePendingMedia(i)}
                          className="absolute top-1.5 right-1.5 p-1 bg-black/70 text-white rounded-full hover:bg-black transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Image Policy Notice Banner */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-start gap-2.5">
              <Camera className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
              <div className="text-[11px] text-emerald-800 leading-snug">
                <span className="font-bold">{AI_RESTRICTION_NOTICE}</span>
              </div>
            </div>

            {/* Upload / Submission Progress Bar */}
            {isSubmitting && (
              <div className="p-3.5 bg-green-50 border border-green-200 rounded-2xl animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-bold text-green-800 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-green-700" />
                    {statusText || 'Processing upload...'}
                  </span>
                  {uploadProgress !== null && <span>{uploadProgress}%</span>}
                </div>
                {uploadProgress !== null && (
                  <div className="w-full bg-green-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-green-600 h-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Upload Drop Zone */}
            {!isSubmitting && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex items-center justify-center gap-3 ${
                  dragOver
                    ? 'border-green-600 bg-green-50/50'
                    : 'border-slate-200 hover:border-green-600 bg-slate-50/60 hover:bg-green-50/20'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-green-700">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800">Add Photos or Video from Device</p>
                  <p className="text-[10px] text-slate-500">Real photographs only • Stored on Supabase</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}

            {/* Tag Community (Optional) */}
            {communities.length > 0 && (
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Share to Community Hub
                </label>
                <select
                  value={selectedCommunityId}
                  disabled={isSubmitting}
                  onChange={e => setSelectedCommunityId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600 text-slate-800 disabled:opacity-60"
                >
                  <option value="">Public Main Feed (No Community Hub)</option>
                  {communities.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Location Field */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-green-600" /> Location / Neighborhood
              </label>
              <input
                type="text"
                value={postLocation}
                disabled={isSubmitting}
                onChange={e => setPostLocation(e.target.value)}
                placeholder="e.g. Besant Nagar, Chennai"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600 text-slate-800 placeholder:text-slate-400 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-white text-xs font-bold text-slate-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handlePublishClick}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-green-700/20 transition-all flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Publishing Post...</span>
                </>
              ) : (
                <span>Publish Post</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Pre-publishing Real Photograph Confirmation Modal */}
      <AiConfirmationModal
        isOpen={showAiConfirmModal}
        onConfirm={performPostPublish}
        onCancel={() => setShowAiConfirmModal(false)}
        isPublishing={isSubmitting}
      />
    </>
  );
};
