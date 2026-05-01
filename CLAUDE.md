# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GratiTree is a free, open-source online gratitude journal. Users submit daily gratitude entries (up to 3/day, max 120 chars each) that grow a visual tree. Trees lock at midnight Mountain Time daily and become publicly readable. Authentication is Google OAuth only.

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (no framework, no bundler, no build step)
- **Backend**: None — all logic is client-side with direct Firestore calls
- **Database**: Cloud Firestore
- **Auth**: Firebase Authentication (Google OAuth)
- **Hosting**: Firebase Hosting (auto-deployed via GitHub Actions)
- **Firebase SDK**: v10.8.1 modular imports via CDN
- **Firebase Project ID**: `gratitree`

## Development Commands

```bash
# Serve locally
firebase serve --only hosting
# Runs at http://localhost:5000

# Alternative: VS Code Live Server (configured on port 5501)

# Deploy manually (usually auto-deployed via GitHub Actions on push to main)
firebase deploy --only hosting

# Grant admin privileges to a user
node scripts/set-admin-claim.js <USER_UID>
# Requires: npm install firebase-admin, serviceAccountKey.json in scripts/
```

There are no automated tests, no linter, and no build step. Files are served as-is.

## File Structure

```
gratitree/
├── frontend/                           # Served by Firebase Hosting
│   ├── index.html                      # Landing page (hero, how-it-works, demo, team)
│   ├── 404.html                        # Custom 404 error page
│   ├── app/
│   │   ├── index.html                  # Dashboard / sign-in page (logic inline)
│   │   └── app.js                      # LEGACY POC code — not used in production
│   ├── tree/
│   │   ├── index.html                  # Main tree view and entry submission
│   │   ├── tree.js                     # Core tree app logic
│   │   ├── admin.html                  # Admin panel UI
│   │   └── admin.js                    # Creates tree metadata docs for next 7 days
│   ├── js/
│   │   └── landing.js                  # Landing page demo tree (real-time, read-only)
│   ├── styles/
│   │   └── styles.css                  # Global stylesheet (~500 lines, CSS variables)
│   └── images/
│       ├── favicon.ico
│       ├── logo.png
│       └── landing_bg.jpg
│
├── scripts/
│   ├── set-admin-claim.js              # CLI: sets admin custom claim on a Firebase user
│   └── create-tree-docs.md            # Manual instructions for creating tree docs
│
├── .github/workflows/
│   ├── firebase-hosting-merge.yml      # Auto-deploy to production on push to main
│   └── firebase-hosting-pull-request.yml  # Preview deploy on pull request
│
├── firebase.json                       # Hosting config (public: frontend, 404 rewrite)
├── .firebaserc                         # Project: gratitree
├── firestore.rules                     # All server-side validation lives here
├── package.json                        # firebase-admin dependency (scripts only)
└── .vscode/settings.json              # Live Server port 5501
```

## Architecture

### Pages

| Route | Files | Notes |
|-------|-------|-------|
| `/` | `frontend/index.html`, `frontend/js/landing.js` | Landing page with live read-only demo tree |
| `/app/` | `frontend/app/index.html` | Dashboard listing last 6 trees; logic is inline JS in the HTML file |
| `/tree/?day=YYYY-MM-DD` | `frontend/tree/index.html`, `frontend/tree/tree.js` | Main tree view and entry submission |
| `/tree/admin.html` | `frontend/tree/admin.html`, `frontend/tree/admin.js` | Admin panel (requires Firebase custom claim) |

> **Note:** `frontend/app/app.js` is legacy POC code that uses a different collection name (`gratitude`) and data model. It is not loaded by any page and should be ignored.

### Firestore Data Model

```
trees/{dayId}                — openUntil: Timestamp  (midnight Mountain Time)
  └── entries/{entryId}      — uid, text, name, anonymous, parentId, timestamp
```

- `dayId` format: `YYYY-MM-DD` (e.g., `2025-02-17`)
- `parentId`: null for root entries, entry ID string for replies
- `anonymous`: if true, display "Anonymous" instead of `name`
- `timestamp`: server timestamp set via `serverTimestamp()`

**Required Firestore Index:**
- Collection: `entries` (under `trees/{dayId}`)
- Fields: `uid` (Ascending), `timestamp` (Ascending)
- Used by `getUserEntryCount()` to enforce the 3 root entries/day limit

### Key Design Decisions

- All daily cutoffs use Mountain Time (`America/Denver`), accounting for DST
- Entries support parent-child relationships (replies), creating hierarchical trees
- Firestore security rules enforce all server-side validation: text length, uid match, time-based locking
- Both open and locked trees use `onSnapshot()` for real-time updates
- Admin status uses Firebase custom claims (`admin: true`), not a Firestore field
- Users are limited to 3 **root** entries per day; replies are unlimited
- Tree metadata documents (`trees/{dayId}`) must be created before users can submit — use the admin panel at `/tree/admin.html`

## Firestore Security Rules Summary

- **`trees/{dayId}`** — readable only when locked (after `openUntil`); writable only by admins
- **`trees/{dayId}/entries/{entryId}`** — always publicly readable; writable only when signed in, tree is open, uid matches auth user, text is 1-120 chars
- Entries are immutable once created (`update` and `delete` are denied)

## CSS Architecture (`frontend/styles/styles.css`)

Uses CSS custom properties for theming:

```css
--primary: #2a8f6b         /* Brand green */
--primary-strong: #197a58  /* Darker green (hover) */
--accent: #7cc4a9          /* Lighter green accent */
--ink: #102a26             /* Primary text */
--muted: #4f6b66           /* Secondary text */
--card-bg: rgba(255,255,255,0.68)  /* Glassmorphism card */
```

Key patterns: glassmorphism (`backdrop-filter: blur`), gradient backgrounds, responsive grids with `auto-fit` / `clamp()`.

Utility classes: `.hidden`, `.btn`, `.btn-primary`, `.btn-ghost`, `.text-center`, `.text-primary`, `.small-muted`, `.break-all`.

## CI/CD

GitHub Actions workflows auto-deploy:
- Push to `main` → production deploy (channel: `live`)
- Pull request → preview deploy with URL commented on PR

Both use the `FIREBASE_SERVICE_ACCOUNT_GRATITREE` GitHub secret.

## Admin Workflow

1. Sign in to the app with the admin Google account
2. Navigate to `/tree/admin.html`
3. If not yet an admin, copy your UID from the page and run:
   ```bash
   node scripts/set-admin-claim.js <YOUR_UID>
   ```
   Then sign out and back in to refresh the token.
4. Click "Create tree docs for next 7 days" — this creates `trees/{YYYY-MM-DD}` documents with the correct `openUntil` timestamp for each day.

Tree docs must exist for a day before any user can submit entries for that day.

## Mountain Time Calculations

All time zone logic uses `Intl.DateTimeFormat` with `timeZone: 'America/Denver'` (handles DST automatically). The `openUntil` timestamp for a given `dayId` is the UTC equivalent of midnight Mountain Time at the start of the **next** day.

Example: for `dayId = "2025-02-17"`, `openUntil` = `2025-02-18T07:00:00.000Z` (UTC, during MST/UTC-7).
