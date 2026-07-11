import { FirebaseError } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

/** Mirrors functions/src/utils/shoppingListFormat.ts `ShoppingListItem`. */
export interface ShoppingListItemPayload {
  name: string;
  quantity?: string;
  unit?: string;
}

interface SendShoppingListRequest {
  items: ShoppingListItemPayload[];
  note?: string;
}

/** Mirrors functions/src/sendShoppingList.ts `ChannelResult`. */
export interface ChannelResult {
  attempted: boolean;
  sent: boolean;
  error?: string;
}

/** Mirrors functions/src/sendShoppingList.ts `SendShoppingListResult`. */
export interface SendShoppingListResult {
  email: ChannelResult;
  sms: ChannelResult;
}

/**
 * Why the call itself failed (as opposed to a per-channel provider failure,
 * which the server reports inside a successful response):
 * - `unauthenticated` — no Firebase Auth session; the user must sign in.
 * - `unavailable` — the callable is not deployed in this environment
 *   (`functions/not-found`, or a fetch-level failure while the browser is
 *   online — an undeployed callable 404s without CORS headers, which the
 *   Functions SDK surfaces as a synthetic `functions/internal`).
 * - `network` — the Functions endpoint could not be reached because the
 *   device is offline (fetch-level failure with `navigator.onLine` false),
 *   or the backend answered 503 (`functions/unavailable`) / timed out
 *   (`functions/deadline-exceeded`).
 * - `error` — anything else (invalid argument, rate limit, real internal).
 */
export type SendShoppingListFailureReason =
  | 'unauthenticated'
  | 'unavailable'
  | 'network'
  | 'error';

export type SendShoppingListOutcome =
  | { ok: true; result: SendShoppingListResult }
  | { ok: false; reason: SendShoppingListFailureReason };

const callSendShoppingList = httpsCallable<SendShoppingListRequest, SendShoppingListResult>(
  functions,
  'sendShoppingList',
);

/**
 * "Send to Chef" via the `sendShoppingList` Cloud Function (ADR-0006). The
 * server holds the Resend/Twilio credentials, templates the message bodies
 * from the validated items, and owns the recipient addresses — the client
 * chooses only the list content and an optional note.
 *
 * Never throws: transport/auth failures are mapped to a typed reason so the
 * caller can pick the right localized message, and per-channel success is
 * reported honestly in `result.email` / `result.sms` (a channel is `sent`
 * only when the provider accepted the message; an unconfigured channel has
 * `attempted: false`).
 */
export async function sendShoppingList(
  items: ShoppingListItemPayload[],
  note?: string,
): Promise<SendShoppingListOutcome> {
  try {
    const request: SendShoppingListRequest = note ? { items, note } : { items };
    const res = await callSendShoppingList(request);
    return { ok: true, result: res.data };
  } catch (error) {
    console.error('[shoppingListClient] sendShoppingList failed:', error);
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'functions/unauthenticated':
          return { ok: false, reason: 'unauthenticated' };
        case 'functions/not-found':
          // The function is not deployed here (e.g. a hosting-only preview):
          // same "no send backend in this deployment" situation the old
          // /api/send-shopping-list content-type sniff used to detect.
          return { ok: false, reason: 'unavailable' };
        case 'functions/unavailable':
        case 'functions/deadline-exceeded':
          return { ok: false, reason: 'network' };
        case 'functions/internal':
          // The Functions SDK converts any fetch-level failure (status 0) to
          // a synthetic `internal` whose message is exactly "internal". That
          // bucket covers both "device offline" and "callable not deployed"
          // (an infrastructure 404 has no CORS headers, so the browser blocks
          // it and fetch rejects). Disambiguate with navigator.onLine: offline
          // → network problem; online → no reachable send backend here. A
          // *real* server-side internal error carries a different message and
          // falls through to the generic failure path.
          if (error.message.includes('internal')) {
            const offline =
              typeof navigator !== 'undefined' && navigator.onLine === false;
            return { ok: false, reason: offline ? 'network' : 'unavailable' };
          }
          break;
      }
    }
    return { ok: false, reason: 'error' };
  }
}
