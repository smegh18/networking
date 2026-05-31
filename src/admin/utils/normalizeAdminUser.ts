import type { Language, User } from '../../types';

const EMPTY_SOCIAL_LINKS: User['socialLinks'] = {
  instagram: '',
  facebook: '',
  whatsapp: '',
  linkedin: '',
  google: '',
};

/**
 * Builds a complete User object safe for profile UI (avoids crashes on partial RTDB records).
 */
export function normalizeAdminUserProfile(
  uid: string,
  source?: Partial<User> | null,
): User {
  const now = new Date().toISOString();
  const social = source?.socialLinks;

  return {
    uid,
    email: source?.email ?? '',
    name: (source?.name && String(source.name).trim()) || 'Unknown User',
    phone: source?.phone ?? '',
    photoURL: source?.photoURL ?? '',
    businessName: source?.businessName ?? '',
    businessDescription: source?.businessDescription ?? '',
    businessCategory: source?.businessCategory ?? '',
    businessTags: Array.isArray(source?.businessTags) ? source.businessTags : [],
    businessPhotos: Array.isArray(source?.businessPhotos) ? source.businessPhotos : [],
    services: Array.isArray(source?.services) ? source.services : [],
    businessAddress: source?.businessAddress ?? '',
    businessArea: source?.businessArea ?? '',
    socialLinks: {
      instagram: social?.instagram ?? '',
      facebook: social?.facebook ?? '',
      whatsapp: social?.whatsapp ?? '',
      linkedin: social?.linkedin ?? '',
      google: social?.google ?? '',
    },
    chapterId: source?.chapterId ?? '',
    location: {
      city: source?.location?.city ?? '',
      state: source?.location?.state ?? '',
      area: source?.location?.area,
      pinCode: source?.location?.pinCode,
      placeId: source?.location?.placeId,
      latitude: source?.location?.latitude,
      longitude: source?.location?.longitude,
    },
    dateOfBirth: source?.dateOfBirth ?? '',
    language: (source?.language as Language) ?? 'en',
    biometricEnabled: source?.biometricEnabled ?? false,
    role: source?.role ?? 'member',
    leadershipRole: source?.leadershipRole ?? 'member',
    leadershipRolePoints: source?.leadershipRolePoints ?? 0,
    leadershipRoleCity: source?.leadershipRoleCity ?? '',
    isActive: source?.isActive !== false,
    createdAt: source?.createdAt ?? now,
    updatedAt: source?.updatedAt ?? now,
  };
}
