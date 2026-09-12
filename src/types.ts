export type UserRole = 
  | 'Animal Lover' 
  | 'Pet Owner' 
  | 'Feeder' 
  | 'Rescuer' 
  | 'Volunteer' 
  | 'Foster' 
  | 'Adopter' 
  | 'Vet' 
  | 'Organization'
  | 'Community Lead';

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  avatar: string;
  coverPhoto?: string;
  bio: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  roles: UserRole[];
  interests: string[];
  postsCount: number;
  followingCount: number;
  followersCount: number;
  followerIds?: string[];
  followingIds?: string[];
  joinedDate: string;
  isVerified?: boolean;
  // Companion animal / dog profile
  petName?: string;
  petSpecies?: 'Dog' | 'Cat' | 'Bird' | 'Other';
  petBreed?: string;
  petPhoto?: string;
  petAge?: string;
  // Contributions & Karma stats
  karmaPoints?: number;
  mealsFedCount?: number;
  rescuesSupportedCount?: number;
  registeredAnimalsCount?: number;
}

export interface VeterinaryHospital {
  id: string;
  name: string;
  address: string;
  distanceKm: number;
  lat: number;
  lng: number;
  phone: string;
  isEmergency: boolean;
  openHours: string;
  emergencyServices?: string[];
  type: 'emergency_hospital' | 'clinic' | 'government_polyclinic';
}

export interface Animal {
  id: string;
  name: string;
  species: 'Dog' | 'Cat' | 'Bird' | 'Cow' | 'Other';
  breed: string;
  gender?: 'Male' | 'Female' | 'Unknown';
  age: string;
  color: string;
  size: 'Small' | 'Medium' | 'Large';
  location: string;
  coordinates?: { lat: number; lng: number };
  avatar: string;
  coverImage?: string;
  photos: string[];
  about: string;
  joinedDate: string;
  vaccinated: boolean;
  neutered: boolean;
  microchipped?: boolean;
  healthInfo?: string;
  ownerId?: string;
  ownerName?: string;
  ownerAvatar?: string;
  communityId?: string;
  communityName?: string;
  followersCount: number;
  isFollowing?: boolean;
  status: 'Healthy' | 'Needs Care' | 'Looking for Foster' | 'Up for Adoption' | 'Adopted';
  feedingHistory?: { date: string; feederName: string; notes: string }[];
  medicalUpdates?: { date: string; title: string; notes: string; type?: 'feeding' | 'medical' }[];
}

export interface Community {
  id: string;
  name: string;
  slug: string;
  icon: string;
  coverImage: string;
  description: string;
  category: 'Dogs' | 'Cats' | 'Street Animals' | 'Rescue' | 'Health' | 'Birds' | 'General';
  membersCount: number;
  postsCount: number;
  isJoined: boolean;
  location?: string;
  rules?: string[];
  createdDate: string;
  createdBy?: string;
  memberIds?: string[];
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userBadge?: string;
  content: string;
  createdAt: string;
  likesCount: number;
  likedUserIds?: string[];
  isLiked?: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userLocation: string;
  createdAt: string;
  communityId?: string;
  communityName?: string;
  communityIcon?: string;
  animalId?: string;
  animalName?: string;
  animalAvatar?: string;
  content: string;
  media: string[];
  poll?: {
    question: string;
    options: PollOption[];
    totalVotes: number;
    userVotedOptionId?: string;
  };
  likedUserIds?: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  isSaved: boolean;
  savedByUserIds?: string[];
  comments?: Comment[];
  type?: 'general' | 'help' | 'adoption' | 'update' | 'feeding';
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userBadge?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: string;
  expiresAt?: string;
  seen?: boolean;
  likesCount?: number;
  location?: string;
  viewedUserIds?: string[];
}

export type HelpUrgency = 'urgent' | 'high' | 'normal' | 'moderate';
export type HelpStatus = 'open' | 'responding' | 'in_progress' | 'resolved';

export interface HelpResponder {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  status: 'on_the_way' | 'offered_transport' | 'offered_foster' | 'offered_vet';
  note?: string;
  timestamp: string;
}

