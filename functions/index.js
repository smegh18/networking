const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp({
  databaseURL: "https://bbcn-networking-default-rtdb.firebaseio.com"
});

const FIRESTORE = admin.firestore();
const AUTH = admin.auth();
const RTDB = admin.database();

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_LENGTH = 6;

const DEFAULT_COUNTRY_CODE = '+91';
const DEFAULT_CHAPTER_ID = 'chapter001';

function generateOtp() {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
}

function sanitizeEmailForDocId(email) {
  return (email || '').trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhoneDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function getPhoneTail(value) {
  const digits = normalizePhoneDigits(value);
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function normalizePhoneE164(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('+')) return raw;
  const digits = normalizePhoneDigits(raw);
  if (!digits) return '';
  if (digits.length === 10) return `${DEFAULT_COUNTRY_CODE}${digits}`;
  // If caller provided country code digits without '+', assume it's already complete.
  return `+${digits}`;
}

async function findRtdbUidByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return '';
  const snap = await RTDB.ref('users').once('value');
  if (!snap.exists()) return '';
  const users = snap.val() || {};
  for (const [uid, raw] of Object.entries(users)) {
    const u = raw || {};
    const candidates = [u.email, u.businessEmail, u.contactEmail];
    if (candidates.some((c) => normalizeEmail(c) === normalized)) {
      return String(uid);
    }
  }
  return '';
}

async function findRtdbUidByPhone(value) {
  const phoneTail = getPhoneTail(value);
  if (!phoneTail) return '';
  const snap = await RTDB.ref('users').once('value');
  if (!snap.exists()) return '';
  const users = snap.val() || {};
  for (const [uid, raw] of Object.entries(users)) {
    const u = raw || {};
    const socialLinks = u.socialLinks && typeof u.socialLinks === 'object' ? u.socialLinks : null;
    const candidates = [u.phone, u.whatsAppNumber, u.whatsapp, socialLinks && socialLinks.whatsapp];
    if (candidates.some((c) => getPhoneTail(c) === phoneTail)) {
      return String(uid);
    }
  }
  return '';
}

/**
 * Callable: sendEmailOtp
 * Body: { email: string }
 * Generates a 6-digit OTP, stores it in Firestore, and queues an email via the "mail" collection.
 * Install the Firebase "Trigger Email from Firestore" extension so emails are sent when
 * documents are added to the "mail" collection (see extension docs for exact schema).
 */
