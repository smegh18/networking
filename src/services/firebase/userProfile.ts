import type { User as FirebaseUser } from 'firebase/auth';
import { get, ref } from 'firebase/database';
import { rtdb } from '../../../firebase.config';
import type { User } from '../../types';

type UserRecord = Record<string, unknown>;

const normalizeEmail = (value: string | null | undefined): string =>
  String(value ?? '').trim().toLowerCase();

const normalizePhoneDigits = (value: string | null | undefined): string =>
  String(value ?? '').replace(/\D/g, '');

const getPhoneTail = (value: string | null | undefined): string => {
  const digits = normalizePhoneDigits(value);
  return digits.length > 10 ? digits.slice(-10) : digits;
};

function toUser(uid: string, raw: UserRecord): User {
  return {
    ...(raw as unknown as User),
    uid,
  };
}

function userMatchesEmail(raw: UserRecord, email: string): boolean {
  if (!email) return false;
  const candidates = [raw.email, raw.businessEmail, raw.contactEmail];
  return candidates.some((candidate) => normalizeEmail(String(candidate ?? '')) === email);
}

function userMatchesPhone(raw: UserRecord, phoneTail: string): boolean {
  if (!phoneTail) return false;
  const socialLinks =
    raw.socialLinks && typeof raw.socialLinks === 'object'
      ? (raw.socialLinks as Record<string, unknown>)
      : null;
  const candidates = [raw.phone, raw.whatsAppNumber, raw.whatsapp, socialLinks?.whatsapp];
  return candidates.some((candidate) => getPhoneTail(String(candidate ?? '')) === phoneTail);
}

export async function findUserProfileByPhone(phone: string): Promise<User | null> {
  const phoneTail = getPhoneTail(phone);
  if (!phoneTail) return null;

  const usersSnap = await get(ref(rtdb, 'users'));
  if (!usersSnap.exists()) return null;

  const users = usersSnap.val() as Record<string, UserRecord>;
  const match = Object.entries(users).find(([, raw]) => userMatchesPhone(raw, phoneTail));
  return match ? toUser(match[0], match[1]) : null;
}

export async function resolveUserProfileForFirebaseUser(firebaseUser: FirebaseUser): Promise<User | null> {
  const directSnap = await get(ref(rtdb, `users/${firebaseUser.uid}`));
  if (directSnap.exists()) {
    return toUser(firebaseUser.uid, directSnap.val() as UserRecord);
  }
  return null;
}
