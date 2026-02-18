# Creating Tree Metadata Docs

Each day's tree requires a document at `trees/{dayId}` with an `openUntil` timestamp. The tree locks at **12:00 PM Mountain time** on that day.

## Document structure

```
Collection: trees
Document ID: YYYY-MM-DD (e.g. 2025-02-17)
Fields:
  - openUntil: Timestamp (12:00 PM Mountain time on that calendar day)
```

## Creating via Firebase Console

1. Go to Firebase Console → Firestore Database
2. Create collection `trees` (if it doesn't exist)
3. Add document with ID = the date (e.g. `2025-02-17`)
4. Add field `openUntil` (type: timestamp) = noon Mountain on that day

Example for 2025-02-17:
- 12:00 PM MST = 19:00 UTC (February is MST, UTC-7)
- Set `openUntil` to `2025-02-17T19:00:00.000Z`

## Firestore index required

The tree app queries entries by `uid` and `timestamp`. Create a composite index:

- **Collection:** `entries` (under `trees/{dayId}/entries`)
- **Fields:** `uid` (Ascending), `timestamp` (Ascending)

Firebase will show a link in the browser console when the first query runs. You can also add it via Firebase Console → Firestore → Indexes.

## Automated creation (optional)

You can run a script or Cloud Function on a schedule to create tree docs for the next N days. The `openUntil` value for day `YYYY-MM-DD` should be noon Mountain time on that date.
