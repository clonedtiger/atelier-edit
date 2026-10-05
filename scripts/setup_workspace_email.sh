#!/usr/bin/env bash
#
# Sets up Atelier Edit's outgoing email through Google Workspace.
#
# Walks through the steps only you can do (Workspace sign-up, DNS at Fasthosts, app
# password), checks each one has worked, then sends a test email and stores the SMTP
# settings in Google Secret Manager for the live app.
#
# Usage:  bash scripts/setup_workspace_email.sh
#
# Safe to re-run: existing secrets get a new version instead of an error.

set -euo pipefail

PROJECT="atelier-edit"
DOMAIN="atelieredit.info"
REGION="europe-west2"
SERVICE="atelier-edit"
RUN_SERVICE_ACCOUNT="46726144892-compute@developer.gserviceaccount.com"
FIREBASE_IP="199.36.158.100"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

bold() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$*"; }
pause() { printf '\n  Press Enter when done (or Ctrl+C to stop and re-run later)... '; read -r _; }

# Re-runs a check until it passes; typing "skip" moves on with a warning.
wait_for() {
  local description="$1" check="$2"
  while true; do
    if eval "$check"; then
      ok "$description"
      return 0
    fi
    fail "$description: not visible yet"
    printf '  DNS changes can take a few minutes. Press Enter to check again, or type "skip": '
    read -r answer
    if [[ "$answer" == "skip" ]]; then
      warn "Skipped: $description (emails may be marked as spam until this is fixed)"
      return 0
    fi
  done
}

txt_records() { dig +short TXT "$1" | tr -d '"'; }

# ---------------------------------------------------------------------------
bold "0. Checking your tools"
for tool in gcloud dig node; do
  command -v "$tool" >/dev/null || { fail "$tool is not installed"; exit 1; }
done
ok "gcloud, dig and node found"

ACCOUNT="$(gcloud config get-value account 2>/dev/null)"
gcloud projects describe "$PROJECT" --format='value(projectId)' >/dev/null 2>&1 \
  || { fail "Signed in as $ACCOUNT, which cannot access project $PROJECT. Run: gcloud auth login"; exit 1; }
ok "Signed in to Google Cloud as $ACCOUNT"

[[ -d node_modules/nodemailer ]] || { fail "Run 'npm install' in $REPO_ROOT first"; exit 1; }

while true; do
  printf '\n  Address emails should come from [concierge@%s]: ' "$DOMAIN"
  read -r SENDER
  SENDER="${SENDER:-concierge@$DOMAIN}"
  SENDER="${SENDER// /}"
  if [[ "$SENDER" == *@"$DOMAIN" ]]; then
    break
  fi
  warn "$SENDER is not an @$DOMAIN address. Check the spelling."
  printf '  Use it anyway? [y/N]: '
  read -r confirm
  [[ "$confirm" =~ ^[Yy] ]] && break
done
ok "Sending from $SENDER"

# ---------------------------------------------------------------------------
bold "1. Create the Google Workspace account (in your browser)"
cat <<EOF
  1. Go to https://workspace.google.com and choose Business Starter.
  2. When asked, say you already own a domain and enter: $DOMAIN
  3. Create the user $SENDER (this is the address emails will come from).
EOF
pause

# ---------------------------------------------------------------------------
bold "2. Verify you own $DOMAIN"
cat <<EOF
  Google will show a TXT record starting "google-site-verification=".
  At Fasthosts: Domains → $DOMAIN → DNS settings → add a TXT record:
      Name/host: @   (leave blank if Fasthosts doesn't accept @)
      Value:     the google-site-verification=... text Google shows you
  Do NOT delete the existing TXT record "hosting-site=atelier-edit" or the A record;
  they keep the website online. Then press "Verify" in Google's setup screen.
EOF
pause
wait_for "Google verification TXT record" "txt_records $DOMAIN | grep -q '^google-site-verification='"
if txt_records "$DOMAIN" | grep -q '^hosting-site=atelier-edit'; then
  ok "Firebase TXT record still in place"
else
  fail "The TXT record 'hosting-site=atelier-edit' is missing. Put it back, or the site can lose its certificate."
fi
if dig +short A "$DOMAIN" | grep -q "^$FIREBASE_IP$"; then
  ok "Website A record unchanged ($FIREBASE_IP)"
else
  fail "The A record no longer points to $FIREBASE_IP; the website may be offline. Restore it at Fasthosts."
fi

# ---------------------------------------------------------------------------
bold "3. Point mail for $DOMAIN at Google"
cat <<EOF
  Still in Fasthosts DNS settings, add:

  a) MX record:   Name: @   Priority: 1   Value: smtp.google.com
     (If Google's setup screen shows different MX values, use those instead.)

  b) TXT record (SPF):   Name: @   Value: v=spf1 include:_spf.google.com ~all
     If a TXT record starting "v=spf1" already exists, edit it rather than adding a second.

  c) DKIM: in the Google Admin console go to
     Apps → Google Workspace → Gmail → Authenticate email → Generate new record.
     Add the TXT record it shows (Name: google._domainkey, Value: v=DKIM1; k=rsa; p=...).
     After it shows up below, return there and press "Start authentication".

  d) DMARC (recommended):   TXT   Name: _dmarc
     Value: v=DMARC1; p=none; rua=mailto:$SENDER
