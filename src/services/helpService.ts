import { HelpRequest } from '../types';
import { authenticatedFetch } from './apiClient';
import { getFirebaseIdToken } from './firebaseAuth';

export const fetchHelpRequestsFromSupabase = async (): Promise<HelpRequest[]> => {
  try {
    const token = await getFirebaseIdToken();
    if (!token) {
      return [];
    }
    const data = await authenticatedFetch('/api/emergency/reports');
    return data.reports || [];
  } catch (err: any) {
    if (err.message?.includes('Authentication required')) {
      return [];
    }
    console.warn('[HelpService] Failed to fetch emergency reports:', err.message || err);
    return [];
  }
};

export const subscribeToHelpRequests = (
  onUpdate: (requests: HelpRequest[]) => void,
  _onError?: (err: Error) => void
) => {
  fetchHelpRequestsFromSupabase().then(onUpdate);
  return () => {};
};

export const createHelpRequestInSupabase = async (reqData: any): Promise<string> => {
  const payload = {
    emergencyType: reqData.emergencyType || reqData.category || reqData.title || 'Pet in Danger',
    description: reqData.description || '',
    lat: reqData.lat ?? reqData.latitude ?? reqData.coordinates?.lat ?? 0,
    lng: reqData.lng ?? reqData.longitude ?? reqData.coordinates?.lng ?? 0,
    address: reqData.address || reqData.location || '',
    photoUrl: reqData.photoUrl || reqData.image || null,
  };
  const res = await authenticatedFetch('/api/emergency/report', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.reportId || res.report?.id;
};

export const respondToHelpRequestInSupabase = async (
  _requestId: string,
  _responderData: any,
  _optionalNote?: string
): Promise<void> => {
  // Not implemented until responder table exists
  throw new Error('Responder updates are currently unavailable.');
};
