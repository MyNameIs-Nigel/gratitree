// GratiTree Admin — Create tree docs for the next 7 days
// Requires admin custom claim (run scripts/set-admin-claim.js)

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  Timestamp,
} from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyAOksyrIIGh0ugEieJ1cK1B3Idl7qQyQyY",
  authDomain: "gratitree.firebaseapp.com",
  projectId: "gratitree",
  storageBucket: "gratitree.firebasestorage.app",
  messagingSenderId: "517473582832",
  appId: "1:517473582832:web:886f25ecadf981b9d48c35",
};

const TZ = 'America/Denver';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function formatDayKey(d) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

// Midnight at the start of the *next* day in Mountain
function midnightMountainAfterDay(dayId) {
  const [y, m, d] = dayId.split('-').map(Number);
  let utc = new Date(Date.UTC(y, m - 1, d + 1, 7, 0, 0, 0));
  const hour = parseInt(
    utc.toLocaleString('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }),
    10
  );
  return new Date(utc.getTime() + (0 - hour) * 60 * 60 * 1000);
}

function buildNext7Days() {
  const now = new Date();
  const opts = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    opts.push({ key: formatDayKey(d) });
  }
  return opts;
}

async function createTreeDocs() {
  const createBtn = document.getElementById('createBtn');
  const statusEl = document.getElementById('createStatus');
  const errorEl = document.getElementById('createError');

  createBtn.disabled = true;
  errorEl.classList.add('hidden');
  statusEl.textContent = 'Creating…';

  const days = buildNext7Days();
  let created = 0;

  try {
    for (const { key } of days) {
      const openUntil = midnightMountainAfterDay(key);
      await setDoc(doc(db, 'trees', key), {
        openUntil: Timestamp.fromDate(openUntil),
      });
      created++;
      statusEl.textContent = `Created ${created} of ${days.length}…`;
    }
    statusEl.textContent = `Done. Created tree docs for ${days.map(d => d.key).join(', ')}.`;
  } catch (err) {
    console.error(err);
    errorEl.textContent = err.message || 'Failed to create tree docs.';
    errorEl.classList.remove('hidden');
    statusEl.textContent = '';
  } finally {
    createBtn.disabled = false;
  }
}

onAuthStateChanged(auth, async (user) => {
  const signedOutView = document.getElementById('signedOutView');
  const signedInView = document.getElementById('signedInView');
  const notAdminView = document.getElementById('notAdminView');
  const adminView = document.getElementById('adminView');

  if (!user) {
    signedOutView.classList.remove('hidden');
    signedInView.classList.add('hidden');
    return;
  }

  signedOutView.classList.add('hidden');
  signedInView.classList.remove('hidden');

  // Force refresh token to get latest custom claims
  const tokenResult = await user.getIdTokenResult(true);
  const isAdmin = tokenResult.claims?.admin === true;

  if (!isAdmin) {
    notAdminView.classList.remove('hidden');
    adminView.classList.add('hidden');
    const uidEl = document.getElementById('userUid');
    if (uidEl) uidEl.textContent = user.uid;
  } else {
    notAdminView.classList.add('hidden');
    adminView.classList.remove('hidden');

    document.getElementById('createBtn').addEventListener('click', createTreeDocs);
  }
});
