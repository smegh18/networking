import { Platform } from 'react-native';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  linkWithCredential,
  updatePhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import { auth } from '../../../firebase.config';
import { getCurrentUser } from './auth';

const RECAPTCHA_CONTAINER_ID = 'recaptcha-container';
let webRecaptchaVerifier: RecaptchaVerifier | null = null;

function getErrorCode(err: unknown): string {
  return err && typeof err === 'object' && typeof (err as { code?: unknown }).code === 'string'
    ? (err as { code: string }).code
    : '';
}

function getPhoneTail(value: string | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '').slice(-10);
}

function normalizeNativePhoneAuthError(err: unknown): Error {
  const code =
    err && typeof err === 'object' && typeof (err as { code?: unknown }).code === 'string'
      ? (err as { code: string }).code
      : '';
  const message =
    err && typeof err === 'object' && typeof (err as { message?: unknown }).message === 'string'
      ? (err as { message: string }).message
      : 'Failed to send OTP. Please try again.';
  const normalizedMessage = `${message}`.toLowerCase();

  if (
    code === 'auth/invalid-app-credential'
    || code === 'auth/app-not-authorized'
    || normalizedMessage.includes('invalid playintegrity token')
    || normalizedMessage.includes('app not recognized by play store')
    || normalizedMessage.includes('no recaptcha enterprise sitekey')
    || normalizedMessage.includes('recaptcha enterprise')
  ) {
    return new Error(
      'Phone verification is blocked on this Android build because Firebase Play Integrity / reCAPTCHA is not configured correctly. Please install the app from the Play Store or use the email OTP flow instead.',
    );
  }

  if (code === 'auth/captcha-check-failed') {
    return new Error(
      'Firebase app verification failed while sending OTP. Check Android SHA fingerprints in Firebase and rebuild the app.',
    );
  }

  if (code === 'auth/too-many-requests') {
    return new Error('Too many OTP requests were made from this device/number. Please wait and try again later.');
  }

  return new Error(code ? `${message} (${code})` : message);
}

export function getWebRecaptchaVerifier(containerId?: string): RecaptchaVerifier {
  const id = containerId ?? RECAPTCHA_CONTAINER_ID;
  if (!webRecaptchaVerifier) {
    webRecaptchaVerifier = new RecaptchaVerifier(auth, id, {
      size: 'invisible',
    });
  }
  return webRecaptchaVerifier;
}

export function getRecaptchaContainerId(): string {
  return RECAPTCHA_CONTAINER_ID;
}

export function resetWebRecaptchaVerifier(): void {
  if (!webRecaptchaVerifier) return;
  webRecaptchaVerifier.clear();
  webRecaptchaVerifier = null;
}

async function sendPhoneOtpOnWeb(phoneE164: string): Promise<ConfirmationResult> {
  try {
    const verifier = getWebRecaptchaVerifier(RECAPTCHA_CONTAINER_ID);
    return await signInWithPhoneNumber(auth, phoneE164, verifier);
  } catch (err) {
    const code = getErrorCode(err);
    if (code === 'auth/captcha-check-failed' || code === 'auth/argument-error' || code === 'auth/internal-error') {
      resetWebRecaptchaVerifier();
      const verifier = getWebRecaptchaVerifier(RECAPTCHA_CONTAINER_ID);
      return await signInWithPhoneNumber(auth, phoneE164, verifier);
    }
    throw err;
  }
}

/** Result type: web uses ConfirmationResult; native uses RN Firebase ConfirmationResult */
export type PhoneOtpResult = ConfirmationResult | { confirm: (code: string) => Promise<any> };
export type PhoneLinkOtpResult = ConfirmationResult | { verificationId: string; autoVerifiedCode?: string | null };

/**
 * Send SMS OTP to the given E.164 phone number (for sign-in).
 * On web: uses invisible reCAPTCHA.
 * On native: uses React Native Firebase (no reCAPTCHA modal needed).
 */
