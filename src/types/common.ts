export type Provenance = 'verbatim' | 'inferred_high' | 'inferred_low' | 'user_confirmed' | 'user_edited';

export type BillProvenance = Provenance | 'ocr_high_confidence' | 'ocr_low_confidence' | 'vendor_default';

export interface FieldMeta {
  provenance?: BillProvenance;
  confidence?: number; // 0-1
  source?: string; // tool name, knowledge chunk ID, or free-text citation
  inferredAt?: string; // ISO timestamp
}

export interface CustomField {
  name: string;
  value: string;
}
