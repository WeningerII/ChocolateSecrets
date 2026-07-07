import type { RecipeStep, StationTag, EnrobingSpec } from '../../types';

/**
 * Classify a recipe into a kitchen station based on its type, technique verbs, and ingredient profile.
 */
export function classifyStation(
  recipeType: string,
  techniqueVerbs: string[],
  ingredientNames: string[]
): StationTag {
  const verbs = techniqueVerbs.map(v => v.toLowerCase());
  const ingredients = ingredientNames.map(i => i.toLowerCase());
  
  // Chocolate room: tempering, molding, enrobing, ganache work
  const chocolateIndicators = ['temper', 'mold', 'enrobe', 'dip', 'spray', 'airbrush', 'bonbon', 'truffle', 'ganache'];
  const chocolateTypeMatch = /bonbon|truffle|praline|bar|ganache|chocolate/i.test(recipeType);
  const hasChocolateVerbs = verbs.some(v => chocolateIndicators.some(ci => v.includes(ci)));
  
  if (chocolateTypeMatch || hasChocolateVerbs) {
    return {
      primary: 'chocolate_room',
      skillLevel: verbs.includes('temper') ? 'sous' : 'line',
      productionMode: 'batch',
    };
  }
  
  // Pastry: baking, laminating, piping, tart work
  const pastryIndicators = ['bake', 'laminate', 'fold into dough', 'proof', 'pipe', 'roll out', 'crimp', 'blind bake'];
  const pastryIngredientMatch = ingredients.some(i => /flour|yeast|butter block|puff|croissant|brioche|choux/i.test(i));
  if (pastryIndicators.some(p => verbs.some(v => v.includes(p))) || pastryIngredientMatch) {
    return {
      primary: 'pastry',
      skillLevel: verbs.includes('laminate') ? 'sous' : 'line',
      productionMode: 'batch',
    };
  }
  
  // Hot line: panini, sauté, sear, simmer, grill
  const hotIndicators = ['sauté', 'saute', 'sear', 'grill', 'fry', 'simmer', 'pan-fry', 'panini', 'press'];
  const hotTypeMatch = /panini|sandwich|sauté|grilled/i.test(recipeType);
  if (hotTypeMatch || hotIndicators.some(h => verbs.some(v => v.includes(h)))) {
    return {
      primary: 'hot_line',
      skillLevel: 'line',
      productionMode: 'a_la_minute',
    };
  }
  
  // Bar/beverage: blend, shake, brew, steam milk
  const barIndicators = ['brew', 'steam', 'blend drink', 'shake', 'strain', 'espresso', 'latte'];
  if (barIndicators.some(b => verbs.some(v => v.includes(b)))) {
    return {
      primary: 'bar',
      skillLevel: 'line',
      productionMode: 'a_la_minute',
    };
  }
  
  // Garde manger: cold preparation, salads, assembly
  return {
    primary: 'garde_manger',
    skillLevel: 'commis',
    productionMode: 'a_la_minute',
  };
}

/**
 * Map technique verbs to the equipment they imply.
 */
