import { FieldValue, Timestamp } from 'firebase/firestore';
import { RECIPE_TYPES, COMPONENT_TYPES, ACTION_TYPES } from './constants';

export type Language = 'en' | 'es' | 'ko';

export type SupportedLanguage = 'en' | 'es' | 'ko';

export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['en', 'es', 'ko'] as const;

/**
 * Canonical shape for any user-entered text that needs to render in multiple languages.
 *
 * - `source` is the original input as the user wrote it (or as Gemini extracted it).
 * - `sourceLanguage` is the language `source` is in. Always set explicitly.
 * - `translations` holds curated translations into other languages, optional.
 *
 * The render layer (Phase 3) uses `getLocalizedText(field, currentLanguage)` to
 * resolve the right string for display.
 */
export interface LocalizedString {
  source: string;
  sourceLanguage: SupportedLanguage;
  translations?: Partial<Record<SupportedLanguage, string>>;
}

import type { AllergenKey } from './services/culinaryTools';
export type { AllergenKey };

export interface Restaurant {
  id: string;
  name: string;
  zipCode?: string;
  // Standing allergen disclaimer: allergens the kitchen may cross-contact across all recipes.
  // Example: "Every food item sold here may contain tree nuts, peanuts, wheat, milk, eggs, sesame or soy."
  standingAllergenDisclaimer?: string[]; // array of AllergenKey strings
  updatedAt?: any;
  createdAt?: any;
}

export type RecipeType = typeof RECIPE_TYPES[number] | (string & {});

export type Provenance = 'verbatim' | 'inferred_high' | 'inferred_low' | 'user_confirmed' | 'user_edited';

export interface FieldMeta {
  provenance?: BillProvenance;
  confidence?: number; // 0-1
  source?: string; // tool name, knowledge chunk ID, or free-text citation
  inferredAt?: string; // ISO timestamp
}

export interface TemperingCurve {
  meltCelsius: [number, number]; // [min, max]
  coolCelsius: [number, number];
  workCelsius: [number, number];
  method?: 'seeding' | 'tabling' | 'mycryo' | 'machine' | 'other';
  notes?: string;
}

export interface ChocolateSpec {
  type?: 'dark' | 'milk' | 'white' | 'ruby' | 'gianduja' | 'compound';
  cocoaPercentage?: number;
  brand?: string;
  productName?: string;
  tempering?: TemperingCurve;
  origin?: string;
  flavorNotes?: string;
}

/**
 * Structured cross-contact risk record. Stored on Recipe documents in
 * place of the legacy free-text strings produced before Phase 5.
 *
 * The renderer composes the displayed sentence from i18n keys at view
 * time using the `allergen` enum value and the optional `station`
 * identifier (matching `StationTag.primary`).
 */
export interface CrossContactRisk {
  allergen: AllergenKey;
  /**
   * Station identifier matching `StationTag.primary` when known.
   * Undefined or absent means a generic shared workspace.
   */
  station?: string;
}

/**
 * Structured unit-conversion warning, returned from `calculateRecipeCost`
 * when an ingredient or sub-recipe quantity can't be converted into the
 * downstream unit. Never stored on Firestore — recomputed every time the
 * recipe cost is displayed.
 *
 * The renderer picks one of two i18n keys based on `subjectType` and
 * fills the placeholders.
 */
export interface UnitConversionWarning {
  fromUnit: string;
  toUnit: string;
  subjectType: 'sub_recipe' | 'ingredient';
  /**
   * The recipe or ingredient name. Renderer should pass this through
   * `<LocalizedField>` if a LocalizedString form is available, otherwise
   * surface it as a raw string.
   */
  subjectName: string;
}

// =====================================================================
// Dietary classification (Milestone — lactose status)
// Distinct from AllergenFlag. AllergenFlag covers FDA Top-9 immune-mediated
// allergens. DietaryFlag covers non-allergen dietary considerations like
// lactose intolerance, derived from quantitative composition.
// =====================================================================

export type DietaryFlag =
  | 'lactose_free'      // composition.lactose is undefined or 0
  | 'low_lactose'       // 0 < lactose ≤ 0.5% by mass
  | 'lactose_present';  // lactose > 0.5% by mass

export interface AllergenFlag extends String {
  allergen: 'milk' | 'eggs' | 'fish' | 'shellfish' | 'tree_nuts' | 'peanuts' | 'wheat' | 'soy' | 'sesame';
  certainty: 'contains' | 'may_contain' | 'cross_contact_risk';
  source: string; // e.g., "butter", "ingredient-derived", "cross-contact: shared mold"
}

export interface StationTag {
  primary: 'chocolate_room' | 'pastry' | 'garde_manger' | 'hot_line' | 'bar' | 'other';
  skillLevel?: 'commis' | 'line' | 'sous' | 'chef';
  productionMode?: 'a_la_minute' | 'batch' | 'set_service' | 'mise_en_place';
}

