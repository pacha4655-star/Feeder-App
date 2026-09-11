/**
 * Firebase Authentication & Supabase Data Adapter
 * Architecture:
 * - Firebase = AUTHENTICATION ONLY (email, password, Google Sign-In, logout, session)
 * - Supabase = ALL APPLICATION DATA & MEDIA STORAGE (PostgreSQL, Storage, Realtime)
 */

export * from './supabase';
export * from './firebaseAuth';
export * from './storageService';
export * from './profileService';
export * from './postService';
export * from './storyService';
export * from './likeService';
export * from './commentService';
export * from './followService';
export * from './communityService';
export * from './animalService';
export * from './helpService';

// Aliases for legacy compatibility
export { createPostInSupabase as createPostInFirestore } from './postService';
export { deletePostInSupabase as deletePostInFirestore } from './postService';
export { createStoryInSupabase as createStoryInFirestore } from './storyService';
export { deleteStoryInSupabase as deleteStoryInFirestore } from './storyService';
export { getUserProfileFromSupabase as getUserProfileFromFirestore } from './profileService';
export { syncUserProfileToSupabase as syncUserProfileToFirestore } from './profileService';
export { toggleLikePostInSupabase as toggleLikePostInFirestore } from './likeService';
export { addCommentToPostInSupabase as addCommentToPostInFirestore } from './commentService';
export { toggleFollowUserInSupabase as toggleFollowUserInFirestore } from './followService';
export { createCommunityInSupabase as createCommunityInFirestore } from './communityService';
export { toggleJoinCommunityInSupabase as toggleJoinCommunityInFirestore } from './communityService';
export { createAnimalInSupabase as createAnimalInFirestore } from './animalService';
export { createHelpRequestInSupabase as createHelpRequestInFirestore } from './helpService';
export { respondToHelpRequestInSupabase as respondToHelpRequestInFirestore } from './helpService';

export const updateUserPostAuthorInfoInFirestore = async (_userId?: string, _updates?: any) => {};
