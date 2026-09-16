import type {
  CommunityType,
  AnimalStatus,
  SocialPostRecordType,
  PlatformDataType,
  SocialPostVisibility,
} from '@/types/database';

export const ALLOWED_COMMUNITY_TYPES: readonly CommunityType[] = [
  'general',
  'country',
  'region',
  'city',
  'species',
  'topic',
  'organization',
] as const;

export const ALLOWED_ANIMAL_STATUSES: readonly AnimalStatus[] = [
  'active',
  'missing',
  'rescued',
  'adopted',
  'reunited',
  'deceased',
  'inactive',
] as const;

export const ALLOWED_SOCIAL_POST_RECORD_TYPES: readonly SocialPostRecordType[] = [
  'post',
  'story',
  'comment',
  'reaction',
  'bookmark',
  'share',
] as const;

export const ALLOWED_PLATFORM_DATA_TYPES: readonly PlatformDataType[] = [
  'follow',
  'block',
  'notification',
  'message',
  'conversation',
  'report',
  'moderation',
  'ai_conversation',
  'ai_message',
  'search',
  'audit',
  'device',
  'system',
] as const;

export const ALLOWED_VISIBILITY: readonly SocialPostVisibility[] = [
  'public',
  'community',
  'private',
] as const;

export function isValidCommunityType(type: any): type is CommunityType {
  return typeof type === 'string' && ALLOWED_COMMUNITY_TYPES.includes(type as CommunityType);
}

export function isValidAnimalStatus(status: any): status is AnimalStatus {
  return typeof status === 'string' && ALLOWED_ANIMAL_STATUSES.includes(status as AnimalStatus);
}

export function isValidSocialPostRecordType(recordType: any): recordType is SocialPostRecordType {
  return (
    typeof recordType === 'string' &&
    ALLOWED_SOCIAL_POST_RECORD_TYPES.includes(recordType as SocialPostRecordType)
  );
}

export function isValidPlatformDataType(dataType: any): dataType is PlatformDataType {
  return (
    typeof dataType === 'string' &&
    ALLOWED_PLATFORM_DATA_TYPES.includes(dataType as PlatformDataType)
  );
}

export function isValidVisibility(visibility: any): visibility is SocialPostVisibility {
  return (
    typeof visibility === 'string' &&
    ALLOWED_VISIBILITY.includes(visibility as SocialPostVisibility)
  );
}

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validates and sanitizes a post creation payload.
 */
export function validatePostPayload(payload: any): ValidationResult<{
  title?: string;
  body: string;
  contentType: string;
  visibility: SocialPostVisibility;
  communityId?: string;
  mediaUrls: string[];
  tags: string[];
  locationName?: string;
  approxLat?: number;
  approxLon?: number;
}> {
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Request body must be a JSON object' };
  }

  const rawBody = typeof payload.body === 'string' ? payload.body.trim() : '';
  if (!rawBody || rawBody.length === 0) {
    return { success: false, error: 'Post content cannot be empty' };
  }
  if (rawBody.length > 10000) {
    return { success: false, error: 'Post content exceeds maximum length of 10,000 characters' };
  }

  const title =
    typeof payload.title === 'string' && payload.title.trim().length > 0
      ? payload.title.trim().slice(0, 200)
      : undefined;

  const rawVisibility = (payload.visibility || 'public').toLowerCase();
  const visibility: SocialPostVisibility = isValidVisibility(rawVisibility)
    ? (rawVisibility as SocialPostVisibility)
    : 'public';

  const mediaUrls: string[] = Array.isArray(payload.mediaUrls)
    ? (payload.mediaUrls as unknown[])
        .filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u.trim()))
        .slice(0, 10)
    : [];

  const tags: string[] = Array.isArray(payload.tags)
    ? (payload.tags as unknown[])
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .map((t: string) => t.trim().replace(/^#/, '').toLowerCase().slice(0, 30))
        .slice(0, 20)
    : [];

  const locationName =
    typeof payload.locationName === 'string' && payload.locationName.trim().length > 0
      ? payload.locationName.trim().slice(0, 150)
      : undefined;

  const approxLat =
    typeof payload.approxLat === 'number' && !isNaN(payload.approxLat)
      ? payload.approxLat
      : undefined;
  const approxLon =
    typeof payload.approxLon === 'number' && !isNaN(payload.approxLon)
      ? payload.approxLon
      : undefined;

  return {
    success: true,
    data: {
      title,
      body: rawBody,
      contentType: typeof payload.contentType === 'string' ? payload.contentType : 'NORMAL',
      visibility,
      communityId: typeof payload.communityId === 'string' ? payload.communityId : undefined,
      mediaUrls,
      tags,
      locationName,
      approxLat,
      approxLon,
    },
  };
}

/**
 * Validates and sanitizes a comment payload.
 */
export function validateCommentPayload(payload: any): ValidationResult<{
  body: string;
  parentId?: string | null;
}> {
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Invalid payload' };
  }
  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  if (!body) {
    return { success: false, error: 'Comment text is required' };
  }
  if (body.length > 2000) {
    return { success: false, error: 'Comment exceeds maximum length of 2,000 characters' };
  }

  return {
    success: true,
    data: {
      body,
      parentId: typeof payload.parentId === 'string' ? payload.parentId : null,
    },
  };
}

/**
 * Validates SOS creation payload.
 */
export function validateSosPayload(payload: any): ValidationResult<{
  animalType: string;
  emergencyType: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  approxLocationName: string;
  approxLat?: number;
  approxLon?: number;
  mediaUrls: string[];
  contactPreference: string;
}> {
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Invalid payload' };
  }

  const animalType = typeof payload.animalType === 'string' ? payload.animalType.trim().slice(0, 80) : '';
  const title = typeof payload.title === 'string' ? payload.title.trim().slice(0, 200) : '';
  const description = typeof payload.description === 'string' ? payload.description.trim().slice(0, 5000) : '';
  const approxLocationName =
    typeof payload.approxLocationName === 'string'
      ? payload.approxLocationName.trim().slice(0, 150)
      : 'Location unspecified';

  if (!animalType) return { success: false, error: 'Animal type is required' };
  if (!title) return { success: false, error: 'SOS title is required' };
  if (!description) return { success: false, error: 'SOS description is required' };

  const validUrgencies = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
  const urgency = validUrgencies.includes(payload.urgency) ? payload.urgency : 'MEDIUM';

  const mediaUrls = Array.isArray(payload.mediaUrls)
    ? (payload.mediaUrls as unknown[])
        .filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u))
        .slice(0, 5)
    : [];

  return {
    success: true,
    data: {
      animalType,
      emergencyType: typeof payload.emergencyType === 'string' ? payload.emergencyType : 'OTHER',
      urgency,
      title,
      description,
      approxLocationName,
      approxLat: typeof payload.approxLat === 'number' ? payload.approxLat : undefined,
      approxLon: typeof payload.approxLon === 'number' ? payload.approxLon : undefined,
      mediaUrls,
      contactPreference: typeof payload.contactPreference === 'string' ? payload.contactPreference : 'IN_APP',
    },
  };
}
