import React, { useState } from 'react';
import { ArrowLeft, Home, Heart, Filter, Plus, ShieldCheck, CheckCircle2, MapPin } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AdoptionListing } from '../types';

export const AdoptionFosterHubModal: React.FC = () => {
  const {
    showAdoptionFosterHub,
    setShowAdoptionFosterHub,
    adoptions,
    createAdoptionListing,
    setActiveAnimalId,
    showToast
  } = useApp();

  const [filter, setFilter] = useState<'all' | 'adoption' | 'foster'>('all');
  const [selectedListing, setSelectedListing] = useState<AdoptionListing | null>(null);
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantExperience, setApplicantExperience] = useState('');

  if (!showAdoptionFosterHub) return null;

  const filtered = (adoptions || []).filter(l => {
    if (filter === 'all') return true;
    return l.type === filter;
  });

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListing) return;
    showToast(`Adoption inquiry submitted for ${selectedListing.name}! The caregiver will contact you. 🐾`, 'success');
    setSelectedListing(null);
    setApplicantName('');
    setApplicantPhone('');
    setApplicantExperience('');
  };

  return (
    <div
      onClick={() => setShowAdoptionFosterHub(false)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans animate-in fade-in duration-200"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-6 duration-200"
      >
        {/* Top Header */}
        <div className="sticky top-0 z-10 bg-white px-5 py-3.5 flex items-center justify-between border-b border-slate-100">
          <button
            onClick={() => setShowAdoptionFosterHub(false)}
            className="p-1 -ml-1 text-slate-700 hover:text-black flex items-center gap-1 font-bold text-xs"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Adoption & Foster Hub</span>
          </button>

          <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
            Forever Homes
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'all'
                  ? 'bg-green-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              All Animals
            </button>
            <button
              onClick={() => setFilter('adoption')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'adoption'
                  ? 'bg-green-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              🏡 Adoption
            </button>
            <button
              onClick={() => setFilter('foster')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'foster'
                  ? 'bg-green-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              🤝 Foster Need
            </button>
          </div>
        </div>

        {/* Animal Listings Grid */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map(item => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="relative aspect-[4/3] bg-slate-100">
                    <img
                      src={item.photos[0] || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&auto=format&fit=crop&q=80'}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs">
                      {item.type === 'foster' ? '🤝 Foster' : '🏡 Adoption'}
                    </span>
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                        <span className="text-xs text-green-700 font-semibold">{item.age}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{item.breed} • {item.gender}</p>
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2">{item.description}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" /> {item.location}
                      </span>
                      <button
                        onClick={() => setSelectedListing(item)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
                      >
                        Apply / Inquire
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400">
              <Home className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No active adoption or foster listings right now</p>
              <p className="text-xs text-slate-500 mt-1">Check back soon or post an animal looking for a forever home!</p>
            </div>
          )}
        </div>

        {/* Application Modal Popup */}
        {selectedListing && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-bold text-sm text-slate-900">Inquire for {selectedListing.name}</h3>
                <button onClick={() => setSelectedListing(null)} className="text-slate-400 hover:text-slate-600">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleApply} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Your Full Name</label>
                  <input
                    type="text"
                    value={applicantName}
                    onChange={e => setApplicantName(e.target.value)}
                    required
                    placeholder="e.g. Rahul Verma"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={applicantPhone}
                    onChange={e => setApplicantPhone(e.target.value)}
                    required
                    placeholder="+91 98401 23456"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Experience with Pets / Housing Details</label>
                  <textarea
                    value={applicantExperience}
                    onChange={e => setApplicantExperience(e.target.value)}
                    rows={3}
                    placeholder="Tell the caregiver about your home, previous pet experience, etc."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedListing(null)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-2xs"
                  >
                    Submit Inquiry
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