exports.sendEmailOtp = functions.region('us-central1').https.onCall(async (data, context) => {
  const email = (data && data.email) ? String(data.email).trim().toLowerCase() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid email is required.');
  }

  const code = generateOtp();
  const docId = sanitizeEmailForDocId(email);
  const expiresAt = Date.now() + OTP_EXPIRY_MS;

  await FIRESTORE.collection('emailOtps').doc(docId).set({
    code,
    email,
    expiresAt,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Queue email: add a document to "mail" for the "Trigger Email from Firestore" extension.
  // Extension schema: https://github.com/firebase/extensions/tree/master/firestore-send-email
  await FIRESTORE.collection('mail').add({
    to: email,
    message: {
      subject: 'Your NetConnect verification code',
      text: `Your verification code is: ${code}\n\nIt expires in 10 minutes.\n\nIf you didn't request this, you can ignore this email.`,
      html: `<p>Your verification code is: <strong>${code}</strong></p><p>It expires in 10 minutes.</p><p>If you didn't request this, you can ignore this email.</p>`,
    },
  });

  return { success: true };
});

/**
 * Callable: verifyEmailOtp
 * Body: { email: string, code: string }
 * Verifies the OTP, then gets or creates the Firebase Auth user by email and returns a custom token.
 */
exports.verifyEmailOtp = functions.region('us-central1').https.onCall(async (data, context) => {
  const email = (data && data.email) ? String(data.email).trim().toLowerCase() : '';
  const code = (data && data.code) ? String(data.code).trim().replace(/\D/g, '') : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid email is required.');
  }
  if (code.length !== OTP_LENGTH) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid or expired code.');
  }

  const docId = sanitizeEmailForDocId(email);
  const otpRef = FIRESTORE.collection('emailOtps').doc(docId);
  const otpSnap = await otpRef.get();
  if (!otpSnap.exists) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid or expired code.');
  }
  const { code: storedCode, expiresAt } = otpSnap.data();
  if (storedCode !== code || (expiresAt && expiresAt < Date.now())) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid or expired code.');
  }
  await otpRef.delete();

  // If a profile already exists in RTDB for this email, prefer that UID so Auth + RTDB stay aligned.
  const rtdbUid = await findRtdbUidByEmail(email);

  let uid = '';
  if (rtdbUid) {
    uid = rtdbUid;
    try {
      const record = await AUTH.getUser(uid);
      if (!record.email) {
        await AUTH.updateUser(uid, { email, emailVerified: true });
      }
    } catch (e) {
      if (e && e.code === 'auth/user-not-found') {
        await AUTH.createUser({ uid, email, emailVerified: true });
      } else {
        throw new functions.https.HttpsError('internal', 'Auth error.');
      }
    }
  } else {
    try {
      const userRecord = await AUTH.getUserByEmail(email);
      uid = userRecord.uid;
    } catch (e) {
      if (e && e.code === 'auth/user-not-found') {
        const newUser = await AUTH.createUser({ email, emailVerified: true });
        uid = newUser.uid;
      } else {
        throw new functions.https.HttpsError('internal', 'Auth error.');
      }
    }
  }

  const token = await AUTH.createCustomToken(uid);
  return { token };
});

/**
 * Callable: verifyEmailOtpAndAttach
 * Body: { email: string, code: string }
 * Verifies the OTP, then attaches the verified email to the currently signed-in Auth user.
 * Used by phone-first registration so the Firebase Auth account is created with phone first.
 */
exports.verifyEmailOtpAndAttach = functions.region('us-central1').https.onCall(async (data, context) => {
  let uid = context.auth && context.auth.uid ? String(context.auth.uid) : '';
  const idToken = data && data.idToken ? String(data.idToken) : '';
  if (!uid && idToken) {
    try {
      const decoded = await AUTH.verifyIdToken(idToken);
      uid = decoded.uid;
    } catch (e) {
      throw new functions.https.HttpsError('unauthenticated', 'Phone verification session expired. Please restart registration.');
    }
  }

  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
  }

  const email = (data && data.email) ? String(data.email).trim().toLowerCase() : '';
  const code = (data && data.code) ? String(data.code).trim().replace(/\D/g, '') : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid email is required.');
  }
  if (code.length !== OTP_LENGTH) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid or expired code.');
  }

  try {
    const existingAuthUser = await AUTH.getUserByEmail(email);
    if (existingAuthUser.uid !== uid) {
      throw new functions.https.HttpsError('already-exists', 'This email is already registered. Please login instead.');
    }
  } catch (e) {
    if (e instanceof functions.https.HttpsError) throw e;
    if (!e || e.code !== 'auth/user-not-found') {
      throw new functions.https.HttpsError('internal', 'Auth error.');
    }
  }

  const rtdbUid = await findRtdbUidByEmail(email);
  if (rtdbUid && rtdbUid !== uid) {
    throw new functions.https.HttpsError('already-exists', 'This email is already registered. Please login instead.');
  }

  const docId = sanitizeEmailForDocId(email);
  const otpRef = FIRESTORE.collection('emailOtps').doc(docId);
  const otpSnap = await otpRef.get();
  if (!otpSnap.exists) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid or expired code.');
  }
  const { code: storedCode, expiresAt } = otpSnap.data();
  if (storedCode !== code || (expiresAt && expiresAt < Date.now())) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid or expired code.');
  }

  await AUTH.updateUser(uid, { email, emailVerified: true });
  await otpRef.delete();

  return { email };
});

