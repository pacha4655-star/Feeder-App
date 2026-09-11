import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Video,
  Sparkles,
  MapPin,
  Clock,
  ArrowRight,
  Loader2,
  Camera,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { uploadMediaFile, deleteMediaFromStorage } from '../services/storageService';
import { checkIfAiGenerated, verifyImageAuthenticityWithServer, AI_RESTRICTION_NOTICE } from '../utils/aiMediaGuard';
import { AiConfirmationModal } from './AiConfirmationModal';
import { Story } from '../types';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated?: (story: Story) => void;
}

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose
}) => {
  const { user, selectedLocation, addStory, showToast } = useApp();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState(selectedLocation !== 'Select location' ? selectedLocation : '');
  const [selectedTag, setSelectedTag] = useState('🐾 Street Feeding');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showAiConfirmModal, setShowAiConfirmModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  if (!isOpen) return null;

  const setFileForStory = async (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      showToast('Please select a valid image or video file.', 'error');
      return;
    }

    // Check for explicit AI generation provenance metadata
    if (file.type.startsWith('image/')) {
      const aiCheck = await checkIfAiGenerated(file);
      if (aiCheck.isAiDetected) {
        showToast('AI-generated photos are not allowed. Please upload a real photograph.', 'error');
        return;
      }
    }

    const isVideo = file.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'image');
    setSelectedFile(file);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileForStory(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFileForStory(file);
    }
  };

  const handleRemoveSelectedFile = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(null);
    setIsUploading(false);
    setStatusText(null);
  };

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    handleRemoveSelectedFile();
    setCaption('');
    setShowAiConfirmModal(false);
    onClose();
  };

  const stickers = [
    '🐾 Street Feeding',
    '🍼 Kitten Foster',
    '🐶 Puppy Care',
    '🏥 Vet Checkup',
    '🍗 Morning Feast',
    '🏡 Adopt Me'
  ];

  const handlePublishClick = () => {
    if (isUploading) return;

    if (!selectedFile) {
      showToast('Please select a photo or video to upload.', 'error');
      return;
    }
    if (!user) {
      showToast('Your session has expired. Please sign in again.', 'error');
      return;
    }

    // Require explicit AI photograph attestation confirmation
    setShowAiConfirmModal(true);
  };

  const performStoryPublish = async () => {
    setShowAiConfirmModal(false);
    if (isUploading || !selectedFile) return;

    if (!user) {
      showToast('Your session has expired. Please sign in again.', 'error');
      return;
    }

    console.log('[Story Upload] File selected:', selectedFile.name, `(${(selectedFile.size / 1024).toFixed(1)} KB)`);
    console.log('[Story Upload] User UID:', user.id);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsUploading(true);
    setUploadProgress(null);
    setStatusText('Checking image authenticity with AI vision...');
    let newlyUploadedUrl: string | null = null;

    try {
      // 1. Authenticate and perform server-side visual AI analysis BEFORE upload
      if (mediaType === 'image') {
        const verification = await verifyImageAuthenticityWithServer(selectedFile);
        if (!verification.verified) {
          console.warn('[Story Upload] Story image rejected by server authenticity detector:', verification);
          showToast(verification.userMessage || 'AI-generated photos are not allowed. Please upload a real photograph.', 'error');
          setIsUploading(false);
          setStatusText(null);
          return;
        }
      }

      setStatusText('Image verified. Uploading to Supabase Storage...');
      setUploadProgress(0);

      console.log('[Story Upload] Starting upload to Supabase Storage...');
      const downloadUrl = await uploadMediaFile(
        selectedFile,
        'stories',
        progress => {
          setUploadProgress(progress);
          setStatusText(`Uploading to Supabase Storage... ${progress}%`);
        },
        controller
      );

      newlyUploadedUrl = downloadUrl;
      console.log('[Story Upload] Download URL received:', downloadUrl);
      console.log('[Story Upload] Creating Supabase story row...');
      setStatusText('Publishing story to community...');

      const fullCaption = `${selectedTag}${caption.trim() ? ` • ${caption.trim()}` : ''}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const newStory: Story = {
        id: `story_${Date.now()}`,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        userBadge: user.roles?.[0] || 'Feeder',
        mediaUrl: downloadUrl,
        mediaType,
        caption: fullCaption,
        location: location || user.location || selectedLocation,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        likesCount: 0
      };

      await addStory(newStory);
      console.log('[Story Upload] Story created successfully in Supabase');
      showToast('Story published! 🐾', 'success');
      handleClose();
    } catch (err: any) {
      console.error('[Story Upload] Error creating story:', err);

      // Clean up orphaned storage media if story insert failed
      if (newlyUploadedUrl) {
        try {
          console.log('[Story Upload] Cleaning up orphaned storage media...');
          await deleteMediaFromStorage(newlyUploadedUrl);
        } catch (cleanErr) {
          console.warn('[Story Upload] Cleanup notice:', cleanErr);
        }
      }

      showToast(err.message || 'Could not post story. Please try again.', 'error');
    } finally {
      abortControllerRef.current = null;
      setIsUploading(false);
      setUploadProgress(null);
      setStatusText(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
        <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-green-700 to-amber-500 p-0.5">
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-xs">
                  📸
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Add Community Story</h3>
                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Live for 24 hours on Supabase
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-4 overflow-y-auto space-y-4 flex-1">
            {/* File Upload Zone / Media Preview */}
            {!previewUrl ? (
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
                  dragOver
                    ? 'border-green-600 bg-green-50/50'
                    : 'border-slate-200 hover:border-green-600 bg-slate-50/70 hover:bg-green-50/20'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-green-700 mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  Tap to upload from Gallery / Device
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Real photographs only • High-resolution supported
                </p>
                <span className="mt-3 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors">
                  Select File
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-black border border-slate-200">
                {mediaType === 'video' ? (
                  <video
                    src={previewUrl}
                    controls
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Story preview"
                    className="w-full h-full object-cover"
                  />
                )}
                
                {!isUploading && (
                  <button
                    type="button"
                    onClick={handleRemoveSelectedFile}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black text-white rounded-full backdrop-blur-xs transition-colors"
                    title="Remove and select another"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] text-white font-medium flex items-center gap-1">
                  {mediaType === 'video' ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                  <span>{mediaType === 'video' ? 'Video Story' : 'Photo Story'}</span>
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

            {/* Upload Progress Bar if active */}
            {isUploading && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-2xl">
                <div className="flex items-center justify-between text-xs font-bold text-green-800 mb-1">
                  <span>{statusText || 'Uploading to Supabase Storage...'}</span>
                  <span>{uploadProgress || 0}%</span>
                </div>
                <div className="w-full bg-green-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-green-600 h-full transition-all duration-200"
                    style={{ width: `${Math.max(5, uploadProgress || 0)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Sticker / Activity Tag Selector */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Story Tag
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {stickers.map((st, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={isUploading}
                    onClick={() => setSelectedTag(st)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                      selectedTag === st
                        ? 'bg-green-600 text-white shadow-xs scale-105'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Caption Input */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Caption (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Fed the street puppies behind the park!"
                value={caption}
                disabled={isUploading}
                onChange={e => setCaption(e.target.value)}
                maxLength={120}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* Location Bar */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
              <MapPin className="w-3.5 h-3.5 text-green-700 flex-shrink-0" />
              <input
                type="text"
                value={location}
                disabled={isUploading}
                onChange={e => setLocation(e.target.value)}
                placeholder="Add location"
                className="bg-transparent text-xs w-full focus:outline-none text-slate-800"
              />
            </div>
          </div>

          {/* Footer Publish Button */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-white text-xs font-bold text-slate-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!selectedFile || isUploading}
              onClick={handlePublishClick}
              id="publish-story-btn"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-green-700/20 transition-all flex items-center justify-center gap-1.5"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Publishing Story...</span>
                </>
              ) : (
                <>
                  <span>Share to Story</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Pre-publishing Real Photograph Confirmation Modal */}
      <AiConfirmationModal
        isOpen={showAiConfirmModal}
        onConfirm={performStoryPublish}
        onCancel={() => setShowAiConfirmModal(false)}
        isPublishing={isUploading}
      />
    </>
  );
};
