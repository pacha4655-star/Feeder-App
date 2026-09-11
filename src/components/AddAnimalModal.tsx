import React, { useState } from 'react';
import { ArrowLeft, PawPrint, CheckCircle2, ShieldCheck, Camera, Loader2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { uploadMediaFile } from '../services/storageService';

export const AddAnimalModal: React.FC = () => {
  const {
    showAddAnimal,
    setShowAddAnimal,
    addAnimal,
    selectedLocation,
    showToast
  } = useApp();

  const [name, setName] = useState('');
  const [species, setSpecies] = useState<'Dog' | 'Cat' | 'Bird' | 'Cow' | 'Other'>('Dog');
  const [breed, setBreed] = useState('Indie / Indian Pariah');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Unknown'>('Male');
  const [age, setAge] = useState('2 years');
  const [color, setColor] = useState('Tan & White');
  const [size, setSize] = useState<'Small' | 'Medium' | 'Large'>('Medium');
  const [neutered, setNeutered] = useState(true);
  const [vaccinated, setVaccinated] = useState(true);
  const [location, setLocation] = useState(selectedLocation !== 'Select location' ? selectedLocation : '');
  const [about, setAbout] = useState('');
  const [avatar, setAvatar] = useState('https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  if (!showAddAnimal) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const downloadUrl = await uploadMediaFile(file, 'animals');
      setAvatar(downloadUrl);
      showToast('Animal photo uploaded to Cloud Storage! 🐾', 'success');
    } catch (err: any) {
      console.error('Photo upload error:', err);
      showToast(err.message || 'Failed to upload photo', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter the animal name', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await addAnimal({
        name: name.trim(),
        species,
        breed: breed.trim(),
        gender,
        age: age.trim(),
        color: color.trim(),
        size,
        neutered,
        vaccinated,
        location: location.trim() || selectedLocation,
        about: about.trim() || `${name} is a sweet community animal living in ${location || 'the neighborhood'}.`,
        avatar,
        photos: [avatar],
        status: 'Healthy'
      });
      setShowAddAnimal(false);
    } catch (err) {
      // Handled by context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={() => setShowAddAnimal(false)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans animate-in fade-in duration-200"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-6 duration-200"
      >
        {/* Top Header */}
        <div className="sticky top-0 z-10 bg-white px-5 py-3.5 flex items-center justify-between border-b border-slate-100">
          <button
            onClick={() => setShowAddAnimal(false)}
            className="p-1 -ml-1 text-slate-700 hover:text-black flex items-center gap-1 font-bold text-xs"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Add Animal Profile</span>
          </button>

          <span className="text-xs font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
            Verified Profile
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Photo Preview & Upload */}
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-green-600 shadow-2xs flex-shrink-0">
              <img src={avatar} alt="Animal preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              {isUploadingPhoto && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-xs font-bold text-slate-800 block mb-1">Animal Photo</label>
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors">
                <Camera className="w-3.5 h-3.5" />
                <span>{isUploadingPhoto ? 'Uploading...' : 'Upload from Device'}</span>
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

          {/* Animal Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Animal Name / Tag</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Bruno or White-Paws"
              required
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600 focus:bg-white"
            />
          </div>

          {/* Species & Breed */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Species</label>
              <select
                value={species}
                onChange={e => setSpecies(e.target.value as any)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600"
              >
                <option value="Dog">Dog</option>
                <option value="Cat">Cat</option>
                <option value="Bird">Bird</option>
                <option value="Cow">Cow</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Breed</label>
              <input
                type="text"
                value={breed}
                onChange={e => setBreed(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Gender & Age */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value as any)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Age</label>
              <input
                type="text"
                value={age}
                onChange={e => setAge(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Feeding Spot / Neighborhood</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Near Gandhi Statue, Marina Beach"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600 focus:bg-white"
            />
          </div>

          {/* Health & Care Toggles */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={vaccinated}
                onChange={e => setVaccinated(e.target.checked)}
                className="w-4 h-4 text-green-600 rounded"
              />
              <span className="text-xs font-semibold text-slate-800">Vaccinated (ARV)</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={neutered}
                onChange={e => setNeutered(e.target.checked)}
                className="w-4 h-4 text-green-600 rounded"
              />
              <span className="text-xs font-semibold text-slate-800">Neutered / Spayed</span>
            </label>
          </div>

          {/* About */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Personality & Description</label>
            <textarea
              value={about}
              onChange={e => setAbout(e.target.value)}
              rows={3}
              placeholder="Friendly with other dogs, likes pedigree and warm broth..."
              className="w-full p-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-green-600 focus:bg-white resize-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isUploadingPhoto}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-green-700/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Profile to Firestore...</span>
                </>
              ) : (
                <span>Save Animal Profile</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
