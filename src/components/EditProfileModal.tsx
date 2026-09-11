import React, { useState } from 'react';
import { X, Camera, MapPin, Check, Sparkles, User as UserIcon, Heart, Dog, Tag, Loader2, Upload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { uploadMediaFile } from '../services/storageService';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'profile' | 'pet';
}

const AVAILABLE_ROLES: UserRole[] = [
  'Feeder',
  'Rescuer',
  'Pet Owner',
  'Volunteer',
  'Foster',
  'Adopter',
  'Vet',
  'Community Lead',
  'Animal Lover'
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, defaultTab = 'profile' }) => {
  const { user, updateUserProfile, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'profile' | 'pet'>(defaultTab);

  // User profile state
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [roles, setRoles] = useState<UserRole[]>(user?.roles || ['Feeder', 'Animal Lover']);
  const [interestInput, setInterestInput] = useState('');
  const [interests, setInterests] = useState<string[]>(user?.interests || ['Dogs', 'Cats', 'Street Animals']);

  // Dog companion profile state
  const [petName, setPetName] = useState(user?.petName || '');
  const [petSpecies, setPetSpecies] = useState<'Dog' | 'Cat' | 'Bird' | 'Other'>(user?.petSpecies || 'Dog');
  const [petBreed, setPetBreed] = useState(user?.petBreed || '');
  const [petAge, setPetAge] = useState(user?.petAge || '');
  const [petPhoto, setPetPhoto] = useState(user?.petPhoto || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingPetPhoto, setIsUploadingPetPhoto] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const downloadUrl = await uploadMediaFile(file, 'profiles');
      setAvatar(downloadUrl);
      showToast('Avatar uploaded to Cloud Storage! 🐾', 'success');
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      showToast(err.message || 'Failed to upload avatar', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePetPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPetPhoto(true);
    try {
      const downloadUrl = await uploadMediaFile(file, 'profiles');
      setPetPhoto(downloadUrl);
      showToast('Pet photo uploaded to Cloud Storage! 🐶', 'success');
    } catch (err: any) {
      console.error('Pet photo upload failed:', err);
      showToast(err.message || 'Failed to upload pet photo', 'error');
    } finally {
      setIsUploadingPetPhoto(false);
    }
  };

  const toggleRole = (role: UserRole) => {
    if (roles.includes(role)) {
      if (roles.length > 1) {
        setRoles(roles.filter(r => r !== role));
      }
    } else {
      setRoles([...roles, role]);
    }
  };

  const handleAddInterest = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (!interestInput.trim()) return;
    if (!interests.includes(interestInput.trim())) {
      setInterests([...interests, interestInput.trim()]);
    }
    setInterestInput('');
  };

  const handleRemoveInterest = (item: string) => {
    setInterests(interests.filter(i => i !== item));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('Please enter your full name', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile({
        name: name.trim(),
        username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
        bio: bio.trim(),
        location: location.trim(),
        avatar,
        roles,
        interests,
        petName: petName.trim() || undefined,
        petSpecies,
        petBreed: petBreed.trim() || undefined,
        petAge: petAge.trim() || undefined,
        petPhoto: petPhoto || undefined
      });
      onClose();
    } catch (err) {
      // Error already toasted by context
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs font-sans animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-slate-900">Edit Profile & Animal Photos</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="px-5 pt-3 pb-2 flex gap-2 border-b border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-green-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Feeder Caregiver Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pet')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'pet'
                ? 'bg-green-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Dog className="w-3.5 h-3.5" />
            <span>Dog / Companion Photo</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'profile' ? (
            <>
              {/* Avatar Upload */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="relative">
                  <img
                    src={avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=feeder'}
                    alt="Profile Avatar"
                    className="w-16 h-16 rounded-full object-cover border-2 border-green-600"
                    referrerPolicy="no-referrer"
                  />
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-bold text-slate-800 mb-1">Caregiver Avatar</label>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isUploadingAvatar ? 'Uploading...' : 'Upload from Device'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploadingAvatar}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Name & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
                  <div className="relative">
                    <span className="text-slate-400 font-bold absolute left-3 top-2 text-xs">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className="w-full pl-7 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Neighborhood / City</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Adyar, Chennai"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">About / Bio</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={3}
                  placeholder="Share your experience caring for community animals..."
                  className="w-full p-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600 focus:bg-white resize-none"
                />
              </div>

              {/* Community Roles */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Your Roles</label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_ROLES.map(r => {
                    const isSelected = roles.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleRole(r)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-green-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected && '✓ '}
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Pet / Companion Dog Section */}
              <div className="flex items-center gap-4 p-3 bg-amber-50/60 rounded-2xl border border-amber-200">
                <div className="relative">
                  <img
                    src={petPhoto || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&auto=format&fit=crop&q=80'}
                    alt="Companion Dog"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500 shadow-2xs"
                    referrerPolicy="no-referrer"
                  />
                  {isUploadingPetPhoto && (
                    <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center text-white">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-bold text-amber-900 mb-1">Dog / Animal Companion Photo</label>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isUploadingPetPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePetPhotoUpload}
                      disabled={isUploadingPetPhoto}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Pet Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dog / Animal Name</label>
                  <input
                    type="text"
                    value={petName}
                    onChange={e => setPetName(e.target.value)}
                    placeholder="e.g. Bruno"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Breed / Type</label>
                  <input
                    type="text"
                    value={petBreed}
                    onChange={e => setPetBreed(e.target.value)}
                    placeholder="e.g. Indie / Indian Pariah"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Species</label>
                  <select
                    value={petSpecies}
                    onChange={e => setPetSpecies(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600"
                  >
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                    <option value="Bird">Bird</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Age</label>
                  <input
                    type="text"
                    value={petAge}
                    onChange={e => setPetAge(e.target.value)}
                    placeholder="e.g. 2 years"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600 focus:bg-white"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-white text-xs font-bold text-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving || isUploadingAvatar || isUploadingPetPhoto}
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-green-700/20 transition-all flex items-center justify-center gap-1.5"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving to Firestore...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