export interface HelpRequest {
  id: string;
  title: string;
  description: string;
  animalName?: string;
  animalType?: 'Dog' | 'Cat' | 'Bird' | 'Puppy' | 'Kitten' | 'Other';
  urgency: HelpUrgency;
  category: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  photos: string[];
  creatorId: string;
  creatorName?: string;
  creatorAvatar?: string;
  creatorPhone?: string;
  createdAt: string;
  status: HelpStatus;
  needs: string[];
  targetAmount?: number;
  raisedAmount?: number;
  untilDeadline?: string;
  responders: HelpResponder[];
  commentsCount: number;
  comments?: Comment[];
}

export interface AdoptionListing {
  id: string;
  animalId?: string;
  name: string;
  type?: 'adoption' | 'foster';
  species: 'Dog' | 'Cat' | 'Other';
  breed: string;
  age: string;
  gender: 'Male' | 'Female';
  photos: string[];
  location: string;
  vaccinated: boolean;
  neutered: boolean;
  personality: string[];
  description: string;
  requirements: string[];
  status: 'Available' | 'Application Received' | 'Under Review' | 'Adopted';
  creatorName: string;
  creatorAvatar: string;
  createdAt: string;
}

export interface FosterRequest {
  id: string;
  title: string;
  animalType: string;
  animalCount: number;
  photos: string[];
  location: string;
  duration: string;
  reason: string;
  foodMedicalProvided: boolean;
  status: 'Open' | 'Fostered';
  creatorName: string;
  creatorAvatar: string;
  createdAt: string;
}

export interface FeedingPoint {
  id: string;
  title: string;
  location: string;
  coordinates: { lat: number; lng: number };
  animalType: string;
  animalCount: number;
  feedingTime: string;
  regularFeedersCount: number;
  foodSuppliesStatus: 'Sufficient' | 'Needed Soon' | 'Urgent Need';
  notes: string;
}

export interface NotificationItem {
  id: string;
  type: 'like' | 'comment' | 'help_response' | 'urgent_nearby' | 'follow' | 'community' | 'urgent_help' | 'feeding_logged' | 'feeding' | 'info';
  title: string;
  message?: string;
  body?: string;
  createdAt: string;
  isRead: boolean;
  avatar?: string;
  linkTab?: string;
  targetId?: string;
  entityType?: 'help' | 'animal' | 'community' | 'post';
  entityId?: string;
}

export interface NearbyMarker {
  id: string;
  type: 'feeder' | 'animal' | 'help' | 'adoption' | 'vet' | 'feeding_point' | 'hospital' | 'clinic' | 'pet_shop';
  title: string;
  subtitle: string;
  location: string;
  distanceKm?: number;
  coordinates?: { lat: number; lng: number };
  lat?: number;
  lng?: number;
  avatar: string;
  badge?: string;
  status?: string;
  actionText: string;
  entityId: string;
}

export type RealPetPlaceType =
  | 'hospital'
  | 'clinic'
  | 'emergency_vet'
  | 'pet_shop'
  | 'shelter'
  | 'rescue'
  | 'pet_pharmacy'
  | 'welfare_org';

export interface RealPetPlace {
  id: string;
  name: string;
  type: RealPetPlaceType;
  categoryLabel: string;
  lat: number;
  lng: number;
  distanceKm: number;
  distanceFormatted: string;
  distanceFormattedMi?: string;
  address: string;
  phone: string | null;
  openHours: string | null;
  isOpen: boolean | null;
  website: string | null;
  isEmergency: boolean;
  directionUrl: string;
}

export type ResponderRole = 'user' | 'responder' | 'admin';
export type RescueAssignmentStatus = 'PENDING' | 'NOTIFIED' | 'ACCEPTED' | 'ARRIVED' | 'RESOLVED' | 'CANCELLED';

export interface ResponderProfile {
  id: string;
  firebase_uid: string;
  name: string;
  email: string;
  phone?: string | null;
  role: ResponderRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RescueAssignment {
  id: string;
  help_request_id: string;
  responder_uid: string;
  status: RescueAssignmentStatus;
  assigned_at: string;
  accepted_at?: string | null;
  arrived_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  responder?: {
    name: string;
    phone?: string | null;
  };
}

export interface RescueAuditLog {
  id: string;
  help_request_id: string;
  actor_uid: string;
  event_type: string;
  details?: string | null;
  created_at: string;
}

