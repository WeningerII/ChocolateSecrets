// src/types.ts — PURE RE-EXPORT BARREL (behavior-preserving split).
// Every type definition now lives in ./types/*. All 174 existing importers keep
// their `from '.../types'` paths unchanged: the FILE src/types.ts resolves before
// the src/types/ DIRECTORY (which has no index.ts — only the ambient i18next.d.ts),
// so `'../types'` still lands here. Do NOT create src/types/index.ts.
// `export *` forwards the re-exported AllergenKey from ./types/allergens too.
// Ordered low-level -> high-level for readability (order is not load-bearing).
export * from './types/i18n';
export * from './types/common';
export * from './types/allergens';
export * from './types/composition';
export * from './types/chocolate';
export * from './types/roles';
export * from './types/categories';
export * from './types/dsl';
export * from './types/inventory';
export * from './types/ingredient';
export * from './types/recipe';
export * from './types/sourcing';
export * from './types/production';
export * from './types/optimizer';
export * from './types/expenses';
export * from './types/alerts';
