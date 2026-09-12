import React, { useState } from 'react';
import { ArrowLeft, MoreHorizontal, CheckCircle2, MapPin, Calendar, Palette, Maximize2, ShieldCheck, Heart, Plus, Send } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PostCard } from './PostCard';

interface AnimalProfileViewProps {
  animalId: string;
  onBack: () => void;
}

export const AnimalProfileView: React.FC<AnimalProfileViewProps> = ({ animalId, onBack }) => {
  const { animals, toggleFollowAnimal, addAnimalUpdate, posts } = useApp();
  const [activeTab, setActiveTab] = useState<'about' | 'posts' | 'updates'>('about');
  const [showAddUpdateModal, setShowAddUpdateModal] = useState(false);
  const [updateType, setUpdateType] = useState<'feeding' | 'medical'>('feeding');
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');

  const animal = animals.find(a => a.id === animalId);
  if (!animal) return null;

  const animalPosts = posts.filter(p => p.animalId === animal.id || (p.content || '').toLowerCase().includes((animal.name || '').toLowerCase()));

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateNotes.trim()) return;
    addAnimalUpdate(animal.id, {
      type: updateType,
      title: updateTitle || (updateType === 'feeding' ? 'Daily Meal' : 'Medical Note'),
      notes: updateNotes
    });
    setUpdateNotes('');
    setUpdateTitle('');
    setShowAddUpdateModal(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden font-sans">
      {/* Top Floating Controls */}
      <div className="relative">
        <div className="h-60 sm:h-80 w-full overflow-hidden bg-gray-100">
          <img
            src={animal.coverImage || (animal.photos && animal.photos[0]) || animal.avatar}
            alt={animal.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
        </div>

        {/* Floating Top Nav */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <button
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            aria-label="Options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Card Overlay matching reference */}
        <div className="relative px-5 -mt-16 flex flex-col items-center text-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden shadow-lg bg-white">
              <img
                src={animal.avatar}
                alt={animal.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            {animal.vaccinated && (
              <div className="absolute bottom-1 right-1 bg-white rounded-full p-0.5 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-[#2E7D32] fill-[#2E7D32] text-white" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-2">
            <h1 className="text-xl font-extrabold text-[#192A1D]">{animal.name}</h1>
            <CheckCircle2 className="w-4 h-4 text-[#2E7D32] fill-[#2E7D32] text-white" />
          </div>

          <p className="text-xs font-semibold text-gray-500 mt-0.5">
            {animal.species} • {animal.gender} • {animal.age}
          </p>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-[#2E7D32]" />
            <span>{animal.location}</span>
          </p>

          {/* Follow Button matching reference */}
          <div className="mt-3.5 w-full max-w-[200px]">
            <button
              onClick={() => toggleFollowAnimal(animal.id)}
              className={`w-full py-2 px-6 rounded-full text-xs font-bold transition-all shadow-sm ${
                animal.isFollowing
                  ? 'bg-[#E8F5E9] text-[#1B5E20] border border-[#C8E6C9] hover:bg-[#c8e6c9]'
                  : 'bg-[#2E7D32] text-white hover:bg-[#1B5E20]'
              }`}
            >
              {animal.isFollowing ? '✓ Following Updates' : '+ Follow'}
            </button>
            <p className="text-[11px] text-gray-400 mt-1">
              {animal.followersCount} caring neighbors following
            </p>
          </div>
        </div>
      </div>

      {/* Tabs: About, Posts, Updates matching reference */}
      <div className="flex border-b border-[#E8EDE9] mt-4 px-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('about')}
          className={`flex-1 pb-3 transition-colors relative ${
            activeTab === 'about' ? 'text-[#2E7D32]' : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          About
          {activeTab === 'about' && (
            <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#2E7D32] rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 pb-3 transition-colors relative ${
            activeTab === 'posts' ? 'text-[#2E7D32]' : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          Posts ({animalPosts.length})
          {activeTab === 'posts' && (
            <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#2E7D32] rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('updates')}
          className={`flex-1 pb-3 transition-colors relative ${
            activeTab === 'updates' ? 'text-[#2E7D32]' : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          Care Updates
          {activeTab === 'updates' && (
            <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#2E7D32] rounded-full" />
          )}
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'about' && (
        <div className="p-5 space-y-4">
          {/* Bio Description matching reference */}
          <div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {animal.about}
            </p>
          </div>

          {/* Key Attributes List matching reference icons */}
          <div className="bg-[#F8FAF8] rounded-2xl p-4 border border-[#E8EDE9] divide-y divide-[#E8EDE9]">
            <div className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 text-gray-600 font-medium">
                <Calendar className="w-4 h-4 text-[#2E7D32]" />
                <span>Joined Feeder</span>
              </div>
              <span className="font-bold text-gray-900">{animal.joinedDate}</span>
            </div>

            <div className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 text-gray-600 font-medium">
                <Palette className="w-4 h-4 text-[#2E7D32]" />
                <span>Colour</span>
              </div>
              <span className="font-bold text-gray-900">{animal.color}</span>
            </div>

            <div className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 text-gray-600 font-medium">
                <Maximize2 className="w-4 h-4 text-[#2E7D32]" />
                <span>Size</span>
              </div>
              <span className="font-bold text-gray-900">{animal.size}</span>
            </div>

            <div className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 text-gray-600 font-medium">
                <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />
                <span>Neutered</span>
              </div>
              <span className="font-bold text-gray-900">{animal.neutered ? 'Yes' : 'No'}</span>
            </div>

            <div className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 text-gray-600 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
                <span>Vaccinated</span>
              </div>
              <span className="font-bold text-[#2E7D32]">{animal.vaccinated ? 'Yes (Up to date)' : 'Pending'}</span>
            </div>
          </div>

          {/* Caretaker info */}
          {animal.ownerName && (
            <div className="p-3.5 bg-white border border-[#E8EDE9] rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={animal.ownerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'}
                  alt={animal.ownerName}
                  className="w-10 h-10 rounded-full object-cover border border-gray-200"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <span className="text-[10px] font-bold text-[#2E7D32] uppercase tracking-wider">
                    Primary Guardian & Feeder
                  </span>
                  <h4 className="text-sm font-bold text-gray-900">{animal.ownerName}</h4>
                </div>
              </div>
              <span className="text-xs text-gray-400">Verified Feeder</span>
            </div>
          )}

          {/* Photo Gallery */}
          {animal.photos && animal.photos.length > 1 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Photos ({animal.photos.length})
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {animal.photos.map((p, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden border border-gray-100">
                    <img
                      src={p}
                      alt={`${animal.name} ${i + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <div className="divide-y divide-[#F0F4F1]">
          {animalPosts.length > 0 ? (
            animalPosts.map((p, idx) => <PostCard key={p.id ? `an_post_${p.id}` : `an_post_${idx}`} post={p} />)
          ) : (
            <div className="text-center py-12 px-6">
              <p className="text-xs text-gray-500">No specific posts mentioning {animal.name} yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Updates Tab */}
      {activeTab === 'updates' && (
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Recent Care & Feeding Logs
            </h3>
            <button
              onClick={() => setShowAddUpdateModal(true)}
              className="px-3 py-1 bg-[#2E7D32] text-white rounded-full text-xs font-bold hover:bg-[#1B5E20] flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Update</span>
            </button>
          </div>

          {/* Feeding History list */}
          <div className="space-y-3">
            {animal.feedingHistory?.map((fh, idx) => (
              <div key={idx} className="bg-[#F8FAF8] p-3 rounded-2xl border border-[#E8EDE9] text-xs">
                <div className="flex items-center justify-between font-semibold text-gray-800">
                  <span className="flex items-center gap-1.5 text-[#2E7D32]">
                    <span>🥣</span>
                    <span>Fed by {fh.feederName}</span>
                  </span>
                  <span className="text-gray-400 font-normal text-[11px]">{fh.date}</span>
                </div>
                <p className="text-gray-600 mt-1 leading-relaxed">{fh.notes}</p>
              </div>
            ))}

            {animal.medicalUpdates?.map((mu, idx) => (
              <div key={idx} className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100 text-xs">
                <div className="flex items-center justify-between font-semibold text-blue-900">
                  <span className="flex items-center gap-1.5">
                    <span>🩺</span>
                    <span>{mu.title}</span>
                  </span>
                  <span className="text-gray-400 font-normal text-[11px]">{mu.date}</span>
                </div>
                <p className="text-gray-600 mt-1 leading-relaxed">{mu.notes}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal for adding update */}
      {showAddUpdateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-[#E8EDE9] animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-gray-900 mb-3">
              Log Update for {animal.name}
            </h3>

            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setUpdateType('feeding')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl border ${
                  updateType === 'feeding'
                    ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#2E7D32]'
                    : 'text-gray-500 border-gray-200'
                }`}
              >
                🥣 Feeding Log
              </button>
              <button
                type="button"
                onClick={() => setUpdateType('medical')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl border ${
                  updateType === 'medical'
                    ? 'bg-blue-50 text-blue-700 border-blue-500'
                    : 'text-gray-500 border-gray-200'
                }`}
              >
                🩺 Medical / Vet
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-3">
              {updateType === 'medical' && (
                <input
                  type="text"
                  placeholder="Update Title (e.g. Vaccination booster, Deworming)"
                  value={updateTitle}
                  onChange={e => setUpdateTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2E7D32]"
                />
              )}
              <textarea
                rows={3}
                placeholder={
                  updateType === 'feeding'
                    ? "What was fed? (e.g. Boiled chicken & rice, fresh water replenished, good appetite)"
                    : "Notes on treatment, medicine administered, or vet observations..."
                }
                value={updateNotes}
                onChange={e => setUpdateNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2E7D32]"
                required
              />

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddUpdateModal(false)}
                  className="flex-1 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#2E7D32] text-white text-xs font-bold rounded-xl hover:bg-[#1B5E20] shadow-sm"
                >
                  Save Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
