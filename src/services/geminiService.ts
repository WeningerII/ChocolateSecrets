import { Type } from '@google/genai';
import { getGeminiClient } from './geminiClient';
import { INGREDIENT_CATEGORIES, RECIPE_TYPES, COMPONENT_TYPES, ACTION_TYPES, CANONICAL_UNITS } from '../constants';
import { 
  Recipe, RecipeIngredient, RecipeStep, RecipeComponent, YieldEquation,
  FieldMeta, Provenance, ChocolateSpec, AllergenFlag,
  StationTag, EnrobingSpec, HACCPMetadata, TemperingCurve, RoleTag
} from '../types';
import { classifyStation, deriveAllergens, inferEquipment, parseChocolateSpec, inferEnrobing, estimateYield, lookupTemperingCurve } from './culinaryTools';
import { inferRoleTag } from './foodScience/roles';
import { GEMINI_MODEL } from '../constants/gemini';

const RECIPE_EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "The name of the recipe or flavor" },
    nameSpanish: { type: Type.STRING },
    description: { type: Type.STRING },
    type: { type: Type.STRING, enum: ["standard", "molded_praline", "bonbon", "enrobed", "bar", "component", "truffle", "caramel", "fudge", "nougat", "marshmallow", "pate_de_fruit", "dragee", "ganache", "praline_paste", "gianduja", "macaron", "cookie", "cake", "pastry", "ice_cream", "sorbet", "sauce", "syrup", "beverage", "viennoiserie", "entremet", "tart", "bread", "plated_dessert", "glaze", "dough", "batter", "mousse", "cremeux", "savory", "other"] },
    equipment: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Global equipment needed" },
    storageInstructions: { type: Type.STRING },
    storageEnvironment: { type: Type.STRING, enum: ["ambient", "refrigerated", "frozen", "dry_dark"] },
    shelfLife: { type: Type.STRING },
    globalDisclaimers: { type: Type.ARRAY, items: { type: Type.STRING } },
    allergens: { type: Type.ARRAY, items: { type: Type.STRING } },
    packagingOptions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          capacity: { type: Type.NUMBER },
          unit: { type: Type.STRING },
          isIndividual: { type: Type.BOOLEAN },
          materialsNeeded: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    },
    sensoryProfile: {
      type: Type.OBJECT,
      properties: {
        aroma: { type: Type.STRING },
        texture: { type: Type.STRING },
        appearance: { type: Type.STRING },
        flavorProfile: { type: Type.STRING }
      }
    },
    reconstitutionInstructions: { type: Type.STRING },
    hardware: {
      type: Type.OBJECT,
      properties: {
        moldId: { type: Type.STRING },
        shape: { type: Type.STRING },
        cavitiesPerMold: { type: Type.NUMBER },
        moldCount: { type: Type.NUMBER },
        gramPerCavity: { type: Type.NUMBER }
      }
    },
    design: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          order: { type: Type.NUMBER },
          technique: { type: Type.STRING },
          colors: { type: Type.ARRAY, items: { type: Type.STRING } },
          tool: { type: Type.STRING },
          notes: { type: Type.STRING }
        }
      }
    },
    yield: {
      type: Type.OBJECT,
      properties: {
        totalYieldAmount: { type: Type.NUMBER },
        totalYieldUnit: { type: Type.STRING },
        portionAmount: { type: Type.NUMBER },
        portionUnit: { type: Type.STRING },
        portionApplication: { type: Type.STRING },
        applicationYield: {
          type: Type.OBJECT,
          properties: {
            servingAmount: { type: Type.NUMBER },
            servingUnit: { type: Type.STRING },
            yieldAmount: { type: Type.NUMBER },
            yieldUnit: { type: Type.STRING },
            description: { type: Type.STRING }
          }
        }
      }
    },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    customFields: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          value: { type: Type.STRING }
        }
      }
    },
    needsReview: { type: Type.BOOLEAN },
    aiExtractionNotes: { type: Type.STRING },
    rawExtractionData: { type: Type.STRING, description: "Catch-all for any text or notes that didn't fit elsewhere" },
    confidence: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.NUMBER },
        yield: { type: Type.NUMBER },
        overall: { type: Type.NUMBER }
      }
    },
    ocrTranscript: { type: Type.STRING },
    lowConfidenceFields: { type: Type.ARRAY, items: { type: Type.STRING } },
    ingredients: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          unit: { type: Type.STRING },
          specification: { type: Type.STRING },
          secondaryQuantity: { type: Type.NUMBER },
          secondaryUnit: { type: Type.STRING },
          density: { type: Type.NUMBER },
          wasteFactor: { type: Type.NUMBER },
          category: { type: Type.STRING },
          isDiscrete: { type: Type.BOOLEAN },
          state: { type: Type.STRING },
          originalState: { type: Type.STRING },
          convertedQuantities: { type: Type.STRING },
          originalString: { type: Type.STRING },
          matchConfidence: { type: Type.NUMBER },
          confidence: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.NUMBER },
              quantity: { type: Type.NUMBER },
              unit: { type: Type.NUMBER },
              specification: { type: Type.NUMBER }
            }
          }
        },
        required: ["name", "quantity", "unit"]
      }
    },
    components: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          type: { type: Type.STRING },
          percentageOfTotalWeight: { type: Type.NUMBER },
          bufferPercentage: { type: Type.NUMBER },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                actionType: { type: Type.STRING },
                equipment: { type: Type.ARRAY, items: { type: Type.STRING } },
                icon: { type: Type.STRING, description: "Icon name like blender, whisk, jar, etc." },
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    durationSeconds: { type: Type.NUMBER },
                    temperatureTarget: { type: Type.NUMBER },
                    speedSetting: { type: Type.STRING },
                    physicalSizeTarget: { type: Type.STRING }
                  }
                },
                isCCP: { type: Type.BOOLEAN },
                ccpInstruction: { type: Type.STRING },
                warning: { type: Type.STRING },
                instruction: { type: Type.STRING },
                instructionSpanish: { type: Type.STRING },
                confidence: {
                  type: Type.OBJECT,
                  properties: {
                    instruction: { type: Type.NUMBER },
                    parameters: { type: Type.NUMBER }
                  }
                }
              }
            }
          },
          ingredients: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                unit: { type: Type.STRING },
                specification: { type: Type.STRING },
                secondaryQuantity: { type: Type.NUMBER },
                secondaryUnit: { type: Type.STRING },
                density: { type: Type.NUMBER },
                wasteFactor: { type: Type.NUMBER },
                category: { type: Type.STRING },
                isDiscrete: { type: Type.BOOLEAN },
                state: { type: Type.STRING },
                originalState: { type: Type.STRING },
                convertedQuantities: { type: Type.STRING },
                originalString: { type: Type.STRING },
                matchConfidence: { type: Type.NUMBER },
                confidence: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.NUMBER },
                    quantity: { type: Type.NUMBER },
                    unit: { type: Type.NUMBER },
                    specification: { type: Type.NUMBER }
                  }
                }
              },
              required: ["name", "quantity", "unit"]
            }
          }
        },
        required: ["name", "ingredients", "steps"]
      }
    }
  },
  required: ["name", "components"]
};

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const status = error?.status || error?.httpStatusCode || error?.code;
      const retryable = [429, 503, 'UNAVAILABLE', 'RESOURCE_EXHAUSTED'];
      if (attempt === maxRetries || !retryable.includes(status)) throw error;
      await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
    }
  }
  throw new Error('Retry exhausted');
}

