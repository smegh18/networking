import { get, ref, update } from 'firebase/database';
import { rtdb } from '../../../firebase.config';
import type { Event, EventCheckInRecord, EventCheckInSource, EventCheckInStatus, User } from '../../types';

const PHONE_DIGITS = /\D/g;
export type AttendanceUserIdentity = Pick<User, 'uid' | 'name' | 'phone' | 'email'>;

const LATE_THRESHOLD_MINUTES = 15;

function getEventStartMs(event: Event): number | null {
  const datePart = String(event.date || '').split('T')[0];
  const timePart = String(event.time || '').trim();
  if (!datePart || !timePart) return null;
  const start = new Date(`${datePart}T${timePart}:00`);
  const ms = start.getTime();
  return Number.isNaN(ms) ? null : ms;
}

function computeStatusFromRecordedAt(event: Event, recordedAtIso: string): EventCheckInStatus {
  const startMs = getEventStartMs(event);
  const recordedMs = new Date(recordedAtIso).getTime();
  if (!startMs || Number.isNaN(recordedMs)) return 'present';
  const diff = recordedMs - startMs;
  return diff > LATE_THRESHOLD_MINUTES * 60 * 1000 ? 'late' : 'present';
}

const normalizePhone = (value: string | null | undefined): string =>
  String(value ?? '').replace(PHONE_DIGITS, '');

const normalizeEmail = (value: string | null | undefined): string =>
  String(value ?? '').trim().toLowerCase();

function getPhoneTail(value: string | null | undefined): string {
  const digits = normalizePhone(value);
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function parseScannerPayload(rawValue: string): { eventId?: string; userId?: string; value: string } {
  const value = rawValue.trim();
  const attendanceMatch = value.match(/^netconnect:attendance:([^:]+):([^:]+)$/i);
  if (attendanceMatch) {
    return { eventId: attendanceMatch[1], userId: attendanceMatch[2], value };
  }

  const userMatch = value.match(/^netconnect:user:([^:]+)$/i);
  if (userMatch) {
    return { userId: userMatch[1], value };
  }

  return { value };
}

export function formatAttendanceLocalInput(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseAttendanceLocalInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function formatAttendanceDisplay(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function resolveScannedUser(
  users: User[],
  rawValue: string,
  eventId?: string,
): User | null {
  const parsed = parseScannerPayload(rawValue);
  const normalizedValue = parsed.userId ?? parsed.value;
  const normalizedEmail = normalizeEmail(normalizedValue);
  const phoneTail = getPhoneTail(normalizedValue);

  if (parsed.eventId && eventId && parsed.eventId !== eventId) {
    return null;
  }

  return users.find((user) => {
    if (parsed.userId && user.uid === parsed.userId) return true;
    if (user.uid === normalizedValue) return true;
    if (normalizedEmail && normalizeEmail(user.email) === normalizedEmail) return true;
    if (phoneTail && getPhoneTail(user.phone) === phoneTail) return true;
    return false;
  }) ?? null;
}

export async function saveEventCheckInRecord(args: {
  eventId: string;
  user: AttendanceUserIdentity;
  status: EventCheckInStatus;
  recordedAt: string;
  source: EventCheckInSource;
  updatedBy?: string;
}): Promise<EventCheckInRecord> {
  const snap = await get(ref(rtdb, `events/${args.eventId}`));
  if (!snap.exists()) {
    throw new Error('Event not found.');
  }

  const event = { id: args.eventId, ...(snap.val() as Omit<Event, 'id'>) } as Event;
  const normalizedStatus: EventCheckInStatus =
    args.status === 'absent' ? 'absent' : computeStatusFromRecordedAt(event, args.recordedAt);

  const checkedIn = new Set(event.checkedInUsers || []);
  if (normalizedStatus === 'present' || normalizedStatus === 'late') {
    checkedIn.add(args.user.uid);
  } else {
    checkedIn.delete(args.user.uid);
  }

  const now = new Date().toISOString();
  const nextRecord: EventCheckInRecord = {
    ...(event.attendanceRecords?.[args.user.uid] || {}),
    status: normalizedStatus,
    recordedAt: args.recordedAt,
    updatedAt: now,
    source: args.source,
    updatedBy: args.updatedBy,
    userName: args.user.name,
    userPhone: args.user.phone,
    userEmail: args.user.email,
  };

  await update(ref(rtdb, `events/${args.eventId}`), {
    attendanceRecords: {
      ...(event.attendanceRecords || {}),
      [args.user.uid]: nextRecord,
    },
    checkedInUsers: Array.from(checkedIn),
    updatedAt: now,
  });

  return nextRecord;
}
