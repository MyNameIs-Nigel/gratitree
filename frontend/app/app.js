// app.js (Firestore POC)
// Uses Firebase Web SDK (modular) via CDN imports

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit as limitQ,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * 1) 🔧 UPDATE THIS:
 * Paste your Firebase Web App config here
 * Firebase Console → Project settings → Your apps → Web app → Config
 */
const firebaseConfig = {
  apiKey: "AIzaSyAOksyrIIGh0ugEieJ1cK1B3Idl7qQyQyY",
  authDomain: "gratitree.firebaseapp.com",
  projectId: "gratitree",
  storageBucket: "gratitree.firebasestorage.app",
  messagingSenderId: "517473582832",
  appId: "1:517473582832:web:886f25ecadf981b9d48c35"
};
// 2) Initialize Firebase + Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 3) 🔧 UPDATE THIS IF YOU WANT A DIFFERENT COLLECTION NAME
const ENTRIES_COLLECTION = "treeEntries";

// DOM elements
const form = document.getElementById("entryForm");
const treeInput = document.getElementById("tree");
const entryInput = document.getElementById("entry");
const limitInput = document.getElementById("limit");
const statusEl = document.getElementById("status");
const errorEl = document.getElementById("error");
const listEl = document.getElementById("entriesList");

// Helper: format Firestore timestamp
function formatDate(ts) {
  // ts can be null briefly while serverTimestamp resolves
  if (!ts) return "Pending…";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString();
}

// Render list
function renderEntries(docs) {
  listEl.innerHTML = "";
  for (const doc of docs) {
    const data = doc.data();
    const li = document.createElement("li");

    li.innerHTML = `
      <div class="meta">
        <strong>Tree:</strong> <span>${escapeHtml(data.tree ?? "")}</span>
        <strong>Date:</strong> <span>${formatDate(data.date)}</span>
      </div>
      <div style="margin-top:.5rem">${escapeHtml(data.entry ?? "")}</div>
      <div class="muted" style="margin-top:.5rem">Doc ID: ${doc.id}</div>
    `;

    listEl.appendChild(li);
  }
}

// Basic HTML escaping to prevent injection when rendering
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Live query subscription
let unsubscribe = null;

function subscribeToLatest() {
  // unsubscribe prior listener
  if (typeof unsubscribe === "function") unsubscribe();

  const n = Math.max(1, Math.min(100, Number(limitInput.value || 20)));

  const q = query(
    collection(db, "gratitude"),
    orderBy("date", "desc"),
    limitQ(n)
  );

  statusEl.textContent = `Listening for latest ${n} entries…`;
  errorEl.textContent = "";

  unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      renderEntries(snapshot.docs);
    },
    (err) => {
      console.error(err);
      errorEl.textContent = `Read failed: ${err.message}`;
    }
  );
}

// Handle form submit (create entry)
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";
  statusEl.textContent = "Saving…";

  const tree = treeInput.value.trim();
  const entry = entryInput.value.trim();

  if (!tree || !entry) {
    errorEl.textContent = "Tree and Entry are required.";
    statusEl.textContent = "";
    return;
  }

  try {
    await addDoc(collection(db, "gratitude"), {
      tree,
      entry,
      // Firestore timestamp (set by server)
      date: serverTimestamp()
    });

    statusEl.textContent = "Saved!";
    entryInput.value = "";
    entryInput.focus();
  } catch (err) {
    console.error(err);
    errorEl.textContent = `Write failed: ${err.message}`;
    statusEl.textContent = "";
  }
});

// Re-subscribe when limit changes
limitInput.addEventListener("change", subscribeToLatest);

// Start listener on load
subscribeToLatest();