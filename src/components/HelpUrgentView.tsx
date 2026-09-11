import React, { useState } from 'react';
import { AlertTriangle, Plus, Clock, MapPin, MessageCircle, Check, Phone, ArrowLeft, Heart, ShieldAlert, Share2, Send } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HelpRequest } from '../types';

export const HelpUrgentView: React.FC = () => {
  const {
    helpRequests,
    setShowCreateHelp,
    activeHelpId,
    setActiveHelpId,
    respondToHelpRequest,
    user,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'urgent' | 'my'>('urgent');
  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [responderStatus, setResponderStatus] = useState<'on_the_way' | 'offered_transport' | 'offered_foster' | 'offered_vet'>('on_the_way');
  const [responderNote, setResponderNote] = useState('');

  const activeRequest = helpRequests.find(h => h.id === activeHelpId);

  const filteredRequests = helpRequests.filter(h => {
    if (activeTab === 'my') {
      return h.creatorId === user?.id || (h.responders || []).some(r => r.userId === user?.id);
    }
    return true;
  });

  const handleSendResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest) return;
    respondToHelpRequest(activeRequest.id, responderStatus, responderNote);
    setResponseModalOpen(false);
    setResponderNote('');
  };

  // If a specific help request detail is open
  if (activeRequest) {
    const isAlreadyResponding = (activeRequest.responders || []).some(r => r.userId === user?.id);

    return (
      <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs overflow-hidden pb-24 min-h-screen font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between border-b border-[#E8EDE9]">
          <button
            onClick={() => setActiveHelpId(null)}
            className="p-1 text-gray-700 hover:text-black flex items-center gap-1.5 font-bold text-xs"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>All Requests</span>
          </button>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {activeRequest.category}
          </span>
          <button
            onClick={() => {
              if (navigator.clipboard) navigator.clipboard.writeText(window.location.href);
              showToast('Request link copied to clipboard');
            }}
            className="p-1.5 text-gray-500 hover:text-gray-800"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Hero Photo */}
        <div className="h-56 w-full overflow-hidden bg-gray-100 relative">
          <img
            src={(activeRequest.photos && activeRequest.photos[0]) || 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=600&auto=format&fit=crop'}
            alt={activeRequest.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 text-xs font-extrabold uppercase bg-red-600 text-white rounded-full shadow-md flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>{activeRequest.urgency.toUpperCase()}</span>
            </span>
          </div>
        </div>

        {/* Request Details */}
        <div className="p-5 space-y-4">
          <div>
            <h1 className="text-xl font-extrabold text-[#192A1D] leading-snug">
              {activeRequest.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
              <MapPin className="w-3.5 h-3.5 text-[#2E7D32]" />
              <span>{activeRequest.location}</span>
              <span>•</span>
              <span>{activeRequest.createdAt}</span>
            </div>
          </div>

          {/* Needs Checklist */}
          <div className="bg-[#FEF2F2] p-3.5 rounded-2xl border border-red-100">
            <div className="text-[11px] font-bold text-red-800 uppercase tracking-wider mb-2">
              Urgent Assistance Required:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeRequest.needs.map((n, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-white text-red-700 font-bold text-xs rounded-xl border border-red-200 shadow-xs"
                >
                  ✓ {n}
                </span>
              ))}
            </div>
          </div>

          {/* Funding Bar if applicable */}
          {activeRequest.targetAmount && (
            <div className="bg-[#F8FAF8] p-3.5 rounded-2xl border border-[#E8EDE9]">
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-gray-700">Surgery / Medical Fund</span>
                <span className="text-[#2E7D32]">
                  ₹{activeRequest.raisedAmount?.toLocaleString()} of ₹{activeRequest.targetAmount.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#34A853] rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      ((activeRequest.raisedAmount || 0) / activeRequest.targetAmount) * 100
                    )}%`
                  }}
                />
              </div>
            </div>
          )}

          {/* Full description */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Situation Description
            </h3>
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
              {activeRequest.description}
            </p>
          </div>

          {/* Requester Profile */}
          <div className="p-3.5 bg-white border border-[#E8EDE9] rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={activeRequest.creatorAvatar}
                alt={activeRequest.creatorName}
                className="w-10 h-10 rounded-full object-cover border border-gray-200"
                referrerPolicy="no-referrer"
              />
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Reported by
                </span>
                <h4 className="text-sm font-bold text-gray-900">{activeRequest.creatorName}</h4>
              </div>
            </div>
            {activeRequest.creatorPhone && (
              <a
                href={`tel:${activeRequest.creatorPhone}`}
                className="p-2 bg-[#E8F5E9] text-[#2E7D32] rounded-full hover:bg-[#c8e6c9] transition-colors"
                title="Call reporter"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Responders Section matching reference */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Community Responders ({activeRequest.responders.length})
              </h3>
              <span className="text-[11px] text-[#2E7D32] font-semibold">
                {activeRequest.responders.length} people on the way / assisting
              </span>
            </div>

            <div className="space-y-2">
              {activeRequest.responders.length > 0 ? (
                activeRequest.responders.map((r, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#F8FAF8] rounded-2xl border border-[#E8EDE9] flex items-start gap-3 text-xs"
                  >
                    <img
                      src={r.userAvatar}
                      alt={r.userName}
                      className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between font-bold text-gray-900">
                        <span>{r.userName}</span>
                        <span className="text-[10px] text-gray-400 font-normal">{r.timestamp}</span>
                      </div>
                      <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-semibold bg-[#E8F5E9] text-[#1B5E20] rounded-md">
                        {r.status === 'on_the_way' && '🏃 On the way'}
                        {r.status === 'offered_transport' && '🚗 Can provide transport'}
                        {r.status === 'offered_foster' && '🏡 Offering foster space'}
                        {r.status === 'offered_vet' && '🩺 Offering veterinary triage'}
                      </span>
                      {r.note && <p className="text-gray-600 mt-1 leading-snug">{r.note}</p>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-gray-50 rounded-2xl text-center text-xs text-gray-500">
                  No one has responded yet. You can be the first to reach out!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Action Button to Respond */}
        <div className="sticky bottom-0 p-4 bg-white/95 backdrop-blur-md border-t border-[#E8EDE9] z-40 w-full">
          {isAlreadyResponding ? (
            <div className="w-full py-3 rounded-2xl bg-[#E8F5E9] text-[#1B5E20] text-center font-bold text-xs flex items-center justify-center gap-2 border border-[#C8E6C9]">
              <Check className="w-4 h-4" />
              <span>You have responded to this rescue request</span>
            </div>
          ) : (
            <button
              onClick={() => setResponseModalOpen(true)}
              className="w-full py-3.5 rounded-2xl bg-[#E53935] hover:bg-red-700 text-white font-bold text-sm shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <span>🚨 I Can Help This Animal</span>
            </button>
          )}
        </div>

        {/* Modal for Offering Help */}
        {responseModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-[#E8EDE9] animate-in fade-in zoom-in-95">
              <h3 className="text-base font-bold text-gray-900 mb-1">Offer Assistance</h3>
              <p className="text-xs text-gray-500 mb-4">
                How can you assist with {activeRequest.title}?
              </p>

              <form onSubmit={handleSendResponse} className="space-y-3">
                <div className="space-y-2">
                  <label
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                      responderStatus === 'on_the_way'
                        ? 'bg-[#E8F5E9] text-[#1B5E20] border-[#2E7D32]'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      checked={responderStatus === 'on_the_way'}
                      onChange={() => setResponderStatus('on_the_way')}
                    />
                    <span>🏃 I am on my way to location now</span>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                      responderStatus === 'offered_transport'
                        ? 'bg-[#E8F5E9] text-[#1B5E20] border-[#2E7D32]'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      checked={responderStatus === 'offered_transport'}
                      onChange={() => setResponderStatus('offered_transport')}
                    />
                    <span>🚗 I have a vehicle and can transport</span>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                      responderStatus === 'offered_foster'
                        ? 'bg-[#E8F5E9] text-[#1B5E20] border-[#2E7D32]'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      checked={responderStatus === 'offered_foster'}
                      onChange={() => setResponderStatus('offered_foster')}
                    />
                    <span>🏡 I can offer safe foster space</span>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                      responderStatus === 'offered_vet'
                        ? 'bg-[#E8F5E9] text-[#1B5E20] border-[#2E7D32]'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      checked={responderStatus === 'offered_vet'}
                      onChange={() => setResponderStatus('offered_vet')}
                    />
                    <span>🩺 Veterinary / Medical treatment</span>
                  </label>
                </div>

                <textarea
                  rows={2}
                  placeholder="Optional note (e.g. ETA 15 mins, bringing crate)"
                  value={responderNote}
                  onChange={e => setResponderNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2E7D32]"
                />

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setResponseModalOpen(false)}
                    className="flex-1 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#E53935] text-white text-xs font-bold rounded-xl hover:bg-red-700 shadow-sm"
                  >
                    Confirm Response
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Primary Help / Urgent Feed
  return (
    <div className="w-full max-w-5xl mx-auto bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs overflow-hidden pb-24 min-h-screen font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header */}
      <div className="sticky top-14 sm:top-16 z-20 bg-white/95 backdrop-blur-md px-4 sm:px-6 pt-4 pb-2 border-b border-slate-100">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#192A1D] tracking-tight">
              Emergency & Rescue Alerts
            </h1>
            <p className="text-xs text-slate-500">Live animal rescue requests needing immediate assistance</p>
          </div>
          
          <button
            onClick={() => setShowCreateHelp(true)}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Report Emergency</span>
          </button>
        </div>

        {/* Tabs: Urgent / My Requests */}
        <div className="flex gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('urgent')}
            className={`pb-2.5 transition-colors relative text-xs sm:text-sm ${
              activeTab === 'urgent' ? 'text-[#2E7D32] font-bold' : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            Urgent Rescues
            {activeTab === 'urgent' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2E7D32] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('my')}
            className={`pb-2.5 transition-colors relative text-xs sm:text-sm ${
              activeTab === 'my' ? 'text-[#2E7D32] font-bold' : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            My Requests
            {activeTab === 'my' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2E7D32] rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Requests Responsive Grid */}
      <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRequests.map(req => {
          const isUrgent = req.urgency === 'urgent';

          return (
            <div
              key={req.id}
              onClick={() => setActiveHelpId(req.id)}
              className="p-4 rounded-2xl border border-slate-100 bg-white hover:bg-slate-50/70 hover:border-red-200 transition-all shadow-2xs hover:shadow-xs cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex-1 min-w-0">
                    {/* Urgent tag pill */}
                    {isUrgent && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                          URGENT
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{req.category}</span>
                      </div>
                    )}

                    {/* Title */}
                    <h3 className="text-sm font-bold text-[#192A1D] leading-snug group-hover:text-red-700 transition-colors line-clamp-2">
                      {req.title}
                    </h3>

                    {/* Location */}
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <span className="truncate">{req.location}</span>
                    </p>
                  </div>

                  {/* Thumbnail photo */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-slate-200 group-hover:scale-105 transition-transform">
                    <img
                      src={(req.photos && req.photos[0]) || 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=600&auto=format&fit=crop'}
                      alt={req.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                {/* Specific needs */}
                {req.needs && req.needs.length > 0 && (
                  <p className="text-xs text-gray-700 font-medium mt-1 bg-red-50/60 p-2 rounded-xl border border-red-100/80">
                    <span className="text-red-700 font-bold">Needs:</span> {req.needs.join(', ')}
                  </p>
                )}

                {/* Deadline if foster */}
                {req.untilDeadline && (
                  <p className="text-xs text-amber-700 font-semibold mt-1">
                    ⏳ {req.untilDeadline}
                  </p>
                )}

                {/* Funding Progress if applicable */}
                {req.targetAmount && (
                  <p className="text-xs font-bold text-[#2E7D32] mt-1.5">
                    ₹{req.raisedAmount?.toLocaleString()} of ₹{req.targetAmount.toLocaleString()} raised
                  </p>
                )}
              </div>

              {/* Responders row & comments count */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs text-gray-500">
                {(req.responders || []).length > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {(req.responders || []).slice(0, 3).map((r, i) => (
                        <img
                          key={i}
                          src={r.userAvatar}
                          alt={r.userName}
                          className="inline-block h-5 w-5 rounded-full ring-2 ring-white object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ))}
                    </div>
                    <span className="font-semibold text-gray-700 text-[11px]">
                      {(req.responders || []).length} on the way
                    </span>
                  </div>
                ) : (
                  <span className="text-amber-600 font-medium text-[11px]">Awaiting responder</span>
                )}

                <div className="flex items-center gap-1 ml-auto">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{req.commentsCount}</span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredRequests.length === 0 && (
          <div className="col-span-full text-center py-16 px-6 bg-slate-50/50 rounded-2xl border border-slate-100">
            <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No active help requests</p>
            <p className="text-xs text-slate-400 mt-0.5">All community animals in this filter are safe or resolved.</p>
          </div>
        )}
      </div>

      {/* Mobile-only Floating Bottom Button: "+ Create Help Request" */}
      <div className="sm:hidden fixed bottom-18 left-0 right-0 px-4 max-w-md mx-auto pointer-events-none z-30">
        <button
          onClick={() => setShowCreateHelp(true)}
          id="create-help-request-button"
          className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-xl shadow-red-600/35 flex items-center justify-center gap-2 pointer-events-auto active:scale-98 transition-all"
        >
          <Plus className="w-5 h-5 stroke-[2.8]" />
          <span>Report Emergency Need</span>
        </button>
      </div>
    </div>
  );
};