export async function sendPhoneOtp(
  phoneE164: string,
  _recaptcha?: unknown,
): Promise<PhoneOtpResult | null> {
  if (Platform.OS === 'web') {
    return sendPhoneOtpOnWeb(phoneE164);
  }
  try {
    const { signInWithPhoneNumberNative } = require('./phoneAuthNative');
    return await signInWithPhoneNumberNative(phoneE164);
  } catch (err) {
    console.error('[phoneAuth] Native sendPhoneOtp failed:', err);
    throw normalizeNativePhoneAuthError(err);
  }
}

/**
 * Send SMS OTP for linking phone to existing account (e.g. during registration).
 * On web: same as sendPhoneOtp (returns verificationId for linkWithCredential).
 * On native: uses React Native Firebase signInWithPhoneNumber to obtain a verificationId.
 */
export async function sendPhoneOtpForLinking(
  phoneE164: string,
  _recaptcha?: unknown,
  forceResend = true,
): Promise<PhoneLinkOtpResult | null> {
  if (Platform.OS === 'web') {
    return sendPhoneOtpOnWeb(phoneE164);
  }
  try {
    const { verifyPhoneNumberForLinkingNative } = require('./phoneAuthNative');
    const result = await verifyPhoneNumberForLinkingNative(phoneE164, forceResend);
    // RN Firebase types allow `verificationId` to be null; treat that as a hard error
    // so the UI can show a meaningful message instead of silently failing later.
    if (!result?.verificationId) {
      throw new Error(
        'Could not start phone verification for this device/build. Please rebuild the Android app after verifying Firebase Phone Auth setup (SHA fingerprints + google-services.json).',
      );
    }
    return result;
  } catch (err) {
    console.error('[phoneAuth] Native sendPhoneOtpForLinking failed:', err);
    throw normalizeNativePhoneAuthError(err);
  }
}

/**
 * Verify the SMS code and link the phone number to the current user (email OTP signed-in).
 * On web: uses Firebase JS SDK.
 * On native: uses React Native Firebase.
 */
export async function verifyPhoneOtpAndLink(
  verificationId: string,
  code: string,
  expectedPhoneE164?: string,
): Promise<void> {
  const codeDigits = code.replace(/\D/g, '');
  if (Platform.OS === 'web') {
    const user = getCurrentUser();
    if (!user) throw new Error('You must be signed in to verify your phone number.');
    const credential = PhoneAuthProvider.credential(verificationId, codeDigits);

    // If the user already has a phone provider linked, Firebase will throw
    // "provider-already-linked" on link. In that case we want to *update*
    // the phone number for the current user instead.
    const alreadyHasPhoneProvider =
      user.providerData?.some((p) => p?.providerId === 'phone') || !!user.phoneNumber;

    if (alreadyHasPhoneProvider) {
      if (expectedPhoneE164 && getPhoneTail(user.phoneNumber) === getPhoneTail(expectedPhoneE164)) {
        return;
      }
      await updatePhoneNumber(user, credential);
      return;
    }

    await linkWithCredential(user, credential);
    return;
  }
  try {
    const authNative = require('@react-native-firebase/auth').default;
    const { PhoneAuthProvider } = require('@react-native-firebase/auth');
    const credential = PhoneAuthProvider.credential(verificationId, codeDigits);
    const currentUser = authNative().currentUser;
    if (!currentUser) throw new Error('You must be signed in to verify your phone number.');

    const alreadyHasPhoneProvider =
      (currentUser.providerData || []).some((p: { providerId?: string } | null) => p?.providerId === 'phone')
      || !!currentUser.phoneNumber;

    if (alreadyHasPhoneProvider && typeof currentUser.updatePhoneNumber === 'function') {
      if (expectedPhoneE164 && getPhoneTail(currentUser.phoneNumber) === getPhoneTail(expectedPhoneE164)) {
        return;
      }
      await currentUser.updatePhoneNumber(credential);
      return;
    }

    await currentUser.linkWithCredential(credential);
  } catch (err) {
    console.error('[phoneAuth] Native verifyPhoneOtpAndLink failed:', err);
    throw err;
  }
}
