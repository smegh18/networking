# NetConnect Cloud Functions

## Email OTP

- **sendEmailOtp**: Generates a 6-digit code, stores it in Firestore `emailOtps`, and adds a document to the `mail` collection so the **Trigger Email from Firestore** extension can send the code to the user.
- **verifyEmailOtp**: Verifies the code, then gets or creates the Firebase Auth user by email and returns a custom token so the client can sign in with `signInWithCustomToken`.

### Setup

1. Install the [Trigger Email from Firestore](https://extensions.dev/extensions/firebase/firestore-send-email) extension in your Firebase project (Authentication → Extensions or Extensions Hub). Configure the extension to use the `mail` collection and your SMTP or email provider.

2. Deploy functions:
   ```bash
   cd functions
   npm install
   cd ..
   firebase deploy --only functions
   ```

3. Ensure your Firebase project has Firestore and Authentication enabled.