export interface EnrobingSpec {
  method?: 'shell_mold' | 'hand_dipped' | 'rolled' | 'enrobed_machine' | 'enrobed_fork' | 'coated_dusted' | 'glazed' | 'velvet_spray' | 'none';
  coating?: string; // "tempered dark 66%", "cocoa powder", "chopped pistachios"
  decoration?: {
    technique?: 'painted' | 'airbrushed' | 'splattered' | 'transfer_sheet' | 'embossed' | 'dusted' | 'none';
    colors?: string[];
    tools?: string[]; // ["airbrush", "#4 round tip", "dipping fork"]
  };
}

export interface HACCPMetadata {
  dangerZoneExposureMinutes?: number; // total time in 41-135°F during prep
  storageTemperatureCelsius?: [number, number]; // [min, max]
  storageHumidity?: [number, number];
  coolingRequired?: boolean; // two-stage 135→70 in 2hr, 70→41 in 4hr
  shelfLifeDays?: number;
  labelingNotes?: string;
}

export interface HardwareSpec {
  moldId: string;
  shape: string;
  cavitiesPerMold: number;
  moldCount: number;
  gramPerCavity: number;
}

export interface DesignLayer {
  order: number;
  technique: string;
  colors: string[];
  tool: string;
  temperatures?: { cocoaButter?: number };
  notes: string;
}

export interface PriceHistoryEntry {
  date: Timestamp | FieldValue;
  costPerUnit: number;
  supplier?: string;
  supplierId?: string;
}

export interface Location {
  id: string;
  name: string;
  type?: string;
  createdAt?: Timestamp | FieldValue;
}

export interface StockPosition {
  id: string;
  locationId: string;
  containerCount: number;
  unitsPerContainer: number;
  lotId?: string;
}

export interface Lot {
  id: string;
  ingredientId: string; // Links to raw ingredient OR prepped sub-recipe
  locationId?: string;   // Where is it physically?
  quantity: number;     // Current remaining amount
  initialQuantity: number;
  costPerUnit: number;  // For precise COGS
  receivedAt: Timestamp | FieldValue;
  expiresAt: Timestamp | FieldValue | null; // For FEFO
  lotNumber?: string;
  poNumber?: string;
  supplierId?: string;
  updatedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
}

export interface InventoryTransaction {
  id?: string;
  type: 'receive' | 'consume' | 'waste' | 'audit' | 'transfer' | 'audit_adjustment' | 'yield';
  ingredientId: string;
  amount: number; // positive or negative
  reason?: string;
  costPerUnit: number; // Snapshot of cost at the time
  date: Timestamp | FieldValue;
  userId: string;
  lotId?: string;
  lotNumber?: string; // Legacy support
  fromLocationId?: string; // For transfers
  toLocationId?: string;   // For transfers/receives
  referenceId?: string; // e.g., PrepList ID or Audit ID
  updatedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
}

export interface AuditItem {
  ingredientId: string;
  lotId: string;
  expectedQty: number; // Snapshot at start time
  actualQty: number | null;
  variance: number | null; // Stale start-time variance (can be omitted in newer versions but kept for backward compatibility)
  expectedQtyAtCompletion?: number; // Snapshot at completion time
  varianceAtCompletion?: number | null; // Actual variance computed at completion
}

export interface Audit {
  id: string;
  status: 'draft' | 'in_progress' | 'completed';
  startedAt: Timestamp | FieldValue;
  completedAt?: Timestamp | FieldValue;
  locationId?: string; // Optional: audit a specific room
  notes?: string;
  items: AuditItem[];
  updatedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  leadTimeDays?: number;
  minimumOrderValue?: number;
  tags?: string[];
  customFields?: CustomField[];
  notes?: string;
  notesI18n?: LocalizedString;
  updatedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
}

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

export interface PurchaseOrderItem {
  ingredientId: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: number;
  name?: string; // For UI convenience
  unit?: string; // For UI convenience
}

export interface PurchaseOrder {
  id?: string;
  poNumber: string;
  supplierId: string;
  status: 'draft' | 'sent' | 'partially_received' | 'fulfilled' | 'received' | 'cancelled';
  items: PurchaseOrderItem[];
  totalAmount: number;
  notes?: string;
  receivedAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
}

export interface ShoppingListItem {
  id?: string;
  ingredientId: string;
  name: string;
  quantity: number;
  unit?: string;
  status: 'pending' | 'purchased' | 'ordered' | 'received' | 'cancelled';
  supplierId?: string;
  moq?: number;
  orderUnit?: string;
  costPerUnit?: number;
  updatedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
}