/**
 * Callable: checkIdentifiers
 * Body: { email?: string, phone?: string, excludeUid?: string }
 * Checks whether the email/phone are already used in Firebase Auth or RTDB.
 */
exports.checkIdentifiers = functions.region('us-central1').https.onCall(async (data) => {
  const excludeUid = data && data.excludeUid ? String(data.excludeUid) : '';
  const email = data && data.email ? normalizeEmail(data.email) : '';
  const phoneE164 = data && data.phone ? normalizePhoneE164(data.phone) : '';
  const phoneTail = getPhoneTail(data && data.phone ? data.phone : '');

  let emailAuthUid = '';
  if (email) {
    try {
      const u = await AUTH.getUserByEmail(email);
      emailAuthUid = u.uid;
    } catch (e) {
      if (!e || e.code !== 'auth/user-not-found') throw new functions.https.HttpsError('internal', 'Auth error.');
    }
  }

  let phoneAuthUid = '';
  if (phoneE164) {
    try {
      const u = await AUTH.getUserByPhoneNumber(phoneE164);
      phoneAuthUid = u.uid;
    } catch (e) {
      if (!e || e.code !== 'auth/user-not-found') throw new functions.https.HttpsError('internal', 'Auth error.');
    }
  }

  const rtdbEmailUid = email ? await findRtdbUidByEmail(email) : '';
  const rtdbPhoneUid = phoneTail ? await findRtdbUidByPhone(phoneTail) : '';

  const emailInUse = !!((emailAuthUid && emailAuthUid !== excludeUid) || (rtdbEmailUid && rtdbEmailUid !== excludeUid));
  const phoneInUse = !!((phoneAuthUid && phoneAuthUid !== excludeUid) || (rtdbPhoneUid && rtdbPhoneUid !== excludeUid));

  return {
    emailInUse,
    phoneInUse,
    emailUid: emailAuthUid || rtdbEmailUid || '',
    phoneUid: phoneAuthUid || rtdbPhoneUid || '',
  };
});

/**
 * Callable: syncMyAccount
 * Ensures the signed-in user's RTDB profile exists, and syncs Auth fields (email/phone/displayName)
 * from RTDB -> Auth. Helps repair drift for older accounts where Auth lacked phone/email updates.
 */
exports.syncMyAccount = functions.region('us-central1').https.onCall(async (_data, context) => {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
  }

  const uid = String(context.auth.uid);
  const authUser = await AUTH.getUser(uid);

  const userRef = RTDB.ref(`users/${uid}`);
  const snap = await userRef.once('value');
  if (!snap.exists()) {
    await userRef.set({
      uid,
      email: authUser.email || '',
      phone: authUser.phoneNumber ? getPhoneTail(authUser.phoneNumber) : '',
      name: authUser.displayName || '',
      profileComplete: false,
      chapterId: DEFAULT_CHAPTER_ID,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _authSync: { source: 'syncMyAccount', at: admin.database.ServerValue.TIMESTAMP },
    });
    return { ok: true, createdProfile: true };
  }

  const profile = snap.val() || {};
  const nextEmail = normalizeEmail(profile.email);
  const nextPhoneE164 = normalizePhoneE164(profile.phone);
  const nextName = String(profile.name || '').trim();

  const updates = {};
  if (nextEmail && nextEmail !== normalizeEmail(authUser.email)) {
    updates.email = nextEmail;
    updates.emailVerified = true;
  }
  if (nextPhoneE164 && nextPhoneE164 !== String(authUser.phoneNumber || '')) {
    updates.phoneNumber = nextPhoneE164;
  }
  if (nextName && nextName !== String(authUser.displayName || '')) {
    updates.displayName = nextName;
  }

  if (Object.keys(updates).length > 0) {
    await AUTH.updateUser(uid, updates);
  }

  await userRef.child('_authSync').set({
    source: 'syncMyAccount',
    at: admin.database.ServerValue.TIMESTAMP,
  });

  return { ok: true, updatedAuth: Object.keys(updates).length > 0 };
});

