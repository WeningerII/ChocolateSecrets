import 'i18next';
import common from '../locales/en/common.json';
import nav from '../locales/en/nav.json';
import dashboard from '../locales/en/dashboard.json';
import ingredients from '../locales/en/ingredients.json';
import suppliers from '../locales/en/suppliers.json';
import recipes from '../locales/en/recipes.json';
import po from '../locales/en/po.json';
import prep from '../locales/en/prep.json';
import shoppingList from '../locales/en/shoppingList.json';
import inventory from '../locales/en/inventory.json';
import reports from '../locales/en/reports.json';
import barcode from '../locales/en/barcode.json';
import receipt from '../locales/en/receipt.json';
import visual from '../locales/en/visual.json';
import batch from '../locales/en/batch.json';
import auth from '../locales/en/auth.json';
import enums from '../locales/en/enums.json';
import ledger from '../locales/en/ledger.json';
import chemistry from '../locales/en/chemistry.json';
import sourcing from '../locales/en/sourcing.json';
import ingredientInfo from '../locales/en/ingredientInfo.json';
import failureMode from '../locales/en/failureMode.json';
import failureModeCatalog from '../locales/en/failureModeCatalog.json';
import expenses from '../locales/en/expenses.json';
import alerts from '../locales/en/alerts.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      nav: typeof nav;
      dashboard: typeof dashboard;
      ingredients: typeof ingredients;
      suppliers: typeof suppliers;
      recipes: typeof recipes;
      po: typeof po;
      prep: typeof prep;
      shoppingList: typeof shoppingList;
      inventory: typeof inventory;
      reports: typeof reports;
      barcode: typeof barcode;
      receipt: typeof receipt;
      visual: typeof visual;
      batch: typeof batch;
      auth: typeof auth;
      enums: typeof enums;
      ledger: typeof ledger;
      chemistry: typeof chemistry;
      sourcing: typeof sourcing;
      ingredientInfo: typeof ingredientInfo;
      failureMode: typeof failureMode;
      failureModeCatalog: typeof failureModeCatalog;
      expenses: typeof expenses;
      alerts: typeof alerts;
    };
  }
}
