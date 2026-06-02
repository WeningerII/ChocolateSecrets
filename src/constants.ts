export const INGREDIENT_CATEGORIES = [
  "Sugars & Sweeteners",
  "Chocolates & Cocoas",
  "Nuts & Seeds",
  "Fruits & Purees",
  "Dairy & Alternatives",
  "Flours & Starches",
  "Spices & Extracts",
  "Leaveners",
  "Colors & Dusts",
  "Emulsifiers & Stabilizers",
  "Fats & Oils",
  "Meat & Seafood",
  "Produce",
  "Beverages",
  "Packaging",
  "Consumables",
  "Uncategorized"
] as const;

export type IngredientCategory = typeof INGREDIENT_CATEGORIES[number];

export const RECIPE_TYPES = [
  "standard", "molded_praline", "bonbon", "enrobed", "bar", "component", 
  "truffle", "caramel", "fudge", "nougat", "marshmallow", "pate_de_fruit", 
  "dragee", "ganache", "praline_paste", "gianduja", "macaron", "cookie", 
  "cake", "pastry", "ice_cream", "sorbet", "sauce", "syrup", "beverage", 
  "viennoiserie", "entremet", "tart", "bread", "plated_dessert", "glaze", 
  "dough", "batter", "mousse", "cremeux", "savory", "other"
] as const;

export const COMPONENT_TYPES = [
  "shell", "filling", "capping", "inclusion", "base", "powder", 
  "glaze", "sponge", "crunch", "mousse", "cremeux", "gel", "decor", 
  "dough", "batter"
] as const;

export const ACTION_TYPES = [
  "heat", "cool", "mix", "chop", "grind", "jar", "bake", "freeze", 
  "whip", "fold", "emulsify", "temper", "rest", "proof", "blend", "sift", "other"
] as const;

export const CANONICAL_UNITS = [
  "g", "kg", "ml", "l", "oz", "lb", "tsp", "tbsp", "cup", "fl_oz", "pt", "qt", "gal", "pieces", "units", "cases"
] as const;

// =====================================================================
// Expenses domain (Milestone P&L-A)
// =====================================================================

export const PAYMENT_METHODS = [
  'ach', 'card', 'check', 'wire', 'auto_debit', 'cash', 'other'
] as const;
