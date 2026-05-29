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
  DataSnapshot,
} from 'firebase/database';
import { rtdb } from '../../../firebase.config';
import type {
  User,
  Chapter,
  Zone,
  Event,
  Meeting,
  Referral,
  Ad,
  Ask,
  AppNotification,
  BusinessConfig,
  Business,
} from '../../types';
import type { AdminDashboardStats } from '../types/admin';
import { APP_CONFIG_PATH, EMPTY_BUSINESS_CONFIG, normalizeBusinessConfig } from '../../services/firebase/realtimeDb';

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

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const TIMEOUT = 8000;

  const [usersSnap, chaptersSnap, zonesSnap, eventsSnap, meetingsSnap, referralsSnap, adsSnap, asksSnap] =
    await Promise.all([
      withTimeout(get(ref(rtdb, 'users')), TIMEOUT),
      withTimeout(get(ref(rtdb, 'chapters')), TIMEOUT),
      withTimeout(get(ref(rtdb, 'zones')), TIMEOUT),
      withTimeout(get(ref(rtdb, 'events')), TIMEOUT),
      withTimeout(get(ref(rtdb, 'meetings')), TIMEOUT),
      withTimeout(get(ref(rtdb, 'referrals')), TIMEOUT),
      withTimeout(get(ref(rtdb, 'ads')), TIMEOUT),
      withTimeout(get(ref(rtdb, 'asks')), TIMEOUT),
    ]);

  const users = usersSnap ? snapToArray<User>(usersSnap, 'uid') : [];
  const chapters = chaptersSnap ? snapToArray<Chapter>(chaptersSnap) : [];
  const zones = zonesSnap ? snapToArray<Zone>(zonesSnap) : [];
  const events = eventsSnap ? snapToArray<Event>(eventsSnap) : [];
  const meetings = meetingsSnap ? snapToArray<Meeting>(meetingsSnap) : [];
  const referrals = referralsSnap ? snapToArray<Referral>(referralsSnap) : [];
  const ads = adsSnap ? snapToArray<Ad>(adsSnap) : [];
  const asks = asksSnap ? snapToArray<Ask>(asksSnap) : [];
  const today = new Date().toISOString().split('T')[0];

  return {
    totalUsers: users.length,
    totalChapters: chapters.length,
    totalZones: zones.length,
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
  return snapToArray<User>(snap, 'uid');
}

export async function getUserAdmin(uid: string): Promise<User | null> {
  const snap = await get(ref(rtdb, `users/${uid}`));
  if (!snap.exists()) return null;
  return { uid, ...snap.val() } as User;
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

// ── Chapter & Zone CRUD ───────────────────────────────────────────────────────

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
}

export async function getAllZones(): Promise<Zone[]> {
  const snap = await get(ref(rtdb, 'zones'));
  return snapToArray<Zone>(snap);
}

export async function createZone(zone: Omit<Zone, 'id'>): Promise<string> {
  const newRef = push(ref(rtdb, 'zones'));
  await set(newRef, zone);
  return newRef.key!;
}

export async function updateZone(id: string, data: Partial<Zone>): Promise<void> {
  await update(ref(rtdb, `zones/${id}`), data);
}

export async function deleteZone(id: string): Promise<void> {
  await remove(ref(rtdb, `zones/${id}`));
}

// ── Event Management ──────────────────────────────────────────────────────────

export async function getAllEventsAdmin(): Promise<Event[]> {
  const snap = await get(ref(rtdb, 'events'));
  const items = snapToArray<Event>(snap);
  return items.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
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
  return items.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

export async function updateReferralStatusAdmin(
  referralId: string,
  status: Referral['status'],
): Promise<void> {
  await update(ref(rtdb, `referrals/${referralId}`), { status });
}

// ── Ad Management ─────────────────────────────────────────────────────────────

export async function getAllAds(): Promise<Ad[]> {
  const snap = await get(ref(rtdb, 'ads'));
  return snapToArray<Ad>(snap);
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
  return snapToArray<Ask>(snap);
}

export async function deleteAsk(askId: string): Promise<void> {
  await remove(ref(rtdb, `asks/${askId}`));
}

// ── Business Management ───────────────────────────────────────────────────────

export async function getAllBusinessTransactions(): Promise<Business[]> {
  const snap = await get(ref(rtdb, 'business'));
  const items = snapToArray<Business>(snap);
  return items.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

export async function getBusinessAdmin(id: string): Promise<Business | null> {
  const snap = await get(ref(rtdb, `business/${id}`));
  if (!snap.exists()) return null;
  return { id, ...snap.val() } as Business;
}

export async function updateBusinessAdmin(
  id: string,
  data: Partial<Business>,
): Promise<void> {
  await update(ref(rtdb, `business/${id}`), { ...data, updatedAt: toISO() });
}

export async function updateBusinessStatusAdmin(
  businessId: string,
  status: Business['status'],
): Promise<void> {
  await update(ref(rtdb, `business/${businessId}`), { status });
}

export async function deleteBusinessTransaction(businessId: string): Promise<void> {
  await remove(ref(rtdb, `business/${businessId}`));
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