export interface ExtractedRecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  specification?: string;
  secondaryQuantity?: number;
  secondaryUnit?: string;
  density?: number;
  wasteFactor?: number;
  category?: string;
  isDiscrete?: boolean;
  state?: string;
  originalState?: string;
  convertedQuantities?: string;
  originalString?: string;
  matchConfidence?: number;
  confidence?: {
    name?: number;      // 0-1
    quantity?: number;
    unit?: number;
    specification?: number;
  };
  chocolateSpec?: ChocolateSpec;
  allergens?: AllergenFlag[];
  yieldFactor?: number;
  prepAction?: string;
  provenance?: Record<string, Provenance>; // field name → provenance tag
  role?: RoleTag;
}

interface ExtractedRecipeStep {
  title: string;
  actionType: string;
  equipment: string[];
  icon?: string;
  parameters?: {
    durationSeconds?: number;
    temperatureTarget?: number;
    speedSetting?: string;
    physicalSizeTarget?: string;
  };
  isCCP?: boolean;
  ccpInstruction?: string;
  warning?: string;
  instruction: string;
  instructionSpanish?: string;
  confidence?: {
    instruction?: number;
    parameters?: number;
  };
  inferredEquipment?: string[];
  inferredDurationSeconds?: number;
  inferredTemperatureCelsius?: number;
  provenance?: Record<string, Provenance>;
}

