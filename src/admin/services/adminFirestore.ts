import {
  ref,
  get,
  set,
  update,
  remove,
  push,
  onValue,
  query,
  orderByChild,
  equalTo,
  DataSnapshot,
} from 'firebase/database';
import { rtdb, functions } from '../../../firebase.config';
import { httpsCallable } from 'firebase/functions';
import { useAuthStore } from '../../stores/authStore';
import type {
  User,
  Chapter,
  Event,
  Meeting,
  Referral,
  Ad,
  Ask,
  AppNotification,
  BusinessConfig,
  Business,
  VisitorInvite,
  CategoryRequest,
} from '../../types';
import type { AdminDashboardStats } from '../types/admin';
import { APP_CONFIG_PATH, EMPTY_BUSINESS_CONFIG, normalizeBusinessConfig } from '../../services/firebase/realtimeDb';
import { DEFAULT_CHAPTER_ID, getUserChapterId } from '../../utils/chapter';
import {
  filterUsersByAdminScope,
  filterEventsByAdminScope,
  filterMeetingsByAdminScope,
  filterReferralsByAdminScope,
  filterAdsByAdminScope,
  filterAsksByAdminScope,
  filterBusinessByAdminScope,
  filterVisitorInvitesByAdminScope,
  filterCategoryRequestsByAdminScope,
} from '../utils/adminRBAC';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toISO(): string {
  return new Date().toISOString();
}