/**
 * Auth trigger: ensure RTDB has a user record stub for new Auth accounts.
 * This prevents "Auth exists but RTDB missing" conflicts when users abandon signup mid-way.
 */
exports.onAuthUserCreated = functions.region('us-central1').auth.user().onCreate(async (user) => {
  const uid = user.uid;
  const userRef = RTDB.ref(`users/${uid}`);
  const snap = await userRef.once('value');
  if (snap.exists()) return;

  await userRef.set({
    uid,
    email: user.email || '',
    phone: user.phoneNumber ? getPhoneTail(user.phoneNumber) : '',
    name: user.displayName || '',
    profileComplete: false,
    chapterId: DEFAULT_CHAPTER_ID,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _authSync: { source: 'auth.onCreate', at: admin.database.ServerValue.TIMESTAMP },
  });
});

/**
 * Auth trigger: remove RTDB profile when an Auth user is deleted.
 */
exports.onAuthUserDeleted = functions.region('us-central1').auth.user().onDelete(async (user) => {
  const uid = user.uid;
  await RTDB.ref(`users/${uid}`).remove();
});

/**
 * RTDB trigger: keep Firebase Auth in sync with the RTDB user profile.
 * - If /users/{uid} is deleted: delete Auth user (if any).
 * - If email/phone/name changes: update Auth user record.
 * - If Auth user is missing but RTDB has a profile: create Auth user with that UID.
 */
exports.onRtdbUserWrite = functions.region('us-central1').database.ref('/users/{uid}').onWrite(async (change, context) => {
  const uid = String(context.params.uid);

  if (!change.after.exists()) {
    try {
      await AUTH.deleteUser(uid);
    } catch (e) {
      if (!e || e.code !== 'auth/user-not-found') {
        console.error('[onRtdbUserWrite] deleteUser failed:', uid, e);
      }
    }
    return null;
  }

  const after = change.after.val() || {};
  const before = change.before.exists() ? (change.before.val() || {}) : {};

  if (!String(after.chapterId || '').trim()) {
    await change.after.ref.update({ chapterId: DEFAULT_CHAPTER_ID });
  }

  // Notify admins when a user completes registration and requires approval.
  try {
    const becameProfileComplete = before.profileComplete !== true && after.profileComplete === true;
    const requiresApproval = after.isActive === false;
    if (becameProfileComplete && requiresApproval) {
      const usersSnap = await RTDB.ref('users').once('value');
      const usersVal = usersSnap.val() || {};
      const adminUids = Object.entries(usersVal)
        .filter(([, user]) => user && (user.role === 'admin' || user.role === 'superadmin'))
        .map(([adminUid]) => adminUid);

      const nowIso = new Date().toISOString();
      const title = 'New registration pending approval';
      const displayName = String(after.name || '').trim() || 'New user';
      const displayEmail = String(after.email || '').trim() || uid;
      const body = `${displayName} (${displayEmail}) is waiting for approval.`;

      const updates = {};
      adminUids.forEach((adminUid) => {
        const key = RTDB.ref('notifications').push().key;
        if (!key) return;
        updates[`notifications/${key}`] = {
          userId: adminUid,
          type: 'system',
          title,
          body,
          data: { kind: 'approval_request', uid, email: displayEmail, name: displayName },
          read: false,
          createdAt: nowIso,
        };
      });
      if (Object.keys(updates).length > 0) {
        await RTDB.ref().update(updates);
      }
    }
  } catch (e) {
    console.error('[onRtdbUserWrite] approval notification failed:', uid, e);
  }

  const nextEmail = normalizeEmail(after.email);
  const prevEmail = normalizeEmail(before.email);
  const nextPhoneE164 = normalizePhoneE164(after.phone);
  const prevPhoneE164 = normalizePhoneE164(before.phone);
  const nextName = String(after.name || '').trim();
  const prevName = String(before.name || '').trim();

  let userRecord = null;
  try {
    userRecord = await AUTH.getUser(uid);
  } catch (e) {
    if (e && e.code === 'auth/user-not-found') {
      // Create Auth user if RTDB profile exists without Auth account.
      const createPayload = {
        uid,
        ...(nextEmail ? { email: nextEmail, emailVerified: true } : {}),
        ...(nextPhoneE164 ? { phoneNumber: nextPhoneE164 } : {}),
        ...(nextName ? { displayName: nextName } : {}),
      };
      try {
        userRecord = await AUTH.createUser(createPayload);
      } catch (createErr) {
        console.error('[onRtdbUserWrite] createUser failed:', uid, createErr);
        return null;
      }
    } else {
      console.error('[onRtdbUserWrite] getUser failed:', uid, e);
      return null;
    }
  }

  const updates = {};
  if (nextEmail && nextEmail !== normalizeEmail(userRecord.email)) {
    updates.email = nextEmail;
    updates.emailVerified = true;
  }
  if (nextPhoneE164 && nextPhoneE164 !== String(userRecord.phoneNumber || '')) {
    updates.phoneNumber = nextPhoneE164;
  }
  if (nextName && nextName !== String(userRecord.displayName || '')) {
    updates.displayName = nextName;
  }

  if (Object.keys(updates).length === 0) return null;

  try {
    await AUTH.updateUser(uid, updates);
    await change.after.ref.child('_authSync').set({
      source: 'rtdb.onWrite',
      at: admin.database.ServerValue.TIMESTAMP,
    });
  } catch (e) {
    const code = e && typeof e.code === 'string' ? e.code : '';
    console.error('[onRtdbUserWrite] updateUser failed:', uid, code);

    // If admin tries to set an email/phone already used elsewhere, revert the RTDB field to avoid drift.
    const revert = {};
    if (code === 'auth/email-already-exists' && nextEmail && prevEmail) {
      revert.email = prevEmail;
    }
    if (code === 'auth/phone-number-already-exists' && nextPhoneE164 && prevPhoneE164) {
      revert.phone = normalizePhoneDigits(prevPhoneE164).slice(-10);
    }
    await change.after.ref.child('_authSync').set({
      source: 'rtdb.onWrite',
      at: admin.database.ServerValue.TIMESTAMP,
      error: code || 'auth/update-failed',
    });
    if (Object.keys(revert).length > 0) {
      await change.after.ref.update(revert);
    }
  }

  return null;
});

