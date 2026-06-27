/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** FoodData Central API key — enables live USDA composition lookups (snapshot fallback when absent). */
  readonly VITE_USDA_FDC_API_KEY?: string;
}