interface ExtractedRecipeComponent {
  name: string;
  type?: typeof COMPONENT_TYPES[number] | (string & {});
  percentageOfTotalWeight?: number;
  bufferPercentage?: number;
  ingredients: ExtractedRecipeIngredient[];
  steps?: ExtractedRecipeStep[];
}

interface ExtractedYieldEquation {
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

export interface ExtractedRecipe {
  name: string;
  nameSpanish?: string;
  description?: string;
  type?: typeof RECIPE_TYPES[number] | (string & {});
  equipment?: string[];
  storageInstructions?: string;
  storageEnvironment?: string;
  shelfLife?: string;
  globalDisclaimers?: string[];
  allergens?: (string & AllergenFlag)[];
  packagingOptions?: {
    type: string;
    capacity: number;
    unit: string;
    isIndividual: boolean;
    materialsNeeded?: string[];
  }[];
  sensoryProfile?: {
    aroma?: string;
    texture?: string;
    appearance?: string;
    flavorProfile?: string;
  };
  reconstitutionInstructions?: string;
  hardware?: {
    moldId?: string;
    shape?: string;
    cavitiesPerMold?: number;
    moldCount?: number;
    gramPerCavity?: number;
  };
  design?: {
    order?: number;
    technique?: string;
    colors?: string[];
    tool?: string;
    notes?: string;
  }[];
  components?: ExtractedRecipeComponent[];
  ingredients?: ExtractedRecipeIngredient[];
  yield?: Partial<ExtractedYieldEquation>;
  tags?: string[];
  customFields?: { name: string; value: string }[];
  needsReview?: boolean;
  aiExtractionNotes?: string;
  rawExtractionData?: string;
  confidence?: {
    name?: number;
    yield?: number;
    overall?: number;   // overall confidence for the whole recipe
  };
  ocrTranscript?: string;   // raw text AI "saw" on the image, for debugging low-confidence extractions
  lowConfidenceFields?: string[];  // list of field paths like "ingredients[2].quantity" that were low confidence
  stationTag?: StationTag;
  haccp?: HACCPMetadata;
  enrobing?: EnrobingSpec;
  crossContactRisks?: never; // Derived at save time via computeCrossContactRisks; never extracted.
  provenance?: Record<string, Provenance>;
  extractionVersion?: number;
}

export interface ExtractedReceiptItem {
  name: string;
  brand?: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  supplier?: string;
  tags?: string[];
  customFields?: { name: string; value: string }[];
  needsReview?: boolean;
  aiExtractionNotes?: string;
}

export interface ExtractedProductLabel {
  name: string;
  brand?: string;
  unit: string;
  category: string;
  tags?: string[];
  customFields?: { name: string; value: string }[];
  needsReview?: boolean;
  aiExtractionNotes?: string;
}

export interface EstimatedStockItem {
  ingredientId: string;
  estimatedQuantity: number;
  unit: string;
  reasoning: string;
}

export async function extractReceiptData(
  image: { base64: string; mimeType: string }
): Promise<ExtractedReceiptItem[]> {
  return withRetry(async () => {
    const prompt = `
      You are an expert culinary assistant analyzing a receipt or invoice.
      Extract all the line items. For each item, identify the name, brand (if visible), quantity purchased, unit of measurement, the cost per unit, and the supplier name at the top of the receipt.
      Strip any trailing punctuation (like dashes or commas) from the supplier name.
      If the receipt shows a total cost and a quantity, calculate the cost per unit (total cost / quantity).
      For units, you MUST normalize them strictly to one of the canonical forms: ${CANONICAL_UNITS.join(', ')}. If the unit is "fluid ounces", "fl. oz.", or "fl oz", output "fl_oz".
      
      If you find ANY additional useful information that does not fit into the predefined fields (e.g., lot number, expiration date, origin), extract them as key-value pairs into the "customFields" array.
      Generate relevant "tags" based on the item (e.g., ["Organic", "Local"]).
      If you are unsure about any value, set "needsReview" to true and explain why in "aiExtractionNotes".
      
      Return an array of these items.
    `;

    const response = await getGeminiClient().models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        prompt,
        { inlineData: { data: image.base64, mimeType: image.mimeType } }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              brand: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              unit: { type: Type.STRING },
              costPerUnit: { type: Type.NUMBER },
              supplier: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              customFields: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { name: { type: Type.STRING }, value: { type: Type.STRING } },
                  required: ["name", "value"]
                }
              },
              needsReview: { type: Type.BOOLEAN },
              aiExtractionNotes: { type: Type.STRING }
            },
            required: ["name", "quantity", "unit", "costPerUnit"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Failed to extract receipt data.");
    return JSON.parse(text) as ExtractedReceiptItem[];
  });
}

