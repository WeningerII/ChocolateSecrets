#!/usr/bin/env node

/**
 * Schema drift check: compares firestore.rules allowedFields against 
 * TypeScript interface keys in src/types.ts. Fails CI if they diverge
 * without an explicit exception.
 *
 * This is not exhaustive — it catches the 80% case of field-name drift.
 * It cannot catch type mismatches (string vs number) or value-constraint
 * drift (status enum changes). Those still need human review.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const rulesPath = path.join(repoRoot, 'firestore.rules');
const typesPath = path.join(repoRoot, 'src/types.ts');

const rulesText = fs.readFileSync(rulesPath, 'utf-8');
const typesText = fs.readFileSync(typesPath, 'utf-8');

// Map of collection name -> { rulesValidator: string, typeName: string }
const COLLECTION_MAP = {
  'recipes': { rulesValidator: 'isValidRecipe', typeName: 'Recipe' },
  'ingredients': { rulesValidator: 'isValidIngredient', typeName: 'Ingredient' },
  'productionRuns': { rulesValidator: 'isValidProductionRun', typeName: 'ProductionRun' },
  'audits': { rulesValidator: 'isValidAudit', typeName: 'Audit' },
  'inventoryTransactions': { rulesValidator: 'isValidInventoryTransaction', typeName: 'InventoryTransaction' },
  'purchaseOrders': { rulesValidator: 'isValidPurchaseOrder', typeName: 'PurchaseOrder' },
  'lots': { rulesValidator: 'isValidLot', typeName: 'Lot' },
  'suppliers': { rulesValidator: 'isValidSupplier', typeName: 'Supplier' },
  'shopping_list': { rulesValidator: 'isValidShoppingListItem', typeName: 'ShoppingListItem' },
  'restaurants': { rulesValidator: 'isValidRestaurant', typeName: 'Restaurant' },
  'sourcing_notes': { rulesValidator: 'isValidSourcingNote', typeName: 'SourcingNote' },
  'expenseCategories': { rulesValidator: 'isValidExpenseCategory', typeName: 'ExpenseCategory' },
  'vendors': { rulesValidator: 'isValidVendor', typeName: 'Vendor' },
  'bills': { rulesValidator: 'isValidBill', typeName: 'Bill' },
  'payments': { rulesValidator: 'isValidPayment', typeName: 'Payment' },
  'recurringExpectations': { rulesValidator: 'isValidRecurringExpectation', typeName: 'RecurringExpectation' },
  'alerts': { rulesValidator: null, typeName: 'Alert', readOnly: true },
};

// Fields that may legitimately only appear in rules (e.g., system-computed)
const RULES_ONLY_ALLOWED = new Set([
  'createdAt', 'updatedAt',
]);

// Fields that may legitimately only appear in types (e.g., doc ID or computed)
const TYPES_ONLY_ALLOWED = new Set([
  'id', 'overall', 'name', 'yield', 'instruction', 'parameters',
  'mixingMethod', 'frictionFactor', 'roomTempC', 'flourTempC', 'desiredDoughTempC', 'starterHydrationPct'
]);

// Parse allowedFields from a validator function body
function extractAllowedFields(validatorName) {
  const pattern = new RegExp(`function\\s+${validatorName}\\s*\\(\\s*\\)\\s*\\{[\\s\\S]*?let allowedFields\\s*=\\s*\\[([\\s\\S]*?)\\]`);
  const match = rulesText.match(pattern);
  if (!match) return null;
  const body = match[1];
  return body.split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
}

// Parse interface keys from a TypeScript interface declaration
function extractInterfaceKeys(typeName) {
  const pattern = new RegExp(`export\\s+interface\\s+${typeName}\\s*\\{([\\s\\S]*?)^\\}`, 'm');
  const match = typesText.match(pattern);
  if (!match) return null;
  const body = match[1];
  // Match lines like:    fieldName?: Type;  or    fieldName: Type;
  const keys = [];
  const lineRe = /^\s*(\w+)\??:/gm;
  let m;
  while ((m = lineRe.exec(body)) !== null) {
    keys.push(m[1]);
  }
  return keys;
}

// Parse optional enum constraints from rules (e.g. data.status in ['a', 'b'])
function extractRulesEnumConstraints(validatorName) {
  const startIdx = rulesText.search(new RegExp(`function\\s+${validatorName}\\s*\\(`));
  if (startIdx === -1) return {};
  const afterStart = rulesText.slice(startIdx);
  const endIdx = afterStart.indexOf('function ', 20);
  const body = endIdx === -1 ? afterStart : afterStart.slice(0, endIdx);

  const constraints = {};
  const enumRe = /(?:data[?.a-zA-Z0-9_]*\.)?(\w+)\s+in\s+\[(.*?)\]/g;
  let m;
  while ((m = enumRe.exec(body)) !== null) {
    const field = m[1];
    const items = m[2].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
    constraints[field] = items;
  }
  return constraints;
}

// Parse named alias unions from types.ts
const ALIAS_RE = /^export type (\w+)\s*=\s*((?:'[^']+'\s*\|?\s*)+);/gm;
const aliases = new Map();
let aliasMatch;
while ((aliasMatch = ALIAS_RE.exec(typesText)) !== null) {
  const literals = [...aliasMatch[2].matchAll(/'([^']+)'/g)].map(x => x[1]);
  aliases.set(aliasMatch[1], literals);
}

// Parse enum constraints from a TypeScript interface declaration
function extractInterfaceEnumConstraints(typeName) {
  const startIdx = typesText.search(new RegExp(`export\\s+(?:type|interface)\\s+${typeName}\\b`));
  if (startIdx === -1) return {};
  const afterStart = typesText.slice(startIdx);
  const endIdx = afterStart.indexOf('export ', 20);
  const body = endIdx === -1 ? afterStart : afterStart.slice(0, endIdx);

  const constraints = {};
  const lineRe = /^\s*(\w+)\??:\s*(.*?);/gm;
  let m;
  while ((m = lineRe.exec(body)) !== null) {
    const field = m[1];
    let typeDef = m[2].trim();
    
    // Check if it matches an alias
    const aliasName = typeDef;
    if (aliases.has(aliasName)) {
      constraints[field] = aliases.get(aliasName);
    } else if (typeDef.includes("'") || typeDef.includes('"')) {
      const literalsMatch = typeDef.match(/(?:'|")([^'"]+)(?:'|")/g);
      if (literalsMatch) {
        constraints[field] = literalsMatch.map(s => s.replace(/['"]/g, ''));
      }
    }
  }
  return constraints;
}

let hasDrift = false;
const report = [];

for (const [collection, { rulesValidator, typeName, readOnly }] of Object.entries(COLLECTION_MAP)) {
  const typesFields = extractInterfaceKeys(typeName);
  
  if (!typesFields) {
    report.push(`${collection}: ERROR — could not parse ${typeName} from types`);
    hasDrift = true;
    continue;
  }

  if (readOnly) {
    // Only verify that the type exists for readOnly collections since there is no validator
    continue;
  }

  const rulesFields = extractAllowedFields(rulesValidator);
  
  if (!rulesFields) {
    report.push(`${collection}: ERROR — could not parse ${rulesValidator} from rules`);
    hasDrift = true;
    continue;
  }
  
  const rulesSet = new Set(rulesFields);
  const typesSet = new Set(typesFields);
  
  const rulesOnly = [...rulesSet].filter(f => !typesSet.has(f) && !RULES_ONLY_ALLOWED.has(f));
  const typesOnly = [...typesSet].filter(f => !rulesSet.has(f) && !TYPES_ONLY_ALLOWED.has(f));
  
  if (rulesOnly.length > 0 || typesOnly.length > 0) {
    hasDrift = true;
    report.push(`\n${collection}:`);
    if (rulesOnly.length) report.push(`  Rules-only: ${rulesOnly.join(', ')}`);
    if (typesOnly.length) report.push(`  Types-only: ${typesOnly.join(', ')}`);
  }

  // Check enum constraints
  const rulesEnums = extractRulesEnumConstraints(rulesValidator);
  const typesEnums = extractInterfaceEnumConstraints(typeName);
  
  // Since rulesEnums are driven by what rules care about, we iterate those
  for (const [field, rulesValues] of Object.entries(rulesEnums)) {
    // If the field exists in types but isn't constrained, it'll just be empty or undefined
    const typesValues = typesEnums[field];
    if (!typesValues) {
      if (!report.some(l => l.startsWith(`\n${collection}:`))) report.push(`\n${collection}:`);
      report.push(`  Enum drift [${field}]: rules enforce [${rulesValues.join(', ')}] but type does not constrain it.`);
      hasDrift = true;
    } else {
      const rulesEnumSet = new Set(rulesValues);
      const typesEnumSet = new Set(typesValues);
      const rulesOnlyEnum = [...rulesEnumSet].filter(v => !typesEnumSet.has(v));
      const typesOnlyEnum = [...typesEnumSet].filter(v => !rulesEnumSet.has(v));
      
      if (rulesOnlyEnum.length > 0 || typesOnlyEnum.length > 0) {
        if (!report.some(l => l.startsWith(`\n${collection}:`))) report.push(`\n${collection}:`);
        report.push(`  Enum drift [${field}]:`);
        if (rulesOnlyEnum.length) report.push(`    Rules-only values: ${rulesOnlyEnum.join(', ')}`);
        if (typesOnlyEnum.length) report.push(`    Types-only values: ${typesOnlyEnum.join(', ')}`);
        hasDrift = true;
      }
    }
  }
}

if (hasDrift) {
  console.error('Schema drift detected:');
  console.error(report.join('\n'));
  console.error('\nFix: update types.ts, rules, or add the field to RULES_ONLY_ALLOWED / TYPES_ONLY_ALLOWED if it is intentional.');
  process.exit(1);
} else {
  console.log('No schema drift detected. All collections match between types and rules.');
}
