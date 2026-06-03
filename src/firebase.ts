import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import firebaseConfig from '../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);

// App Check attests that traffic originates from this app, not from a script
// replaying a stolen auth token or hitting the project's APIs directly. It is the
// missing layer in front of the (already auth-gated and rate-limited) callable
// functions and Firestore. Gated on the reCAPTCHA site key so the app behaves
// exactly as before until you opt in — see docs/security-hardening.md for the
// console setup and how to turn on enforcement.
const appCheckSiteKey: string | undefined = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
if (appCheckSiteKey) {
  // A debug token lets App Check pass from localhost / CI without a real reCAPTCHA
  // assessment. Only set one in development; never ship it to production.
  const appCheckDebugToken: string | undefined = import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN;
  if (appCheckDebugToken) {
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
      appCheckDebugToken;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const functions = getFunctions(app);

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
  }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo?: Record<string, unknown>[];
  }
}

export class FirestoreOperationError extends Error {
  public info: FirestoreErrorInfo;
  constructor(info: FirestoreErrorInfo) {
    super(info.error);
    this.name = 'FirestoreOperationError';
    this.info = info;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new FirestoreOperationError(errInfo);
}

/**
 * Non-throwing variant for realtime listener (onSnapshot) error callbacks.
 * Firestore invokes those callbacks asynchronously, so throwing from them escapes
 * React's render path — the ErrorBoundary cannot catch it, the tab logs an uncaught
 * error, and (because loading is only cleared on success) the page hangs on its
 * skeleton forever. This logs the same structured context but returns, so the
 * caller can reset its loading/error state instead.
 */
export function reportFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  try {
    handleFirestoreError(error, operationType, path);
  } catch {
    // handleFirestoreError logs then throws by design; swallow the throw here
    // because a listener callback must not propagate.
  }
}
