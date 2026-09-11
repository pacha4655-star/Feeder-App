import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  X,
  Navigation,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  Activity,
  Compass,
  ChevronRight,
  Loader2,
  Bell,
  BellOff,
  BellRing
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { authenticatedFetch } from '../services/apiClient';
import { useLiveGeolocation } from '../hooks/useLiveGeolocation';
import { calculateHaversineDistanceKm, formatDistance } from '../server/placesService';
import { RescueAssignmentStatus } from '../types';
import {
  isBrowserPushSupported,
  getBrowserNotificationPermission,
  registerFcmPushToken,
  setupForegroundFcmListener,
  setupServiceWorkerMessageListener
} from '../services/fcmClient';

interface RescueItem {
  id: string;
  firebase_uid: string;
  emergency_type: string;
  description: string | null;
  latitude: number;
  longitude: number;
  address: string;
  photo_url: string | null;
  created_at: string;
  status: RescueAssignmentStatus;
  assignedResponderUid: string | null;
  isMyAssignment: boolean;
}

interface ResponderDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: 'responder' | 'admin';
}

export const ResponderDashboardModal: React.FC<ResponderDashboardModalProps> = ({
  isOpen,
  onClose,
  userRole,
}) => {
  const { showToast } = useApp();
  const { coords, requestCurrentPosition } = useLiveGeolocation(true);

  const [activeTab, setActiveTab] = useState<'requests' | 'admin'>('requests');
  const [requests, setRequests] = useState<RescueItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Admin state
  const [responders, setResponders] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [notifStatus, setNotifStatus] = useState<any>(null);

  // Push notification state
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [pushStatusInfo, setPushStatusInfo] = useState<{
    isRegistered: boolean;
    lastRegistration?: string;
    serverStatus?: any;
    deviceType?: string;
  }>({ isRegistered: false });
  const [isRegisteringPush, setIsRegisteringPush] = useState(false);
  const [highlightedIncidentId, setHighlightedIncidentId] = useState<string | null>(null);

  const fetchPushStatus = async () => {
    setPushPermission(getBrowserNotificationPermission());
    try {
      const data = await authenticatedFetch('/api/notifications/status');
      const myDevices = data.registeredDevices || [];
      const activeDevice = myDevices.find((d: any) => d.is_active);
      setPushStatusInfo({
        isRegistered: Boolean(activeDevice),
        lastRegistration: activeDevice ? (activeDevice.last_seen_at || activeDevice.updated_at) : undefined,
        serverStatus: data.serverPushStatus,
        deviceType: activeDevice?.device_type || activeDevice?.platform || 'web',
      });
    } catch (e) {}
  };

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const data = await authenticatedFetch('/api/responder/requests');
      setRequests(data.requests || []);
    } catch (err: any) {
      console.warn('[Responder Dashboard] Error fetching requests:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdminData = async () => {
    if (userRole !== 'admin') return;
    try {
      const [resps, logs, notifs] = await Promise.all([
        authenticatedFetch('/api/admin/responders'),
        authenticatedFetch('/api/admin/audit-logs'),
        authenticatedFetch('/api/admin/notification-status'),
      ]);
      setResponders(resps.responders || []);
      setAuditLogs(logs.auditLogs || []);
      setNotifStatus(notifs);
    } catch (err: any) {
      console.warn('[Responder Dashboard] Admin data error:', err.message);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
      fetchPushStatus();
      if (userRole === 'admin') fetchAdminData();
      const interval = setInterval(fetchRequests, 8000);

      // Listen for foreground FCM messages
      const unsubFg = setupForegroundFcmListener((payload) => {
        const title = payload.notification?.title || payload.data?.title || '🚨 Emergency Rescue Alert';
        showToast(title, 'warning');
        fetchRequests();
      });

      // Listen for background service worker click events
      const unsubSw = setupServiceWorkerMessageListener((helpRequestId) => {
        setHighlightedIncidentId(helpRequestId);
        fetchRequests();
      });

      return () => {
        clearInterval(interval);
        unsubFg();
        unsubSw();
      };
    }
  }, [isOpen, userRole]);

  const [registrationProgress, setRegistrationProgress] = useState<string>('');

  const handleEnablePushNotifications = async () => {
    setIsRegisteringPush(true);
    setRegistrationProgress('Checking browser push support...');
    try {
      const res = await registerFcmPushToken((step) => {
        if (step === 'checking_support') setRegistrationProgress('Checking browser support...');
        else if (step === 'requesting_permission') setRegistrationProgress('Requesting notification permission...');
        else if (step === 'registering_service_worker') setRegistrationProgress('Registering service worker...');
        else if (step === 'generating_token') setRegistrationProgress('Generating FCM token from Firebase...');
        else if (step === 'registering_device') setRegistrationProgress('Registering device with backend...');
        else if (step === 'success') setRegistrationProgress('Push enabled!');
      });
      setPushPermission(res.permission);
      if (res.success) {
        showToast('Push notifications enabled for emergency alerts!', 'success');
        await fetchPushStatus();
      } else {
        showToast(res.error || 'Could not enable push notifications.', 'warning');
        await fetchPushStatus();
      }
    } catch (err: any) {
      showToast(err.message || 'Error registering push notifications.', 'error');
    } finally {
      setIsRegisteringPush(false);
      setRegistrationProgress('');
    }
  };

  const handleAccept = async (requestId: string) => {
    setActionInProgress(requestId);
    try {
      await authenticatedFetch(`/api/emergency/${requestId}/accept`, { method: 'POST' });
      showToast('Rescue request accepted. You are assigned to this rescue.', 'success');
      fetchRequests();
    } catch (err: any) {
      showToast(err.message || 'Could not accept request. Another responder may have claimed it.', 'error');
      fetchRequests();
    } finally {
      setActionInProgress(null);
    }
  };

  const handleArrived = async (requestId: string) => {
    setActionInProgress(requestId);
    try {
      await authenticatedFetch(`/api/emergency/${requestId}/arrived`, { method: 'POST' });
      showToast('Status updated to Arrived. User has been notified.', 'success');
      fetchRequests();
    } catch (err: any) {
      showToast(err.message || 'Could not update status to arrived.', 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleResolve = async (requestId: string) => {
    setActionInProgress(requestId);
    try {
      await authenticatedFetch(`/api/emergency/${requestId}/resolve`, { method: 'POST' });
      showToast('Rescue request marked resolved.', 'success');
      fetchRequests();
    } catch (err: any) {
      showToast(err.message || 'Could not resolve rescue request.', 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleToggleResponderStatus = async (targetUid: string, currentActive: boolean) => {
    try {
      await authenticatedFetch('/api/admin/responders/role', {
        method: 'POST',
        body: JSON.stringify({
          targetUid,
          role: 'responder',
          isActive: !currentActive,
        }),
      });
      showToast(`Responder status updated to ${!currentActive ? 'Active' : 'Inactive'}.`, 'success');
      fetchAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update responder status.', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150 font-sans">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] text-slate-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 backdrop-blur-md flex items-center justify-center text-xl flex-shrink-0">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight">RESCUE RESPONDER CONSOLE</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                  {userRole}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Real-time incident dispatch & field navigation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRequests}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-300 transition-colors"
              title="Refresh Incidents"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Nav for Admins */}
        {userRole === 'admin' && (
          <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab('requests')}
              className={`pb-2.5 transition-all border-b-2 ${
                activeTab === 'requests'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              🚨 Active Incidents ({requests.length})
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`pb-2.5 transition-all border-b-2 ${
                activeTab === 'admin'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              ⚙️ Admin & Responder Roster
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'requests' ? (
            <>
              {/* Push Notification Device & Provider Status Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl shrink-0 ${
                      pushStatusInfo.isRegistered
                        ? 'bg-emerald-100 text-emerald-700'
                        : pushPermission === 'denied'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {pushStatusInfo.isRegistered ? (
                        <BellRing className="w-4 h-4" />
                      ) : pushPermission === 'denied' ? (
                        <BellOff className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">Push Notifications:</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          pushStatusInfo.isRegistered
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : pushPermission === 'denied'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {pushStatusInfo.isRegistered ? 'Enabled' : pushPermission === 'denied' ? 'Permission Denied' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Device: Web Browser (Chrome/Edge/Firefox) {pushStatusInfo.lastRegistration ? `• Last active: ${new Date(pushStatusInfo.lastRegistration).toLocaleTimeString()}` : ''}
                      </p>
                    </div>
                  </div>

                  {!pushStatusInfo.isRegistered && (
                    <button
                      onClick={handleEnablePushNotifications}
                      disabled={isRegisteringPush || pushPermission === 'denied'}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                    >
                      {isRegisteringPush ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{registrationProgress || 'Enabling...'}</span>
                        </>
                      ) : (
                        <>
                          <Bell className="w-3.5 h-3.5" />
                          <span>Enable Push Notifications</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {pushPermission === 'denied' && (
                  <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 leading-relaxed">
                    <strong>Notification permission is blocked.</strong> To re-enable: click the padlock or site settings icon in your Chrome address bar, change Notifications to <strong>&quot;Allow&quot;</strong>, and reload this page.
                  </div>
                )}

                {pushStatusInfo.serverStatus?.status === 'BLOCKED / CONFIGURATION REQUIRED' && (
                  <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Push notifications are not configured on the server.</span>
                      <p className="text-[10px] text-amber-700 mt-0.5">
                        Requires VAPID key (VITE_FIREBASE_VAPID_KEY) and Firebase Admin credentials ({pushStatusInfo.serverStatus?.missingCredentials?.join(', ') || 'FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'}).
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {requests.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700">No Active Emergency Incidents</h4>
                  <p className="text-xs text-slate-500">All pet rescue requests have been resolved or none are reported.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {requests.map(req => {
                    const distKm = coords
                      ? calculateHaversineDistanceKm(coords.lat, coords.lng, req.latitude, req.longitude)
                      : null;
                    const distText = distKm !== null ? formatDistance(distKm) : null;
                    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${req.latitude},${req.longitude}`;
                    const isBusy = actionInProgress === req.id;

                    return (
                      <div
                        key={req.id}
                        className={`rounded-2xl p-4 border transition-all ${
                          req.isMyAssignment
                            ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                            : req.status === 'RESOLVED'
                            ? 'bg-slate-50 border-slate-200 opacity-60'
                            : 'bg-white border-slate-200 shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                              {req.emergency_type}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                req.status === 'ACCEPTED'
                                  ? 'bg-blue-100 text-blue-700'
                                  : req.status === 'ARRIVED'
                                  ? 'bg-green-100 text-green-700'
                                  : req.status === 'RESOLVED'
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              Status: {req.status}
                            </span>
                          </div>

                          {distText && (
                            <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                              <Compass className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{distText} away</span>
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5 my-2.5">
                          <div className="flex items-start gap-1.5 text-xs font-semibold text-slate-800">
                            <MapPin className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <span>{req.address}</span>
                          </div>
                          {req.description && (
                            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              {req.description}
                            </p>
                          )}
                          {req.photo_url && (
                            <div className="mt-2 rounded-xl overflow-hidden aspect-video max-w-xs border border-slate-200">
                              <img src={req.photo_url} alt="Incident" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-3 border-t border-slate-100 flex-wrap">
                          {/* Navigation deep link to exact coordinates */}
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2 px-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Navigate to GPS ↗</span>
                          </a>

                          {/* Accept Button if open */}
                          {(req.status === 'PENDING' || req.status === 'NOTIFIED') && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleAccept(req.id)}
                              className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                            >
                              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                              <span>Accept Incident</span>
                            </button>
                          )}

                          {/* Mark Arrived if accepted by me */}
                          {req.status === 'ACCEPTED' && req.isMyAssignment && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleArrived(req.id)}
                              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                            >
                              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                              <span>Mark Arrived</span>
                            </button>
                          )}

                          {/* Mark Resolved if arrived and by me */}
                          {req.status === 'ARRIVED' && req.isMyAssignment && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleResolve(req.id)}
                              className="py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                            >
                              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              <span>Mark Resolved</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Admin Tab Content */
            <div className="space-y-5">
              {/* Push Provider Status */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <h4 className="text-xs font-extrabold uppercase text-slate-700 mb-1">
                  📡 Push Notification Service Status
                </h4>
                {notifStatus?.configured ? (
                  <p className="text-xs text-green-700 font-bold">
                    ✓ Configured via {notifStatus.provider.toUpperCase()}
                  </p>
                ) : (
                  <div className="text-xs text-amber-800 space-y-1">
                    <p className="font-semibold">⚠️ External FCM/WebPush credentials not configured in server .env.</p>
                    <p className="text-[11px] text-slate-500">
                      In-app notifications are actively recorded in Supabase. For background OS push alerts, configure: {notifStatus?.missingCredentials?.join(', ')}.
                    </p>
                  </div>
                )}
              </div>

              {/* Responder Roster */}
              <div>
                <h4 className="text-xs font-extrabold uppercase text-slate-700 mb-2.5">
                  👥 Registered Responders ({responders.length})
                </h4>
                <div className="space-y-2">
                  {responders.map((r: any) => (
                    <div
                      key={r.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-extrabold text-slate-900 flex items-center gap-2">
                          <span>{r.name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-black bg-slate-100 text-slate-600">
                            {r.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {r.email} • UID: {r.firebase_uid.substring(0, 10)}...
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleResponderStatus(r.firebase_uid, r.is_active)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          r.is_active
                            ? 'bg-green-100 hover:bg-red-100 text-green-800 hover:text-red-800'
                            : 'bg-red-100 hover:bg-green-100 text-red-800 hover:text-green-800'
                        }`}
                      >
                        {r.is_active ? 'Active (Deactivate)' : 'Inactive (Activate)'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audit Logs */}
              <div>
                <h4 className="text-xs font-extrabold uppercase text-slate-700 mb-2">
                  📜 Rescue Audit Trail ({auditLogs.length} events)
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {auditLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px] flex items-center justify-between"
                    >
                      <span className="font-bold text-slate-800">{log.event_type}</span>
                      <span className="text-slate-500 truncate max-w-xs">{log.details || 'No details'}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
