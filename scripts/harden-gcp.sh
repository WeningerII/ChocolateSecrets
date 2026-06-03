#!/usr/bin/env bash
#
# Harden the Google Cloud project behind ChocolateSecrets.
#
# Focus: restrict the *public* Firebase web API key (the "AIza..." value in
# firebase-applet-config.json) so it can't be reused from other origins. The key is
# safe to ship in the browser by design, but an UNRESTRICTED key can be lifted and
# pointed at your project from anywhere, or used against other billable Google APIs.
#
# Requires the gcloud CLI, signed in as an owner/editor of the project:
#   gcloud auth login
#
# SAFE BY DEFAULT: with no APPLY=1 this only PRINTS what it would do. Review the
# output, then re-run with APPLY=1 to make changes. See docs/security-hardening.md.
#
# Usage:
#   bash scripts/harden-gcp.sh                       # list keys (dry run)
#   KEY_ID=<uid> ALLOWED_REFERRERS="https://yourdomain.com/*,http://localhost:*" \
#     APPLY=1 bash scripts/harden-gcp.sh             # apply referrer restriction
#
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-absolute-pulsar-301421}"
# Every origin that serves the app (no trailing slash on the host; keep the /*).
# localhost lets `npm run dev` keep working.
ALLOWED_REFERRERS="${ALLOWED_REFERRERS:-https://${PROJECT_ID}.web.app/*,https://${PROJECT_ID}.firebaseapp.com/*,http://localhost:*}"
KEY_ID="${KEY_ID:-}"
APPLY="${APPLY:-0}"

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*"; }
run()  {
  echo "+ $*"
  if [ "$APPLY" = "1" ]; then "$@"; else echo "  (dry run — set APPLY=1 to execute)"; fi
}

command -v gcloud >/dev/null || {
  echo "gcloud not found. Install: https://cloud.google.com/sdk/docs/install"; exit 1;
}

gcloud config set project "$PROJECT_ID" >/dev/null

say "1) API keys in $PROJECT_ID — find the BROWSER key (value starts with AIza...):"
gcloud services api-keys list --project="$PROJECT_ID" \
  --format="table(uid, displayName, restrictions.browserKeyRestrictions.allowedReferrers.list())" || \
  warn "Could not list keys (need the API Keys API enabled + apikeys.viewer). Use the console instead."

if [ -z "$KEY_ID" ]; then
  cat <<EOF

Next: copy the browser key's UID from the table above, then re-run to lock it to your origins:
  KEY_ID=<uid> ALLOWED_REFERRERS="https://yourdomain.com/*,http://localhost:*" APPLY=1 bash scripts/harden-gcp.sh
EOF
  exit 0
fi

say "2) Restrict the key to your origins (HTTP referrers):"
echo "   $ALLOWED_REFERRERS"
run gcloud services api-keys update "$KEY_ID" --project="$PROJECT_ID" \
  --allowed-referrers="$ALLOWED_REFERRERS"

say "3) (Optional, do this in the CONSOLE) Restrict the key to ONLY the APIs the web SDK uses."
warn "   Over-restricting here can silently break sign-in or data access — verify usage first"
warn "   under APIs & Services -> Credentials -> <key> -> API restrictions. Typical set:"
cat <<'EOF'
     identitytoolkit.googleapis.com      (Auth)
     securetoken.googleapis.com          (token refresh)
     firestore.googleapis.com            (Firestore)
     firebaseappcheck.googleapis.com     (App Check)
     firebaseinstallations.googleapis.com
     cloudfunctions.googleapis.com       (callable functions)
EOF

say "Done. Reminders that can only be done in the console (see docs/security-hardening.md):"
cat <<'EOF'
  - Deploy the repo's rules so they're actually live:   firebase deploy --only firestore:rules
  - App Check: Firebase console -> App Check -> register the web app (reCAPTCHA v3),
    put the site key in VITE_FIREBASE_APPCHECK_SITE_KEY, redeploy, then — once metrics
    show verified traffic — switch enforcement ON for Firestore + Cloud Functions.
  - Authentication -> Settings -> Authorized domains: keep only domains you serve.
EOF