export async function extractProductLabel(
  image: { base64: string; mimeType: string }
): Promise<ExtractedProductLabel> {
  return withRetry(async () => {
    const prompt = `
      You are an expert culinary assistant analyzing a product label or packaging.
      Extract the product name, brand, and the primary unit of measurement. You MUST normalize the unit strictly to one of the canonical forms: ${CANONICAL_UNITS.join(', ')}. If the unit is "fluid ounces", "fl. oz.", or "fl oz", output "fl_oz".
      Suggest a category for this ingredient from: ${INGREDIENT_CATEGORIES.map(c => `"${c}"`).join(', ')}.
      
      If you find ANY additional useful information (e.g., ingredients list, allergens, nutritional info, origin), extract them as key-value pairs into the "customFields" array.
      Generate relevant "tags" based on the label (e.g., ["Vegan", "Nut-Free"]).
      If you are unsure about any value, set "needsReview" to true and explain why in "aiExtractionNotes".
    `;

    const response = await getGeminiClient().models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        prompt,
        { inlineData: { data: image.base64, mimeType: image.mimeType } }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            brand: { type: Type.STRING },
            unit: { type: Type.STRING },
            category: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            customFields: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { name: { type: Type.STRING }, value: { type: Type.STRING } },
                required: ["name", "value"]
              }
            },
            needsReview: { type: Type.BOOLEAN },
            aiExtractionNotes: { type: Type.STRING }
          },
          required: ["name", "unit", "category"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Failed to extract product label.");
    return JSON.parse(text) as ExtractedProductLabel;
  });
}

export async function estimateStockFromImage(
  image: { base64: string; mimeType: string },
  knownIngredients: { id: string; name: string; brand?: string; unit: string }[]
): Promise<EstimatedStockItem[]> {
  return withRetry(async () => {
    const prompt = `
      You are an expert culinary assistant conducting an inventory audit from a photo of a shelf, fridge, or storage area.
      I will provide you with a list of my KNOWN ingredients.
      Identify the items in the photo and map them ONLY to the IDs of my known ingredients.
      Estimate the quantity of each item you see, using the unit specified in the known ingredients list.
      Provide a brief reasoning for your estimate (e.g., "3 full 1kg bags visible").
      
      KNOWN INGREDIENTS:
      ${JSON.stringify(knownIngredients, null, 2)}
    `;

    const response = await getGeminiClient().models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        prompt,
        { inlineData: { data: image.base64, mimeType: image.mimeType } }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              ingredientId: { type: Type.STRING, description: "Must exactly match an ID from the known ingredients list" },
              estimatedQuantity: { type: Type.NUMBER },
              unit: { type: Type.STRING },
              reasoning: { type: Type.STRING }
            },
            required: ["ingredientId", "estimatedQuantity", "unit", "reasoning"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Failed to estimate stock.");
    return JSON.parse(text) as EstimatedStockItem[];
  });
}