export interface RecipeIngredient {
  type?: 'ingredient' | 'recipe';
  ingredientId?: string;
  recipeId?: string;
  quantity: number;
  unit?: string;
  role?: RoleTag;
  specification?: string; // e.g., "62%", "High-Fat", "Mesh 40"
  specificationI18n?: LocalizedString;
  secondaryQuantity?: number; // e.g., 5 for "5 lb" when primary is 2267g
  secondaryUnit?: string; // e.g., "lb"
  density?: number; // g/ml - inferred from dual units (e.g., 1 Quart = 907g)
  wasteFactor?: number; // 0-1 (e.g., 0.05 for 5% loss during processing)
  isDiscrete?: boolean;
  state?: string; // e.g., "chopped", "melted"
  stateI18n?: LocalizedString;
  originalState?: string; // State before processing (e.g., "solid bars")
  convertedQuantities?: string; // e.g., "approx. 10.6 melted cups"
  originalString?: string; // The exact phrase read by the AI
  name?: string; // Temporary field for inline creation
  showIngredientSuggestions?: boolean; // Temporary UI field for inline creation
  confidence?: {
    name?: number;
    quantity?: number;
    unit?: number;
    specification?: number;
  };
  meta?: Record<string, FieldMeta>; // keyed by field name: { quantity: {...}, name: {...} }
  chocolateSpec?: ChocolateSpec; // populated when the ingredient is a chocolate
  allergens?: AllergenFlag[]; // derived allergens for this specific ingredient
  yieldFactor?: number; // 0-1, for prep actions like "peeled and diced" (default 1.0)
  prepAction?: string; // "toasted and skinned", "melted", "softened"
}

export interface RecipeStep {
  id: string;
  order: number;
  title: string;
  titleI18n?: LocalizedString;
  actionType: typeof ACTION_TYPES[number] | (string & {});
  equipment: string[];
  icon?: string; // e.g., "blender", "whisk", "jar", "thermometer"
  parameters?: {
    durationSeconds?: number;
    temperatureTarget?: number;
    speedSetting?: string;
    physicalSizeTarget?: string; // e.g., "1/4 inch"
  };
  isCCP?: boolean; // Critical Control Point (Quality/Safety)
  ccpInstruction?: string;
  ccpInstructionI18n?: LocalizedString;
  warning?: string;
  warningI18n?: LocalizedString;
  instruction: string;
  instructionI18n?: LocalizedString;
  instructionSpanish?: string; // Bilingual support
  /** Closed-DSL predicate. When false, the step is hidden in cooking/detail view. */
  condition?: StepCondition;
  /** Template instruction with {{slot}} markers. When set, it overrides `instruction` at render time. */
  templateInstruction?: string;
  templateInstructionI18n?: LocalizedString;
  /** Slot table for the templateInstruction. Keys must match the markers in the template. */
  slots?: Record<string, ContextSlot>;
  /**
   * Curated translation map for the step instruction. See `Recipe.nameTranslations`.
   */
  instructionTranslations?: Partial<Record<SupportedLanguage, string>>;
  confidence?: {
    instruction?: number;
    parameters?: number;
  };
  meta?: Record<string, FieldMeta>;
  inferredEquipment?: string[]; // tools the AI inferred from the verb
  inferredDurationSeconds?: number; // if not explicitly stated
  inferredTemperatureCelsius?: number;
}

export interface YieldEquation {
  totalYieldAmount: number;
  totalYieldUnit: string;
  portionAmount: number;
  portionUnit: string;
  portionApplication: string;
  applicationYield?: {
    servingAmount: number;
    servingUnit: string;
    yieldAmount: number;
    yieldUnit: string;
    description: string;
  };
}

export interface RecipeComponent {
  id: string;
  name: string;
  nameI18n?: LocalizedString;
  type: typeof COMPONENT_TYPES[number] | (string & {});
  percentageOfTotalWeight: number;
  bufferPercentage: number;
  ingredients: RecipeIngredient[];
  instructions?: string[]; // Legacy support
  steps?: RecipeStep[];
}

export interface CustomField {
  name: string;
  value: string;
}

export interface PrepItem {
  recipeId: string;
  quantity: number;
  notes?: string;
}

export interface ProductionRun {
  id: string;
  name: string;
  plannedDate: Timestamp | FieldValue;
  completedAt?: Timestamp | FieldValue;
  status: 'draft' | 'active' | 'completed';
  items: PrepItem[];
  notes?: string;
  updatedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
}

export interface PackagingOption {
  id: string;
  type: string; // e.g., "Foil Pouch", "Glass Jar"
  capacity: number;
  unit: string;
  isIndividual: boolean;
  materialsNeeded?: string[]; // e.g., ["Label", "Oxygen Absorber"]
}

export interface SensoryProfile {
  aroma?: string;
  texture?: string;
  appearance?: string;
  flavorProfile?: string;
}

