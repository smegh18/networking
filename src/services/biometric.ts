import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CREDENTIALS_KEY = 'netconnect_biometric_email';

// ---------------------------------------------------------------------------
// Biometric Availability
// ---------------------------------------------------------------------------

/**
 * Check whether the device has biometric hardware and whether the
 * user has enrolled at least one biometric credential.
 *
 * @returns `true` if biometric authentication can be used.
 */
export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

/**
 * Human-readable description of the biometric type(s) available on
 * the device. Returns `null` if no biometrics are available.
 *
 * Possible values: "Fingerprint", "Facial Recognition",
 * "Iris", or a comma-separated combination.
 */
export async function getBiometricType(): Promise<string | null> {
  const types =
    await LocalAuthentication.supportedAuthenticationTypesAsync();

  if (types.length === 0) return null;

  const labels = types.map((type) => {
    switch (type) {
      case LocalAuthentication.AuthenticationType.FINGERPRINT:
        return 'Fingerprint';
      case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
        return 'Facial Recognition';
      case LocalAuthentication.AuthenticationType.IRIS:
        return 'Iris';
      default:
        return 'Biometric';
    }
  });

  return labels.join(', ');
}

// ---------------------------------------------------------------------------
// Biometric Authentication
// ---------------------------------------------------------------------------

/**
 * Prompt the user to authenticate using their device biometric
 * (fingerprint, face, iris).
 *
 * @returns `true` if authentication succeeded, `false` otherwise.
 */
export async function authenticateWithBiometric(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Authenticate to continue',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false, // allow PIN/pattern as fallback
    fallbackLabel: 'Use Passcode',
  });

  return result.success;
}

// ---------------------------------------------------------------------------
// Secure Credential Storage
// ---------------------------------------------------------------------------

/**
 * Persist the user's email in the device secure store.
 * This email is used to auto-fill the login form when
 * the user authenticates via biometrics.
 */
export async function saveCredentials(email: string): Promise<void> {
  await SecureStore.setItemAsync(CREDENTIALS_KEY, email, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

/**
 * Retrieve the stored email from the secure store.
 *
 * @returns The stored email, or `null` if none is saved.
 */
export async function getCredentials(): Promise<string | null> {
  return SecureStore.getItemAsync(CREDENTIALS_KEY);
}

/**
 * Remove the stored email from the secure store.
 * Should be called when the user disables biometric login
 * or signs out.
 */
export async function clearCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
}
