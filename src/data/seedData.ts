import { Animal, Community, HelpRequest, Post, User, AdoptionListing, FosterRequest, FeedingPoint, NotificationItem, NearbyMarker } from '../types';

// Clean empty seed collections for production application (All real data lives in Cloud Firestore)
export const INITIAL_CURRENT_USER: User | null = null;
export const DEMO_USERS: User[] = [];
export const INITIAL_COMMUNITIES: Community[] = [];
export const INITIAL_ANIMALS: Animal[] = [];
export const INITIAL_POSTS: Post[] = [];
export const INITIAL_HELP_REQUESTS: HelpRequest[] = [];
export const INITIAL_NEARBY_MARKERS: NearbyMarker[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
export const INITIAL_ADOPTIONS: AdoptionListing[] = [];
export const INITIAL_FOSTERS: FosterRequest[] = [];
export const INITIAL_FEEDING_POINTS: FeedingPoint[] = [];
