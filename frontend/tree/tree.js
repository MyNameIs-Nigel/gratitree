// GratiTree — Tree view and entry form
// Uses Firebase Auth + Firestore. Tree locks at midnight Mountain time (start of next day).

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyAOksyrIIGh0ugEieJ1cK1B3Idl7qQyQyY",
  authDomain: "gratitree.firebaseapp.com",
  projectId: "gratitree",
  storageBucket: "gratitree.firebasestorage.app",
  messagingSenderId: "517473582832",
  appId: "1:517473582832:web:886f25ecadf981b9d48c35",
};

const TZ = 'America/Denver'; // Mountain time
const MAX_ENTRIES_PER_DAY = 3;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------------------------------------------------------------------------
// Date / dayId helpers (Mountain time)
// ---------------------------------------------------------------------------

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

// Midnight at the start of the *next* day in Mountain (when this day's tree locks)
function midnightMountainAfterDay(dayId) {
  const [y, m, d] = dayId.split('-').map(Number);
  // 07:00 UTC = midnight MST (next day), 06:00 UTC = midnight MDT; start with MST and adjust
  let utc = new Date(Date.UTC(y, m - 1, d + 1, 7, 0, 0, 0));
  const hour = parseInt(
    utc.toLocaleString('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }),
    10
  );
  return new Date(utc.getTime() + (0 - hour) * 60 * 60 * 1000);
}

function isTreeOpen(dayId) {
  return new Date() < midnightMountainAfterDay(dayId);
}

function formatPretty(d) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

function buildDayOptions() {
  const now = new Date();
  const opts = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    opts.push({
      key: formatDayKey(d),
      label: i === 0 ? 'Today' : formatPretty(d),
      isToday: i === 0,
    });
  }
  return opts;
}

// ---------------------------------------------------------------------------
// DOM refs and state
// ---------------------------------------------------------------------------

const els = {
  signedOutView: document.getElementById('signedOutView'),
  signedInView: document.getElementById('signedInView'),
  dayPicker: document.getElementById('dayPicker'),
  treeTitle: document.getElementById('treeTitle'),
  treeSubtitle: document.getElementById('treeSubtitle'),
  openNotice: document.getElementById('openNotice'),
  lockedNotice: document.getElementById('lockedNotice'),
  entryFormSection: document.getElementById('entryFormSection'),
  entryForm: document.getElementById('entryForm'),
  entryText: document.getElementById('entryText'),
  entryName: document.getElementById('entryName'),
  entryAnonymous: document.getElementById('entryAnonymous'),
  parentSelect: document.getElementById('parentSelect'),
  charCount: document.getElementById('charCount'),
  limitNotice: document.getElementById('limitNotice'),
  submitBtn: document.getElementById('submitBtn'),
  treeSection: document.getElementById('treeSection'),
  treeRoot: document.getElementById('treeRoot'),
  emptyTree: document.getElementById('emptyTree'),
  errorEl: document.getElementById('errorEl'),
  userSpan: document.getElementById('userSpan'),
  signOutBtn: document.getElementById('signOutBtn'),
};

let currentDayId = null;
let unsubscribeEntries = null;

function setError(msg) {
  els.errorEl.textContent = msg || '';
  els.errorEl.classList.toggle('show', !!msg);
}

// ---------------------------------------------------------------------------
// URL params for ?day=YYYY-MM-DD
// ---------------------------------------------------------------------------

function getDayFromUrl() {
  const params = new URLSearchParams(location.search);
  const day = params.get('day');
  if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
  return formatDayKey(new Date());
}

function setDayInUrl(dayId) {
  const u = new URL(location.href);
  u.searchParams.set('day', dayId);
  history.replaceState({}, '', u);
}

// ---------------------------------------------------------------------------
// Tree data: build parent→children map
// ---------------------------------------------------------------------------

function buildTree(entries) {
  const map = new Map();
  for (const e of entries) {
    map.set(e.id, { ...e, children: [] });
  }
  const roots = [];
  for (const e of map.values()) {
    const parentId = e.parentId || null;
    if (!parentId || !map.has(parentId)) {
      roots.push(e);
    } else {
      map.get(parentId).children.push(e);
    }
  }
  roots.sort((a, b) => (a.timestamp?.toMillis?.() ?? 0) - (b.timestamp?.toMillis?.() ?? 0));
  return roots;
}

