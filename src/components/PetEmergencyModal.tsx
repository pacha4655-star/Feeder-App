import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Phone,
  Navigation,
  Share2,
  X,
  Camera,
  MapPin,
  Clock,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Compass,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLiveGeolocation } from '../hooks/useLiveGeolocation';
import { LiveOpenStreetMap, MapMarkerItem } from './LiveOpenStreetMap';
import { RealPetPlace } from '../server/placesService';
import { uploadMediaFile } from '../services/storageService';
import { authenticatedFetch } from '../services/apiClient';
import { api } from '../services/api';
import { ResponderDashboardModal } from './ResponderDashboardModal';

interface PetEmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PetEmergencyModal: React.FC<PetEmergencyModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, showToast } = useApp();
  const {
    coords,
    accuracy,
    address,
    status: gpsStatus,
    errorMessage: gpsError,
    lastUpdated,
    requestCurrentPosition,
    startLiveTracking,
    stopLiveTracking,
  } = useLiveGeolocation(false);

  const [activeTab, setActiveTab] = useState<'hub' | 'rescue_form' | 'tracking'>('hub');
  const [nearestVet, setNearestVet] = useState<RealPetPlace | null>(null);
  const [isLoadingVet, setIsLoadingVet] = useState(false);

  // Rescue form state
  const [emergencyType, setEmergencyType] = useState<'Pet Accident' | 'Pet Injured' | 'Animal in Danger'>('Pet Accident');
  const [description, setDescription] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Live status tracking state
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<string>('PENDING');
  const [assignedResponder, setAssignedResponder] = useState<{ name: string; phone?: string | null } | null>(null);
  const [userRole, setUserRole] = useState<'user' | 'responder' | 'admin'>('user');
  const [showResponderModal, setShowResponderModal] = useState(false);

  // Start live GPS and check role immediately when modal opens
  useEffect(() => {
    if (isOpen) {
      startLiveTracking();
      setSubmittedSuccess(false);
      if (!submittedRequestId) setActiveTab('hub');

      // Fetch user role
      authenticatedFetch('/api/users/me/role')
        .then(res => {
          if (res && res.role) setUserRole(res.role);
        })
        .catch(() => {});
    } else {
      stopLiveTracking();
    }
  }, [isOpen, startLiveTracking, stopLiveTracking, submittedRequestId]);

  // Real-time status polling for submitted rescue request
  useEffect(() => {
    if (!isOpen || !submittedRequestId) return;

    let isMounted = true;
    const checkStatus = async () => {
      try {
        const data = await authenticatedFetch(`/api/emergency/status/${submittedRequestId}`);
        if (data && isMounted) {
          setLiveStatus(data.status || 'PENDING');
          if (data.assignment && data.assignment.responder) {
            setAssignedResponder(data.assignment.responder);
          }
        }
      } catch (err: any) {
        console.warn('[Emergency Modal] Status poll error:', err.message);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, submittedRequestId]);

  // Fetch nearest real veterinary hospital when user GPS coordinates are obtained
  useEffect(() => {
    if (!coords) return;

    let isMounted = true;
    const fetchNearest = async () => {
      setIsLoadingVet(true);
      try {
        const data = await api.getNearbyPlaces({
          lat: coords.lat,
          lng: coords.lng,
          radiusKm: 25,
          category: 'hospital',
        });
        if (isMounted) {
          const places: RealPetPlace[] = data.places || [];
          if (places.length > 0) {
            setNearestVet(places[0]);
          } else {
            // If no hospital in 25km, search clinics
            const fallbackData = await api.getNearbyPlaces({
              lat: coords.lat,
              lng: coords.lng,
              radiusKm: 35,
              category: 'clinic',
            });
            if (isMounted) {
              const fallbackPlaces: RealPetPlace[] = fallbackData.places || [];
              if (fallbackPlaces.length > 0) {
                setNearestVet(fallbackPlaces[0]);
              }
            }
          }
        }
      } catch (err) {
        console.warn('[Emergency Modal] Error finding nearest vet:', err);
      } finally {
        if (isMounted) setIsLoadingVet(false);
      }
    };

    fetchNearest();
    return () => {
      isMounted = false;
    };
  }, [coords]);

  if (!isOpen) return null;

  // Map markers: user/accident location + nearest hospital
  const mapMarkers: MapMarkerItem[] = [];
  if (coords) {
    mapMarkers.push({
      id: 'accident_location',
      lat: coords.lat,
      lng: coords.lng,
      title: '🚨 Accident / Emergency Location',
      type: 'accident',
      address: address || `GPS: ${coords.lat.toFixed(5)}°, ${coords.lng.toFixed(5)}°`,
      distanceFormatted: 'Current Location',
    });
  }
  if (nearestVet) {
    mapMarkers.push({
      id: nearestVet.id,
      lat: nearestVet.lat,
      lng: nearestVet.lng,
      title: nearestVet.name,
      type: 'hospital',
      address: nearestVet.address,
      phone: nearestVet.phone,
      distanceFormatted: nearestVet.distanceFormatted,
      directionUrl: nearestVet.directionUrl,
      openHours: nearestVet.openHours,
    });
  }

  const handleShareLocation = async () => {
    if (!coords) {
      showToast('GPS coordinates not ready. Please enable location permissions.', 'error');
      return;
    }

    const shareTitle = '🚨 PET EMERGENCY - Accident Location';
    const shareText = `Emergency assistance needed for a pet! Location: ${address || 'Near coordinates'}, GPS: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
    const mapUrl = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: mapUrl,
        });
        showToast('Accident location shared successfully.', 'success');
      } catch (e) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(`${shareText}\nMap: ${mapUrl}`);
        showToast('Accident location link copied to clipboard.', 'info');
      }
    } else {
      await navigator.clipboard.writeText(`${shareText}\nMap: ${mapUrl}`);
      showToast('Accident location copied to clipboard.', 'info');
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmitRescue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords) {
      showToast('Live GPS coordinates are required to submit an emergency request.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let photoUrl: string | null = null;
      if (selectedPhoto) {
        photoUrl = await uploadMediaFile(selectedPhoto, 'help_requests');
      }

      const res = await authenticatedFetch('/api/emergency/report', {
        method: 'POST',
        body: JSON.stringify({
          emergencyType,
          description: description.trim(),
          lat: coords.lat,
          lng: coords.lng,
          accuracy: accuracy || null,
          address: address || `GPS: ${coords.lat.toFixed(5)}°, ${coords.lng.toFixed(5)}°`,
          photoUrl,
        }),
      });

      const reqId = res.reportId || res.report?.id;
      if (reqId) {
        setSubmittedRequestId(reqId);
        setActiveTab('tracking');
      }
      setSubmittedSuccess(true);
      showToast(res.message || 'Rescue request submitted successfully.', 'success');
    } catch (err: any) {
      console.error('[Emergency Modal] Rescue submission error:', err);
      showToast(err.message || 'Unable to submit the rescue request. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-red-950/80 backdrop-blur-md animate-in fade-in duration-150 font-sans">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-red-200 flex flex-col max-h-[94vh] text-slate-800">
        {/* Urgent Header */}
        <div className="bg-gradient-to-r from-red-700 via-red-600 to-amber-600 p-4 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl flex-shrink-0 animate-pulse">
              🚨
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">PET EMERGENCY HUB</h2>
              <p className="text-[11px] text-red-100 font-medium">Real-time GPS accident response & vet locator</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Live GPS Status Card */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {address || (coords ? `Coordinates: ${coords.lat.toFixed(5)}°, ${coords.lng.toFixed(5)}°` : 'Acquiring device GPS...')}
                  </h4>
                  {coords ? (
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-medium">
                      <span>Lat: {coords.lat.toFixed(5)}°</span>
                      <span>•</span>
                      <span>Lng: {coords.lng.toFixed(5)}°</span>
                      <span>•</span>
                      <span className={accuracy && accuracy > 80 ? 'text-amber-600 font-bold' : 'text-green-700 font-bold'}>
                        Accuracy: ~{Math.round(accuracy || 0)}m
                      </span>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {gpsStatus === 'locating' ? 'Accessing high-accuracy GPS satellite signal...' : gpsError || 'Please allow GPS location permission.'}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => requestCurrentPosition()}
                className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 flex-shrink-0"
                title="Refresh GPS"
              >
                <Compass className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Accuracy warning if poor */}
            {accuracy && accuracy > 100 && (
              <div className="mt-2 p-2 bg-amber-50 rounded-xl text-[10px] text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span>GPS accuracy is low (~{Math.round(accuracy)}m). Move outdoors for precise positioning.</span>
              </div>
            )}
          </div>

          {/* Interactive Live Map */}
          {coords && (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200">
              <LiveOpenStreetMap
                userCoords={coords}
                accuracyMeters={accuracy}
                markers={mapMarkers}
                heightClass="h-[180px]"
              />
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white z-10">
                🔴 Live Accident Marker
              </div>
            </div>
          )}

          {/* Header Action / Responder Console Button */}
          {(userRole === 'responder' || userRole === 'admin') && (
            <div className="flex items-center justify-between p-2.5 bg-indigo-50 border border-indigo-200 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-900">🛡️ Authorized Responder Active ({userRole.toUpperCase()})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowResponderModal(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                Open Console ↗
              </button>
            </div>
          )}

          {/* Tab Selection */}
          <div className={`grid ${submittedRequestId ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5 p-1 bg-slate-100 rounded-2xl`}>
            <button
              type="button"
              onClick={() => setActiveTab('hub')}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'hub'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚡ Immediate Help
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rescue_form')}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'rescue_form'
                  ? 'bg-white text-red-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🆘 Request Rescue
            </button>
            {submittedRequestId && (
              <button
                type="button"
                onClick={() => setActiveTab('tracking')}
                className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
                  activeTab === 'tracking'
                    ? 'bg-white text-green-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>Live Status</span>
              </button>
            )}
          </div>

          {/* Tab 1: Immediate Actions */}
          {activeTab === 'hub' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {/* Closest Veterinary Hospital Card */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                    Closest Emergency Care
                  </span>
                  {nearestVet && (
                    <span className="text-xs font-bold text-blue-900">
                      📍 {nearestVet.distanceFormatted} away
                    </span>
                  )}
                </div>

                {isLoadingVet ? (
                  <div className="flex items-center justify-center py-4 text-xs text-blue-700 font-bold gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Searching nearest verified emergency veterinary clinic...</span>
                  </div>
                ) : nearestVet ? (
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                      {nearestVet.name}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {nearestVet.address}
                    </p>

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-blue-200/60">
                      {nearestVet.phone ? (
                        <a
                          href={`tel:${nearestVet.phone}`}
                          className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call Clinic</span>
                        </a>
                      ) : (
                        <div className="py-2 px-2 bg-slate-200 text-slate-600 rounded-xl text-[10px] font-bold text-center">
                          No phone in directory
                        </div>
                      )}

                      <a
                        href={nearestVet.directionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Directions ↗</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-blue-800 py-2">
                    No registered veterinary hospital within current radius. Use emergency rescue broadcast below.
                  </p>
                )}
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleShareLocation}
                  className="p-3 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 transition-all"
                >
                  <Share2 className="w-5 h-5 text-amber-400" />
                  <span>Share Accident Location</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('rescue_form')}
                  className="p-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-md shadow-red-600/20 active:scale-95 transition-all"
                >
                  <ShieldAlert className="w-5 h-5" />
                  <span>Request Rescue</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Request Rescue Form */}
          {activeTab === 'rescue_form' && (
            <form onSubmit={handleSubmitRescue} className="space-y-3.5 animate-in fade-in duration-150">
              {submittedSuccess ? (
                <div className="p-5 bg-green-50 border border-green-200 rounded-2xl text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
                  <h3 className="text-sm font-bold text-green-900">Rescue Request Submitted Successfully</h3>
                  <p className="text-xs text-green-700 leading-relaxed">
                    Your accident report with verified GPS coordinates has been registered in the database.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('hub')}
                    className="mt-3 px-4 py-2 bg-green-700 text-white text-xs font-bold rounded-xl"
                  >
                    View Emergency Hub
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Type</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['Pet Accident', 'Pet Injured', 'Animal in Danger'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setEmergencyType(type)}
                          className={`py-2 px-1 text-[11px] font-bold rounded-xl border text-center transition-all ${
                            emergencyType === type
                              ? 'bg-red-50 border-red-600 text-red-700 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Incident Description & Injuries</label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Describe the animal's condition, visible bleeding or trauma, and exact landmarks near the accident..."
                      required
                      className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-600 resize-none text-slate-800"
                    />
                  </div>

                  {/* Photo upload */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Attach Photo of Incident (Optional)</label>
                    {photoPreview ? (
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200">
                        <img src={photoPreview} alt="Accident" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => { setSelectedPhoto(null); setPhotoPreview(null); }}
                          className="absolute top-2 right-2 p-1 bg-black/70 text-white rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="border border-dashed border-slate-300 hover:border-red-600 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer bg-slate-50 text-xs font-bold text-slate-600">
                        <Camera className="w-4 h-4 text-red-600" />
                        <span>Add Photo</span>
                        <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                      </label>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !coords}
                    className="w-full py-3 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white font-bold text-xs rounded-xl shadow-md shadow-red-700/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting Rescue Request...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Rescue Request</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          )}

          {/* Tab 3: Real-Time Live Status Tracking */}
          {activeTab === 'tracking' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200">
                    Live Status: {liveStatus}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    ID: {submittedRequestId?.substring(0, 8)}...
                  </span>
                </div>

                {/* Progress Steps */}
                <div className="space-y-3">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">✓</div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Rescue Request Registered</h4>
                      <p className="text-[11px] text-slate-500">Accident coordinates persisted in database.</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      ['NOTIFIED', 'ACCEPTED', 'ARRIVED', 'RESOLVED'].includes(liveStatus)
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {['NOTIFIED', 'ACCEPTED', 'ARRIVED', 'RESOLVED'].includes(liveStatus) ? '✓' : '2'}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Responders Notified</h4>
                      <p className="text-[11px] text-slate-500">
                        {['NOTIFIED', 'ACCEPTED', 'ARRIVED', 'RESOLVED'].includes(liveStatus)
                          ? 'Active responders have received the emergency alert.'
                          : 'Querying registered responders...'}
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      ['ACCEPTED', 'ARRIVED', 'RESOLVED'].includes(liveStatus)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {['ACCEPTED', 'ARRIVED', 'RESOLVED'].includes(liveStatus) ? '✓' : '3'}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Responder Claimed & En Route</h4>
                      <p className="text-[11px] text-slate-500">
                        {['ACCEPTED', 'ARRIVED', 'RESOLVED'].includes(liveStatus)
                          ? `Accepted by ${assignedResponder?.name || 'verified responder'}.`
                          : 'Awaiting responder claim.'}
                      </p>
                      {assignedResponder?.phone && (
                        <a
                          href={`tel:${assignedResponder.phone}`}
                          className="mt-1.5 inline-flex items-center gap-1.5 py-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call Responder ({assignedResponder.name})</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      ['ARRIVED', 'RESOLVED'].includes(liveStatus)
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {['ARRIVED', 'RESOLVED'].includes(liveStatus) ? '✓' : '4'}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Responder Arrived</h4>
                      <p className="text-[11px] text-slate-500">
                        {['ARRIVED', 'RESOLVED'].includes(liveStatus)
                          ? 'Responder is on-scene providing care.'
                          : 'Pending responder arrival.'}
                      </p>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      liveStatus === 'RESOLVED'
                        ? 'bg-green-700 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {liveStatus === 'RESOLVED' ? '✓' : '5'}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Rescue Resolved</h4>
                      <p className="text-[11px] text-slate-500">
                        {liveStatus === 'RESOLVED'
                          ? 'Animal rescue operation successfully concluded.'
                          : 'Ongoing emergency response.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
          <span>Always seek certified veterinary emergency care immediately.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-white hover:bg-slate-100 rounded-lg font-bold border border-slate-200 text-slate-700"
          >
            Close
          </button>
        </div>
      </div>

      {/* Responder Dashboard Modal */}
      {(userRole === 'responder' || userRole === 'admin') && (
        <ResponderDashboardModal
          isOpen={showResponderModal}
          onClose={() => setShowResponderModal(false)}
          userRole={userRole}
        />
      )}
    </div>
  );
};
