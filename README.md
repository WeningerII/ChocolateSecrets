# Chocolate Secrets

Production-management dashboard for a chocolate & confectionery kitchen — recipes and
costing, inventory, expenses, food safety, and a chocolate-formulation/texture
optimizer — backed by Firebase (Auth, Firestore, Cloud Functions, Hosting) with AI
features (Google Gemini) proxied server-side.

> Originally scaffolded with Google AI Studio:
> https://ai.studio/apps/b87bb121-f3a6-4594-bf8b-d104e1bc3903

## What's inside

- **Recipes & costing** — components/sub-recipes, weighted-average-cost (WAC) ingredient
  costing, and a texture/formulation optimizer (tempering, solid-fat content,
  ice-fraction / recrystallization objectives).
- **Inventory** — receive goods / purchase orders, stock audits, and a
  threshold-driven shopping list.
- **Expenses** — AI bill/receipt extraction, payments, and vendor resolution.
- **Food safety** — allergen and cross-contact tracking.
- **Knowledge library** — reference content with vector embeddings for search.
- **Localization** — multi-language UI via i18next.
- **Access control** — optional Google sign-in with role-based access (admin/staff)
  enforced by Firestore security rules. The app starts in **guest mode** (Firebase
  anonymous auth) so no OAuth setup is needed to use it; Google sign-in only gates
  admin features. Guest mode needs the Anonymous provider enabled once in
  Firebase console → Authentication → Sign-in method (a toggle — no keys).

AI calls run through Cloud Functions (`geminiGenerate`, `extractBill`, `translateBatch`);
the `GEMINI_API_KEY` lives in Secret Manager and never reaches the browser.

## Tech stack

React 19 + Vite 6 + TypeScript, Tailwind CSS 4, React Router 7, i18next, Recharts;
Firebase 12 (Auth, Firestore, Cloud Functions, Hosting). A small Express server
(`server.ts`) wraps Vite for local development only; all backend features —
including the shopping-list email/SMS (Resend / Twilio) — run as Cloud Functions.

## Run locally

**Prerequisites:** Node.js 20+ (CI builds on Node 20).

1. Install dependencies:
   ```bash
   npm install
   ```
   The `postinstall` script also installs `functions/` dependencies, which the root
   type-check (`npm run lint`) and unit tests need — no separate
   `npm --prefix functions install` required.
