# Creating Tree Metadata Docs

Each day's tree requires a document at `trees/{dayId}` with an `openUntil` timestamp. The tree locks at **midnight Mountain time** (start of the next calendar day).

## Document structure

```
Collection: trees
Document ID: YYYY-MM-DD (e.g. 2025-02-17)
Fields:
  - openUntil: Timestamp (midnight Mountain time = 00:00 on the *next* day)
```

## Creating via Firebase Console

1. Go to Firebase Console → Firestore Database
2. Create collection `trees` (if it doesn't exist)
3. Add document with ID = the date (e.g. `2025-02-17`)
4. Add field `openUntil` (type: timestamp) = midnight Mountain at the start of the *next* day

Example for 2025-02-17 (tree locks at start of 2025-02-18):
- Midnight MST (start of Feb 18) = 07:00 UTC (February is MST, UTC-7)
- Set `openUntil` to `2025-02-18T07:00:00.000Z`

## Firestore index required

The tree app queries entries by `uid` and `timestamp`. Create a composite index:

- **Collection:** `entries` (under `trees/{dayId}/entries`)
- **Fields:** `uid` (Ascending), `timestamp` (Ascending)

Firebase will show a link in the browser console when the first query runs. You can also add it via Firebase Console → Firestore → Indexes.

## Automated creation (optional)

You can run a script or Cloud Function on a schedule to create tree docs for the next N days. The `openUntil` value for day `YYYY-MM-DD` should be midnight Mountain time at the start of the next day (e.g. for 2025-02-17 use 2025-02-18 00:00 America/Denver).
