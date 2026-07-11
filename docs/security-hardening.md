# Security hardening

This app is already in good shape. This doc records what's in place (and how to
verify it yourself) plus the handful of one-time console steps that can't live in
code. None of the code changes here alter app behavior until you opt in.

## Already in place ✅

| Control | Where | Verify it yourself |
| --- | --- | --- |
| Google sign-in gates the app | `src/firebase.ts` | App redirects to sign-in when logged out |
| Firestore rules: **default-deny**, role-based, immutable ledgers | `firestore.rules` (512 lines) | `grep -nE 'if true\|request.time' firestore.rules` → no hits; last block is `allow read, write: if false` |
| Callable functions reject unauthenticated calls | `functions/src/*.ts` | each has `if (!auth) throw new HttpsError('unauthenticated', ...)` |
| Paid AI calls are per-user rate-limited | `geminiGenerate` (200/hr), `extractBill` (100/hr), `translateBatch` | rate-limit transaction on `userQuotas/{uid}` |
| Secret keys never reach the browser | `GEMINI_API_KEY` via `defineSecret` (Secret Manager); Gemini calls proxied through a Cloud Function | `geminiClient.ts` calls `httpsCallable`, not the API directly |
| No Cloud Storage exposure | — | app stores bill image *paths*, not files via the Storage SDK |

Admin is granted **only** by the `users/{uid}` role doc (`role == 'admin'`) — the
old hardcoded owner-email bootstrap in `isAdmin()` was removed (ADR-0007), so no
token claim can confer admin. To bootstrap (or recover) the first admin, set
`role: "admin"` on your own `users/{uid}` doc in the Firebase console — clients
can't escalate roles through the rules. Cloud Functions resolve back-office alert
recipients the same role-based way; the optional `SUPER_ADMIN_EMAIL` env var can
add a recipient by email, and with no admins resolvable the functions skip the
alert and log a warning instead of falling back to a baked-in address.

## To do (one-time, console / CLI)

### 1. Confirm your Firestore rules are actually deployed
`firestore.rules` in the repo is the source of truth, but the project enforces
whatever was **last deployed**, and they can drift.

⚠️ **This project uses a _named_ Firestore database**
(`ai-studio-b87bb121-f3a6-4594-bf8b-d104e1bc3903`), not `(default)` — see
`firestoreDatabaseId` in `firebase-applet-config.json`. A bare
`firebase deploy --only firestore:rules` deploys to `(default)`, which would leave
the database your app actually uses on its old rules. `firebase.json` now declares
that database explicitly (multi-database array form), so the deploy targets it:

```bash
firebase deploy --only firestore:rules
# → deploys firestore.rules to the ai-studio-… database declared in firebase.json
```

Verify in **Firebase console → Firestore →** (switch to the `ai-studio-…`
database) **→ Rules** — it should match `firestore.rules`.

If a `(default)` database also exists in the project, make sure it isn't sitting in
open "test mode": add a `{ "database": "(default)", … }` entry to `firebase.json`
and deploy, or lock it down in the console.

### 2. Restrict the public Firebase web API key
The key (`AIza…` in `firebase-applet-config.json`) is safe to ship — it identifies
the project, it isn't a credential. But restrict it so it can't be reused elsewhere:

**Script (recommended):**
```bash
bash scripts/harden-gcp.sh                       # dry run: lists your keys
# then, with the browser key's UID and your real domain(s):
KEY_ID=<uid> ALLOWED_REFERRERS="https://yourdomain.com/*,http://localhost:*" \
  APPLY=1 bash scripts/harden-gcp.sh
```

**Console (equivalent):** APIs & Services → Credentials → click the browser key →
*Application restrictions* → **HTTP referrers** → add your domains + `http://localhost:*`
→ Save. Optionally set *API restrictions* to only the APIs the SDK uses (verify
usage first; see the script for the list).

### 3. Turn on App Check
The client is **already wired** (`src/firebase.ts`), gated on an env var, so it stays
off until you do this:

1. **Firebase console → App Check → Apps →** register this web app with the
   **reCAPTCHA v3** provider; copy the **site key**.
2. Set `VITE_FIREBASE_APPCHECK_SITE_KEY=<site key>` in your build/deploy environment
   and redeploy. The client now attaches App Check tokens automatically.
3. *(local dev)* In the console, generate a **debug token** and set
   `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=<token>` so localhost/CI pass.
4. Watch **App Check → Metrics** until you see verified traffic from the real app.
5. Only then flip **enforcement ON** for **Firestore** and **Cloud Functions** in the
   console — doing it earlier rejects legitimate users.
6. *(optional, belt-and-suspenders)* enforce inside the callables too — add
   `enforceAppCheck: true` to the `onCall` options of the paid functions:

   ```ts
   // functions/src/geminiGenerate.ts (and extractBill.ts, translation.ts)
   export const geminiGenerate = onCall(
     { secrets: [GEMINI_API_KEY], region: 'us-central1', enforceAppCheck: true, /* ... */ },
     async (request) => { /* ... */ }
   );
   ```

### 4. Auth authorized domains
**Console → Authentication → Settings → Authorized domains** — keep only the domains
you actually serve (remove anything stale). This limits where sign-in can complete.

### Optional: rotate the web API key
Not necessary (it isn't a secret), but if you'd like a clean slate after it sat
unrestricted: create a new browser API key, restrict it (step 2), swap the `apiKey`
in `firebase-applet-config.json`, redeploy, then delete the old key.