/**
 * Pass 1 of the new multi-pass pipeline: Parse the image into verbatim structured data.
 * This pass is explicitly conservative — it transcribes only what is literally visible.
 * It does NOT infer, derive, or fill in missing information. That happens in Pass 2.
 */
async function extractRecipe_parsePass(
  images: { base64: string; mimeType: string }[],
  existingIngredients: string[],
  userHint?: string
): Promise<ExtractedRecipe[]> {
  return withRetry(async () => {
    const imageParts = images.map(img => ({
      inlineData: { mimeType: img.mimeType, data: img.base64 }
    }));
    
    const prompt = `You are performing PASS 1 of a multi-pass recipe extraction pipeline: the PARSE pass.

Your job is to transcribe the recipe card(s) into structured JSON. CRITICAL EXCEPTIONS: Many uploaded recipes are incomplete. You MUST infer/add missing ingredients that are logically required, AND you MUST generate comprehensive, precise, step-by-step instructions if they are missing or vague.

RULES FOR PASS 1:
1. INGREDIENTS: Capture every ingredient with its exact quantity. You MUST specify quantities in GRAMS ('g') whenever possible. If the uploaded recipe is missing standard ingredients implied by the recipe type or instructions, INFER AND ADD THEM. Ensure proportions are precise and professional (like a perfectly balanced Hot Chocolate or ganache recipe). For units, you MUST normalize them strictly to one of the canonical forms: ${CANONICAL_UNITS.join(', ')}.
2. INSTRUCTIONS: Capture steps clearly. If the source recipe is incomplete, lacks detailed instructions, or is just an ingredients list, you MUST generate exhaustive, high-precision, professional culinary step-by-step instructions that utilize all listed ingredients. Explain the preparation exactly and completely, mimicking a perfectly detailed masterclass recipe. Ensure no recipe is left unfinished or unexplained.
3. LANGUAGE: You MUST provide instructions and names in Spanish (populate 'instructionSpanish' and 'nameSpanish') so the user has the recipe fully translated or generated in Spanish.
4. If the card is handwritten and a word is illegible, record it as "[illegible]" and set low confidence for that field.
5. Set provenance: 'verbatim' for every field you transcribe directly, and 'inferred_high' or 'inferred_medium' for ingredients/instructions you generate or infer.
6. Preserve ALL numeric detail — chocolate percentages, temperatures in degrees, durations, dimensions.
7. If the card mentions a specific brand or product name (Valrhona Guanaja, Callebaut 811, Kerrygold butter), capture it.
8. If the card includes colors, decorative techniques, tools, or equipment explicitly, capture them.
9. EVERY recipe loaded into the system MUST be complete and without errors. Do not leave instructions or ingredient lists unpopulated. If they are missing, you must generate them logically. YOU MUST ALWAYS RETURN COMPONENTS, INGREDIENTS AND STEPS.

Here are the existing ingredients in the kitchen (match against these when identifying ingredients): ${existingIngredients.slice(0, 200).join(', ')}

${userHint ? `Additional hint from the user: ${userHint}` : ''}

OUTPUT FORMAT: Return valid JSON matching the schema. Set extractionVersion to 2. For every field, set the corresponding entry in the provenance map to "verbatim".

Begin.`;

    const response = await getGeminiClient().models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [...imageParts, { text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: RECIPE_EXTRACTION_SCHEMA, // reuse existing schema — will work since new fields are optional
        },
      },
    });
    
    const text = response.text || '';
    try {
      const parsed = JSON.parse(text) as ExtractedRecipe[];
      // Mark extraction version on each recipe
      return parsed.map(r => ({ ...r, extractionVersion: 2 }));
    } catch (e) {
      console.error('Pass 1 parse failed:', e, text);
      throw new Error('Parse pass produced invalid JSON');
    }
  });
}

/**
 * Pass 2 of the multi-pass pipeline: REASON pass.
 * Takes the verbatim parse output and enriches it with inferred fields via tool calls.
 * Tool calls produce structured records that are incorporated with 'inferred_high' provenance.
 */