export interface Recipe {
  id: string;
  name: string;
  nameI18n?: LocalizedString;
  nameSpanish?: string;
  /**
   * Curated translation map for the recipe name, edited through the
   * translation tabs in RecipeEditor. The save helper
   * (`attachRecipeLocalizedFields`) folds this into `nameI18n.translations`
   * for every populated language slot.
   *
   * Replaces the single-language `nameSpanish` field for editor purposes.
   * The legacy field remains for backward compatibility with extraction
   * output and untouched documents.
   */
  nameTranslations?: Partial<Record<SupportedLanguage, string>>;
  description: string;
  descriptionI18n?: LocalizedString;
  type?: RecipeType;
  hardware?: HardwareSpec;
  equipment?: string[]; // General kitchen equipment (Blender, Bowl, etc.)
  storageInstructions?: string;
  storageInstructionsI18n?: LocalizedString;
  storageEnvironment?: 'ambient' | 'refrigerated' | 'frozen' | 'dry_dark';
  shelfLife?: string;
  shelfLifeI18n?: LocalizedString;
  globalDisclaimers?: string[];
  allergens?: (string & AllergenFlag)[]; // Structured allergen list
  /**
   * Dietary classification — derived from aggregate recipe composition.
   * A recipe is lactose_free only if every dairy-derived ingredient is
   * lactose_free. low_lactose if total lactose ≤ 1g per serving (FDA threshold).
   * Recomputed via deriveRecipeDietaryFlags() on every recipe save.
   */
  dietary?: DietaryFlag[];
  packagingOptions?: PackagingOption[];
  sensoryProfile?: SensoryProfile;
  reconstitutionInstructions?: string; // e.g., "35g per 8oz cup"
  design?: DesignLayer[];
  components?: RecipeComponent[];
  customFields?: CustomField[];
  tags?: string[];
  /**
   * Category tags. Each tag opts the recipe into a category-specific physics module
   * on top of the always-on universal kernel. Empty / missing means universal-only.
   */
  categories?: RecipeCategory[];
  /**
   * Subtype within the frozen category. Read by the frozen module to select
   * the band table for warnings. Optional; when missing, the frozen module
   * falls back to a name-and-composition inference.
   */
  frozenSubtype?: FrozenRecipeSubtype;
  /**
   * Subtype within the bread category. Read by the bread module to select
   * the band table for warnings. Optional; when missing, the bread module
   * falls back to a name-and-composition inference.
   */
  breadSubtype?: BreadRecipeSubtype;
  needsReview?: boolean;
  aiExtractionNotes?: string;
  aiExtractionNotesI18n?: LocalizedString;
  rawExtractionData?: string;
  yield?: YieldEquation;
  retailPrice?: number;
  targetMarginPercentage?: number;
  laborTimeMinutes?: number;
  hourlyRate?: number;
  overheadPercentage?: number;
  outputIngredientId?: string;
  updatedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
  confidence?: {
    name?: number;
    yield?: number;
    overall?: number;
  };
  ocrTranscript?: string;
  lowConfidenceFields?: string[];
  // Provenance & metadata
  meta?: Record<string, FieldMeta>;
  extractionVersion?: number; // schema version for migrations
  
  // AI-inferred operational metadata
  stationTag?: StationTag;
  haccp?: HACCPMetadata;
  enrobing?: EnrobingSpec;
  
  mixingParams?: {
    /** Mixing method — drives default friction factor for DDT. */
    mixingMethod?: MixingMethod;
    /** Friction factor (°C). Overrides the default from mixingMethod when set. */
    frictionFactor?: number;
    /** Ambient room temp at the time of mixing (°C). Default 22. */
    roomTempC?: number;
    /** Flour temp at the time of mixing (°C). Default = roomTempC. */
    flourTempC?: number;
    /** Desired dough temperature (°C). Default 24 for lean doughs, 26 for enriched. */
    desiredDoughTempC?: number;
    /** Hydration percentage of the starter or preferment (water/flour × 100). Default 100. */
    starterHydrationPct?: number;
  };
  
  
  // Derived & aggregated
  /**
   * Structured cross-contact risk records, populated by
   * `computeCrossContactRisks` at save time. The legacy `string[]` shape
   * remains in the union for backward compatibility with documents that
   * predate Phase 5 — the renderer in `RecipeDetail.tsx` handles both
   * shapes via a runtime guard. Phase 5's migration script flips all
   * existing docs to `CrossContactRisk[]`; a future cleanup tightens
   * this type to `CrossContactRisk[]` only.
   */
  crossContactRisks?: (CrossContactRisk | string)[];
}

/**
 * A persisted sourcing observation — a SourcingCandidate the chef chose to Keep.
 * Lives in the /sourcing_notes collection, queryable by ingredientId.
 */
export type SourcingCandidate = Omit<SourcingNote, 'id' | 'ingredientId' | 'restaurantId' | 'keptAt' | 'keptBy' | 'promotedToSupplierId' | 'updatedAt' | 'createdAt'>;

export interface SourcingNote {
  id: string;
  name: string;
  address?: string;
  website?: string;
  phone?: string;
  priceUsd?: number;
  priceUnit?: string;
  observedAt?: string;
  sourceUrl?: string;
  sourceDomain?: string;
  notes?: string;
  ingredientId: string;
  restaurantId: string;           // 'default' for now; future multi-restaurant support
  keptAt: any;                     // Firestore Timestamp
  keptBy: string;                  // user uid
  promotedToSupplierId?: string;   // set once the note has been turned into a supplier record
  updatedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
}

// =====================================================================
// Composition (Milestone A — Universal Physics Primitives)
// =====================================================================

export type CompositionSpecies =
  | 'water' | 'sucrose' | 'glucose' | 'fructose'
  | 'lactose' | 'maltose' | 'sorbitol' | 'glycerol'
  | 'ethanol' | 'fat' | 'protein' | 'ash';

