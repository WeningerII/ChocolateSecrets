import { FieldValue, Timestamp } from 'firebase/firestore';
import { RECIPE_TYPES, COMPONENT_TYPES, ACTION_TYPES } from '../constants';
import type { LocalizedString, SupportedLanguage } from './i18n';
import type { FieldMeta, CustomField } from './common';
import type { RoleTag } from './roles';
import type { StepCondition, ContextSlot } from './dsl';
import type { ChocolateSpec, DesignLayer, EnrobingSpec } from './chocolate';
import type { AllergenFlag, DietaryFlag, HACCPMetadata, CrossContactRisk } from './allergens';
import type { RecipeCategory, FrozenRecipeSubtype, BreadRecipeSubtype, MixingMethod } from './categories';
import type { StationTag } from './production';

export type RecipeType = typeof RECIPE_TYPES[number] | (string & {});

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

export interface HardwareSpec {
  moldId: string;
  shape: string;
  cavitiesPerMold: number;
  moldCount: number;
  gramPerCavity: number;
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
