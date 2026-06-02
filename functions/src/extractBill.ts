import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';
import { GoogleGenAI } from '@google/genai';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getGeminiModel } from './constants';
import { BILL_EXTRACTION_SCHEMA } from './billExtractionSchema';
import { runVendorResolution } from './vendorResolution';
import {
  sanitizeAmount,
  finiteOrNull,
  sanitizeCurrency,
  parsePlausibleDate,
  isAllowedStoragePath,
} from './utils/billValidation';

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const RATE_LIMIT_PER_HOUR = 100;
const HOUR_MS = 60 * 60 * 1000;
const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];

interface ExtractBillInput {
  // Mutually exclusive — provide exactly one
  base64Data?: string;
  storagePath?: string;
  mimeType: string;
}

interface ExtractBillResult {
  extraction: {
    billDate: Timestamp | null;
    dueDate: Timestamp | null;
    periodStart: Timestamp | null;
    periodEnd: Timestamp | null;
    vendorName: string;
    vendorAddress: string | null;
    accountNumber: string | null;
    invoiceNumber: string | null;
    totalAmount: number;
    amountDue: number;
    currency: string;
    lineItems: Array<{ description: string; amount: number; quantity: number | null; unitPrice: number | null }>;
    taxes: Array<{ description: string; amount: number; rate: number | null }>;
    paymentInstructions: { method: string; addressOrAccount: string; dueIfPaidBy: Timestamp | null } | null;
    suggestedCategoryHint: string | null;
    fieldMeta: Record<string, { provenance: 'ocr_high_confidence' | 'ocr_low_confidence'; confidence: number }>;
  };
  vendorResolution: {
    status: 'resolved' | 'unresolved' | 'ambiguous';
    candidateVendorIds: string[];
    rawExtractedVendorName: string;
  };
  modelUsed: string;
}