/** Convert an RTDB snapshot of a hash-map into an array, injecting the key as `id` (or `uid` for users). */
function snapToArray<T>(snap: DataSnapshot, idKey: string = 'id'): T[] {
  const val = snap.val();
  if (!val) return [];
  return Object.entries(val).map(([key, data]) => ({
    ...(data as any),
    [idKey]: key,
  })) as T[];
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

function normalizeUserChapter<T extends Partial<User>>(user: T): T {
  return { ...user, chapterId: getUserChapterId(user.chapterId) };
}

async function backfillMissingUserChapters(users: User[]): Promise<void> {
  const updates = users.reduce<Record<string, string>>((acc, user) => {
    if (!String(user.chapterId ?? '').trim()) {
      acc[`users/${user.uid}/chapterId`] = DEFAULT_CHAPTER_ID;
    }
    return acc;
  }, {});
  if (Object.keys(updates).length > 0) {
    await update(ref(rtdb), updates);
  }
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export async function getAdminDashboardStats(currentUser?: User, isGlobalAdmin: boolean = true): Promise<AdminDashboardStats> {
  const TIMEOUT = 8000;

  const [usersSnap, chaptersSnap, eventsSnap, meetingsSnap, referralsSnap, adsSnap, asksSnap] =
    await Promise.all([
      withTimeout(get(ref(rtdb, 'users')), TIMEOUT),
      withTimeout(get(ref(rtdb, 'chapters')), TIMEOUT),
      withTimeout(get(ref(rtdb, 'events')), TIMEOUT),
      withTimeout(get(ref(rtdb, 'meetings')), TIMEOUT),
      withTimeout(get(ref(rtdb, 'referrals')), TIMEOUT),
      withTimeout(get(ref(rtdb, 'ads')), TIMEOUT),
      withTimeout(get(ref(rtdb, 'asks')), TIMEOUT),
    ]);

  const rawUsers = usersSnap ? snapToArray<User>(usersSnap, 'uid') : [];
  const rawEvents = eventsSnap ? snapToArray<Event>(eventsSnap) : [];
  const rawMeetings = meetingsSnap ? snapToArray<Meeting>(meetingsSnap) : [];
  const rawReferrals = referralsSnap ? snapToArray<Referral>(referralsSnap) : [];
  const rawAds = adsSnap ? snapToArray<Ad>(adsSnap) : [];
  const rawAsks = asksSnap ? snapToArray<Ask>(asksSnap) : [];

  const users = filterUsersByAdminScope(rawUsers, currentUser, isGlobalAdmin);
  const events = filterEventsByAdminScope(rawEvents, currentUser, isGlobalAdmin);
  const meetings = filterMeetingsByAdminScope(rawMeetings, rawUsers, currentUser, isGlobalAdmin);
  const referrals = filterReferralsByAdminScope(rawReferrals, rawUsers, currentUser, isGlobalAdmin);
  const ads = filterAdsByAdminScope(rawAds, rawUsers, currentUser, isGlobalAdmin);
  const asks = filterAsksByAdminScope(rawAsks, rawUsers, currentUser, isGlobalAdmin);
  
  const chapters = chaptersSnap ? snapToArray<Chapter>(chaptersSnap) : [];
  const today = new Date().toISOString().split('T')[0];

  return {
    totalUsers: users.length,
    totalChapters: chapters.length,
    totalEvents: events.length,
    totalMeetings: meetings.length,
    totalReferrals: referrals.length,
    totalAds: ads.length,
    totalAsks: asks.length,
    activeUsers: users.filter((u) => u.isActive !== false).length,
    pendingReferrals: referrals.filter((r) => r.status === 'pending').length,
    completedReferrals: referrals.filter((r) => r.status === 'completed').length,
    upcomingEvents: events.filter((e) => e.date >= today).length,
    referralTotalAmount: referrals
      .filter((r) => r.status === 'completed')
      .reduce((sum, r) => sum + (r.amount || 0), 0),
  };
}

// ── User Management ───────────────────────────────────────────────────────────

export async function getAllUsersAdmin(): Promise<User[]> {
  const snap = await get(ref(rtdb, 'users'));
  const users = snapToArray<User>(snap, 'uid');
  await backfillMissingUserChapters(users);
  return users.map(normalizeUserChapter);
}

export async function getUserAdmin(uid: string): Promise<User | null> {
  const snap = await get(ref(rtdb, `users/${uid}`));
  if (!snap.exists()) return null;
  const user = normalizeUserChapter({ uid, ...snap.val() } as User);
  if (!String((snap.val() as Partial<User>).chapterId ?? '').trim()) {
    await update(ref(rtdb, `users/${uid}`), { chapterId: DEFAULT_CHAPTER_ID, updatedAt: toISO() });
  }
  return user;
}

export async function createUserAdmin(
  user: Omit<User, 'createdAt' | 'updatedAt'>,
): Promise<void> {
  const now = toISO();
  await set(ref(rtdb, `users/${user.uid}`), {
    ...user,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateUserAdmin(
  uid: string,
  data: Partial<User>,
): Promise<void> {
  await update(ref(rtdb, `users/${uid}`), { ...data, updatedAt: toISO() });
}

export async function updateUserRole(
  uid: string,
  role: 'member' | 'admin' | 'superadmin',
): Promise<void> {
  await update(ref(rtdb, `users/${uid}`), { role, updatedAt: toISO() });
}

export async function deactivateUser(uid: string): Promise<void> {
  await update(ref(rtdb, `users/${uid}`), { isActive: false, updatedAt: toISO() });
}

export async function activateUser(uid: string): Promise<void> {
  await update(ref(rtdb, `users/${uid}`), { isActive: true, updatedAt: toISO() });
}

export async function deleteUserDoc(uid: string): Promise<void> {
  await remove(ref(rtdb, `users/${uid}`));
}

export async function setPresidentCredentials(targetUid: string, password: string): Promise<void> {
  const setPresidentCredentialsCallable = httpsCallable<{ targetUid: string, password: string }, { success: boolean }>(functions, 'setPresidentCredentials');
  await setPresidentCredentialsCallable({ targetUid, password });
}

// ── Chapter CRUD ──────────────────────────────────────────────────────────────

export async function getAllChapters(): Promise<Chapter[]> {
  const snap = await get(ref(rtdb, 'chapters'));
  return snapToArray<Chapter>(snap);
}
export async function createChapter(
  chapter: Omit<Chapter, 'id' | 'createdAt'>,
): Promise<string> {
  const newRef = push(ref(rtdb, 'chapters'));
  await set(newRef, { ...chapter, createdAt: toISO() });
  return newRef.key!;
}

export async function updateChapter(id: string, data: Partial<Chapter>): Promise<void> {
  await update(ref(rtdb, `chapters/${id}`), data);
}

export async function deleteChapter(id: string): Promise<void> {
  await remove(ref(rtdb, `chapters/${id}`));
  await syncEventsAfterChapterDelete(id);
}

async function syncEventsAfterChapterDelete(deletedChapterId: string): Promise<void> {
  const eventsSnap = await get(ref(rtdb, 'events'));
  if (!eventsSnap.exists()) return;

  const updates: Record<string, unknown> = {};
  const events = snapToArray<Event>(eventsSnap);

  events.forEach((event) => {
    const nextChapterIds = Array.from(
      new Set((event.chapterIds || []).map((chapterId) => String(chapterId || '').trim()).filter(Boolean)),
    ).filter((chapterId) => chapterId !== deletedChapterId);

    const currentChapterId = String(event.chapterId || '').trim();
    if (currentChapterId !== deletedChapterId && nextChapterIds.length === (event.chapterIds || []).length) {
      return;
    }

    updates[`events/${event.id}/chapterIds`] = nextChapterIds;
    updates[`events/${event.id}/chapterId`] = nextChapterIds.length > 0 ? nextChapterIds[0] : 'all';
    updates[`events/${event.id}/updatedAt`] = toISO();
  });

  if (Object.keys(updates).length > 0) {
    await update(ref(rtdb), updates);
  }
}

// ── Event Management ──────────────────────────────────────────────────────────

export async function getAllEventsAdmin(): Promise<Event[]> {
  const snap = await get(ref(rtdb, 'events'));
  const items = snapToArray<Event>(snap);
  const user = useAuthStore.getState().user;
  const isChapterAdmin = user?.leadershipRole === 'president';
  const isGlobalAdmin = user?.role === 'superadmin' || (user?.role === 'admin' && !isChapterAdmin);
  const filtered = filterEventsByAdminScope(items, user, isGlobalAdmin);
  return filtered.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}

export async function createEventAdmin(
  event: Omit<Event, 'id' | 'createdAt' | 'attendees'>,
): Promise<string> {
  const newRef = push(ref(rtdb, 'events'));
  await set(newRef, {
    ...event,
    attendees: [],
    attendanceRecords: {},
    checkedInUsers: [],
    createdAt: toISO(),
    updatedAt: toISO(),
  });
  return newRef.key!;
}

export async function updateEventAdmin(
  eventId: string,
  data: Partial<Event>,
): Promise<void> {
  await update(ref(rtdb, `events/${eventId}`), { ...data, updatedAt: toISO() });
}

export async function deleteEvent(eventId: string): Promise<void> {
  await remove(ref(rtdb, `events/${eventId}`));
}

// ── Referral Management ───────────────────────────────────────────────────────

export async function getAllReferrals(): Promise<Referral[]> {
  const snap = await get(ref(rtdb, 'referrals'));
  const items = snapToArray<Referral>(snap);
  
  const user = useAuthStore.getState().user;
  const isChapterAdmin = user?.leadershipRole === 'president';
  const isGlobalAdmin = user?.role === 'superadmin' || (user?.role === 'admin' && !isChapterAdmin);
  if (!isGlobalAdmin && user?.leadershipRole === 'president') {
    const usersSnap = await get(ref(rtdb, 'users'));
    const users = snapToArray<User>(usersSnap, 'uid');
    const filtered = filterReferralsByAdminScope(items, users, user, isGlobalAdmin);
    return filtered.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }
  return items.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

export async function updateReferralStatusAdmin(
  referralId: string,
  status: Referral['status'],
): Promise<void> {
  await update(ref(rtdb, `referrals/${referralId}`), { status });
}

// ── Business Transaction Management ───────────────────────────────────────────

export async function getAllBusinessTransactions(): Promise<Business[]> {
  const snap = await get(ref(rtdb, 'business'));
  const items = snapToArray<Business>(snap);
  
  const user = useAuthStore.getState().user;
  const isChapterAdmin = user?.leadershipRole === 'president';
  const isGlobalAdmin = user?.role === 'superadmin' || (user?.role === 'admin' && !isChapterAdmin);
  if (!isGlobalAdmin && user?.leadershipRole === 'president') {
    const usersSnap = await get(ref(rtdb, 'users'));
    const users = snapToArray<User>(usersSnap, 'uid');
    const filtered = filterBusinessByAdminScope(items, users, user, isGlobalAdmin);
    return filtered.sort((a: Business, b: Business) => (b.date ?? '').localeCompare(a.date ?? ''));
  }
  return items.sort((a: Business, b: Business) => (b.date ?? '').localeCompare(a.date ?? ''));
}

export async function getBusinessAdmin(id: string): Promise<Business | null> {
  const snap = await get(ref(rtdb, `business/${id}`));
  if (!snap.exists()) return null;
  return { id, ...snap.val() } as Business;
}

export async function updateBusinessAdmin(id: string, data: Partial<Business>): Promise<void> {
  await update(ref(rtdb, `business/${id}`), { ...data, updatedAt: toISO() });
}

export async function deleteBusinessTransaction(id: string): Promise<void> {
  await remove(ref(rtdb, `business/${id}`));
}

// ── Meeting Management ────────────────────────────────────────────────────────

export async function getAllMeetingsAdmin(): Promise<Meeting[]> {
  const snap = await get(ref(rtdb, 'meetings'));
  const items = snapToArray<Meeting>(snap);
  
  const user = useAuthStore.getState().user;
  const isChapterAdmin = user?.leadershipRole === 'president';
  const isGlobalAdmin = user?.role === 'superadmin' || (user?.role === 'admin' && !isChapterAdmin);
  if (!isGlobalAdmin && user?.leadershipRole === 'president') {
    const usersSnap = await get(ref(rtdb, 'users'));
    const users = snapToArray<User>(usersSnap, 'uid');
    return filterMeetingsByAdminScope(items, users, user, isGlobalAdmin);
  }
  return items;
}

// ── Visitor Invite Management ─────────────────────────────────────────────────

export async function getAllVisitorInvitesAdmin(): Promise<VisitorInvite[]> {
  const snap = await get(ref(rtdb, 'visitor_invites'));
  const items = snapToArray<VisitorInvite>(snap);
  
  const user = useAuthStore.getState().user;
  const isChapterAdmin = user?.leadershipRole === 'president';
  const isGlobalAdmin = user?.role === 'superadmin' || (user?.role === 'admin' && !isChapterAdmin);
  if (!isGlobalAdmin && user?.leadershipRole === 'president') {
    const usersSnap = await get(ref(rtdb, 'users'));
    const users = snapToArray<User>(usersSnap, 'uid');
    return filterVisitorInvitesByAdminScope(items, users, user, isGlobalAdmin);
  }
  return items;
}

// ── Ad Management ─────────────────────────────────────────────────────────────

export async function getAllAds(): Promise<Ad[]> {
  const snap = await get(ref(rtdb, 'ads'));
  const items = snapToArray<Ad>(snap);
  
  const user = useAuthStore.getState().user;
  const isChapterAdmin = user?.leadershipRole === 'president';
  const isGlobalAdmin = user?.role === 'superadmin' || (user?.role === 'admin' && !isChapterAdmin);
  if (!isGlobalAdmin && user?.leadershipRole === 'president') {
    const usersSnap = await get(ref(rtdb, 'users'));
    const users = snapToArray<User>(usersSnap, 'uid');
    return filterAdsByAdminScope(items, users, user, isGlobalAdmin);
  }
  return items;
}

export async function createAd(ad: Omit<Ad, 'id' | 'createdAt'>): Promise<string> {
  const newRef = push(ref(rtdb, 'ads'));
  await set(newRef, { ...ad, createdAt: toISO() });
  return newRef.key!;
}

export async function updateAd(adId: string, data: Partial<Ad>): Promise<void> {
  await update(ref(rtdb, `ads/${adId}`), data);
}

export async function deleteAd(adId: string): Promise<void> {
  await remove(ref(rtdb, `ads/${adId}`));
}

export async function toggleAdActive(adId: string, active: boolean): Promise<void> {
  await update(ref(rtdb, `ads/${adId}`), { active });
}

// ── Ask Management ────────────────────────────────────────────────────────────

export async function getAllAsks(): Promise<Ask[]> {
  const snap = await get(ref(rtdb, 'asks'));
  const items = snapToArray<Ask>(snap);
  
  const user = useAuthStore.getState().user;
  const isChapterAdmin = user?.leadershipRole === 'president';
  const isGlobalAdmin = user?.role === 'superadmin' || (user?.role === 'admin' && !isChapterAdmin);
  if (!isGlobalAdmin && user?.leadershipRole === 'president') {
    const usersSnap = await get(ref(rtdb, 'users'));
    const users = snapToArray<User>(usersSnap, 'uid');
    return filterAsksByAdminScope(items, users, user, isGlobalAdmin);
  }
  return items;
}

export async function deleteAsk(askId: string): Promise<void> {
  await remove(ref(rtdb, `asks/${askId}`));
}

// ── Additional Deletion Methods for Member Activity ────────────────────────────

export async function deleteReferral(referralId: string): Promise<void> {
  await remove(ref(rtdb, `referrals/${referralId}`));
}

export async function deleteMeeting(meetingId: string): Promise<void> {
  await remove(ref(rtdb, `meetings/${meetingId}`));
}

export async function removeEventAttendance(eventId: string, userId: string): Promise<void> {
  await remove(ref(rtdb, `events/${eventId}/attendanceRecords/${userId}`));
  await remove(ref(rtdb, `events/${eventId}/attendanceDetails/${userId}`));
}

// ── Notification Management ───────────────────────────────────────────────────

export async function getAllNotificationsAdmin(): Promise<AppNotification[]> {
  const snap = await get(ref(rtdb, 'notifications'));
  const items = snapToArray<AppNotification>(snap);
  return items.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

export async function sendNotificationToUser(
  userId: string,
  notification: { type: AppNotification['type']; title: string; body: string; data?: Record<string, string> },
): Promise<string> {
  const newRef = push(ref(rtdb, 'notifications'));
  await set(newRef, {
    userId,
    ...notification,
    data: notification.data || {},
    read: false,
    createdAt: toISO(),
  });
  return newRef.key!;
}

export async function sendNotificationToChapter(
  chapterId: string,
  notification: { type: AppNotification['type']; title: string; body: string; data?: Record<string, string> },
): Promise<void> {
  const usersSnap = await get(ref(rtdb, 'users'));
  const users = snapToArray<User>(usersSnap, 'uid');
  const chapterUsers = users.filter((u) => u.chapterId === chapterId);
  const now = toISO();

  const updates: Record<string, any> = {};
  chapterUsers.forEach((user) => {
    const key = push(ref(rtdb, 'notifications')).key!;
    updates[`notifications/${key}`] = {
      userId: user.uid,
      ...notification,
      data: notification.data || {},
      read: false,
      createdAt: now,
    };
  });
  if (Object.keys(updates).length > 0) {
    await update(ref(rtdb), updates);
  }
}

export async function sendBroadcastNotification(
  notification: { type: AppNotification['type']; title: string; body: string; data?: Record<string, string> },
): Promise<void> {
  const usersSnap = await get(ref(rtdb, 'users'));
  const users = snapToArray<User>(usersSnap, 'uid');
  const now = toISO();

  const updates: Record<string, any> = {};
  users.forEach((user) => {
    const key = push(ref(rtdb, 'notifications')).key!;
    updates[`notifications/${key}`] = {
      userId: user.uid,
      ...notification,
      data: notification.data || {},
      read: false,
      createdAt: now,
    };
  });
  if (Object.keys(updates).length > 0) {
    await update(ref(rtdb), updates);
  }
}

// ── Business Config Management ────────────────────────────────────────────────

export async function getBusinessConfigAdmin(): Promise<BusinessConfig> {
  const snap = await get(ref(rtdb, APP_CONFIG_PATH));
  if (!snap.exists()) {
    const usersSnap = await get(ref(rtdb, 'users'));
    if (!usersSnap.exists()) return EMPTY_BUSINESS_CONFIG;
    const users = snapToArray<User>(usersSnap, 'uid');
    const categories = Array.from(
      new Set(users.map((u) => (u.businessCategory || '').trim()).filter(Boolean)),
    );
    const popularTags = Array.from(
      new Set(users.flatMap((u) => u.businessTags || []).map((tag) => tag.trim()).filter(Boolean)),
    );
    const servicesByCategory: Record<string, string[]> = {};
    const tagsByCategory: Record<string, string[]> = {};
    users.forEach((user) => {
      const category = (user.businessCategory || '').trim();
      if (!category) return;
      const existingServices = servicesByCategory[category] || [];
      servicesByCategory[category] = Array.from(new Set([...existingServices, ...(user.services || [])])).filter(Boolean);
      const existingTags = tagsByCategory[category] || [];
      tagsByCategory[category] = Array.from(new Set([...existingTags, ...(user.businessTags || [])])).filter(Boolean);
    });
    return {
      businessCategories: categories,
      popularTags,
      servicesByCategory,
      tagsByCategory,
    };
  }
  return normalizeBusinessConfig(snap.val());
}

export async function updateBusinessConfigAdmin(data: BusinessConfig): Promise<void> {
  const popularTags = Array.from(
    new Set(Object.values(data.tagsByCategory || {}).flat()),
  );
  await set(ref(rtdb, APP_CONFIG_PATH), {
    businessCategories: data.businessCategories,
    popularTags,
    servicesByCategory: data.servicesByCategory,
    tagsByCategory: data.tagsByCategory || {},
    updatedAt: toISO(),
  });
}

// ── Category Requests Management ───────────────────────────────────────────────

export const CATEGORY_REQUESTS_PATH = 'categoryRequests';

export async function getAllCategoryRequests(): Promise<CategoryRequest[]> {
  const snap = await get(ref(rtdb, CATEGORY_REQUESTS_PATH));
  const items = snapToArray<CategoryRequest>(snap);
  
  const user = useAuthStore.getState().user;
  const isChapterAdmin = user?.leadershipRole === 'president';
  const isGlobalAdmin = user?.role === 'superadmin' || (user?.role === 'admin' && !isChapterAdmin);
  if (!isGlobalAdmin && user?.leadershipRole === 'president') {
    const usersSnap = await get(ref(rtdb, 'users'));
    const users = snapToArray<User>(usersSnap, 'uid');
    const filtered = filterCategoryRequestsByAdminScope(items, users, user, isGlobalAdmin);
    return filtered.sort((a: CategoryRequest, b: CategoryRequest) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }
  return items.sort((a: CategoryRequest, b: CategoryRequest) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

export async function createCategoryRequest(request: Omit<CategoryRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const newRef = push(ref(rtdb, CATEGORY_REQUESTS_PATH));
  const now = toISO();
  await set(newRef, {
    ...request,
    createdAt: now,
    updatedAt: now,
  });
  return newRef.key!;
}

export async function updateCategoryRequest(id: string, data: Partial<CategoryRequest>): Promise<void> {
  await update(ref(rtdb, `${CATEGORY_REQUESTS_PATH}/${id}`), {
    ...data,
    updatedAt: toISO(),
  });
}

export async function deleteCategoryRequest(id: string): Promise<void> {
  await remove(ref(rtdb, `${CATEGORY_REQUESTS_PATH}/${id}`));
}

export async function getPendingCategoryRequest(category: string): Promise<CategoryRequest | null> {
  const normalizedTarget = category.trim().toLowerCase();
  const snap = await get(ref(rtdb, CATEGORY_REQUESTS_PATH));
  const items = snapToArray<CategoryRequest>(snap);
  const pendingRequest = items.find((request) => {
    const requestCategory = String(request.category ?? '').trim().toLowerCase();
    return request.status === 'pending' && requestCategory === normalizedTarget;
  });
  return pendingRequest || null;
}

// ── Real-time Listener ────────────────────────────────────────────────────────

export function subscribeToCollection<T>(
  path: string,
  callback: (items: T[]) => void,
  idKey: string = 'id',
): () => void {
  const dbRef = ref(rtdb, path);
  return onValue(dbRef, (snapshot) => {
    const items = snapToArray<T>(snapshot, idKey);
    callback(items);
  });
}
