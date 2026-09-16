export type Role =
  | 'USER'
  | 'MODERATOR'
  | 'COMMUNITY_ADMIN'
  | 'PLATFORM_MODERATOR'
  | 'PLATFORM_ADMIN';

export interface Permissions {
  canDeleteAnyPost: boolean;
  canModerateSos: boolean;
  canManageCommunity: (communityRole?: string) => boolean;
  canViewAuditLogs: boolean;
  canManageUsers: boolean;
}

export function isPlatformAdmin(role: string | null | undefined): boolean {
  return role === 'PLATFORM_ADMIN';
}

export function isPlatformStaff(role: string | null | undefined): boolean {
  return role === 'PLATFORM_ADMIN' || role === 'PLATFORM_MODERATOR';
}

export function getPermissions(role: Role): Permissions {
  const isPlatformAdminRole = role === 'PLATFORM_ADMIN';
  const isPlatformMod = role === 'PLATFORM_MODERATOR' || isPlatformAdminRole;

  return {
    canDeleteAnyPost: isPlatformMod,
    canModerateSos: isPlatformMod,
    canManageCommunity: (communityRole?: string) =>
      isPlatformAdminRole || communityRole === 'ADMIN' || communityRole === 'MODERATOR',
    canViewAuditLogs: isPlatformAdminRole,
    canManageUsers: isPlatformAdminRole,
  };
}

/**
 * Validates whether a user can modify a specific resource (post, animal, SOS case, profile).
 * Enforces ownership: only resource owner can modify, or platform staff.
 */
export function canModifyResource(
  currentUserId: string,
  currentUserRole: Role | string,
  resourceOwnerId: string
): boolean {
  if (!currentUserId || !resourceOwnerId) return false;
  if (currentUserId === resourceOwnerId) return true;
  return isPlatformStaff(currentUserRole);
}

/**
 * Validates whether a user can delete a specific resource.
 * Owner or platform staff can delete.
 */
export function canDeleteResource(
  currentUserId: string,
  currentUserRole: Role | string,
  resourceOwnerId: string
): boolean {
  if (!currentUserId || !resourceOwnerId) return false;
  if (currentUserId === resourceOwnerId) return true;
  return isPlatformStaff(currentUserRole);
}

export function canAccessCommunity(
  isPrivate: boolean,
  isMember: boolean,
  userRole: Role
): boolean {
  if (!isPrivate) return true;
  if (userRole === 'PLATFORM_ADMIN') return true;
  return isMember;
}