export const extractBill = onCall(
  { secrets: [GEMINI_API_KEY], region: 'us-central1', maxInstances: 10, timeoutSeconds: 120 },
  async (request) => {
    const { auth, data } = request;
    if (!auth) throw new HttpsError('unauthenticated', 'Authentication required');
    const userId = auth.uid;
    const input = data as ExtractBillInput;
    
    // Validate input
    if (!input.mimeType || !SUPPORTED_MIME_TYPES.includes(input.mimeType)) {
      throw new HttpsError('invalid-argument', `Unsupported mime type: ${input.mimeType}`);
    }
    if (!input.base64Data && !input.storagePath) {
      throw new HttpsError('invalid-argument', 'Either base64Data or storagePath required');
    }
    if (input.base64Data && input.storagePath) {
      throw new HttpsError('invalid-argument', 'Provide base64Data OR storagePath, not both');
    }
    // Confine storagePath reads to the caller's own upload prefix. Without this a
    // caller could have the function download (and AI-transcribe) any object in the
    // default bucket — an IDOR over other users' uploads.
    if (input.storagePath && !isAllowedStoragePath(input.storagePath, userId)) {
      throw new HttpsError('permission-denied', 'storagePath must be within your own bills/ upload prefix');
    }
    
    // Rate limiting (follow translateBatch pattern)
    const db = getFirestore();
    const quotaRef = db.collection('userQuotas').doc(userId);
    const now = Date.now();
    await db.runTransaction(async (tx) => {
      const quotaDoc = await tx.get(quotaRef);
      const quota = (quotaDoc.exists && quotaDoc.data()) ? quotaDoc.data()! : { extractBillCount: 0, extractBillWindowStart: now };
      if (now - (quota.extractBillWindowStart || 0) > HOUR_MS) {
        quota.extractBillCount = 0;
        quota.extractBillWindowStart = now;
      }
      if ((quota.extractBillCount || 0) >= RATE_LIMIT_PER_HOUR) {
        throw new HttpsError('resource-exhausted', `Rate limit exceeded: ${RATE_LIMIT_PER_HOUR} extractions per hour`);
      }
      quota.extractBillCount = (quota.extractBillCount || 0) + 1;
      tx.set(quotaRef, quota, { merge: true });
    });
    
    // Get bytes
    let base64: string;
    if (input.storagePath) {
      const bucket = getStorage().bucket();
      const [bytes] = await bucket.file(input.storagePath).download();
      base64 = bytes.toString('base64');
    } else {
      base64 = input.base64Data!;
    }
    
    // Call Gemini
    const apiKey = GEMINI_API_KEY.value();
    const client = new GoogleGenAI({ apiKey });
    const model = getGeminiModel();
    
    const PROMPT = `You are extracting structured data from a bill or invoice.

Read the document carefully and populate every field you can. Critical rules:

1. Dates: emit ISO 8601 format YYYY-MM-DD. If a year is missing on the bill, infer from context (likely the current or recent year given a due date).
2. Amounts: emit plain numbers, no currency symbols, no commas. Decimals as periods.
3. Vendor name: copy EXACTLY as it appears on the bill, including any corporate suffix. Do not normalize, expand, or correct.
4. Account number: the customer's account WITH this vendor — usually labeled "Account Number", "Account #", "Customer ID", "Service ID". This is NOT the invoice number.
5. Line items: capture every itemized charge. For utility bills, this includes the energy/usage charge, base service fee, demand charge, etc. as separate lines. Do NOT lump them.
6. Taxes: separate from line items. Sales tax, regulatory fees, franchise fees go in the taxes array.
7. periodStart/periodEnd: ONLY populate for usage-based bills (utilities, internet, phone). Leave null for one-time invoices, professional service bills, equipment purchases.
8. Confidence: be calibrated. 0.95+ only when reading from clear text. 0.7-0.9 when inferring. Below 0.7 when guessing. Total amount and vendor name should rarely be below 0.85.

If a field is genuinely absent from the bill, omit it (do not invent values).
If the document is not a bill or invoice, return totalAmount: 0 with confidence 0.

Return JSON matching the schema. No prose, no markdown.`;
    
    let response;
    try {
      response = await client.models.generateContent({
        model,
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: input.mimeType, data: base64 } },
            { text: PROMPT }
          ]
        }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: BILL_EXTRACTION_SCHEMA,
        },
      });
    } catch (err: any) {
      logger.error('Gemini bill extraction call failed', { err: err?.message || String(err) });
      throw new HttpsError('unavailable', 'Bill extraction is temporarily unavailable. Please try again.');
    }

    const rawText = response.text ?? '';
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch (err) {
      logger.error('Bill extraction returned non-JSON', { rawText, err });
      throw new HttpsError('internal', 'Extraction returned unparseable response');
    }
    
    // Convert ISO date strings to Timestamps; build fieldMeta from fieldConfidences.
    // parsePlausibleDate rejects garbage / out-of-range years so Timestamp.fromDate
    // can't throw and absurd dates can't poison anomaly baselines.
    const toTimestamp = (iso?: string): Timestamp | null => {
      const d = parsePlausibleDate(iso);
      return d ? Timestamp.fromDate(d) : null;
    };
    
    const fieldMeta: Record<string, { provenance: 'ocr_high_confidence' | 'ocr_low_confidence'; confidence: number }> = {};
    const confidences = parsed.fieldConfidences || {};
    for (const [field, conf] of Object.entries(confidences)) {
      const c = typeof conf === 'number' ? conf : 0;
      fieldMeta[field] = {
        provenance: c >= 0.9 ? 'ocr_high_confidence' : 'ocr_low_confidence',
        confidence: c,
      };
    }
    
    // Run vendor resolution
    const vendorResolution = await runVendorResolution({
      rawName: parsed.vendorName || '',
      accountIdentifier: parsed.accountNumber || undefined,
    });
    
    const result: ExtractBillResult = {
      extraction: {
        billDate: toTimestamp(parsed.billDate),
        dueDate: toTimestamp(parsed.dueDate),
        periodStart: toTimestamp(parsed.periodStart),
        periodEnd: toTimestamp(parsed.periodEnd),
        vendorName: parsed.vendorName || '',
        vendorAddress: parsed.vendorAddress || null,
        accountNumber: parsed.accountNumber || null,
        invoiceNumber: parsed.invoiceNumber || null,
        totalAmount: sanitizeAmount(parsed.totalAmount),
        amountDue: typeof parsed.amountDue === 'number' ? sanitizeAmount(parsed.amountDue) : sanitizeAmount(parsed.totalAmount),
        currency: sanitizeCurrency(parsed.currency),
        lineItems: (Array.isArray(parsed.lineItems) ? parsed.lineItems : []).map((li: any) => ({
          description: typeof li?.description === 'string' ? li.description : '',
          amount: sanitizeAmount(li?.amount),
          quantity: finiteOrNull(li?.quantity),
          unitPrice: finiteOrNull(li?.unitPrice),
        })),
        taxes: (Array.isArray(parsed.taxes) ? parsed.taxes : []).map((t: any) => ({
          description: typeof t?.description === 'string' ? t.description : '',
          amount: sanitizeAmount(t?.amount),
          rate: finiteOrNull(t?.rate),
        })),
        paymentInstructions: parsed.paymentInstructions ? {
          method: parsed.paymentInstructions.method || 'other',
          addressOrAccount: parsed.paymentInstructions.addressOrAccount || '',
          dueIfPaidBy: toTimestamp(parsed.paymentInstructions.dueIfPaidBy),
        } : null,
        suggestedCategoryHint: parsed.suggestedCategoryHint || null,
        fieldMeta,
      },
      vendorResolution,
      modelUsed: model,
    };
    
    return result;
  }
);
