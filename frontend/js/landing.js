import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js';
import { getFirestore, collection, query, orderBy, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';

// smooth scrolling (existing behavior)
document.documentElement.style.scrollBehavior = 'smooth';

// --- Firebase setup (same config used elsewhere) ---
const firebaseConfig = {
  apiKey: "AIzaSyAOksyrIIGh0ugEieJ1cK1B3Idl7qQyQyY",
  authDomain: "gratitree.firebaseapp.com",
  projectId: "gratitree",
  storageBucket: "gratitree.firebasestorage.app",
  messagingSenderId: "517473582832",
  appId: "1:517473582832:web:886f25ecadf981b9d48c35"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const TZ = 'America/Denver';

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

function renderTreeNode(node) {
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
      ${node.children.map((c) => renderTreeNode(c).outerHTML).join('')}
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
  const container = document.getElementById('demoTree');
  container.innerHTML = '';
  if (!entries.length) {
    container.innerHTML = '<span style="color:#aaa;">No entries yet</span>';
    return;
  }
  const roots = buildTree(entries);
  for (const r of roots) {
    container.appendChild(renderTreeNode(r));
  }
}

function subscribeToday() {
  const today = formatDayKey(new Date());
  const entriesRef = collection(db, 'trees', today, 'entries');
  const q = query(entriesRef, orderBy('timestamp', 'asc'));
  onSnapshot(
    q,
    (snap) => {
      const entries = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().timestamp,
      }));
      renderTree(entries);
    },
    (err) => {
      console.error(err);
      const container = document.getElementById('demoTree');
      container.innerHTML = '<span style="color:red;">Failed to load</span>';
    }
  );
}

document.addEventListener('DOMContentLoaded', () => {
  subscribeToday();
  document.getElementById('year').textContent = new Date().getFullYear();

  const signup = document.getElementById('signup');
  if (signup) {
    signup.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = signup.querySelector('input[type="email"]').value.trim();
      if (!email) return;
      alert(`You're on the list! (demo)\n\nEmail: ${email}`);
      signup.reset();
    });
  }
});