export interface Composition {
  water?: number;     // % by mass, 0-100
  sucrose?: number;
  glucose?: number;
  fructose?: number;
  lactose?: number;
  maltose?: number;
  sorbitol?: number;
  glycerol?: number;
  ethanol?: number;
  fat?: number;
  protein?: number;
  ash?: number;
  // --- descriptive sub-fractions: NOT part of the mass-balance sum (they break
  // down fields above), so compositionSum/isCompositionComplete ignore them. ---
  /** Unsaturated portion of `fat` (0 ≤ unsaturatedFat ≤ fat), mass %. Lipid-oxidation substrate. */
  unsaturatedFat?: number;
  /** Sodium content (a subset of `ash`), mass %. Electrolyte for freezing-point depression. */
  sodium?: number;
  // --- flavor-active trace compounds: the chemical inventory the perception layer reads ---
  /** Caffeine, mass % — bitter (T2R) agonist. */
  caffeine?: number;
  /** Theobromine, mass % — cocoa's milder bitter methylxanthine. */
  theobromine?: number;
  /** Free glutamate, mass % — umami (T1R1/T1R3) agonist. */
  glutamate?: number;
}

export type CompositionSource =
  | 'explicit'           // user typed values into the editor
  | 'usda_fdc'           // pulled from USDA FoodData Central snapshot
  | 'chocolate_spec'     // derived from chocolateSpec.cocoaPercentage
  | 'alcohol_spec'       // derived from alcoholSpec.abv
  | 'category_default'   // category fallback
  | 'unknown';           // no data available

export interface AlcoholSpec {
  abv?: number;          // % alcohol by volume, 0-100
  type?: 'wine' | 'liqueur' | 'spirit' | 'highproof';
  brand?: string;
}

// =====================================================================
// Roles (Milestone C — Role Architecture)
// =====================================================================

/**
 * Universal roles — what an ingredient does in a recipe, independent of category.
 * The formulation engine reads this. Closed enum: new roles require a code change.
 */
export const UNIVERSAL_ROLES = [
  'sweetener',     // sucrose, honey, glucose syrup, sorbitol, invert sugar
  'fat',           // butter, oil, cocoa butter, lard
  'liquid',        // cream, milk, water added, juice, stock
  'flour_starch',  // wheat flour, rye flour, cornstarch, tapioca
  'leavener',      // yeast, baking soda, baking powder, sourdough starter
  'acidulant',     // vinegar, citrus juice, lemon zest, citric acid
  'hydrocolloid',  // gelatin, pectin, agar, carrageenan, xanthan, lbg
  'protein',       // egg, milk powder, whey, casein, meat, seafood
  'alcohol',       // wine, spirit, liqueur, beer
  'flavor',        // extracts, oils, infusions, spices, herbs, vanilla
  'inclusion',     // nuts, dried fruit, chocolate chips, seeds (textural additions)
  'salt',          // table salt, sea salt, kosher salt, mineral seasonings
  'water',         // explicit water added (not the water inside another ingredient)
  'other',         // doesn't fit cleanly — color, dust, garnish, packaging, etc.
] as const;

export type UniversalRole = typeof UNIVERSAL_ROLES[number];

/**
 * Category-specific subtypes. Each module declares its own. Listed here for type-safety
 * across the codebase, but only the corresponding module reads its subtype values.
 *
 * Confectionery, frozen, bread, brined, plated subtypes — populated as those modules ship.
 */
export type ConfectionerySubtype =
  | 'chocolate' | 'cream' | 'butter' | 'sugar_add' | 'puree' | 'powder'
  | 'milk_powder' | 'glucose_syrup' | 'flavor_oil' | 'infusion'
  | 'stabilizer' | 'gelatin' | 'cocoa_butter' | 'praline_paste'
  | 'fondant' | 'inclusion';

export type FrozenSubtype =
  | 'base_dairy' | 'base_water' | 'sugar_blend' | 'fat_addition'
  | 'stabilizer_blend' | 'flavor_paste' | 'inclusion' | 'alcohol_low_dose';

export type BreadSubtype =
  | 'bread_flour' | 'whole_wheat_flour' | 'rye_flour' | 'specialty_flour'
  | 'starter' | 'preferment' | 'commercial_yeast'
  | 'enrichment_fat' | 'enrichment_dairy' | 'enrichment_egg' | 'enrichment_sweetener'
  | 'inclusion' | 'salt';

export type CategorySubtype =
  | ConfectionerySubtype
  | FrozenSubtype
  | BreadSubtype;

/**
 * Role tag attached to a recipe ingredient.
 *
 * `universal` is what cross-category tooling reads (the optimizer, warnings, the rollup).
 * `subtype` is read only by the matching category module.
 * `provenance` records how the role was determined.
 */
export interface RoleTag {
  universal: UniversalRole;
  subtype?: CategorySubtype;
  provenance: 'inferred_high' | 'inferred_low' | 'user_confirmed' | 'user_edited' | 'verbatim';
  confidence?: number;          // 0..1, only meaningful for inferred_*
}

