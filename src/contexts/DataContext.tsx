import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Ingredient, Recipe, Supplier, Location, Lot } from '../types';

interface DataContextValue {
  ingredients: Ingredient[];
  recipes: Recipe[];
  suppliers: Supplier[];
  locations: Location[];
  lots: Lot[];
  loading: boolean;
  getIngredient: (id: string) => Ingredient | undefined;
  getRecipe: (id: string) => Recipe | undefined;
  getSupplier: (id: string) => Supplier | undefined;
  getLocation: (id: string) => Location | undefined;
  getLotsForIngredient: (ingredientId: string) => Lot[];
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);

    let ingredientsLoaded = false;
    let recipesLoaded = false;
    let suppliersLoaded = false;
    let locationsLoaded = false;
    let lotsLoaded = false;

    const checkLoading = () => {
      if (ingredientsLoaded && recipesLoaded && suppliersLoaded && locationsLoaded && lotsLoaded) {
        setLoading(false);
      }
    };

    const unsubIngredients = onSnapshot(collection(db, 'ingredients'), (snapshot) => {
      setIngredients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ingredient)));
      ingredientsLoaded = true;
      checkLoading();
    }, (error) => {
      console.error('[DataContext] ingredients subscription error:', error);
      handleFirestoreError(error, OperationType.LIST, 'ingredients');
      ingredientsLoaded = true;
      checkLoading();
    });

    const unsubRecipes = onSnapshot(collection(db, 'recipes'), (snapshot) => {
      setRecipes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe)));
      recipesLoaded = true;
      checkLoading();
    }, (error) => {
      console.error('[DataContext] recipes subscription error:', error);
      handleFirestoreError(error, OperationType.LIST, 'recipes');
      recipesLoaded = true;
      checkLoading();
    });

    const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
      suppliersLoaded = true;
      checkLoading();
    }, (error) => {
      console.error('[DataContext] suppliers subscription error:', error);
      handleFirestoreError(error, OperationType.LIST, 'suppliers');
      suppliersLoaded = true;
      checkLoading();
    });

    const unsubLocations = onSnapshot(collection(db, 'locations'), (snapshot) => {
      setLocations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)));
      locationsLoaded = true;
      checkLoading();
    }, (error) => {
      console.error('[DataContext] locations subscription error:', error);
      handleFirestoreError(error, OperationType.LIST, 'locations');
      locationsLoaded = true;
      checkLoading();
    });

    const lotsQuery = query(collection(db, 'lots'), where('quantity', '>', 0));
    const unsubLots = onSnapshot(lotsQuery, (snapshot) => {
      setLots(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lot)));
      lotsLoaded = true;
      checkLoading();
    }, (error) => {
      console.error('[DataContext] lots subscription error:', error);
      handleFirestoreError(error, OperationType.LIST, 'lots');
      lotsLoaded = true;
      checkLoading();
    });

    return () => {
      unsubIngredients();
      unsubRecipes();
      unsubSuppliers();
      unsubLocations();
      unsubLots();
    };
  }, [user]);

  const ingredientMap = useMemo(() => new Map(ingredients.map(i => [i.id, i])), [ingredients]);
  const recipeMap = useMemo(() => new Map(recipes.map(r => [r.id, r])), [recipes]);
  const supplierMap = useMemo(() => new Map(suppliers.map(s => [s.id, s])), [suppliers]);
  const locationMap = useMemo(() => new Map(locations.map(l => [l.id, l])), [locations]);
  
  const lotsByIngredientMap = useMemo(() => {
    const map = new Map<string, Lot[]>();
    lots.forEach(lot => {
      const existing = map.get(lot.ingredientId) || [];
      existing.push(lot);
      map.set(lot.ingredientId, existing);
    });
    return map;
  }, [lots]);

  const value = useMemo(() => ({
    ingredients,
    recipes,
    suppliers,
    locations,
    lots,
    loading,
    getIngredient: (id: string) => ingredientMap.get(id),
    getRecipe: (id: string) => recipeMap.get(id),
    getSupplier: (id: string) => supplierMap.get(id),
    getLocation: (id: string) => locationMap.get(id),
    getLotsForIngredient: (ingredientId: string) => lotsByIngredientMap.get(ingredientId) || [],
  }), [ingredients, recipes, suppliers, locations, lots, loading, ingredientMap, recipeMap, supplierMap, locationMap, lotsByIngredientMap]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
