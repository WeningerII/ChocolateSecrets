import { getGeminiClient } from './geminiClient';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { SourcingCandidate, SourcingNote } from '../types';
import { RESTAURANT_ID } from '../constants/tenant';

// =============================================================================
// Fresh query — calls Gemini with Google Search grounding, returns candidates.
// Never caches. Every call is a fresh search. ~$0.02 per call on Gemini 2.5 Flash.
// =============================================================================

export async function queryFreshSources(params: {
  ingredientName: string;
  userQuery?: string;
}): Promise<{
  candidates: SourcingCandidate[];
  searchSuggestionsHtml?: string;
  summary?: string;
}> {
  // Read restaurant ZIP for location context (optional — Gemini still works without it)
  let zipCode: string | undefined;
  try {
    const snap = await getDoc(doc(db, 'restaurants', RESTAURANT_ID));
    zipCode = snap.exists() ? snap.data()?.zipCode : undefined;
  } catch {}

  const askLine = params.userQuery
    ? `The chef asked: "${params.userQuery}"\nAnswer that question directly, grounded in current web results.`
    : `Find local and regional suppliers that stock this ingredient. Prioritize distributors within ~100 miles of the ZIP, with national shippers as fallback.`;

  const prompt = `Find suppliers for "${params.ingredientName}"${zipCode ? ` near ZIP ${zipCode} (United States)` : ''}.

${askLine}

Return a JSON object with this exact shape (no commentary outside the JSON):

{
  "summary": "one-paragraph plain-English synthesis",
  "suppliers": [
    {
      "name": "supplier or distributor name",
      "address": "street address if known, else null",
      "website": "website URL if known, else null",
      "phone": "phone with area code if known, else null",
      "priceUsd": number or null,
      "priceUnit": "per kg" | "per 1kg bag" | etc., or null,
      "observedAt": "YYYY-MM-DD of the observation from the source page, or null",
      "sourceUrl": "URL of the page cited",
      "notes": "short caveat if useful, else null"
    }
  ]
}

Be conservative about prices — only include them when explicitly stated on the cited page. Never invent a price. Never claim in-stock status.`;

  try {
    const resp = await getGeminiClient().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = resp.text || '';
    const groundingMeta = (resp.candidates?.[0] as any)?.groundingMetadata;
    const searchSuggestionsHtml: string | undefined = groundingMeta?.searchEntryPoint?.renderedContent;

    const parsed = parseGeminiJson(text) || {};
    const raw: any[] = Array.isArray(parsed.suppliers) ? parsed.suppliers : [];
    const summary: string | undefined = typeof parsed.summary === 'string' ? parsed.summary : undefined;

    const candidates: SourcingCandidate[] = raw
      .map(r => buildCandidate(r))
      .filter(c => !!c.name);

    return { candidates, searchSuggestionsHtml, summary };
  } catch (e) {
    console.error('Gemini grounded query failed', e);
    throw new Error('Could not fetch sources — check your network and Gemini API key.');
  }
}

function buildCandidate(raw: any): SourcingCandidate {
  const candidate: SourcingCandidate = { name: raw?.name || '' };
  if (raw?.address) candidate.address = raw.address;
  if (raw?.website) candidate.website = raw.website;
  if (raw?.phone) candidate.phone = raw.phone;
  if (typeof raw?.priceUsd === 'number') candidate.priceUsd = raw.priceUsd;
  if (raw?.priceUnit) candidate.priceUnit = raw.priceUnit;
  if (raw?.observedAt) candidate.observedAt = raw.observedAt;
  if (raw?.sourceUrl) {
    candidate.sourceUrl = raw.sourceUrl;
    try { candidate.sourceDomain = new URL(raw.sourceUrl).hostname.replace(/^www\./, ''); } catch {}
  }
  if (raw?.notes) candidate.notes = raw.notes;
  return candidate;
}

function parseGeminiJson(text: string): any | null {
  if (!text) return null;
  let body = text.trim();
  const fence = body.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) body = fence[1];
  const match = body.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

// =============================================================================
// Keep a candidate — writes it to /sourcing_notes as a persistent note.
// =============================================================================

export async function keepNote(params: {
  ingredientId: string;
  candidate: SourcingCandidate;
  userId: string;
}): Promise<string> {
  const noteData: any = {
    ingredientId: params.ingredientId,
    restaurantId: RESTAURANT_ID,
    name: params.candidate.name,
    keptAt: serverTimestamp(),
    keptBy: params.userId,
  };
  // Firestore rejects undefined — only include defined optional fields
  const optional: (keyof SourcingCandidate)[] = [
    'address', 'website', 'phone', 'priceUsd', 'priceUnit',
    'observedAt', 'sourceUrl', 'sourceDomain', 'notes',
  ];
  for (const key of optional) {
    const v = params.candidate[key];
    if (v !== undefined && v !== null && v !== '') noteData[key] = v;
  }
  const ref = await addDoc(collection(db, 'sourcing_notes'), noteData);
  return ref.id;
}

// =============================================================================
// Promote a note to a supplier record — simple name-match dedup; writes a
// supplierId back onto the note so the UI can show "Already a supplier."
// =============================================================================

export async function promoteNoteToSupplier(noteId: string): Promise<{ supplierId: string; action: 'created' | 'matched' }> {
  const noteRef = doc(db, 'sourcing_notes', noteId);
  const noteSnap = await getDoc(noteRef);
  if (!noteSnap.exists()) throw new Error('Note not found');
  const note = noteSnap.data() as SourcingNote;

  // Name-match dedup (case-insensitive)
  const allSuppliers = await getDocs(collection(db, 'suppliers'));
  const matchedId = (() => {
    const target = note.name.trim().toLowerCase();
    for (const d of allSuppliers.docs) {
      const existing = (d.data()?.name || '').toString().trim().toLowerCase();
      if (existing === target) return d.id;
    }
    return null;
  })();

  let supplierId: string;
  let action: 'created' | 'matched';

  if (matchedId) {
    supplierId = matchedId;
    action = 'matched';
  } else {
    const supplierData: any = {
      name: note.name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (note.address) supplierData.address = note.address;
    if (note.phone) supplierData.phone = note.phone;
    if (note.website) supplierData.website = note.website;
    const ref = await addDoc(collection(db, 'suppliers'), supplierData);
    supplierId = ref.id;
    action = 'created';
  }

  await updateDoc(noteRef, { promotedToSupplierId: supplierId });
  return { supplierId, action };
}