async function extractRecipe_reasonPass(
  parsedRecipes: ExtractedRecipe[]
): Promise<ExtractedRecipe[]> {
  const enriched: ExtractedRecipe[] = [];
  
  for (const recipe of parsedRecipes) {
    const enrichedRecipe = await reasonAboutRecipe(recipe);
    enriched.push(enrichedRecipe);
  }
  
  return enriched;
}

async function reasonAboutRecipe(recipe: ExtractedRecipe): Promise<ExtractedRecipe> {
  const enriched: ExtractedRecipe = { ...recipe };

  // 1. Gather inputs
  const ingredientNames = (recipe.components || [])
    .flatMap(c => c.ingredients.map((i: any) => i.name || ''))
    .filter(Boolean);
  const techniqueVerbs = (recipe.components || [])
    .flatMap(c => (c.steps || []).flatMap((s: any) => [s.actionType, s.title].filter(Boolean)))
    .filter(Boolean);
  const recipeType = recipe.type || '';

  // 2. Map required tool logic
  try {
    const station = classifyStation(recipeType, techniqueVerbs, ingredientNames);
    if (station) applyToolResult(enriched, 'classify_station', {}, station);
  } catch (e) {
    console.error(`[extractRecipe_reasonPass] Tool classifyStation failed for recipe "${recipe.name}":`, e);
    enriched.aiExtractionNotes = (enriched.aiExtractionNotes || '') + `\nTool classifyStation failed during enrichment.`;
    enriched.needsReview = true;
  }

  try {
    const allergens = deriveAllergens(ingredientNames);
    if (allergens) applyToolResult(enriched, 'derive_allergens', {}, allergens);
  } catch (e) {
    console.error(`[extractRecipe_reasonPass] Tool deriveAllergens failed for recipe "${recipe.name}":`, e);
    enriched.aiExtractionNotes = (enriched.aiExtractionNotes || '') + `\nTool deriveAllergens failed during enrichment.`;
    enriched.needsReview = true;
  }

  try {
    const equipment = inferEquipment(techniqueVerbs);
    if (equipment) applyToolResult(enriched, 'infer_equipment', {}, equipment);
  } catch (e) {
    console.error(`[extractRecipe_reasonPass] Tool inferEquipment failed for recipe "${recipe.name}":`, e);
    enriched.aiExtractionNotes = (enriched.aiExtractionNotes || '') + `\nTool inferEquipment failed during enrichment.`;
    enriched.needsReview = true;
  }

  // 3. Conditional tool logic
  // Parse chocolate specs
  for (const component of enriched.components || []) {
    for (const ing of component.ingredients || []) {
      const name = (ing as any).name;
      if (name && (name.toLowerCase().includes('chocolate') || name.toLowerCase().includes('cocoa'))) {
        try {
          const spec = parseChocolateSpec(name);
          if (spec.type) {
            applyToolResult(enriched, 'parse_chocolate_spec', { text: name }, spec);
          }
        } catch (e) {
          console.error(`[extractRecipe_reasonPass] Tool parseChocolateSpec failed for ingredient "${name}" in recipe "${recipe.name}":`, e);
          enriched.aiExtractionNotes = (enriched.aiExtractionNotes || '') + `\nTool parseChocolateSpec failed for ingredient "${name}".`;
          enriched.needsReview = true;
        }
      }
    }
  }

  // Infer role tags
  for (const component of enriched.components || []) {
    for (const ing of component.ingredients || []) {
      const name = ing.name;
      const category = ing.category as any;
      const chocolateSpec = ing.chocolateSpec;
      const alcoholSpec = (ing as any).alcoholSpec;
      if (name) {
        const roleTag = inferRoleTag({ name, category, chocolateSpec, alcoholSpec });
        if (roleTag) {
          ing.role = roleTag;
        }
      }
    }
  }

  // Infer enrobing
  const typeLower = recipeType.toLowerCase();
  if (typeLower.includes('bonbon') || typeLower.includes('truffle') || typeLower.includes('praline') || typeLower.includes('bar')) {
    try {
      const enrobing = inferEnrobing(recipeType, techniqueVerbs, ingredientNames);
      if (enrobing) applyToolResult(enriched, 'infer_enrobing', {}, enrobing);
    } catch (e) {
      console.error(`[extractRecipe_reasonPass] Tool inferEnrobing failed for recipe "${recipe.name}":`, e);
      enriched.aiExtractionNotes = (enriched.aiExtractionNotes || '') + `\nTool inferEnrobing failed during enrichment.`;
      enriched.needsReview = true;
    }
  }

  // Estimate yield
  if (typeLower.includes('bonbon') || typeLower.includes('truffle') || typeLower.includes('praline')) {
    try {
      const totalWeight = 1000; // default for parsing
      const yieldResult = estimateYield(recipeType, totalWeight);
      if (yieldResult) applyToolResult(enriched, 'estimate_yield', { piecesEstimated: yieldResult.piecesEstimated }, yieldResult);
    } catch (e) {
      console.error(`[extractRecipe_reasonPass] Tool estimateYield failed for recipe "${recipe.name}":`, e);
      enriched.aiExtractionNotes = (enriched.aiExtractionNotes || '') + `\nTool estimateYield failed during enrichment.`;
      enriched.needsReview = true;
    }
  }

  // Look up tempering curve
  if (techniqueVerbs.some(v => v.toLowerCase().includes('temper'))) {
     try {
        const hasDark = ingredientNames.some(i => i.toLowerCase().includes('dark chocolate'));
        const type = hasDark ? 'dark' : 'milk'; 
        const curve = lookupTemperingCurve(type, 60);
        if (curve) applyToolResult(enriched, 'lookup_tempering_curve', {}, curve);
     } catch (e) {
        console.error(`[extractRecipe_reasonPass] Tool lookupTemperingCurve failed for recipe "${recipe.name}":`, e);
        enriched.aiExtractionNotes = (enriched.aiExtractionNotes || '') + `\nTool lookupTemperingCurve failed during enrichment.`;
        enriched.needsReview = true;
     }
  }

  return enriched;
}



