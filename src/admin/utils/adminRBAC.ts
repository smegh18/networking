import type { User, Event, Meeting, Referral, Ask, Ad, Business, VisitorInvite, CategoryRequest } from '../../types';

export function filterUsersByAdminScope(users: User[], adminUser: User | null | undefined, isGlobalAdmin: boolean): User[] {
  if (isGlobalAdmin || !adminUser) return users;
  return users.filter((u) => u.chapterId === adminUser.chapterId);
}

export function filterEventsByAdminScope(events: Event[], adminUser: User | null | undefined, isGlobalAdmin: boolean): Event[] {
  if (isGlobalAdmin || !adminUser) return events;
  return events.filter((e) => e.chapterId === adminUser.chapterId || (e.chapterIds && e.chapterIds.includes(adminUser.chapterId)));
}

export function filterMeetingsByAdminScope(
  meetings: Meeting[],
  users: User[],
  adminUser: User | null | undefined,
  isGlobalAdmin: boolean
): Meeting[] {
  if (isGlobalAdmin || !adminUser) return meetings;
  
  return meetings.filter((m) => {
    const requester = users.find(u => u.uid === m.requesterId);
    const requestee = users.find(u => u.uid === m.requesteeId);
    return (
      (requester && requester.chapterId === adminUser.chapterId) || 
      (requestee && requestee.chapterId === adminUser.chapterId)
    );
  });
}

export function filterReferralsByAdminScope(
  referrals: Referral[],
  users: User[],
  adminUser: User | null | undefined,
  isGlobalAdmin: boolean
): Referral[] {
  if (isGlobalAdmin || !adminUser) return referrals;
  
  return referrals.filter((r) => {
    const giver = users.find(u => u.uid === r.giverId);
    const receiver = users.find(u => u.uid === r.receiverId);
    return (
      (giver && giver.chapterId === adminUser.chapterId) || 
      (receiver && receiver.chapterId === adminUser.chapterId)
    );
  });
}

export function filterAsksByAdminScope(
  asks: Ask[],
  users: User[],
  adminUser: User | null | undefined,
  isGlobalAdmin: boolean
): Ask[] {
  if (isGlobalAdmin || !adminUser) return asks;
  
  return asks.filter((a) => {
    const asker = users.find(u => u.uid === a.askerUid);
    return asker && asker.chapterId === adminUser.chapterId;
  });
}

export function filterAdsByAdminScope(
  ads: Ad[],
  users: User[],
  adminUser: User | null | undefined,
  isGlobalAdmin: boolean
): Ad[] {
  if (isGlobalAdmin || !adminUser) return ads;
  
  return ads.filter((a) => {
    const owner = users.find(u => u.uid === a.userId);
    return owner && owner.chapterId === adminUser.chapterId;
  });
}

export function filterBusinessByAdminScope(
  businessEntries: Business[],
  users: User[],
  adminUser: User | null | undefined,
  isGlobalAdmin: boolean
): Business[] {
  if (isGlobalAdmin || !adminUser) return businessEntries;
  
  return businessEntries.filter((b) => {
    const giver = users.find(u => u.uid === b.givenById);
    const receiver = users.find(u => u.uid === b.givenToId);
    return (
      (giver && giver.chapterId === adminUser.chapterId) || 
      (receiver && receiver.chapterId === adminUser.chapterId)
    );
  });
}

export function filterVisitorInvitesByAdminScope(
  invites: VisitorInvite[],
  users: User[],
  adminUser: User | null | undefined,
  isGlobalAdmin: boolean
): VisitorInvite[] {
  if (isGlobalAdmin || !adminUser) return invites;
  
  return invites.filter((v) => {
    const inviter = users.find(u => u.uid === v.inviterUid);
    return inviter && inviter.chapterId === adminUser.chapterId;
  });
}

export function filterCategoryRequestsByAdminScope(
  requests: CategoryRequest[],
  users: User[],
  adminUser: User | null | undefined,
  isGlobalAdmin: boolean
): CategoryRequest[] {
  if (isGlobalAdmin || !adminUser) return requests;
  
  return requests.filter((req) => {
    const user = users.find(u => u.uid === req.requestedById);
    return user && user.chapterId === adminUser.chapterId;
  });
}