// =====================================================================
// Recipe categories (Milestone D — Confectionery Module)
// =====================================================================

/**
 * A recipe's category tags select which physics modules apply on top of universal.
 * Multiple categories can stack (e.g., a frozen confection that gets both rule sets).
 * Adding a new category requires shipping its module — see /services/foodScience/.
 */
export const RECIPE_CATEGORIES = [
  'confectionery',  // ganaches, truffles, bonbons, caramels, nougat, fudge, marshmallow, fondant, fillings
  'frozen',         // ice cream, gelato, sorbet, sherbet, semifreddo, granita, frozen yogurt — Milestone F
  'bread',          // doughs, viennoiserie, breads, pizza — Milestone G
  'plated',         // plated desserts, hot/cold composed plates — later
  'brined',         // cures, brines, charcuterie — later
  'sauce',          // sauces, emulsions, reductions — later
  'savory',         // catch-all for non-categorical savory — later
] as const;

export type RecipeCategory = typeof RECIPE_CATEGORIES[number];

// =====================================================================
// Optimizer (Milestone E — Formulation Optimizer)
// =====================================================================

/**
 * One axis of the search space. Each dimension contributes one or more genes
 * to the decision vector. The recipe builder decodes a vector against the base
 * recipe and the dimension list to produce a candidate.
 *
 * Closed enum — adding a new dimension kind is a code change in
 * src/services/foodScience/optimizer/.
 */
export type SearchDimension =
  | {
      kind: 'continuous_mass';
      ingredientId: string;        // existing recipe-ingredient
      componentIndex: number;
      ingredientIndex: number;
      baseMass: number;
      minMass: number;
      maxMass: number;
    }
  | {
      kind: 'continuous_pct_of_role';
      role: UniversalRole;
      componentIndex: number;       // where to insert if not present
      ingredientId: string;          // candidate to insert/scale
      minPct: number;                // 0..1 of total recipe mass
      maxPct: number;
    }
  | {
      kind: 'parametric_choice';
      ingredientId: string;
      componentIndex: number;
      ingredientIndex: number;
      property: 'cocoaPercentage';
      options: number[];             // e.g., [55, 60, 65, 70, 75, 80]
    }
  | {
      kind: 'discrete_swap';
      componentIndex: number;
      ingredientIndex: number;
      candidateIngredientIds: string[];   // includes the base ingredient at index 0
    }
  | {
      kind: 'presence_with_variant';
      role: UniversalRole;
      componentIndex: number;
      candidateIngredientIds: string[];   // ingredients to consider adding
      maxMass: number;
    };

/** A serialized decision vector. One entry per dimension; semantics depend on kind. */
export type DecisionVector = number[];

export type OptimizerObjective =
  | 'aw_distance_to_target'
  | 'aw_below_threshold'
  | 'shelf_life_weeks'
  | 'cost_per_gram'
  | 'curdle_safety_margin'
  | 'fat_regime_distance'
  | 'warning_count'
  | 'composition_completeness'
  | 'ice_fraction_at_serving_distance'
  | 'recrystallization_margin';

export interface OptimizerTargets {
  awTarget?: number;             // e.g., 0.85 for stabilized
  awMaxThreshold?: number;       // hard constraint when set
  shelfLifeWeeksMin?: number;
  costPerGramMaxUsd?: number;
  forbiddenFatRegimes?: Array<'firm-set' | 'standard' | 'inversion-approaching' | 'oil-in-water'>;
  maxCurdleRisk?: 'none' | 'low' | 'medium' | 'high';
  /** Frozen-dessert serving temperature (°C) for the ice-fraction / recrystallization objectives. */
  servingTempC?: number;
  /** Target fraction (0..1) of water frozen at servingTempC. */
  frozenWaterTarget?: number;
}

/** Weights in [0..1]. Normalized at runtime. Keys present here are active objectives. */
export type ObjectiveWeights = Partial<Record<OptimizerObjective, number>>;

export interface OptimizerCandidate {
  id: string;                              // crypto.randomUUID at construction
  vector: DecisionVector;
  recipe: Recipe;                          // the materialized candidate recipe
  /** Per-objective scores; higher is better, normalized to [0..1] except warning_count which is 1/(1+n). */
  objectives: Record<OptimizerObjective, number>;
  topsisCloseness: number;                 // 0..1, higher better
  paretoRank: number;                      // 0 = non-dominated front
  /** Diff from base for display: list of human-readable changes. Computed by recipeBuilder. */
  diff: Array<
    | { kind: 'mass_changed'; ingredientName: string; from: number; to: number }
    | { kind: 'swapped'; from: string; to: string; mass: number }
    | { kind: 'added'; ingredientName: string; mass: number }
    | { kind: 'removed'; ingredientName: string; mass: number }
    | { kind: 'cocoa_changed'; from: number; to: number }
  >;
}

