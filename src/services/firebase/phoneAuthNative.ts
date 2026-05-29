/**
 * Native-only phone auth using React Native Firebase.
 * Do not import on web - use phoneAuth.ts which handles platform switching.
 */
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

export type PhoneAuthConfirmation = FirebaseAuthTypes.ConfirmationResult;

export async function signInWithPhoneNumberNative(
  phoneNumber: string,
): Promise<PhoneAuthConfirmation> {
  return auth().signInWithPhoneNumber(phoneNumber);
}

export async function verifyPhoneNumberForLinkingNative(
  phoneNumber: string,
): Promise<PhoneAuthConfirmation> {
  // For linking, we only need the `verificationId` to build a credential later.
  // `signInWithPhoneNumber` returns a `ConfirmationResult` with `verificationId`.
  // `verifyPhoneNumber` returns a listener that requires event subscription, which
  // is not compatible with this Promise-based flow.
  return auth().signInWithPhoneNumber(phoneNumber);
}
