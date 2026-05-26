/**
 * Native-only auth using React Native Firebase.
 * Used for getCurrentUser, signOut, onAuthStateChanged on iOS/Android.
 * Do not import on web.
 */
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

export type NativeFirebaseUser = FirebaseAuthTypes.User | null;

export function getCurrentUserNative(): NativeFirebaseUser {
  return auth().currentUser;
}

export function signOutNative(): Promise<void> {
  return auth().signOut();
}

export function onAuthStateChangedNative(
  callback: (user: NativeFirebaseUser) => void,
): () => void {
  return auth().onAuthStateChanged(callback);
}
