import { FieldValue, Timestamp } from 'firebase/firestore';
import type { LocalizedString } from './i18n';
import type { AllergenFlag, DietaryFlag } from './allergens';
import type { CustomField, FieldMeta } from './common';
import type { PriceHistoryEntry } from './inventory';
import type { ChocolateSpec } from './chocolate';
import type { Composition, AlcoholSpec } from './composition';

export interface Ingredient {
  id: string;
  name: string;
  nameI18n?: LocalizedString;
  nameSpanish?: string; // TBD drift
  unit?: string;
  stock: number;
  lowStockThreshold: number;
  parLevel?: number;
  category?: string;
  costPerUnit?: number;
  weightedAverageCost?: number; // Added for advanced costing
  supplier?: string; // Legacy support
  supplierId?: string;
  moq?: number;
  orderUnit?: string;
  brand?: string;
  brandI18n?: LocalizedString;
  barcode?: string;
  allergens?: (string & AllergenFlag)[];
  /**
   * Dietary classification — derived from composition.lactose at write time
   * via deriveDietaryFlags(). Stored so queries and warnings panels can read
   * without recomputing. Recomputed whenever composition changes.
   */
  dietary?: DietaryFlag[];
  customFields?: CustomField[];
  tags?: string[];
  needsReview?: boolean;
  aiExtractionNotes?: string;
  isDiscrete?: boolean;
  density?: number; // grams per ml, used for volume-to-weight conversions
  wasteFactor?: number;
  originalState?: string;
  priceHistory?: PriceHistoryEntry[];
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
  chocolateSpec?: ChocolateSpec; // populated by ingredient intake when an ingredient IS a chocolate
  meta?: Record<string, FieldMeta>;
  composition?: Composition;
  bufferRef?: string;          // dotted ref: 'cream' | 'puree.raspberry' | 'honey' | 'vinegar.white'
  alcoholSpec?: AlcoholSpec;
  usdaFdcId?: number;          // USDA FDC fdcId, for re-lookup or refresh
}
