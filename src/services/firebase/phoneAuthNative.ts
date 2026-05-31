/**
 * Native-only phone auth using React Native Firebase.
 * Do not import on web - use phoneAuth.ts which handles platform switching.
 */
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

export type PhoneAuthConfirmation = FirebaseAuthTypes.ConfirmationResult;
export type PhoneLinkVerification = {
  verificationId: string;
  autoVerifiedCode?: string | null;
};

export async function signInWithPhoneNumberNative(
  phoneNumber: string,
): Promise<PhoneAuthConfirmation> {
  return auth().signInWithPhoneNumber(phoneNumber);
}

export async function verifyPhoneNumberForLinkingNative(
  phoneNumber: string,
  forceResend = true,
): Promise<PhoneLinkVerification> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settleResolve = (value: PhoneLinkVerification) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const settleReject = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    auth()
      .verifyPhoneNumber(phoneNumber, 60, forceResend)
      .on(
        'state_changed',
        (snapshot) => {
          if (snapshot.state === auth.PhoneAuthState.CODE_SENT && snapshot.verificationId) {
            settleResolve({ verificationId: snapshot.verificationId });
            return;
          }

          if (snapshot.state === auth.PhoneAuthState.AUTO_VERIFIED && snapshot.verificationId) {
            settleResolve({
              verificationId: snapshot.verificationId,
              autoVerifiedCode: snapshot.code,
            });
            return;
          }

          if (snapshot.state === auth.PhoneAuthState.ERROR) {
            settleReject(snapshot.error ?? new Error('Phone verification failed. Please try again.'));
          }
        },
        settleReject,
      );
  });
}
