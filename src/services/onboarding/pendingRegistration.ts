import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_REGISTRATION_KEY = 'netconnect_pending_registration';

export type PendingRegistration = {
  uid: string;
  startedAt: string;
};

export async function setPendingRegistration(uid: string): Promise<void> {
  const payload: PendingRegistration = { uid, startedAt: new Date().toISOString() };
  await AsyncStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(payload));
}

export async function getPendingRegistration(): Promise<PendingRegistration | null> {
  const raw = await AsyncStorage.getItem(PENDING_REGISTRATION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingRegistration>;
    if (!parsed || typeof parsed.uid !== 'string' || !parsed.uid) return null;
    return {
      uid: parsed.uid,
      startedAt: typeof parsed.startedAt === 'string' ? parsed.startedAt : '',
    };
  } catch {
    return null;
  }
}

export async function clearPendingRegistration(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_REGISTRATION_KEY);
}