const VERB_EQUIPMENT_MAP: Record<string, string[]> = {
  // ---- Chocolate work (existing, retained) ----
  temper: ['digital laser thermometer', 'marble slab or tempering machine', 'rubber scraper', 'bain-marie or microwave'],
  mold: ['polycarbonate mold', 'scraper', 'rubber spatula', 'cooling rack'],
  enrobe: ['enrobing machine or dipping fork', 'cooling tunnel or cool shelf', 'parchment paper'],
  dip: ['dipping fork (round or oval)', 'parchment paper', 'decorating tool (paper cone)'],
  airbrush: ['airbrush compressor', 'airbrush gun', 'cocoa butter + pigments', 'face mask'],
  splatter: ['small stiff brush', 'cocoa butter + pigments'],
  transfer: ['transfer sheets', 'scraper', 'small offset spatula'],

  // ---- Piping and finishing ----
  pipe: ['piping bag', 'assortment of tips (#4 round common)', 'parchment paper'],
  glaze: ['small offset spatula', 'cooling rack over sheet pan'],
  garnish: ['plating tweezers', 'squeeze bottles', 'small offset spatula'],

  // ---- Mixing / aerating ----
  whip: ['stand mixer with whisk or hand mixer', 'chilled bowl if for cream'],
  fold: ['flexible spatula', 'wide bowl'],
  blend: ['blender or immersion blender', 'heatproof container'],
  puree: ['blender', 'fine-mesh sieve or tamis'],
  mix: ['bowl', 'whisk or wooden spoon'],
  cream: ['stand mixer with paddle', 'bowl', 'rubber spatula'],
  knead: ['stand mixer with dough hook or clean work surface', 'bench scraper'],

  // ---- Size reduction ----
  chop: ['chef knife', 'cutting board'],
  dice: ['chef knife', 'cutting board'],
  mince: ['chef knife', 'cutting board'],
  slice: ['chef knife or mandoline', 'cutting board'],
  julienne: ['chef knife or mandoline', 'cutting board'],
  brunoise: ['chef knife', 'cutting board'],
  grind: ['spice grinder or food processor', 'sieve'],
  zest: ['microplane or fine grater'],
  grate: ['box grater or microplane'],

  // ---- Separation / straining ----
  sift: ['fine-mesh sieve or tamis', 'bowl'],
  strain: ['chinois or fine-mesh strainer', 'bowl'],
  drain: ['colander', 'bowl'],
  pat: ['paper towels or clean kitchen towel'],

  // ---- Heat: dry ----
  bake: ['sheet pan or cake pan', 'parchment paper', 'oven preheated to specified temperature'],
  roast: ['roasting pan or sheet pan', 'oven preheated to specified temperature', 'probe thermometer'],
  broil: ['sheet pan', 'broiler preheated', 'long-handled tongs'],
  toast: ['sheet pan', 'oven or toaster'],

  // ---- Heat: pan / surface ----
  sear: ['heavy-bottomed pan (cast iron or carbon steel)', 'tongs', 'neutral oil with high smoke point'],
  saute: ['saute pan', 'tongs or wooden spoon', 'oil or butter'],
  brown: ['heavy pan', 'tongs'],
  fry: ['heavy-bottomed pot or deep fryer', 'candy or deep-fry thermometer', 'spider or slotted spoon', 'paper towels for draining'],
  'pan-fry': ['heavy skillet', 'tongs', 'paper towels for draining'],
  'deep-fry': ['deep fryer or heavy pot', 'deep-fry thermometer', 'spider or slotted spoon'],
  grill: ['grill or grill pan', 'tongs', 'oil-saturated cloth'],
  griddle: ['griddle or flat-top', 'offset spatula'],
  press: ['panini press or sandwich press', 'bench scraper'],

  // ---- Heat: water / wet ----
  boil: ['heavy pot', 'lid', 'slotted spoon'],
  simmer: ['heavy-bottomed pot', 'wooden spoon', 'lid'],
  poach: ['wide shallow pan', 'slotted spoon', 'instant-read thermometer'],
  braise: ['Dutch oven or heavy oven-safe pot with lid', 'tongs'],
  stew: ['heavy-bottomed pot with lid', 'wooden spoon'],
  steam: ['steamer basket or bamboo steamer', 'pot with lid', 'tongs'],
  blanch: ['large pot for boiling', 'bowl of ice water for shock', 'spider or slotted spoon'],
  reduce: ['wide shallow pan for faster evaporation', 'wooden spoon'],

  // ---- Sous vide / precision cooking ----
  'sous vide': ['immersion circulator', 'vacuum sealer or zip-top bag with water displacement', 'heatproof container'],
  vacuum: ['chamber vacuum sealer or countertop vacuum sealer', 'vacuum-rated bags'],

  // ---- Smoking / curing ----
  smoke: ['smoker or smoking box', 'wood chips or pellets', 'probe thermometer'],
  cure: ['non-reactive container', 'scale for precise salt measurement', 'refrigeration'],
  brine: ['non-reactive container large enough for submersion', 'refrigeration'],
  marinate: ['non-reactive container or zip-top bag', 'refrigeration'],

  // ---- Bread / dough ----
  laminate: ['rolling pin', 'marble or steel bench', 'ruler', 'bench scraper', 'refrigeration'],
  proof: ['proofing box or warm spot 75-78°F', 'kitchen towel or plastic wrap'],
  'bulk ferment': ['large bowl or bulk container', 'plastic wrap or lid', 'room temperature space'],
  shape: ['bench scraper', 'floured work surface'],
  score: ['lame or very sharp razor blade'],
  autolyse: ['bowl', 'plastic wrap'],
  ferment: ['fermentation vessel', 'warm spot'],

  // ---- Sugar work ----
  caramelize: ['heavy-bottomed saucepan', 'candy thermometer', 'long-handled wooden spoon or heatproof whisk', 'bowl of ice water for testing'],
  'cook sugar': ['heavy-bottomed saucepan', 'candy thermometer calibrated to target stage', 'wet pastry brush to wash down crystals'],
  brulee: ['kitchen torch or salamander', 'heatproof ramekins', 'fine sifter for sugar coat'],

  // ---- Emulsion / sauce ----
  emulsify: ['bowl', 'whisk or immersion blender', 'steady thin-stream pouring technique'],
  'temper eggs': ['bowl', 'whisk', 'ladle'],
  'temper cream': ['saucepan', 'candy thermometer', 'whisk'],

  // ---- Freezing / chilling ----
  freeze: ['freezer (-18°C/0°F or colder)', 'flat container for even freezing'],
  chill: ['refrigerator', 'covered container'],
  churn: ['ice cream machine or Pacojet', 'pre-frozen bowl (ice cream style)'],
  temper_ice: ['refrigerator or slight warmth for scoopable consistency'],
  'shock': ['large bowl with ice water', 'spider or slotted spoon'],

  // ---- Beverage: coffee ----
  brew: ['coffee brewer (espresso machine, pour-over, French press, or AeroPress)', 'scale for dose + yield', 'timer', 'grinder set to match method'],
  'pull shot': ['espresso machine', 'portafilter', 'tamper', 'scale', 'timer'],
  'pour over': ['gooseneck kettle', 'V60 or Chemex dripper', 'paper filter', 'scale', 'timer'],
  'french press': ['French press', 'kettle', 'scale', 'timer'],
  aeropress: ['AeroPress', 'paper or metal filter', 'kettle', 'scale'],

  // ---- Beverage: tea ----
  steep: ['teapot or infuser', 'kettle with temperature control', 'timer', 'scale or measuring spoon'],
  'steep tea': ['teapot or infuser', 'kettle', 'timer'],

  // ---- Beverage: cocktail / bar ----
  shake: ['cocktail shaker', 'jigger', 'strainer', 'ice'],
  stir: ['mixing glass', 'bar spoon', 'jigger', 'ice', 'strainer'],
  muddle: ['muddler', 'mixing glass'],

  // ---- Plating / service ----
  plate: ['plating tweezers', 'squeeze bottles', 'small offset spatula', 'wiped rim cloth'],
  portion: ['scale', 'scoops or ring molds for uniform portions'],
  assemble: ['clean work surface', 'small offset spatula or tongs'],

  // ---- Resting / holding ----
  rest: ['covered plate or warm holding spot'],
  'hold warm': ['warming oven at 150°F or low-temp holding unit'],
  'hold cold': ['refrigeration or ice bath'],

  // ---- Jar / preserve ----
  jar: ['sterilized jars with lids', 'canning funnel if hot-packing', 'water bath for seal if shelf-stable'],
  can: ['pressure canner or water-bath canner', 'jar lifter', 'magnetic lid lifter', 'headspace tool'],
  preserve: ['non-reactive pot', 'sterilized jars', 'candy thermometer'],
};