EOF
pause
wait_for "MX record points to Google" "dig +short MX $DOMAIN | grep -qi 'google'"
wait_for "SPF record includes Google" "[[ \$(txt_records $DOMAIN | grep -c '^v=spf1') -eq 1 ]] && txt_records $DOMAIN | grep '^v=spf1' | grep -q '_spf.google.com'"
wait_for "DKIM record (google._domainkey)" "txt_records google._domainkey.$DOMAIN | grep -q 'v=DKIM1'"
wait_for "DMARC record" "txt_records _dmarc.$DOMAIN | grep -q 'v=DMARC1'"

# ---------------------------------------------------------------------------
bold "4. Create an app password for $SENDER"
cat <<EOF
  1. Sign in to https://myaccount.google.com as $SENDER.
  2. Security → turn on 2-Step Verification (needed before app passwords appear).
  3. Security → App passwords → create one named "Atelier Edit".
     If "App passwords" is missing: in https://admin.google.com go to
     Security → Authentication → 2-Step Verification and allow users to turn it on,
     then try again.
  Google shows a 16-character password once. Keep that page open.
EOF

while true; do
  printf '\n  App password for %s (it will not be shown): ' "$SENDER"
  read -rs APP_PASSWORD
  printf '\n'
  APP_PASSWORD="${APP_PASSWORD// /}"
  if [[ ${#APP_PASSWORD} -ne 16 ]]; then
    fail "That is ${#APP_PASSWORD} characters; app passwords are 16. Try again."
    continue
  fi

  # -------------------------------------------------------------------------
  bold "5. Sending a test email"
  printf '  Send the test to [%s]: ' "$ACCOUNT"
  read -r TEST_TO
  TEST_TO="${TEST_TO:-$ACCOUNT}"

  if SMTP_USER="$SENDER" SMTP_PASS="$APP_PASSWORD" TEST_TO="$TEST_TO" node -e '
    const nodemailer = require("nodemailer");
    const t = nodemailer.createTransport({ host: "smtp.gmail.com", port: 587, secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
    t.sendMail({
      from: `Atelier Edit <${process.env.SMTP_USER}>`,
      to: process.env.TEST_TO,
      subject: "Atelier Edit email is working",
      text: "This test was sent by scripts/setup_workspace_email.sh. Password resets and digests can now be delivered.",
    }).then(() => process.exit(0)).catch((e) => { console.error("  " + e.message); process.exit(1); });
  '; then
    ok "Test email sent to $TEST_TO (check your inbox, and spam the first time)"
    break
  fi
  fail "Google rejected the login for $SENDER. If that address is misspelt, press Ctrl+C and run the script again. Otherwise create a new app password in a private window signed in only as $SENDER."
done

# ---------------------------------------------------------------------------
bold "6. Storing the settings in Google Secret Manager"
upsert_secret() {
  local name="$1" value="$2"
  if gcloud secrets describe "$name" --project "$PROJECT" >/dev/null 2>&1; then
    printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=- --project "$PROJECT" >/dev/null
    ok "$name updated"
  else
    printf '%s' "$value" | gcloud secrets create "$name" --data-file=- --project "$PROJECT" >/dev/null
    ok "$name created"
  fi
  gcloud secrets add-iam-policy-binding "$name" --project "$PROJECT" \
    --member="serviceAccount:$RUN_SERVICE_ACCOUNT" --role=roles/secretmanager.secretAccessor >/dev/null
}

upsert_secret SMTP_HOST "smtp.gmail.com"
upsert_secret SMTP_USER "$SENDER"
upsert_secret SMTP_PASS "$APP_PASSWORD"
upsert_secret EMAIL_FROM "Atelier Edit <$SENDER>"
unset APP_PASSWORD
ok "The live app is allowed to read them"

# ---------------------------------------------------------------------------
bold "7. Turn email on in the live app"
printf '  Apply to the live app now? This starts a new revision (about a minute). [Y/n]: '
read -r apply
if [[ ! "$apply" =~ ^[Nn] ]]; then
  gcloud run services update "$SERVICE" --project "$PROJECT" --region "$REGION" \
    --update-secrets "SMTP_HOST=SMTP_HOST:latest,SMTP_USER=SMTP_USER:latest,SMTP_PASS=SMTP_PASS:latest,EMAIL_FROM=EMAIL_FROM:latest" \
    --quiet
  ok "Live app updated"
fi

bold "Done"
cat <<EOF
  Tell Claude "email is set up". It will then add these settings to cloudbuild.yaml so
  future deploys keep them, and test a real password reset on atelieredit.info.
EOF