export interface OptimizerInput {
  baseRecipe: Recipe;
  ingredientCatalog: Ingredient[];        // entire catalog accessible to the worker
  recipesCatalog: Recipe[];                // for sub-recipe resolution; usually empty for tuning
  targets: OptimizerTargets;
  weights: ObjectiveWeights;
  /** Locked dimensions (chef pinned these and doesn't want them touched). */
  lockedIngredientIds: string[];
  /** Candidate ingredients to consider adding (presence_with_variant). */
  candidateAdditionIds: string[];
  /** Search algorithm config; pass empty object to use defaults. */
  config?: {
    populationSize?: number;
    generations?: number;
    crossoverRate?: number;       // 0..1
    mutationRate?: number;
    sbxEta?: number;              // SBX distribution index
    polynomialEta?: number;       // mutation distribution index
    tournamentSize?: number;
    topN?: number;
  };
}

export interface OptimizerResult {
  candidates: OptimizerCandidate[];
  searchSpace: SearchDimension[];
  generationsRun: number;
}

// =====================================================================
// DSL — step condition and slot types (Milestone D)
// =====================================================================

export type StepCondition =
  | { kind: 'always' }
  | { kind: 'role_present'; role: UniversalRole }
  | { kind: 'role_absent'; role: UniversalRole }
  | { kind: 'role_quantity'; role: UniversalRole; op: '<' | '<=' | '=' | '>=' | '>'; grams: number }
  | { kind: 'physics_compare'; metric: 'aw' | 'pH' | 'fatPct' | 'aqueousSugarPct'; op: '<' | '<=' | '=' | '>=' | '>'; value: number }
  | { kind: 'aw_band'; band: 'very-fragile' | 'fragile' | 'stabilized' | 'shelf-stable' | ('very-fragile' | 'fragile' | 'stabilized' | 'shelf-stable')[] }
  | { kind: 'fat_regime'; regime: 'syrup' | 'oil-in-water' | 'inversion-approaching' | 'firm-set' | ('syrup' | 'oil-in-water' | 'inversion-approaching' | 'firm-set')[] }
  | { kind: 'curdle_risk'; min: 'low' | 'medium' | 'high' }
  | { kind: 'category_subtype_present'; subtype: CategorySubtype }
  | { kind: 'and'; conditions: StepCondition[] }
  | { kind: 'or'; conditions: StepCondition[] }
  | { kind: 'not'; condition: StepCondition };

export type SlotFormatter =
  | 'percent_int'              // 41 → "41%"
  | 'gram_int'                 // 234.7 → "235 g"
  | 'gram_one_decimal'         // 234.7 → "234.7 g"
  | 'aw_three_decimals'        // 0.9438 → "0.944"
  | 'ph_two_decimals'          // 3.749 → "3.75"
  | 'temp_c'                   // 31.5 → "31.5°C"
  | 'identity';                // pass-through

export type ContextSlot =
  | { kind: 'physics'; metric: 'aw' | 'pH' | 'fatPct' | 'aqueousSugarPct' | 'shelfLifeWeeks'; formatter: SlotFormatter }
  | { kind: 'role_quantity'; role: UniversalRole; formatter: SlotFormatter }
  | { kind: 'role_property'; role: UniversalRole; property: 'name' }
  | { kind: 'derived'; name: 'temperWindow' | 'temperWorkingPoint' | 'curdleFoldCeiling' | 'curdleRiskLabel' | 'finalAbv'; formatter: SlotFormatter };

// =====================================================================
// Frozen recipe subtype (Milestone F — Frozen Module)
// =====================================================================

/**
 * What the recipe IS as a finished product. Distinct from the per-ingredient
 * `RoleTag.subtype: FrozenSubtype`, which describes what an ingredient DOES
 * inside the recipe.
 */
export const FROZEN_RECIPE_SUBTYPES = [
  'gelato',
  'ice_cream',
  'sorbet',
  'sherbet',
  'semifreddo',
  'frozen_yogurt',
  'granita',
] as const;

export type FrozenRecipeSubtype = typeof FROZEN_RECIPE_SUBTYPES[number];

// =====================================================================
// Bread recipe subtype (Milestone G — Bread Module)
// =====================================================================

/**
 * What the recipe IS as a finished product. Distinct from the per-ingredient
 * `RoleTag.subtype: BreadSubtype` which describes what an ingredient DOES.
 */
export const BREAD_RECIPE_SUBTYPES = [
  'standard_bread',     // generic country / boule / batard at 65–75% hydration
  'ciabatta',           // very wet, 75–85% hydration
  'baguette',           // 65–72% hydration, instant yeast
  'bagel',              // very stiff, 50–58% hydration
  'pizza_dough',        // 60–65% hydration, longer ferment, possibly poolish
  'brioche',            // enriched: butter + eggs, 50–55% hydration
  'whole_wheat',        // 100% whole wheat or majority whole wheat
  'sourdough',          // levain-leavened, 70–80% hydration typical
  'pan_loaf',           // sandwich tin loaf, 60–68% hydration, often slightly enriched
] as const;

export type BreadRecipeSubtype = typeof BREAD_RECIPE_SUBTYPES[number];

