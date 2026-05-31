import { Platform } from 'react-native';
import {
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
  NextOrObserver,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../../../firebase.config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EMAIL_STORAGE_KEY = 'netconnect_signin_email';

const sendEmailOtpCallable = httpsCallable<{ email: string }, { success: boolean }>(functions, 'sendEmailOtp');
const verifyEmailOtpCallable = httpsCallable<{ email: string; code: string }, { token: string }>(functions, 'verifyEmailOtp');
const verifyEmailOtpAndAttachCallable = httpsCallable<{ email: string; code: string; idToken?: string }, { email: string }>(
  functions,
  'verifyEmailOtpAndAttach',
);
const checkIdentifiersCallable = httpsCallable<
  { email?: string; phone?: string; excludeUid?: string },
  { emailInUse: boolean; phoneInUse: boolean; emailUid?: string; phoneUid?: string }
>(functions, 'checkIdentifiers');
const syncMyAccountCallable = httpsCallable<void, { ok: boolean; createdProfile?: boolean; updatedAuth?: boolean }>(
  functions,
  'syncMyAccount',
);

/**
 * Send a 6-digit OTP to the user's email (via Cloud Function).
 */
export async function sendOTPEmail(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  try {
    await sendEmailOtpCallable({ email: normalized });
  } catch (err: unknown) {
    const code = err && typeof (err as { code?: string }).code === 'string' ? (err as { code: string }).code : '';
    const msg = err && typeof (err as { message?: string }).message === 'string' ? (err as { message: string }).message : 'Request failed';
    throw new Error(code === 'unavailable' ? 'Network error. Check your connection and that the app is using the correct Firebase project.' : msg);
  }
  await AsyncStorage.setItem(EMAIL_STORAGE_KEY, normalized);
}

/**
 * Verify the email OTP and sign in with a custom token.
 * Returns the signed-in Firebase user.
 * On native: uses React Native Firebase for auth.
 */
export async function verifyEmailOtpAndSignIn(email: string, code: string): Promise<FirebaseUser> {
  const normalized = email.trim().toLowerCase();
  const codeDigits = code.replace(/\D/g, '');
  const { data } = await verifyEmailOtpCallable({ email: normalized, code: codeDigits });
  const token = (data as { token: string }).token;
  if (Platform.OS !== 'web') {
    const authNative = require('@react-native-firebase/auth').default;
    const userCred = await authNative().signInWithCustomToken(token);
    await AsyncStorage.setItem(EMAIL_STORAGE_KEY, normalized);
    return userCred.user as unknown as FirebaseUser;
  }
  const credential = await signInWithCustomToken(auth, token);
  await AsyncStorage.setItem(EMAIL_STORAGE_KEY, normalized);
  return credential.user;
}

/**
 * Verify an email OTP and attach the verified email to the current phone-auth user.
 */
export async function verifyEmailOtpAndAttach(email: string, code: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const codeDigits = code.replace(/\D/g, '');
  let idToken = '';
  if (Platform.OS !== 'web') {
    const authNative = require('@react-native-firebase/auth').default;
    idToken = await authNative().currentUser?.getIdToken() ?? '';
  } else {
    idToken = await auth.currentUser?.getIdToken() ?? '';
  }

  try {
    const { data } = await verifyEmailOtpAndAttachCallable({ email: normalized, code: codeDigits, idToken });
    return (data as { email: string }).email;
  } catch (err: unknown) {
    const rawCode = err && typeof (err as { code?: string }).code === 'string' ? (err as { code: string }).code : '';
    const message = err && typeof (err as { message?: string }).message === 'string'
      ? (err as { message: string }).message
      : 'Email verification failed. Please try again.';

    if (rawCode === 'functions/not-found' || rawCode === 'not-found' || message === 'not-found') {
      throw new Error('Email verification backend is not deployed yet. Deploy Cloud Functions and try again.');
    }
    if (rawCode === 'functions/unauthenticated' || rawCode === 'unauthenticated') {
      throw new Error('Your phone login session expired. Please restart registration and verify your phone again.');
    }
    throw err;
  }
}

export async function checkIdentifiersAvailability(args: {
  email?: string;
  phone?: string;
  excludeUid?: string;
}): Promise<{ emailInUse: boolean; phoneInUse: boolean; emailUid?: string; phoneUid?: string }> {
  try {
    const { data } = await checkIdentifiersCallable(args);
    return data as { emailInUse: boolean; phoneInUse: boolean; emailUid?: string; phoneUid?: string };
  } catch (err: unknown) {
    const code = err && typeof (err as { code?: string }).code === 'string' ? (err as { code: string }).code : '';
    const msg = err && typeof (err as { message?: string }).message === 'string' ? (err as { message: string }).message : 'Request failed';
    throw new Error(code === 'unavailable' ? 'Network error. Please try again.' : msg);
  }
}

export async function syncMyAccount(): Promise<void> {
  try {
    await syncMyAccountCallable();
  } catch {
    // Non-fatal; auth/profile sync can be retried later.
  }
}

/**
 * Retrieve the email that was stored when sendOTPEmail was called.
 */
export async function getStoredSignInEmail(): Promise<string | null> {
  return AsyncStorage.getItem(EMAIL_STORAGE_KEY);
}

/**
 * Sign in with email and password (development / demo fallback).
 * This is useful during development when email link sign-in
 * cannot be tested easily (e.g. Expo Go, simulators).
 * On native: uses React Native Firebase.
 */
export async function signInWithEmailPassword(
  email: string,
  password: string,
): Promise<FirebaseUser> {
  if (Platform.OS !== 'web') {
    const authNative = require('@react-native-firebase/auth').default;
    const userCred = await authNative().signInWithEmailAndPassword(email, password);
    return userCred.user as unknown as FirebaseUser;
  }
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/**
 * Sign the current user out of Firebase.
 * On native: uses React Native Firebase.
 */
export async function signOut(): Promise<void> {
  if (Platform.OS !== 'web') {
    const { signOutNative } = require('./authNative');
    await signOutNative();
    return;
  }
  await firebaseSignOut(auth);
}

/**
 * Get the currently authenticated Firebase user, or null.
 * On native: uses React Native Firebase (for phone auth compatibility).
 */
export function getCurrentUser(): FirebaseUser | null {
  if (Platform.OS !== 'web') {
    const { getCurrentUserNative } = require('./authNative');
    const nativeUser = getCurrentUserNative();
    if (!nativeUser) return null;
    return nativeUser as unknown as FirebaseUser;
  }
  return auth.currentUser;
}

/**
 * Subscribe to auth state changes.
 * On native: uses React Native Firebase.
 *
 * @param callback  Called with the Firebase user (or null) whenever
 *                  the auth state changes.
 * @returns         An unsubscribe function.
 */
export function onAuthStateChanged(
  callback: NextOrObserver<FirebaseUser | null>,
): () => void {
  if (Platform.OS !== 'web') {
    const { onAuthStateChangedNative } = require('./authNative');
    return onAuthStateChangedNative((user) => {
      const fn = typeof callback === 'function' ? callback : callback.next;
      if (fn) fn(user as unknown as FirebaseUser | null);
    });
  }
  return firebaseOnAuthStateChanged(auth, callback);
}

/**
 * Delete the currently authenticated Firebase user (best-effort).
 * On native: uses React Native Firebase.
 */
export async function deleteCurrentUser(): Promise<void> {
  if (Platform.OS !== 'web') {
    const authNative = require('@react-native-firebase/auth').default as () => { currentUser: { delete: () => Promise<void> } | null };
    const user = authNative().currentUser;
    if (user) await user.delete();
    return;
  }
  const user = auth.currentUser;
  if (user) await user.delete();
}
