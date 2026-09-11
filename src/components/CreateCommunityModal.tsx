import React, { useState } from 'react';
import { X, Users, MapPin, Sparkles, Image as ImageIcon, Shield, Plus, Check, Camera, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Community } from '../types';
import { uploadMediaFile } from '../services/storageService';

interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: Community['category'][] = [
  'Street Animals',
  'Dogs',
  'Cats',
  'Rescue',
  'Health',
  'Birds',
  'General'
];

export const CreateCommunityModal: React.FC<CreateCommunityModalProps> = ({ isOpen, onClose }) => {
  const { user, createCommunity, selectedLocation, showToast } = useApp();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Community['category']>('Street Animals');
  const [location, setLocation] = useState(user?.location || (selectedLocation !== 'Select location' ? selectedLocation : ''));
  const [icon, setIcon] = useState('https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=120&auto=format&fit=crop&q=80');
  const [coverImage, setCoverImage] = useState('https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&auto=format&fit=crop&q=80');
  const [ruleInput, setRuleInput] = useState('');
  const [rules, setRules] = useState<string[]>([
    'Respect all animals and volunteer caregivers',
    'Share verified locations when requesting rescue'
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  if (!isOpen) return null;

  const handleAddRule = () => {
    if (!ruleInput.trim()) return;
    setRules(prev => [...prev, ruleInput.trim()]);
    setRuleInput('');
  };

  const handleRemoveRule = (index: number) => {
    setRules(prev => prev.filter((_, i) => i !== index));
  };

  const handleCustomIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingIcon(true);
    try {
      const downloadUrl = await uploadMediaFile(file, 'communities');
      setIcon(downloadUrl);
      showToast('Community icon uploaded! 🌿', 'success');
    } catch (err: any) {
      console.error('Icon upload error:', err);
      showToast(err.message || 'Failed to upload icon', 'error');
    } finally {
      setIsUploadingIcon(false);
    }
  };

  const handleCustomCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    try {
      const downloadUrl = await uploadMediaFile(file, 'communities');
      setCoverImage(downloadUrl);
      showToast('Community cover image uploaded! 🌿', 'success');
    } catch (err: any) {
      console.error('Cover upload error:', err);
      showToast(err.message || 'Failed to upload cover', 'error');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please provide a community name', 'error');
      return;
    }
    if (!description.trim()) {
      showToast('Please provide a short description or mission', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await createCommunity({
        name: name.trim(),
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        description: description.trim(),
        category,
        location: location.trim() || selectedLocation,
        icon,
        coverImage,
        rules
      });
      onClose();
    } catch (err) {
      // Handled by context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs font-sans animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-50 text-green-700 flex items-center justify-center font-bold text-xs">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Create Feeder Community Hub</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Cover & Icon Uploads */}
          <div className="space-y-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Community Visuals</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="cursor-pointer p-2 bg-white rounded-xl border border-slate-200 hover:border-green-600 flex items-center gap-2 text-xs font-semibold text-slate-700 transition-colors">
                <Camera className="w-3.5 h-3.5 text-green-700" />
                <span>{isUploadingIcon ? 'Uploading...' : 'Upload Icon'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCustomIconUpload}
                  disabled={isUploadingIcon}
                  className="hidden"
                />
              </label>

              <label className="cursor-pointer p-2 bg-white rounded-xl border border-slate-200 hover:border-green-600 flex items-center gap-2 text-xs font-semibold text-slate-700 transition-colors">
                <ImageIcon className="w-3.5 h-3.5 text-green-700" />
                <span>{isUploadingCover ? 'Uploading...' : 'Upload Cover'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCustomCoverUpload}
                  disabled={isUploadingCover}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Community Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Adyar Street Dog Protectors"
              required
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600 focus:bg-white"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Focus Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as any)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Area / Neighborhood</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Besant Nagar & Adyar, Chennai"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mission & Purpose</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="What does this community do? e.g. Daily morning feedings, medical rescues, and vaccination drives."
              required
              className="w-full p-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600 focus:bg-white resize-none"
            />
          </div>

          {/* Rules */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Community Guidelines</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={ruleInput}
                onChange={e => setRuleInput(e.target.value)}
                placeholder="Add a rule (e.g. Always keep feeding spots clean)"
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600"
              />
              <button
                type="button"
                onClick={handleAddRule}
                className="px-3 py-1.5 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700"
              >
                + Add
              </button>
            </div>

            <div className="space-y-1">
              {rules.map((rule, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl text-xs text-slate-700">
                  <span className="truncate pr-2">{idx + 1}. {rule}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRule(idx)}
                    className="text-slate-400 hover:text-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isUploadingIcon || isUploadingCover}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-green-700/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Community in Firestore...</span>
                </>
              ) : (
                <span>Create Community Hub</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