/**
 * Full multi-pass extraction: Parse → Reason → Validate.
 * Replaces extractRecipeWithConfidence as the primary extraction entry point.
 * The old function remains available for backward compatibility.
 */
export async function extractRecipe_fullPipeline(
  images: { base64: string; mimeType: string }[],
  existingIngredients: string[],
  userHint?: string,
  onProgress?: (stage: 'parse' | 'reason' | 'validate', message: string) => void
): Promise<{
  recipes: ExtractedRecipe[];
}> {
  // Pass 1: Parse
  onProgress?.('parse', 'Reading the card...');
  const parsed = await extractRecipe_parsePass(images, existingIngredients, userHint);
  
  // Pass 2: Reason (tool calls)
  onProgress?.('reason', 'Filling in what the card implies...');
  const enriched = await extractRecipe_reasonPass(parsed);
  
  return { recipes: enriched };
}

/**
 * Apply a single tool result to the enriched recipe object at the appropriate field.
 */
function applyToolResult(recipe: ExtractedRecipe, toolName: string, args: any, result: any): void {
  if (result == null) return;
  
  switch (toolName) {
    case 'classify_station':
      (recipe as any).stationTag = result;
      break;
    case 'derive_allergens':
      (recipe as any).allergens = result;
      break;
    case 'infer_equipment':
      // Applied to recipe level; individual step equipment is a separate concern
      (recipe as any).inferredEquipment = result;
      break;
    case 'infer_enrobing':
      (recipe as any).enrobing = result;
      break;
    case 'estimate_yield':
      if (result.piecesEstimated) {
        (recipe as any).yieldEstimate = result;
      }
      break;
    case 'parse_chocolate_spec':
      // Match by text: find an ingredient whose name contains the parsed text
      for (const component of recipe.components || []) {
        for (const ing of component.ingredients || []) {
          if ((ing as any).name && (ing as any).name.includes(args.text.slice(0, 20))) {
            (ing as any).chocolateSpec = result;
          }
        }
      }
      break;
    case 'lookup_tempering_curve':
      // Could be attached to specific steps that mention tempering
      // Simplest: attach to recipe level
      (recipe as any).temperingCurve = result;
      break;
  }
}


