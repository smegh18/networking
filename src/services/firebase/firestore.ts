import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  arrayUnion,
  arrayRemove,
  writeBatch,
  DocumentData,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '../../../firebase.config';
import type {
  User,
  Chapter,
  Zone,
  Event,
  Meeting,
  Referral,
  Ad,
  AppNotification,
  DashboardStats,
  SearchResult,
} from '../../types';

// ---------------------------------------------------------------------------
// Collection references
// ---------------------------------------------------------------------------

const usersCol = collection(db, 'users');
const chaptersCol = collection(db, 'chapters');
const zonesCol = collection(db, 'zones');
const eventsCol = collection(db, 'events');
const meetingsCol = collection(db, 'meetings');
const referralsCol = collection(db, 'referrals');
const adsCol = collection(db, 'ads');
const notificationsCol = collection(db, 'notifications');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toISO(): string {
  return new Date().toISOString();
}

/**
 * Convert a Firestore document snapshot to a typed object,
 * injecting the document id.
 */
function docToTyped<T extends { id: string }>(
  snap: DocumentData,
): T {
  return { id: snap.id, ...snap.data() } as T;
}

// ---------------------------------------------------------------------------
// User CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new user document. The document ID is the Firebase Auth UID.
 */
export async function createUser(
  user: Omit<User, 'createdAt' | 'updatedAt'>,
): Promise<void> {
  const now = toISO();
  await setDoc(doc(db, 'users', user.uid), {
    ...user,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Get a user by their UID. Returns null if not found.
 */
export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as User;
}

/**
 * Partially update a user document.
 */
export async function updateUser(
  uid: string,
  data: Partial<Omit<User, 'uid' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: toISO(),
  });
}

/**
 * Get all users.
 */
export async function getAllUsers(): Promise<User[]> {
  const snap = await getDocs(usersCol);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as User));
}

/**
 * Search users by name (case-insensitive prefix match).
 *
 * Firestore does not support native full-text search. We use a
 * range query on the `name` field which gives prefix matching.
 * For production, consider Algolia / Typesense or a Cloud Function
 * that maintains a search index.
 */
export async function searchUsers(queryStr: string): Promise<User[]> {
  if (!queryStr.trim()) return [];

  const searchTerm = queryStr.trim();
  const end = searchTerm + '\uf8ff';

  const q = query(
    usersCol,
    where('name', '>=', searchTerm),
    where('name', '<=', end),
    limit(20),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as User));
}

/**
 * Get all users belonging to a specific chapter.
 */
export async function getUsersByChapter(chapterId: string): Promise<User[]> {
  const q = query(usersCol, where('chapterId', '==', chapterId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as User));
}

// ---------------------------------------------------------------------------
// Chapters & Zones
// ---------------------------------------------------------------------------

export async function getChapters(): Promise<Chapter[]> {
  const snap = await getDocs(chaptersCol);
  return snap.docs.map((d) => docToTyped<Chapter>(d));
}

export async function getZones(): Promise<Zone[]> {
  const snap = await getDocs(zonesCol);
  return snap.docs.map((d) => docToTyped<Zone>(d));
}

export async function getChaptersByZone(zoneId: string): Promise<Chapter[]> {
  const q = query(chaptersCol, where('zoneId', '==', zoneId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToTyped<Chapter>(d));
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export async function getEvents(): Promise<Event[]> {
  const q = query(eventsCol, orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToTyped<Event>(d));
}

/**
 * Get upcoming events (date >= today), ordered ascending.
 */
export async function getUpcomingEvents(
  eventLimit: number = 20,
): Promise<Event[]> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const q = query(
    eventsCol,
    where('date', '>=', today),
    orderBy('date', 'asc'),
    limit(eventLimit),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToTyped<Event>(d));
}

export async function createEvent(
  event: Omit<Event, 'id' | 'createdAt' | 'attendees'>,
): Promise<string> {
  const ref = await addDoc(eventsCol, {
    ...event,
    attendees: [],
    createdAt: toISO(),
  });
  return ref.id;
}

export async function updateEvent(
  eventId: string,
  data: Partial<Omit<Event, 'id' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'events', eventId), data);
}

