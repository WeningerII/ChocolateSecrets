import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';
import { getFirestore } from 'firebase-admin/firestore';
import {
  validateShoppingListInput,
  formatEmailSubject,
  formatEmailBody,
  formatSmsBody,
} from './utils/shoppingListFormat';

// --- Credentials (Secret Manager) — bound via the `secrets` array on the
// function options below. Set with `firebase functions:secrets:set <NAME>`.
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const TWILIO_ACCOUNT_SID = defineSecret('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = defineSecret('TWILIO_AUTH_TOKEN');

// --- Non-secret config (string params). Params are collected at deploy time
// (from functions/.env or the CLI prompt) and surface as env vars at runtime,
// so `.value()` reads a value the deploy actually bound — unlike the old
// GEMINI_MODEL, which was documented but never wired to anything. The empty
// default means "channel unconfigured": there is deliberately NO
// onboarding@resend.dev fallback sender (Resend's sandbox sender cannot
// deliver to arbitrary recipients — ADR-0006).
const RESEND_FROM = defineString('RESEND_FROM', {
  default: '',
  description: 'Verified Resend sender, e.g. "Chocolate Secrets <lists@yourdomain.com>"',
});
const CHEF_EMAIL = defineString('CHEF_EMAIL', {
  default: '',
  description: 'Destination email address for shopping lists',
});
const TWILIO_PHONE_NUMBER = defineString('TWILIO_PHONE_NUMBER', {
  default: '',
  description: 'Twilio sender phone number (E.164)',
});
const CHEF_PHONE_NUMBER = defineString('CHEF_PHONE_NUMBER', {
  default: '',
  description: 'Destination SMS phone number (E.164)',
});

const RATE_LIMIT_PER_HOUR = 20;
// Global (all-users) hourly cap. The per-uid limit alone is defeatable: the web
// API key is public and the Anonymous provider is enabled (ADR-0005), so a
// script can mint fresh anonymous uids via the Identity Toolkit signUp endpoint
// and give itself a new per-uid quota each time. Because the destination is a
// single fixed chef phone/inbox, a global cap is a per-destination cap — it
// bounds total paid Twilio/Resend spend no matter how many uids exist, while
// leaving legitimate guest use (per-uid limit) untouched.
const GLOBAL_RATE_LIMIT_PER_HOUR = 40;
const HOUR_MS = 60 * 60 * 1000;

export interface ChannelResult {
  attempted: boolean;
  sent: boolean;
  error?: string;
}

export interface SendShoppingListResult {
  email: ChannelResult;
  sms: ChannelResult;
}

/**
 * Secret value with env-var fallback for the emulator / preview environments
 * where Secret Manager is unavailable (mirrors translation.ts's
 * resolveGeminiApiKey). Returns '' when unconfigured.
 */
function secretOrEnv(secret: { value(): string }, envName: string): string {
  try {
    const v = secret.value();
    if (v) return v;
  } catch {
    // Secret not bound — fall through to env var.
  }
  return process.env[envName] || '';
}

/**
 * "Send to Chef": deliver the prep shopping list by email (Resend) and/or SMS
 * (Twilio) to the configured chef contact.
 *
 * Replaces the dev-only Express endpoint in server.ts (ADR-0006): callable =
 * Firebase Auth required, provider keys live in Secret Manager instead of a
 * static bundle, and the message bodies are server-templated from validated
 * items so the function cannot be used as an authenticated free-text relay to
 * the chef's phone/inbox. Recipients are fixed server config — the client
 * chooses only the list content, never the destination.
 *
 * Returns honest per-channel results; a channel that is not configured reports
 * itself as such instead of being silently skipped, and a provider error is
 * never converted into a success.
 */
export const sendShoppingList = onCall(
  {
    secrets: [RESEND_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN],
    region: 'us-central1',
    maxInstances: 10,
    timeoutSeconds: 60,
  },
  async (request): Promise<SendShoppingListResult> => {
    const { auth, data } = request;
    if (!auth) throw new HttpsError('unauthenticated', 'Authentication required');
    const userId = auth.uid;

    const validated = validateShoppingListInput(data);
    if (validated.ok === false) {
      throw new HttpsError('invalid-argument', validated.error);
    }
    const { items, note } = validated;

    // Two-layer hourly rate limit. The SMS channel is billable and the
    // destination is a real phone — any authenticated user (including anonymous
    // guests, ADR-0005) must not be able to spam it. The per-uid limit (mirrors
    // geminiGenerate) throttles a single user; the global limit bounds total
    // spend even when an attacker mints fresh anonymous uids to escape the
    // per-uid quota (see GLOBAL_RATE_LIMIT_PER_HOUR above). Both are checked and
    // consumed in one transaction so concurrent calls cannot slip past either.
    // 'global' cannot collide with a real uid (Firebase Auth uids are 28-char
    // identifiers), and its fields are namespaced regardless.
    const db = getFirestore();
    const quotaRef = db.collection('userQuotas').doc(userId);
    const globalQuotaRef = db.collection('userQuotas').doc('global');
    const now = Date.now();
    await db.runTransaction(async (tx) => {
      const [quotaDoc, globalQuotaDoc] = await Promise.all([tx.get(quotaRef), tx.get(globalQuotaRef)]);

      const quota = (quotaDoc.exists && quotaDoc.data()) ? quotaDoc.data()! : {};
      let count = quota.sendShoppingListCount || 0;
      let windowStart = quota.sendShoppingListWindowStart || now;
      if (now - windowStart > HOUR_MS) { count = 0; windowStart = now; }
      if (count >= RATE_LIMIT_PER_HOUR) {
        throw new HttpsError('resource-exhausted', `Rate limit exceeded: ${RATE_LIMIT_PER_HOUR} shopping-list sends per hour`);
      }

      const globalQuota = (globalQuotaDoc.exists && globalQuotaDoc.data()) ? globalQuotaDoc.data()! : {};
      let globalCount = globalQuota.sendShoppingListGlobalCount || 0;
      let globalWindowStart = globalQuota.sendShoppingListGlobalWindowStart || now;
      if (now - globalWindowStart > HOUR_MS) { globalCount = 0; globalWindowStart = now; }
      if (globalCount >= GLOBAL_RATE_LIMIT_PER_HOUR) {
        throw new HttpsError('resource-exhausted', 'Shopping-list sending is temporarily paused (hourly send budget reached). Try again later.');
      }

      tx.set(quotaRef, { sendShoppingListCount: count + 1, sendShoppingListWindowStart: windowStart }, { merge: true });
      tx.set(globalQuotaRef, { sendShoppingListGlobalCount: globalCount + 1, sendShoppingListGlobalWindowStart: globalWindowStart }, { merge: true });
    });

    // Server-templated bodies — client input reaches the outgoing message only
    // through the validated items and the capped single-line note.
    const emailSubject = formatEmailSubject(items.length);
    const emailBody = formatEmailBody(items, note);
    const smsBody = formatSmsBody(items, note);

    const email: ChannelResult = { attempted: false, sent: false };
    const sms: ChannelResult = { attempted: false, sent: false };

    // --- Email via Resend ---
    const resendApiKey = secretOrEnv(RESEND_API_KEY, 'RESEND_API_KEY');
    const resendFrom = RESEND_FROM.value();
    const chefEmail = CHEF_EMAIL.value();
    if (!resendApiKey || !resendFrom || !chefEmail) {
      email.error = 'Email channel not configured (requires the RESEND_API_KEY secret plus RESEND_FROM and CHEF_EMAIL params).';
    } else {
      email.attempted = true;
      try {
        // Lazy import: keep the provider SDK off the cold-start path for
        // invocations that fail auth/validation or only use the other channel.
        const { Resend } = await import('resend');
        const resend = new Resend(resendApiKey);
        const { error } = await resend.emails.send({
          from: resendFrom,
          to: chefEmail,
          subject: emailSubject,
          text: emailBody,
        });
        if (error) {
          email.error = error.message || 'Resend reported an error';
        } else {
          email.sent = true;
        }
      } catch (err: any) {
        email.error = err?.message || String(err);
      }
      if (!email.sent) {
        logger.error('sendShoppingList email failed', { userId, error: email.error });
      }
    }

    // --- SMS via Twilio ---
    const twilioSid = secretOrEnv(TWILIO_ACCOUNT_SID, 'TWILIO_ACCOUNT_SID');
    const twilioToken = secretOrEnv(TWILIO_AUTH_TOKEN, 'TWILIO_AUTH_TOKEN');
    const twilioFrom = TWILIO_PHONE_NUMBER.value();
    const chefPhone = CHEF_PHONE_NUMBER.value();
    if (!twilioSid || !twilioToken || !twilioFrom || !chefPhone) {
      sms.error = 'SMS channel not configured (requires the TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN secrets plus TWILIO_PHONE_NUMBER and CHEF_PHONE_NUMBER params).';
    } else {
      sms.attempted = true;
      try {
        const { Twilio } = await import('twilio');
        const client = new Twilio(twilioSid, twilioToken);
        await client.messages.create({ body: smsBody, from: twilioFrom, to: chefPhone });
        sms.sent = true;
      } catch (err: any) {
        sms.error = err?.message || String(err);
      }
      if (!sms.sent) {
        logger.error('sendShoppingList sms failed', { userId, error: sms.error });
      }
    }

    logger.info('sendShoppingList result', {
      userId,
      itemCount: items.length,
      email: { attempted: email.attempted, sent: email.sent },
      sms: { attempted: sms.attempted, sent: sms.sent },
    });

    return { email, sms };
  }
);