/**
 * Mixing method drives the friction factor used in DDT calculation.
 *   hand          — friction factor 0
 *   stand_mixer   — friction factor 8–15 (default 10)
 *   spiral_mixer  — friction factor 20–30 (default 25)
 *   no_knead      — friction factor 0 (autolyse + folds only)
 */
export const MIXING_METHODS = ['hand', 'stand_mixer', 'spiral_mixer', 'no_knead'] as const;
export type MixingMethod = typeof MIXING_METHODS[number];

export const DEFAULT_FRICTION_FACTOR_BY_METHOD: Record<MixingMethod, number> = {
  hand:         0,
  stand_mixer:  10,
  spiral_mixer: 25,
  no_knead:     0,
};

// =====================================================================
// Expenses domain (Milestone P&L-A — data model only)
// =====================================================================

export type ExpenseCategoryParent = 'operating' | 'non_operating' | 'cogs';

export interface ExpenseCategory {
  id?: string;
  name: string;
  parent: ExpenseCategoryParent;
  glAccountCode: string;
  description?: string;
  isActive: boolean;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

export type PaymentMethod = 'ach' | 'card' | 'check' | 'wire' | 'auto_debit' | 'cash' | 'other';

export interface VendorContact {
  name: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface Vendor {
  id?: string;
  name: string;
  expenseCategoryId: string;
  accountIdentifier?: string;
  address?: string;
  website?: string;
  phone?: string;
  defaultPaymentMethod?: PaymentMethod;
  contacts?: VendorContact[];
  linkedSupplierId?: string;
  tags?: string[];
  notes?: string;
  isActive: boolean;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

export interface BillLineItem {
  description: string;
  amount: number;
  quantity?: number;
  unitPrice?: number;
  categoryHintId?: string;
}

export interface BillTaxLine {
  description: string;
  amount: number;
  rate?: number;
}

export type BillStatus = 'extracted' | 'reviewed' | 'scheduled' | 'paid' | 'partially_paid' | 'reconciled' | 'disputed' | 'void';

export type BillProvenance = Provenance | 'ocr_high_confidence' | 'ocr_low_confidence' | 'vendor_default';

export interface BillPaymentInstruction {
  method: PaymentMethod;
  addressOrAccount: string;
  dueIfPaidBy?: Timestamp | FieldValue;
}

export interface BillVendorResolution {
  status: 'resolved' | 'unresolved' | 'ambiguous';
  candidateVendorIds: string[];
  rawExtractedVendorName: string;
}

export interface Bill {
  id?: string;
  vendorId?: string | null;
  expenseCategoryId?: string | null;
  billDate: Timestamp | FieldValue;
  dueDate?: Timestamp | FieldValue;
  periodStart?: Timestamp | FieldValue;
  periodEnd?: Timestamp | FieldValue;
  invoiceNumber?: string;
  accountNumber?: string;
  extractedVendorName?: string;
  totalAmount: number;
  amountDue?: number;
  paidAmount?: number;
  currency?: string;
  lineItems: BillLineItem[];
  taxes?: BillTaxLine[];
  paymentInstructions?: BillPaymentInstruction;
  status: BillStatus;
  notes?: string;
  imageStoragePath?: string;
  extractedJson?: string;
  fieldMeta?: Record<string, FieldMeta>;
  vendorResolution?: BillVendorResolution;
  recurringExpectationId?: string;
  tags?: string[];
  createdBy?: string;          // Firebase auth uid of the user who saved this bill
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

export interface BillAllocation {
  billId: string;
  amount: number;
}

export interface Payment {
  id?: string;
  paymentDate: Timestamp | FieldValue;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  billAllocations: BillAllocation[];
  notes?: string;
  createdBy?: string;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

// =====================================================================
// Alerts (Milestone P&L-E)
// =====================================================================

export type AlertType = 'missing_bill' | 'due_soon' | 'anomaly_amount';
export type AlertSeverity = 'info' | 'warning' | 'urgent';

export interface Alert {
  id?: string;
  userId: string;
  type: AlertType;
  severity: AlertSeverity;
  vendorId?: string;
  billId?: string;
  expectationId?: string;
  titleKey: string;          // i18n key, e.g. 'alerts:missingBill.title'
  bodyKey: string;           // i18n key
  bodyParams?: Record<string, string | number>;  // for interpolation
  actionUrl?: string;        // app-relative path the bell-icon click navigates to
  dismissedAt?: Timestamp | FieldValue | null;
  createdAt?: Timestamp | FieldValue;
}

export interface RecurringCadenceTolerance {
  amountToleranceBand: {
    low: number;
    high: number;
  };
  graceDays: number;
}

export interface RecurringExpectation {
  id?: string;
  vendorId: string;
  expenseCategoryId?: string;
  rrule: string;
  nextExpectedDate: Timestamp | FieldValue;
  expectedAmount: number;
  tolerance: RecurringCadenceTolerance;
  lastSatisfiedBillId?: string;
  isActive: boolean;
  notes?: string;
  lastCheckedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}
