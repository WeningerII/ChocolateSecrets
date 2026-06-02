import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English
import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enDashboard from './locales/en/dashboard.json';
import enIngredients from './locales/en/ingredients.json';
import enSuppliers from './locales/en/suppliers.json';
import enRecipes from './locales/en/recipes.json';
import enPo from './locales/en/po.json';
import enPrep from './locales/en/prep.json';
import enShoppingList from './locales/en/shoppingList.json';
import enInventory from './locales/en/inventory.json';
import enReports from './locales/en/reports.json';
import enBarcode from './locales/en/barcode.json';
import enReceipt from './locales/en/receipt.json';
import enVisual from './locales/en/visual.json';
import enBatch from './locales/en/batch.json';
import enAuth from './locales/en/auth.json';
import enEnums from './locales/en/enums.json';
import enLedger from './locales/en/ledger.json';
import enChemistry from './locales/en/chemistry.json';
import enExpenses from './locales/en/expenses.json';

// Spanish
import esCommon from './locales/es/common.json';
import esNav from './locales/es/nav.json';
import esDashboard from './locales/es/dashboard.json';
import esIngredients from './locales/es/ingredients.json';
import esSuppliers from './locales/es/suppliers.json';
import esRecipes from './locales/es/recipes.json';
import esPo from './locales/es/po.json';
import esPrep from './locales/es/prep.json';
import esShoppingList from './locales/es/shoppingList.json';
import esInventory from './locales/es/inventory.json';
import esReports from './locales/es/reports.json';
import esBarcode from './locales/es/barcode.json';
import esReceipt from './locales/es/receipt.json';
import esVisual from './locales/es/visual.json';
import esBatch from './locales/es/batch.json';
import esAuth from './locales/es/auth.json';
import esEnums from './locales/es/enums.json';
import esLedger from './locales/es/ledger.json';
import esChemistry from './locales/es/chemistry.json';
import esExpenses from './locales/es/expenses.json';

// Korean
import koCommon from './locales/ko/common.json';
import koNav from './locales/ko/nav.json';
import koDashboard from './locales/ko/dashboard.json';
import koIngredients from './locales/ko/ingredients.json';
import koSuppliers from './locales/ko/suppliers.json';
import koRecipes from './locales/ko/recipes.json';
import koPo from './locales/ko/po.json';
import koPrep from './locales/ko/prep.json';
import koShoppingList from './locales/ko/shoppingList.json';
import koInventory from './locales/ko/inventory.json';
import koReports from './locales/ko/reports.json';
import koBarcode from './locales/ko/barcode.json';
import koReceipt from './locales/ko/receipt.json';
import koVisual from './locales/ko/visual.json';
import koBatch from './locales/ko/batch.json';
import koAuth from './locales/ko/auth.json';
import koEnums from './locales/ko/enums.json';
import koLedger from './locales/ko/ledger.json';
import koChemistry from './locales/ko/chemistry.json';
import koExpenses from './locales/ko/expenses.json';

import enAlerts from './locales/en/alerts.json';
import esAlerts from './locales/es/alerts.json';
import koAlerts from './locales/ko/alerts.json';

import enSourcing from './locales/en/sourcing.json';
import enIngredientInfo from './locales/en/ingredientInfo.json';
import enFailureMode from './locales/en/failureMode.json';
import enFailureModeCatalog from './locales/en/failureModeCatalog.json';
import esSourcing from './locales/es/sourcing.json';
import esIngredientInfo from './locales/es/ingredientInfo.json';
import esFailureMode from './locales/es/failureMode.json';
import esFailureModeCatalog from './locales/es/failureModeCatalog.json';
import koSourcing from './locales/ko/sourcing.json';
import koIngredientInfo from './locales/ko/ingredientInfo.json';
import koFailureMode from './locales/ko/failureMode.json';
import koFailureModeCatalog from './locales/ko/failureModeCatalog.json';

const resources = {
  en: {
    common: enCommon,
    nav: enNav,
    dashboard: enDashboard,
    ingredients: enIngredients,
    suppliers: enSuppliers,
    recipes: enRecipes,
    po: enPo,
    prep: enPrep,
    shoppingList: enShoppingList,
    inventory: enInventory,
    reports: enReports,
    barcode: enBarcode,
    receipt: enReceipt,
    visual: enVisual,
    batch: enBatch,
    auth: enAuth,
    enums: enEnums,
    ledger: enLedger,
    chemistry: enChemistry,
    sourcing: enSourcing,
    ingredientInfo: enIngredientInfo,
    failureMode: enFailureMode,
    failureModeCatalog: enFailureModeCatalog,
    expenses: enExpenses,
    alerts: enAlerts,
  },
  es: {
    common: esCommon,
    nav: esNav,
    dashboard: esDashboard,
    ingredients: esIngredients,
    suppliers: esSuppliers,
    recipes: esRecipes,
    po: esPo,
    prep: esPrep,
    shoppingList: esShoppingList,
    inventory: esInventory,
    reports: esReports,
    barcode: esBarcode,
    receipt: esReceipt,
    visual: esVisual,
    batch: esBatch,
    auth: esAuth,
    enums: esEnums,
    ledger: esLedger,
    chemistry: esChemistry,
    sourcing: esSourcing,
    ingredientInfo: esIngredientInfo,
    failureMode: esFailureMode,
    failureModeCatalog: esFailureModeCatalog,
    expenses: esExpenses,
    alerts: esAlerts,
  },
  ko: {
    common: koCommon,
    nav: koNav,
    dashboard: koDashboard,
    ingredients: koIngredients,
    suppliers: koSuppliers,
    recipes: koRecipes,
    po: koPo,
    prep: koPrep,
    shoppingList: koShoppingList,
    inventory: koInventory,
    reports: koReports,
    barcode: koBarcode,
    receipt: koReceipt,
    visual: koVisual,
    batch: koBatch,
    auth: koAuth,
    enums: koEnums,
    ledger: koLedger,
    chemistry: koChemistry,
    sourcing: koSourcing,
    ingredientInfo: koIngredientInfo,
    failureMode: koFailureMode,
    failureModeCatalog: koFailureModeCatalog,
    expenses: koExpenses,
    alerts: koAlerts,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
