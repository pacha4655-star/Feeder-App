import React, { useState } from 'react';
import { ArrowLeft, AlertCircle, Camera, MapPin, Phone, IndianRupee, Plus, X, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { uploadMediaFile } from '../services/storageService';

export const CreateHelpModal: React.FC = () => {
  const {
    showCreateHelp,
    setShowCreateHelp,
    createHelpRequest,
    selectedLocation,
    showToast
  } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'Injured Animal' | 'Transport Needed' | 'Vet Help' | 'Temporary Foster' | 'Food Required'>('Injured Animal');
  const [urgency, setUrgency] = useState<'urgent' | 'high' | 'normal'>('urgent');
  const [location, setLocation] = useState(selectedLocation !== 'Select location' ? selectedLocation : '');
  const [untilDeadline, setUntilDeadline] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&auto=format&fit=crop&q=80');
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>(['Transport', 'Vet care']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  if (!showCreateHelp) return null;

  const availableNeeds = [
    'Transport',
    'Vet care',
    'Temporary foster',
    'Emergency surgery fund',
    'Medication',
    'Puppy food',
    'Catching & rescue team'
  ];

  const toggleNeed = (need: string) => {
    if (selectedNeeds.includes(need)) {
      setSelectedNeeds(selectedNeeds.filter(n => n !== need));
    } else {
      setSelectedNeeds([...selectedNeeds, need]);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const downloadUrl = await uploadMediaFile(file, 'help_requests');
      setPhotoUrl(downloadUrl);
      showToast('Rescue photo uploaded to Cloud Storage! 🚨', 'success');
    } catch (err: any) {
      console.error('Photo upload error:', err);
      showToast(err.message || 'Failed to upload photo', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      showToast('Please provide a title and description.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await createHelpRequest({
        title: title.trim(),
        description: description.trim(),
        category,
        urgency,
        location: location.trim() || selectedLocation,
        needs: selectedNeeds,
        untilDeadline: untilDeadline ? untilDeadline : undefined,
        targetAmount: targetAmount ? Number(targetAmount) : undefined,
        photos: [photoUrl],
        creatorPhone: phone.trim() || undefined
      });
      setShowCreateHelp(false);
    } catch (err) {
      // Handled by context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={() => setShowCreateHelp(false)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans animate-in fade-in duration-200"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-6 duration-200"
      >
        {/* Top Header */}
        <div className="sticky top-0 z-10 bg-white px-5 py-3.5 flex items-center justify-between border-b border-slate-100">
          <button
            onClick={() => setShowCreateHelp(false)}
            className="p-1 -ml-1 text-slate-700 hover:text-black flex items-center gap-1 font-bold text-xs"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Report Urgent Help Need</span>
          </button>

          <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">
            Emergency Alert
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Urgency Level Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Urgency Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setUrgency('urgent')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all ${
                  urgency === 'urgent'
                    ? 'bg-red-600 text-white border-red-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                🚨 Critical / Now
              </button>
              <button
                type="button"
                onClick={() => setUrgency('high')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all ${
                  urgency === 'high'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                ⚠️ High / Today
              </button>
              <button
                type="button"
                onClick={() => setUrgency('normal')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all ${
                  urgency === 'normal'
                    ? 'bg-green-600 text-white border-green-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                🟢 Standard
              </button>
            </div>
          </div>

          {/* Photo Upload */}
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-slate-300 flex-shrink-0">
              <img src={photoUrl} alt="Rescue preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              {isUploadingPhoto && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-xs font-bold text-slate-800 block mb-1">Rescue Photo Evidence</label>
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors">
                <Camera className="w-3.5 h-3.5" />
                <span>{isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={isUploadingPhoto}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Alert Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Alert Headline</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Injured stray dog near Metro pillar #42"
              required
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:bg-white"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as any)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600"
            >
              <option value="Injured Animal">Injured Animal (Accident / Wound)</option>
              <option value="Transport Needed">Transport to Vet / Hospital</option>
              <option value="Vet Help">Emergency Medical Care</option>
              <option value="Temporary Foster">Emergency Foster Host</option>
              <option value="Food Required">Puppy / Kitten Starvation Alert</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Exact Location & Landmark</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Opposite Blue Cross, Sardar Patel Road, Adyar"
              required
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:bg-white"
            />
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Rescuer Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. +91 98401 23456"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:bg-white"
            />
          </div>

          {/* Needs Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">What is needed from community?</label>
            <div className="flex flex-wrap gap-1.5">
              {availableNeeds.map(need => {
                const isSelected = selectedNeeds.includes(need);
                return (
                  <button
                    key={need}
                    type="button"
                    onClick={() => toggleNeed(need)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-red-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected && '✓ '}
                    {need}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Situation Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the animal's condition, immediate safety status, and how responders can help..."
              required
              className="w-full p-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 focus:bg-white resize-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isUploadingPhoto}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing Alert to Cloud...</span>
                </>
              ) : (
                <span>Publish Urgent Rescue Alert</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
