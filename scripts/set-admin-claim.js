/**
 * One-time script to grant admin custom claim to a user.
 * Run: node scripts/set-admin-claim.js <UID>
 *
 * Requires:
 *   1. Firebase Admin SDK: npm install firebase-admin
 *   2. Service account key: place at scripts/serviceAccountKey.json
 *      (or set GOOGLE_APPLICATION_CREDENTIALS to its path)
 *
 * Get your UID from Firebase Console → Authentication → Users
 * Or from the admin page when signed in (it shows your UID if not admin).
 */

const admin = require('firebase-admin');
const path = require('path');

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node scripts/set-admin-claim.js <UID>');
  console.error('Get your UID from Firebase Console → Authentication → Users');
  process.exit(1);
}

// Initialize with service account (optional: use default credentials)
const keyPath = path.join(__dirname, 'serviceAccountKey.json');
try {
  const serviceAccount = require(keyPath);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) {
  // Fall back to default credentials (e.g. GOOGLE_APPLICATION_CREDENTIALS)
  admin.initializeApp();
}

async function main() {
  await admin.auth().setCustomUserClaims(uid, { admin: true });
  console.log(`Admin claim set for UID: ${uid}`);
  console.log('The user may need to sign out and sign in again for the claim to take effect.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