/**
 * Mirror RTDB meetings to Firestore.
 */
exports.mirrorMeetingToFirestore = functions.region('us-central1').database.ref('/meetings/{meetingId}').onWrite(async (change, context) => {
  const meetingId = context.params.meetingId;
  const after = change.after.val();

  if (!change.after.exists()) {
    await FIRESTORE.collection('meetings').doc(meetingId).delete();
    return null;
  }

  if (after._source === 'firestore') {
    // Remove the flag so it doesn't linger
    await change.after.ref.update({ _source: null });
    return null;
  }

  await FIRESTORE.collection('meetings').doc(meetingId).set({
    ...after,
    _source: 'rtdb'
  }, { merge: true });

  return null;
});

/**
 * Mirror Firestore meetings to RTDB.
 */
exports.mirrorMeetingToRtdb = functions.region('us-central1').firestore.document('meetings/{meetingId}').onWrite(async (change, context) => {
  const meetingId = context.params.meetingId;
  const after = change.after.data();

  if (!change.after.exists) {
    await RTDB.ref(`meetings/${meetingId}`).remove();
    return null;
  }

  if (after._source === 'rtdb') {
    await change.after.ref.update({ _source: admin.firestore.FieldValue.delete() });
    return null;
  }

  await RTDB.ref(`meetings/${meetingId}`).update({
    ...after,
    _source: 'firestore'
  });

  return null;
});

/**
 * HTTP Endpoint to one-time sync existing chapters and meetings from RTDB to Firestore.
 */
