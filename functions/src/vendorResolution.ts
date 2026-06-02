import { getFirestore } from 'firebase-admin/firestore';
import { nameMatchScore } from './utils/billNormalization';

export interface VendorMatchInput {
  rawName: string;
  accountIdentifier?: string;
}

export interface VendorMatchResult {
  status: 'resolved' | 'unresolved' | 'ambiguous';
  candidateVendorIds: string[];   // ordered best-first, max 3
  rawExtractedVendorName: string;
}

const RESOLVED_THRESHOLD = 0.85;
const AMBIGUOUS_FLOOR = 0.65;
const MAX_CANDIDATES = 3;

export async function runVendorResolution(
  input: VendorMatchInput
): Promise<VendorMatchResult> {
  const db = getFirestore();
  const snapshot = await db.collection('vendors')
    .where('isActive', '==', true)
    .get();
  
  const vendors = snapshot.docs.map(d => ({
    id: d.id,
    name: d.data().name as string,
    accountIdentifier: d.data().accountIdentifier as string | undefined,
  }));
  
  // Stage 1: account-number match (exact)
  if (input.accountIdentifier) {
    const acctMatch = vendors.find(
      v => v.accountIdentifier && v.accountIdentifier === input.accountIdentifier
    );
    if (acctMatch) {
      return {
        status: 'resolved',
        candidateVendorIds: [acctMatch.id],
        rawExtractedVendorName: input.rawName,
      };
    }
  }
  
  // Stage 2: normalized name match (Jaccard)
  const scored = vendors
    .map(v => ({ vendor: v, score: nameMatchScore(input.rawName, v.name) }))
    .filter(s => s.score >= AMBIGUOUS_FLOOR)
    .sort((a, b) => b.score - a.score);
  
  if (scored.length === 0) {
    return {
      status: 'unresolved',
      candidateVendorIds: [],
      rawExtractedVendorName: input.rawName,
    };
  }
  
  if (scored[0].score >= RESOLVED_THRESHOLD) {
    return {
      status: 'resolved',
      candidateVendorIds: [scored[0].vendor.id],
      rawExtractedVendorName: input.rawName,
    };
  }
  
  return {
    status: 'ambiguous',
    candidateVendorIds: scored.slice(0, MAX_CANDIDATES).map(s => s.vendor.id),
    rawExtractedVendorName: input.rawName,
  };
}
