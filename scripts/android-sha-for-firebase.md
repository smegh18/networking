# Get EAS Preview SHA-1 & SHA-256 for Firebase Phone Auth

The **EAS preview** APK is signed with a different key than your local **debug** keystore. Firebase needs the certificate of the app that is actually installed, so you must add the **preview** build’s SHA-1 and SHA-256 in Firebase.

## Option A: Expo dashboard (easiest)

1. Open [expo.dev](https://expo.dev) → your account → **NetConnect** project.
2. Go to **Credentials** (or **Project** → **Credentials**).
3. Select **Android** and the **preview** profile.
4. If Expo shows **Keystore** with SHA-1 / SHA-256, copy both and add them in Firebase (see “Add in Firebase” below).

## Option B: EAS CLI and keytool

If the dashboard doesn’t show SHA fingerprints:

1. In the project root, run:
   ```bash
   eas credentials -p android
   ```
2. Choose the **preview** profile when asked.
3. Select **Download credentials from EAS** → **credentials.json** (upload/download between EAS and local).
4. When done, you’ll have a **keystore** file (path is shown in the CLI or in the downloaded `credentials.json`).
5. Get SHA-1 and SHA-256 from the keystore. You need the **keystore path**, **store password**, and **key alias** (from `credentials.json`). Then run (replace the placeholders):

   **Windows (PowerShell):**
   ```powershell
   keytool -list -v -keystore "C:\path\to\your\keystore.jks" -alias your_key_alias
   ```
   When prompted, enter the **keystore password** (and key password if different).

   Or use the helper script (after you have the keystore path and alias):
   ```powershell
   node scripts/print-android-sha.js "C:\path\to\keystore.jks" your_key_alias
   ```
   The script will prompt for the keystore password and print SHA-1 and SHA-256.

6. Copy the **SHA-1** and **SHA-256** lines from the output.

## Add in Firebase

1. Open [Firebase Console](https://console.firebase.google.com) → your project.
2. **Project settings** (gear) → **Your apps**.
3. Select the Android app with package **com.netconnect.app**.
4. Under **SHA certificate fingerprints**, click **Add fingerprint**.
5. Add the **SHA-1** from the EAS preview keystore, save.
6. Add the **SHA-256** from the EAS preview keystore, save.

No need to re-download `google-services.json` for SHA-only changes. The **existing** EAS preview APK should work for phone auth after this.

## Summary

| Build type   | Key used        | Where to add SHA                          |
|-------------|------------------|-------------------------------------------|
| Local debug | `android/app/debug.keystore` | Firebase Android app (already added)     |
| EAS preview | EAS-managed keystore        | Firebase Android app (add with steps above) |
