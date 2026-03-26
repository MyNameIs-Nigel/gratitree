// app.js — PoC: no Firebase; in-memory gratitude entries (session only)

let entrySeq = 1;
function nextId() {
  return `entry-${Date.now()}-${entrySeq++}`;
}

const memoryEntries = [
  {
    id: nextId(),
    tree: 'Demo-Oak',
    entry: 'Sample gratitude from static demo.',
    date: new Date(),
  },
];

// DOM elements
const form = document.getElementById('entryForm');
const treeInput = document.getElementById('tree');
const entryInput = document.getElementById('entry');
const limitInput = document.getElementById('limit');
const statusEl = document.getElementById('status');
const errorEl = document.getElementById('error');
const listEl = document.getElementById('entriesList');

function formatDate(ts) {
  if (!ts) return 'Pending…';
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleString();
}

function renderEntries(docs) {
  listEl.innerHTML = '';
  for (const doc of docs) {
    const data = doc.data ? doc.data() : doc;
    const li = document.createElement('li');

    li.innerHTML = `
      <div class="meta">
        <strong>Tree:</strong> <span>${escapeHtml(data.tree ?? '')}</span>
        <strong>Date:</strong> <span>${formatDate(data.date)}</span>
      </div>
      <div class="mt-05">${escapeHtml(data.entry ?? '')}</div>
      <div class="muted mt-05">ID: ${escapeHtml(doc.id ?? '')}</div>
    `;

    listEl.appendChild(li);
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getSnapshotDocs() {
  const n = Math.max(1, Math.min(100, Number(limitInput.value || 20)));
  const sorted = [...memoryEntries].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
  const slice = sorted.slice(0, n);
  return slice.map((row) => ({
    id: row.id,
    data: () => ({
      tree: row.tree,
      entry: row.entry,
      date: row.date,
    }),
  }));
}

function subscribeToLatest() {
  statusEl.textContent = `Showing latest ${Math.min(
    memoryEntries.length,
    Math.max(1, Math.min(100, Number(limitInput.value || 20)))
  )} entries (in-memory demo).`;
  errorEl.textContent = '';
  renderEntries(getSnapshotDocs());
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  errorEl.textContent = '';
  statusEl.textContent = 'Saving…';

  const tree = treeInput.value.trim();
  const entry = entryInput.value.trim();

  if (!tree || !entry) {
    errorEl.textContent = 'Tree and Entry are required.';
    statusEl.textContent = '';
    return;
  }

  const id = nextId();
  memoryEntries.push({
    id,
    tree,
    entry,
    date: new Date(),
  });

  statusEl.textContent = 'Saved! (session only — not persisted to a server)';
  entryInput.value = '';
  entryInput.focus();
  subscribeToLatest();
});

limitInput.addEventListener('change', subscribeToLatest);

subscribeToLatest();