exports.syncRtdbToFirestore = functions.region('us-central1').https.onRequest(async (req, res) => {
  try {
    const chaptersSnap = await RTDB.ref('chapters').once('value');
    if (chaptersSnap.exists()) {
      const chapters = chaptersSnap.val();
      for (const [id, data] of Object.entries(chapters)) {
        await FIRESTORE.collection('chapters').doc(id).set(data);
      }
    }

    const meetingsSnap = await RTDB.ref('meetings').once('value');
    if (meetingsSnap.exists()) {
      const meetings = meetingsSnap.val();
      for (const [id, data] of Object.entries(meetings)) {
        await FIRESTORE.collection('meetings').doc(id).set(data);
      }
    }

    res.send("Sync complete! Chapters and meetings have been copied to Firestore.");
  } catch (error) {
    res.status(500).send(error.toString());
  }
});

/**
 * RTDB trigger: send push notification via Expo Push API
 * when a new notification is added to /notifications/{notificationId}
 */
exports.sendPushNotification = functions.region('us-central1').database.ref('/notifications/{notificationId}').onCreate(async (snap, context) => {
  const notificationId = context.params.notificationId;
  const data = snap.val();
  
  if (!data || !data.userId || !data.title) {
    return null;
  }
  
  try {
    const userSnap = await RTDB.ref(`users/${data.userId}/pushToken`).once('value');
    if (!userSnap.exists()) {
      console.log(`No push token for user ${data.userId}`);
      return null;
    }
    
    const pushToken = userSnap.val();
    if (!pushToken || !String(pushToken).startsWith('ExponentPushToken[')) {
      console.log(`Invalid push token for user ${data.userId}: ${pushToken}`);
      return null;
    }
    
    const message = {
      to: pushToken,
      sound: 'default',
      title: data.title,
      body: data.body,
      data: data.data || {},
    };
    
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    
    const receipt = await response.json();
    console.log(`Push sent to ${data.userId}, response:`, JSON.stringify(receipt));
    
    await snap.ref.update({ pushStatus: 'sent' });
  } catch (err) {
    console.error(`Error sending push to ${data.userId}:`, err);
    await snap.ref.update({ pushStatus: 'error' });
  }
  
  return null;
});

/**
 * Callable: setPresidentCredentials
 * Body: { targetUid: string, password: string }
 * Sets the password for a given user and emails them their credentials.
 * Only accessible by global admins.
 */
exports.setPresidentCredentials = functions.region('us-central1').https.onCall(async (data, context) => {
  const callerUid = context.auth && context.auth.uid;
  if (!callerUid) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }

  const { targetUid, password } = data || {};
  if (!targetUid || !password) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing targetUid or password.');
  }

  // Verify caller is admin or superadmin
  const callerSnap = await RTDB.ref(`users/${callerUid}/role`).once('value');
  const role = callerSnap.val();
  if (role !== 'admin' && role !== 'superadmin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can perform this action.');
  }

  // Get target user's email
  const targetSnap = await RTDB.ref(`users/${targetUid}/email`).once('value');
  const email = targetSnap.val();
  if (!email) {
    throw new functions.https.HttpsError('not-found', 'Target user email not found.');
  }

  // Update Auth password
  try {
    await AUTH.updateUser(targetUid, { password });
  } catch (err) {
    throw new functions.https.HttpsError('internal', `Failed to update password: ${err.message}`);
  }

  // Queue email via Trigger Email extension
  await FIRESTORE.collection('mail').add({
    to: email,
    message: {
      subject: 'Welcome! Your Chapter President Login Credentials',
      text: `Congratulations on being chosen as a Chapter President!\n\nYour login credentials for the admin panel are:\nEmail: ${email}\nPassword: ${password}\n\nPlease keep this secure.`,
      html: `<p>Congratulations on being chosen as a Chapter President!</p><p>Your login credentials for the admin panel are:</p><ul><li><strong>Email:</strong> ${email}</li><li><strong>Password:</strong> ${password}</li></ul><p>Please keep this secure.</p>`,
    },
  });

  return { success: true };
});
