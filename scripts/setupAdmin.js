/**
 * Setup Admin User Script
 *
 * Creates (or restores) an admin user via Firebase REST APIs.
 * - Firebase Auth: creates the user if missing (or signs in if it exists)
 * - RTDB: ensures `users/{uid}` exists with `role: admin|superadmin`
 *
 * Usage:
 *   node scripts/setupAdmin.js --email admin@netconnect.app --password "YOUR_PASSWORD"
 *
 * Optional:
 *   --role admin|superadmin
 *   --apiKey <firebaseWebApiKey>        (defaults from firebase.config.ts)
 *   --projectId <firebaseProjectId>     (defaults from firebase.config.ts)
 *   --rtdbUrl <https://...firebaseio.com>
 *   --noRtdb                            (skip RTDB write)
 *   --noAuth                            (skip Auth create/sign-in; requires --uid)
 *   --uid <existingAuthUid>             (only used with --noAuth)
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function readFirebaseConfigDefaults() {
  try {
    const configPath = path.join(__dirname, '..', 'firebase.config.ts');
    const raw = fs.readFileSync(configPath, 'utf8');
    const apiKeyMatch = raw.match(/apiKey\s*:\s*["']([^"']+)["']/);
    const projectIdMatch = raw.match(/projectId\s*:\s*["']([^"']+)["']/);
    return {
      apiKey: apiKeyMatch ? apiKeyMatch[1] : undefined,
      projectId: projectIdMatch ? projectIdMatch[1] : undefined,
    };
  } catch {
    return { apiKey: undefined, projectId: undefined };
  }
}

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

function generatePassword() {
  // 18-ish chars, URL-safe.
  return crypto.randomBytes(14).toString('base64url');
}

async function signUpOrSignIn() {
  const { API_KEY, ADMIN_EMAIL, ADMIN_PASSWORD } = globalThis.__SETUP_ADMIN_CTX;
  // Try sign up first
  let res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        returnSecureToken: true,
      }),
    },
  );

  let data = await res.json();

  if (data.error && data.error.message === 'EMAIL_EXISTS') {
    console.log('  Auth user already exists, signing in...');
    res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          returnSecureToken: true,
        }),
      },
    );
    data = await res.json();
  }

  if (data.error) {
    const msg = String(data.error.message || 'UNKNOWN');
    if (msg === 'INVALID_PASSWORD' || msg === 'INVALID_LOGIN_CREDENTIALS') {
      throw new Error(
        'Auth error: INVALID_PASSWORD. If the user already exists, reset the password in Firebase Console (Authentication → Users) or delete/recreate the user, then rerun.',
      );
    }
    throw new Error(`Auth error: ${msg}`);
  }

  return { uid: data.localId, idToken: data.idToken };
}

function buildMinimalAdminUser(uid, email, role) {
  const now = new Date().toISOString();
  const normalizedEmail = normalizeEmail(email);
  const name = normalizedEmail === 'admin@netconnect.app' ? 'Admin' : 'Admin';
  return {
    uid,
    email: normalizedEmail,
    name,
    phone: '',
    photoURL: '',
    businessName: 'Admin',
    businessDescription: '',
    businessCategory: '',
    businessTags: [],
    businessPhotos: [],
    socialLinks: { instagram: '', facebook: '', whatsapp: '', linkedin: '' },
    chapterId: '',
    zoneId: '',

    location: { city: '', state: '' },
    dateOfBirth: '',
    language: 'en',
    biometricEnabled: false,
    role,
    leadershipRole: 'member',
    leadershipRolePoints: 0,
    leadershipRoleCity: '',
    isActive: true,
    profileComplete: true,
    createdAt: now,
    updatedAt: now,
  };
}

async function upsertRtdbUser(uid, idToken) {
  const { RTDB_URL, ADMIN_EMAIL, ROLE } = globalThis.__SETUP_ADMIN_CTX;
  const user = buildMinimalAdminUser(uid, ADMIN_EMAIL, ROLE);
  const url = `${RTDB_URL.replace(/\/+$/, '')}/users/${encodeURIComponent(uid)}.json?auth=${encodeURIComponent(idToken)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`RTDB error: ${res.status} ${text || res.statusText}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const defaults = readFirebaseConfigDefaults();

  const ADMIN_EMAIL = normalizeEmail(args.email || process.env.ADMIN_EMAIL || 'admin@netconnect.app');
  const ADMIN_PASSWORD = String(args.password || process.env.ADMIN_PASSWORD || generatePassword());
  const API_KEY = String(args.apiKey || process.env.FIREBASE_API_KEY || defaults.apiKey || '').trim();
  const PROJECT_ID = String(args.projectId || process.env.FIREBASE_PROJECT_ID || defaults.projectId || '').trim();
  const ROLE = String(args.role || process.env.ADMIN_ROLE || 'admin').trim();
  const RTDB_URL = String(
    args.rtdbUrl ||
      process.env.FIREBASE_RTDB_URL ||
      (PROJECT_ID ? `https://${PROJECT_ID}-default-rtdb.firebaseio.com` : ''),
  ).trim();

  const skipAuth = Boolean(args.noAuth);
  const skipRtdb = Boolean(args.noRtdb);
  const providedUid = String(args.uid || '').trim();

  if (!skipAuth && !API_KEY) {
    throw new Error('Missing --apiKey (or FIREBASE_API_KEY). Could not infer it from firebase.config.ts.');
  }
  if (skipAuth && !providedUid) {
    throw new Error('When using --noAuth you must provide --uid <existingAuthUid>.');
  }
  if (!skipRtdb && !RTDB_URL) {
    throw new Error('Missing --rtdbUrl (or FIREBASE_RTDB_URL). Could not infer it from projectId.');
  }
  if (!['admin', 'superadmin'].includes(ROLE)) {
    throw new Error('Invalid --role. Use admin or superadmin.');
  }

  globalThis.__SETUP_ADMIN_CTX = {
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    API_KEY,
    PROJECT_ID,
    RTDB_URL,
    ROLE,
  };

  console.log('Restoring admin user...\n');

  let uid = providedUid;
  let idToken = '';

  if (!skipAuth) {
    console.log('Step 1: Creating / signing in Firebase Auth user...');
    const authResult = await signUpOrSignIn();
    uid = authResult.uid;
    idToken = authResult.idToken;
    console.log(`  UID: ${uid}`);
  } else {
    console.log('Step 1: Skipping Auth (using provided UID)...');
    console.log(`  UID: ${uid}`);
  }

  if (!skipRtdb) {
    if (!idToken) {
      throw new Error('Cannot write RTDB without an idToken. Remove --noAuth or provide valid Firebase auth for REST calls.');
    }
    console.log('\nStep 2: Upserting RTDB user profile...');
    await upsertRtdbUser(uid, idToken);
    console.log('  RTDB user profile written.');
  } else {
    console.log('\nStep 2: Skipping RTDB write.');
  }

  console.log('\n========================================');
  console.log('  Admin user restore complete!');
  console.log('========================================');
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log(`  UID:      ${uid}`);
  console.log(`  Role:     ${ROLE}`);
  console.log(`  RTDB:     ${skipRtdb ? '(skipped)' : 'users/' + uid}`);
  console.log('========================================\n');
}

main().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