/**
 * Toggle RSVP for the current user.
 * If the user is already in the attendees array, they are removed;
 * otherwise they are added.
 */
export async function rsvpEvent(
  eventId: string,
  userId: string,
): Promise<void> {
  const eventRef = doc(db, 'events', eventId);
  const snap = await getDoc(eventRef);
  if (!snap.exists()) throw new Error('Event not found');

  const attendees: string[] = snap.data().attendees ?? [];
  if (attendees.includes(userId)) {
    await updateDoc(eventRef, { attendees: arrayRemove(userId) });
  } else {
    await updateDoc(eventRef, { attendees: arrayUnion(userId) });
  }
}

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------

export async function createMeeting(
  meeting: Omit<Meeting, 'id' | 'createdAt' | 'status'>,
): Promise<string> {
  const ref = await addDoc(meetingsCol, {
    ...meeting,
    status: 'pending',
    createdAt: toISO(),
  });
  return ref.id;
}

/**
 * Get all meetings where the given user is either requester or requestee.
 * Firestore does not support OR queries across different fields in a
 * single query, so we run two queries and merge/deduplicate the results.
 */
export async function getMeetings(userId: string): Promise<Meeting[]> {
  const [asRequester, asRequestee] = await Promise.all([
    getDocs(
      query(
        meetingsCol,
        where('requesterId', '==', userId),
        orderBy('createdAt', 'desc'),
      ),
    ),
    getDocs(
      query(
        meetingsCol,
        where('requesteeId', '==', userId),
        orderBy('createdAt', 'desc'),
      ),
    ),
  ]);

  const map = new Map<string, Meeting>();
  for (const d of asRequester.docs) {
    map.set(d.id, docToTyped<Meeting>(d));
  }
  for (const d of asRequestee.docs) {
    map.set(d.id, docToTyped<Meeting>(d));
  }

  // Sort combined results by createdAt descending
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function updateMeetingStatus(
  meetingId: string,
  status: Meeting['status'],
): Promise<void> {
  await updateDoc(doc(db, 'meetings', meetingId), { status });
}

// ---------------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------------

export async function createReferral(
  referral: Omit<Referral, 'id' | 'createdAt' | 'status'>,
): Promise<string> {
  const ref = await addDoc(referralsCol, {
    ...referral,
    status: 'pending',
    createdAt: toISO(),
  });
  return ref.id;
}

/**
 * Get referrals where the user is either the giver or receiver.
 */
export async function getReferrals(userId: string): Promise<Referral[]> {
  const [asGiver, asReceiver] = await Promise.all([
    getDocs(
      query(
        referralsCol,
        where('giverId', '==', userId),
        orderBy('createdAt', 'desc'),
      ),
    ),
    getDocs(
      query(
        referralsCol,
        where('receiverId', '==', userId),
        orderBy('createdAt', 'desc'),
      ),
    ),
  ]);

  const map = new Map<string, Referral>();
  for (const d of asGiver.docs) {
    map.set(d.id, docToTyped<Referral>(d));
  }
  for (const d of asReceiver.docs) {
    map.set(d.id, docToTyped<Referral>(d));
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function updateReferralStatus(
  referralId: string,
  status: Referral['status'],
): Promise<void> {
  await updateDoc(doc(db, 'referrals', referralId), { status });
}

/**
 * Compute dashboard stats for a user:
 * - businessGiven: referrals given with status 'completed'
 * - businessReceived: referrals received with status 'completed'
 * - referralGiven: total referrals given (any status)
 * - referralReceived: total referrals received (any status)
 */
export async function getDashboardStats(
  userId: string,
): Promise<DashboardStats> {
  const [givenSnap, receivedSnap] = await Promise.all([
    getDocs(query(referralsCol, where('giverId', '==', userId))),
    getDocs(query(referralsCol, where('receiverId', '==', userId))),
  ]);

  const given = givenSnap.docs.map((d) => d.data() as Referral);
  const received = receivedSnap.docs.map((d) => d.data() as Referral);

  return {
    referralGiven: given.length,
    referralReceived: received.length,
    businessGiven: given.filter((r) => r.status === 'completed').length,
    businessReceived: received.filter((r) => r.status === 'completed').length,
  };
}

// ---------------------------------------------------------------------------
// Ads
// ---------------------------------------------------------------------------

/**
 * Get active, non-expired ads.
 */
export async function getActiveAds(): Promise<Ad[]> {
  const now = toISO();
  const q = query(
    adsCol,
    where('active', '==', true),
    where('expiresAt', '>=', now),
    orderBy('expiresAt', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToTyped<Ad>(d));
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function getNotifications(
  userId: string,
): Promise<AppNotification[]> {
  const q = query(
    notificationsCol,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToTyped<AppNotification>(d));
}

export async function markNotificationRead(
  notificationId: string,
): Promise<void> {
  await updateDoc(doc(db, 'notifications', notificationId), { read: true });
}

/**
 * Mark all unread notifications for a user as read.
 * Uses a batched write for efficiency.
 */
export async function markAllNotificationsRead(
  userId: string,
): Promise<void> {
  const q = query(
    notificationsCol,
    where('userId', '==', userId),
    where('read', '==', false),
  );
  const snap = await getDocs(q);

  if (snap.empty) return;

  const batch = writeBatch(db);
  for (const d of snap.docs) {
    batch.update(d.ref, { read: true });
  }
  await batch.commit();
}

export async function createNotification(
  notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>,
): Promise<string> {
  const ref = await addDoc(notificationsCol, {
    ...notification,
    read: false,
    createdAt: toISO(),
  });
  return ref.id;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Search businesses by name, tags, or category.
 *
 * Strategy:
 * 1. Prefix-match on `businessName`.
 * 2. Array-contains on `businessTags` (exact tag match).
 * 3. Exact match on `businessCategory`.
 *
 * Results are merged and deduplicated, then returned as SearchResult[].
 *
 * Note: For a production app, consider a dedicated search service
 * (Algolia, Typesense, Meilisearch) or a Cloud Function that
 * maintains a trigram / full-text index.
 */
export async function searchBusinesses(
  queryStr: string,
): Promise<SearchResult[]> {
  if (!queryStr.trim()) return [];

  const searchTerm = queryStr.trim();
  const searchTermLower = searchTerm.toLowerCase();
  const end = searchTerm + '\uf8ff';

  // Run all three queries in parallel
  const [byName, byTag, byCategory] = await Promise.all([
    getDocs(
      query(
        usersCol,
        where('businessName', '>=', searchTerm),
        where('businessName', '<=', end),
        limit(15),
      ),
    ),
    getDocs(
      query(
        usersCol,
        where('businessTags', 'array-contains', searchTermLower),
        limit(15),
      ),
    ),
    getDocs(
      query(
        usersCol,
        where('businessCategory', '==', searchTerm),
        limit(15),
      ),
    ),
  ]);

  const resultsMap = new Map<string, SearchResult>();

  for (const d of byName.docs) {
    const user = { uid: d.id, ...d.data() } as User;
    resultsMap.set(d.id, { id: d.id, type: 'business', user, matchField: 'businessName' });
  }
  for (const d of byTag.docs) {
    if (!resultsMap.has(d.id)) {
      const user = { uid: d.id, ...d.data() } as User;
      resultsMap.set(d.id, { id: d.id, type: 'tag', user, matchField: 'businessTags' });
    }
  }
  for (const d of byCategory.docs) {
    if (!resultsMap.has(d.id)) {
      const user = { uid: d.id, ...d.data() } as User;
      resultsMap.set(d.id, { id: d.id, type: 'category', user, matchField: 'businessCategory' });
    }
  }

  return Array.from(resultsMap.values());
}