2. *(Optional)* Configure integrations — the app runs without any of these. Copy the
   template and fill in only what you need:
   ```bash
   cp .env.example .env.local
   ```
   See [Environment variables](#environment-variables). You do **not** set a Gemini key
   here; it is a server-side secret (see [Build & deploy](#build--deploy)).
3. Start the app:
   ```bash
   npm run dev
   ```
   This runs `server.ts` (Express + Vite middleware) at **http://localhost:3000**.

The Firebase web config ships in `firebase-applet-config.json`, so the app connects to
its configured Firebase project — including a **named** Firestore database — out of the
box. To run against the Firebase emulators instead, see [docs/testing.md](docs/testing.md).

## Environment variables

Every variable is **optional** for running the UI; each one enables a specific
integration (see `.env.example`). `VITE_*` variables are loaded from `.env.local` by
Vite and exposed to the browser.

| Variable | Read by | Purpose |
| --- | --- | --- |
| `VITE_USDA_FDC_API_KEY` | client | Live USDA FoodData Central lookups (falls back to a bundled snapshot when absent) |
| `VITE_FIREBASE_APPCHECK_SITE_KEY` / `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN` | client | Optional Firebase App Check (off unless the site key is set) — see [docs/security-hardening.md](docs/security-hardening.md) |

> **Gemini API key — not a client variable.** The Cloud Functions read `GEMINI_API_KEY`
> from Secret Manager (`firebase functions:secrets:set GEMINI_API_KEY`). Do **not** set
> `GEMINI_API_KEY` / `VITE_GEMINI_API_KEY` for the web build — all Gemini calls are
> proxied through the functions. See [docs/deploy-readiness.md](docs/deploy-readiness.md) §6.

> **Shopping-list email/SMS ("Send to Chef")** is served by the `sendShoppingList`
> Cloud Function (ADR-0006), not the dev server. Provider credentials are Secret
> Manager secrets (`firebase functions:secrets:set RESEND_API_KEY` /
> `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`); the non-secret config (`RESEND_FROM`,
> `CHEF_EMAIL`, `TWILIO_PHONE_NUMBER`, `CHEF_PHONE_NUMBER`) is bound as function
> params at deploy time — see [functions/.env.example](functions/.env.example).

## Testing

```bash
npm run lint          # tsc --noEmit (type-check; also covers functions/src)
npm test              # unit / logic tests (vitest)
npm run check:schema  # schema-drift check
```

Firestore rules tests (`npm run test:rules`) and function smoke tests need the Firebase
emulator (Java); end-to-end tests (`npm run test:e2e`) need Playwright/Chrome and a
**non-production** Firebase project. Full matrix and the pre-deploy checklist:
[docs/testing.md](docs/testing.md) and [docs/deploy-readiness.md](docs/deploy-readiness.md).

## Build & deploy

```bash
npm run build         # → dist/
```

- **Firebase Hosting (production):** `firebase deploy --only hosting`. This is the target
  where **Google sign-in works**, because the auth handler is served same-origin.
  Workflow: `.github/workflows/firebase-hosting.yml` (manual; needs a
  `FIREBASE_SERVICE_ACCOUNT` repo secret).
- **GitHub Pages:** `.github/workflows/deploy-pages.yml` builds with
  `BASE_PATH=/ChocolateSecrets/` on push to `main`. Note: Google sign-in is **blocked**
  there (cross-origin auth handler) — use Firebase Hosting for a working signed-in app.
- **Cloud Functions:** `npm --prefix functions ci && npm --prefix functions run build`,
  then `firebase deploy --only functions`. Set the `GEMINI_API_KEY` secret first; for
  shopping-list email/SMS also set the Resend/Twilio secrets and params
  (see [functions/.env.example](functions/.env.example)).
- **Firestore rules** deploy to the **named** database declared in `firebase.json`;
  details in [docs/security-hardening.md](docs/security-hardening.md).

Run the full [deployment readiness checklist](docs/deploy-readiness.md) before any
production deploy.

## Project layout

```
src/         React app (components, pages, hooks, contexts, services, utils, i18n, workers)
functions/   Firebase Cloud Functions (AI proxy, Firestore triggers, payments)
scripts/     Maintenance / migration & check scripts (see package.json)
docs/        Setup, testing, deploy, and security docs
firestore.rules               Default-deny, role-based security rules
firebase-applet-config.json   Firebase web config (named Firestore database)
server.ts                     Express + Vite dev server (development only)
```

## Memory & knowledge graph (Claude Code)

This repo ships a **persistent, two-layer memory system** for Claude Code: a
[Graphify](https://github.com/safishamsi/graphify) code knowledge graph
(`graphify-out/`, queried instead of re-reading files) plus an
[Obsidian](https://obsidian.md) "second brain" vault (`memory/`) for decisions,
domain knowledge, and session logs — wired through the root `CLAUDE.md`,
`.mcp.json`, and the `/resume` · `/save` · `/remember` · `/map` commands.

```bash
bash scripts/setup-memory.sh   # installs Graphify if needed, builds/refreshes the graph
```

Then open `memory/` as an Obsidian vault. Full runbook:
[docs/memory-system.md](docs/memory-system.md).

## Docs

- [docs/memory-system.md](docs/memory-system.md) — Claude Code memory & knowledge-graph setup
- [docs/testing.md](docs/testing.md) — how and where each test runs
- [docs/deploy-readiness.md](docs/deploy-readiness.md) — pre-deploy checklist
- [docs/security-hardening.md](docs/security-hardening.md) — security posture & one-time setup
- [docs/admin-seed.md](docs/admin-seed.md) — seeding the first admin user
- [docs/knowledge-seed.md](docs/knowledge-seed.md) — seed content for the knowledge library
- [docs/pending-features.md](docs/pending-features.md) · [docs/pending-deletions.md](docs/pending-deletions.md) — known deferred work
