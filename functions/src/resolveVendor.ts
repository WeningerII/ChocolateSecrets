import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { runVendorResolution } from './vendorResolution';

interface ResolveVendorInput {
  rawName: string;
  accountIdentifier?: string;
}

export const resolveVendor = onCall(
  { region: 'us-central1', maxInstances: 10 },
  async (request) => {
    const { auth, data } = request;
    if (!auth) throw new HttpsError('unauthenticated', 'Authentication required');
    const input = data as ResolveVendorInput;
    if (!input.rawName || typeof input.rawName !== 'string') {
      throw new HttpsError('invalid-argument', 'rawName required');
    }
    return await runVendorResolution(input);
  }
);
