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

## Architecture

**Pages:**
- `/` — Landing page with demo (`frontend/index.html`, `frontend/js/landing.js`)
- `/app/` — Sign-in & dashboard listing recent trees (`frontend/app/index.html`, `frontend/app/app.js`)
- `/tree/?day=YYYY-MM-DD` — Main tree view and entry submission (`frontend/tree/index.html`, `frontend/tree/tree.js`)
- `/tree/admin.html` — Admin panel to create tree docs for next 7 days (`frontend/tree/admin.js`)

**Firestore Data Model:**
```
trees/{dayId}              — openUntil (Timestamp)
  └── entries/{entryId}    — uid, text, name, anonymous, parentId, timestamp
```

**Key Design Decisions:**
- All daily cutoffs use Mountain Time (America/Denver), accounting for DST
- Entries support parent-child relationships (replies) creating hierarchical trees
- Firestore security rules enforce all validation server-side (text length, uid match, entry limits, time-based locking)
- Locked trees use `onSnapshot()` for real-time read-only updates
- Admin status is set via Firebase custom claims (one-time CLI script)

## CI/CD

GitHub Actions workflows auto-deploy:
- Push to `main` → production deploy
- Pull request → preview deploy