/**
 * Infer equipment from technique verbs in a recipe's steps.
 */
export function inferEquipment(techniqueVerbs: string[]): string[] {
  const equipment = new Set<string>();
  for (const verb of techniqueVerbs) {
    const vLower = verb.toLowerCase();
    for (const [key, tools] of Object.entries(VERB_EQUIPMENT_MAP)) {
      if (vLower.includes(key)) {
        tools.forEach(t => equipment.add(t));
      }
    }
  }
  return Array.from(equipment);
}

/**
 * Suggest equipment for a single recipe step by combining:
 * - The step's actionType (the primary verb)
 * - The step's title (often contains additional verbs like "sear and rest")
 * - The step's parameters (temperature → thermometer; duration → timer)
 *
 * Returns a deduplicated, sorted list. Existing `step.equipment` is NOT returned —
 * the caller is responsible for merging with existing entries.
 */
export function suggestEquipmentForStep(step: Pick<RecipeStep, 'actionType' | 'title' | 'parameters'>): string[] {
  const verbs: string[] = [];

  if (step.actionType) verbs.push(String(step.actionType));
  if (step.title) verbs.push(step.title);

  const fromVerbs = inferEquipment(verbs);
  const suggestions = new Set(fromVerbs);

  // Parameter-driven additions
  const params = step.parameters || {};
  if (typeof params.temperatureTarget === 'number') {
    suggestions.add('instant-read or probe thermometer');
  }
  if (typeof params.durationSeconds === 'number' && params.durationSeconds > 0) {
    suggestions.add('timer');
  }
  if (params.physicalSizeTarget) {
    // A size target implies measurement tools
    suggestions.add('ruler or calipers for size check');
  }

  return Array.from(suggestions).sort();
}