// ---------------------------------------------------------------------------
// Render collapsible tree
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatTime(ts) {
  if (!ts?.toDate) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: 'numeric',
    minute: '2-digit',
  }).format(ts.toDate());
}

function renderTreeNode(node, depth = 0) {
  const hasChildren = node.children && node.children.length > 0;
  const displayName = node.anonymous ? 'Anonymous' : (node.name || 'Anonymous');
  const timeStr = formatTime(node.timestamp);

  const div = document.createElement('div');
  div.className = 'tree-node';
  div.dataset.entryId = node.id;

  div.innerHTML = `
    <div class="tree-node-header">
      <button type="button" class="tree-node-toggle ${hasChildren ? '' : 'empty'}" aria-expanded="true" ${!hasChildren ? 'disabled' : ''}>
        ${hasChildren ? '▼' : '•'}
      </button>
      <div class="tree-node-content">
        <div class="tree-node-text">${escapeHtml(node.text)}</div>
        <div class="tree-node-meta">
          <span>${escapeHtml(displayName)}</span>
          ${timeStr ? `<span>${timeStr}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="tree-node-children">
      ${node.children.map((c) => renderTreeNode(c, depth + 1).outerHTML).join('')}
    </div>
  `;

  const toggle = div.querySelector('.tree-node-toggle');
  const childrenEl = div.querySelector('.tree-node-children');

  if (toggle && hasChildren) {
    toggle.addEventListener('click', () => {
      const collapsed = toggle.classList.toggle('collapsed');
      childrenEl.style.display = collapsed ? 'none' : 'block';
      toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    });
  }

  return div;
}

function renderTree(entries) {
  els.treeRoot.innerHTML = '';
  if (!entries.length) {
    els.emptyTree.classList.remove('hidden');
    return;
  }
  els.emptyTree.classList.add('hidden');
  const roots = buildTree(entries);
  for (const r of roots) {
    els.treeRoot.appendChild(renderTreeNode(r));
  }
}

// ---------------------------------------------------------------------------
// Populate parent selector (only when we have entries — i.e. when tree is readable)
// ---------------------------------------------------------------------------

function fillParentSelect(entries) {
  els.parentSelect.innerHTML = '<option value="">— New root entry —</option>';
  const flat = [];
  function collect(e) {
    flat.push(e);
    (e.children || []).forEach(collect);
  }
  buildTree(entries).forEach(collect);
  for (const e of flat) {
    const text = (e.text || '').slice(0, 50) + (e.text?.length > 50 ? '…' : '');
    els.parentSelect.appendChild(
      new Option(text || '(no text)', e.id)
    );
  }
}

// ---------------------------------------------------------------------------
// Fetch user's entry count for the day (while tree is open)
// ---------------------------------------------------------------------------

async function getUserEntryCount(dayId, uid) {
  const entriesRef = collection(db, 'trees', dayId, 'entries');
  const q = query(
    entriesRef,
    where('uid', '==', uid)
  );
  const snap = await getDocs(q);
  return snap.size;
}

// ---------------------------------------------------------------------------
// Subscribe to entries for a day (only works when tree is closed)
// ---------------------------------------------------------------------------

function subscribeToEntries(dayId) {
  if (unsubscribeEntries) unsubscribeEntries();

  const entriesRef = collection(db, 'trees', dayId, 'entries');
  const q = query(entriesRef, orderBy('timestamp', 'asc'));

  unsubscribeEntries = onSnapshot(
    q,
    (snap) => {
      const entries = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().timestamp,
      }));
      renderTree(entries);
      fillParentSelect(entries);
    },
    (err) => {
      console.error(err);
      setError(`Could not load tree: ${err.message}`);
    }
  );
}

// ---------------------------------------------------------------------------
// Switch day and update UI
// ---------------------------------------------------------------------------

async function switchDay(dayId, user) {
  currentDayId = dayId;
  setDayInUrl(dayId);
  setError('');

  const open = isTreeOpen(dayId);
  const dayOpts = buildDayOptions();
  const opt = dayOpts.find((o) => o.key === dayId);

  els.treeTitle.textContent = opt?.label || dayId;
  els.treeSubtitle.textContent = `${dayId} • ${open ? 'Accepting entries until midnight Mountain' : 'Locked (read-only)'}`;

  // Day picker
  els.dayPicker.innerHTML = '';
  for (const o of dayOpts) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'day-btn' + (o.key === dayId ? ' active' : '');
    btn.textContent = o.label;
    btn.addEventListener('click', () => switchDay(o.key, user));
    els.dayPicker.appendChild(btn);
  }

  if (open) {
    els.openNotice.classList.remove('hidden');
    els.lockedNotice.classList.add('hidden');
    els.entryFormSection.classList.remove('hidden');
    els.treeSection.classList.add('hidden');
    unsubscribeEntries?.();
    unsubscribeEntries = null;

    if (user) {
      const entriesRef = collection(db, 'trees', dayId, 'entries');
      const q = query(
        entriesRef,
        where('uid', '==', user.uid),
        orderBy('timestamp', 'asc')
      );
      const snap = await getDocs(q);
      const entries = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().timestamp,
      }));

      const count = entries.length;
      const atLimit = count >= MAX_ENTRIES_PER_DAY;
      els.limitNotice.classList.toggle('hidden', !atLimit);
      els.submitBtn.disabled = atLimit;
      els.entryForm.querySelectorAll('input, textarea, select').forEach((el) => {
        el.disabled = atLimit;
      });

      fillParentSelect(entries);
    }
  } else {
    els.openNotice.classList.add('hidden');
    els.lockedNotice.classList.remove('hidden');
    els.entryFormSection.classList.add('hidden');
    els.treeSection.classList.remove('hidden');
    subscribeToEntries(dayId);
  }
}

// ---------------------------------------------------------------------------
// Submit entry
// ---------------------------------------------------------------------------

els.entryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user || !currentDayId) return;

  const text = els.entryText.value.trim();
  if (!text) return;

  if (text.length > 120) {
    setError('Entry must be 120 characters or less.');
    return;
  }

  const count = await getUserEntryCount(currentDayId, user.uid);
  if (count >= MAX_ENTRIES_PER_DAY) {
    setError('You\'ve reached the limit of 3 entries for today.');
    return;
  }

  setError('');
  els.submitBtn.disabled = true;

  const parentVal = els.parentSelect.value;
  const parentId = parentVal || null;

  try {
    await addDoc(collection(db, 'trees', currentDayId, 'entries'), {
      uid: user.uid,
      timestamp: serverTimestamp(),
      name: els.entryName.value.trim() || null,
      text,
      anonymous: els.entryAnonymous.checked,
      parentId,
    });

    els.entryText.value = '';
    els.entryName.value = '';
    els.entryAnonymous.checked = false;
    els.parentSelect.selectedIndex = 0;
    updateCharCount();

    const newCount = count + 1;
    if (newCount >= MAX_ENTRIES_PER_DAY) {
      els.limitNotice.classList.remove('hidden');
      els.submitBtn.disabled = true;
      els.entryForm.querySelectorAll('input, textarea, select').forEach((el) => {
        el.disabled = true;
      });
    } else {
      els.submitBtn.disabled = false;
    }
  } catch (err) {
    console.error(err);
    setError(`Could not save: ${err.message}`);
    els.submitBtn.disabled = false;
  }
});

function updateCharCount() {
  const len = els.entryText.value.length;
  els.charCount.textContent = `${len} / 120`;
  els.charCount.classList.toggle('at-limit', len >= 120);
}

els.entryText.addEventListener('input', updateCharCount);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

els.signOutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error(err);
    setError('Could not sign out.');
  }
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    els.signedOutView.classList.remove('hidden');
    els.signedInView.classList.add('hidden');
    return;
  }

  els.signedOutView.classList.add('hidden');
  els.signedInView.classList.remove('hidden');
  els.userSpan.textContent = user.displayName || user.email || '';
  els.userSpan.classList.remove('hidden');
  els.signOutBtn.classList.remove('hidden');

  const dayId = getDayFromUrl();
  switchDay(dayId, user);
});
