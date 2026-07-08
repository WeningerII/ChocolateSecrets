import { FieldValue, Timestamp } from 'firebase/firestore';

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

export interface StationTag {
  primary: 'chocolate_room' | 'pastry' | 'garde_manger' | 'hot_line' | 'bar' | 'other';
  skillLevel?: 'commis' | 'line' | 'sous' | 'chef';
  productionMode?: 'a_la_minute' | 'batch' | 'set_service' | 'mise_en_place';
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