/**
 * Merge suggested equipment with existing equipment, removing case-insensitive duplicates.
 * Existing entries are preserved verbatim (in case the user edited them); new entries
 * are appended only if no case-insensitive match already exists.
 */
export function mergeEquipment(existing: string[], suggested: string[]): string[] {
  const normalizeForCompare = (s: string) => s.toLowerCase().trim();
  const existingNormalized = new Set(existing.map(normalizeForCompare));
  const result = [...existing];
  for (const item of suggested) {
    if (!existingNormalized.has(normalizeForCompare(item))) {
      result.push(item);
      existingNormalized.add(normalizeForCompare(item));
    }
  }
  return result;
}

/**
 * Infer an enrobing specification from recipe type and technique verbs.
 */
export function inferEnrobing(
  recipeType: string,
  techniqueVerbs: string[],
  ingredientNames: string[]
): EnrobingSpec | null {
  const type = recipeType.toLowerCase();
  const verbs = techniqueVerbs.map(v => v.toLowerCase());
  const ingredients = ingredientNames.map(i => i.toLowerCase());
  
  // Shell-molded bonbon: always has shell + filling + cap
  if (type.includes('bonbon') || type.includes('molded') || verbs.some(v => v.includes('mold'))) {
    const hasColors = ingredients.some(i => i.includes('cocoa butter') && (i.includes('color') || i.includes('tint'))) 
                   || verbs.some(v => v.includes('airbrush') || v.includes('splatter') || v.includes('paint'));
    return {
      method: 'shell_mold',
      coating: 'tempered shell chocolate',
      decoration: hasColors ? {
        technique: verbs.some(v => v.includes('airbrush')) ? 'airbrushed' :
                   verbs.some(v => v.includes('splatter')) ? 'splattered' :
                   verbs.some(v => v.includes('paint')) ? 'painted' : 'painted',
        tools: verbs.some(v => v.includes('airbrush')) ? ['airbrush', 'cocoa butter colors'] : ['fine paintbrush', 'cocoa butter colors'],
      } : undefined,
    };
  }
  
  // Rolled truffle: ganache + roll in coating
  if (type.includes('truffle')) {
    const isRolled = verbs.some(v => v.includes('roll'));
    const coating = ingredients.find(i => i.includes('cocoa powder') || i.includes('chopped') || i.includes('dust')) || 'cocoa powder';
    
    if (isRolled) {
      return {
        method: 'rolled',
        coating,
        decoration: {
          technique: 'none',
          tools: ['piping bag with #4 round tip', 'parchment paper', 'gloves for rolling', 'tempered pre-coat chocolate'],
        },
      };
    }
    
    // Dipped truffle (default if not explicitly rolled)
    return {
      method: 'hand_dipped',
      coating: 'tempered chocolate',
      decoration: {
        technique: verbs.some(v => v.includes('filigree')) ? 'painted' : 'none',
        tools: ['piping bag with #4 round tip', 'dipping fork', 'parchment paper', 'optional: paper cone for filigree'],
      },
    };
  }
  
  // Bar: enrobed or molded
  if (type.includes('bar')) {
    return {
      method: verbs.some(v => v.includes('enrobe')) ? 'enrobed_machine' : 'shell_mold',
      coating: 'tempered chocolate',
    };
  }
  
  
  return null;
}
