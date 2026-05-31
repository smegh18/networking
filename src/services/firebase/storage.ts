import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  UploadMetadata,
} from 'firebase/storage';
import { app, firebaseConfig, storage } from '../../../firebase.config';
import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a local file URI (from expo-image-picker, camera, etc.)
 * into a Blob that can be uploaded to Firebase Storage.
 *
 * On React Native the global `fetch` can resolve `file://` URIs,
 * so we use that rather than trying to read via FileReader.
 */
export async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
}

function normalizeStorageUploadError(error: unknown): Error {
  if (error instanceof Error) {
    const message = error.message || '';
    if (
      Platform.OS === 'web'
      && /cors|preflight|xmlhttprequest|failed|storage\/unknown/i.test(message)
    ) {
      return new Error(
        'Image upload failed on web. Firebase Storage rejected the upload request. Check the Storage bucket configuration and web upload access.',
      );
    }
    return error;
  }

  return new Error('Image upload failed. Please try again.');
}

/**
 * Generic upload helper that converts a local URI to a blob,
 * uploads it to the given storage path, and returns the
 * publicly accessible download URL.
 *
 * @param storagePath  The full path in Firebase Storage (e.g. "profiles/uid.jpg")
 * @param uri          The local file URI to upload.
 * @param contentType  Optional MIME type (defaults to "image/jpeg").
 * @returns            The download URL of the uploaded file.
 */
async function uploadFile(
  storagePath: string,
  uri: string,
  contentType: string = 'image/jpeg',
): Promise<string> {
  const blob = await uriToBlob(uri);
  const metadata: UploadMetadata = { contentType };
  const uploadTargets = Array.from(
    new Set([
      storage,
      getStorage(app, `gs://${firebaseConfig.projectId}.appspot.com`),
      getStorage(app, `gs://${firebaseConfig.projectId}.firebasestorage.app`),
    ]),
  );

  let lastError: Error | null = null;

  for (const storageTarget of uploadTargets) {
    try {
      const storageRef = ref(storageTarget, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, blob, metadata);

      const downloadUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (_snapshot) => {},
          (error) => {
            reject(normalizeStorageUploadError(error));
          },
          async () => {
            try {
              const resolvedDownloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(resolvedDownloadURL);
            } catch (error) {
              reject(normalizeStorageUploadError(error));
            }
          },
        );
      });

      return downloadUrl;
    } catch (error) {
      lastError = normalizeStorageUploadError(error);
    }
  }

  throw lastError || new Error('Image upload failed. Please try again.');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Upload a user's profile photo.
 *
 * Storage path: `profiles/{userId}/photo.jpg`
 *
 * @returns The publicly accessible download URL.
 */
export async function uploadProfilePhoto(
  userId: string,
  uri: string,
): Promise<string> {
  const path = `profiles/${userId}/photo.jpg`;
  return uploadFile(path, uri);
}

/**
 * Upload a business photo for a user.
 *
 * Storage path: `profiles/{userId}/business_{index}.jpg`
 *
 * @param index  The photo index (0-based), used to distinguish
 *               multiple business photos.
 * @returns      The publicly accessible download URL.
 */
export async function uploadBusinessPhoto(
  userId: string,
  uri: string,
  index: number,
): Promise<string> {
  const path = `profiles/${userId}/business_${index}.jpg`;
  return uploadFile(path, uri);
}

/**
 * Upload an image for an event.
 *
 * Storage path: `events/{eventId}/cover.jpg`
 *
 * @returns The publicly accessible download URL.
 */
export async function uploadEventImage(
  eventId: string,
  uri: string,
): Promise<string> {
  const path = `events/${eventId}/cover.jpg`;
  return uploadFile(path, uri);
}

/**
 * Upload an image for an advertisement.
 *
 * Storage path: `ads/{adId}/image.jpg`
 *
 * @returns The publicly accessible download URL.
 */
export async function uploadAdImage(
  adId: string,
  uri: string,
): Promise<string> {
  const path = `ads/${adId}/image.jpg`;
  return uploadFile(path, uri);
}

/**
 * Upload an event image for admin create flow (no eventId yet).
 * Storage path: `admin/events/{timestamp}.jpg`
 *
 * @returns The publicly accessible download URL.
 */
export async function uploadAdminEventImage(uri: string): Promise<string> {
  const path = `admin/events/${Date.now()}.jpg`;
  return uploadFile(path, uri);
}

/**
 * Upload an ad image for admin create flow (no adId yet).
 * Storage path: `admin/ads/{timestamp}.jpg`
 *
 * @returns The publicly accessible download URL.
 */
export async function uploadAdminAdImage(uri: string): Promise<string> {
  const path = `admin/ads/${Date.now()}.jpg`;
  return uploadFile(path, uri);
}
