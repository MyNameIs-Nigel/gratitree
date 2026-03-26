// GratiTree landing — demo tree preview (no Firebase; static PoC data)

document.documentElement.style.scrollBehavior = 'smooth';

const TZ = 'America/Denver';

/** Demo entries — Firestore-like shape for shared render helpers */
function mockTs(date) {
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
  };
}

const DEMO_ENTRIES = [
  {
    id: '1',
    text: 'Grateful for morning coffee and quiet time.',
    name: 'Alex',
    anonymous: false,
    parentId: null,
    timestamp: mockTs(new Date(2026, 2, 26, 8, 15)),
  },
  {
    id: '2',
    text: 'Same here — small rituals matter.',
    name: 'Sam',
    anonymous: false,
    parentId: '1',
    timestamp: mockTs(new Date(2026, 2, 26, 9, 5)),
  },
  {
    id: '3',
    text: 'Appreciating my team today.',
    name: 'Jordan',
    anonymous: false,
    parentId: null,
    timestamp: mockTs(new Date(2026, 2, 26, 11, 30)),
  },
];

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
    container.innerHTML = '<span class="placeholder">No entries yet</span>';
    return;
  }
  const roots = buildTree(entries);
  for (const r of roots) {
    container.appendChild(renderTreeNode(r));
  }
}

function showDemoTree() {
  renderTree(DEMO_ENTRIES);
}

document.addEventListener('DOMContentLoaded', () => {
  showDemoTree();
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

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
