import React, { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, Timestamp, increment, runTransaction, limit } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Ingredient, Recipe, ProductionRun, PrepItem, Location, Lot } from '../types';
import { Calculator, Send, Plus, Trash2, AlertCircle, CheckCircle2, ClipboardList, GripVertical, Save, FolderOpen, FilePlus, Printer, X, ShoppingCart } from 'lucide-react';
import { convertUnit } from '../utils/units';
import { calculateTotalTargetYield, calculateTotalTargetWeight, calculateComponentTargetWeight, scaleIngredient, calculateRecipeCost, getRecipeRawIngredients } from '../utils/recipeMath';
import { useReactToPrint } from 'react-to-print';
import ConfirmModal from '../components/ConfirmModal';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';
import { formatCurrency } from '../utils/formatters';
import { SafeBatch, updateLotQuantity } from '../utils/firestore';
import { depleteStock, computeProducedLotExpiry, DEFAULT_PRODUCED_LOT_SHELF_LIFE_DAYS } from '../utils/inventory';
import { addManualShoppingListItem } from '../utils/shoppingList';
import { lotNumberForProduction } from '../utils/identifiers';
import { useData } from '../contexts/DataContext';
import Combobox from '../components/Combobox';
import { useToast } from '../contexts/ToastContext';
import { LocalizedField } from '../components/LocalizedField';

import ProductionCalendar from '../components/ProductionCalendar';
import { Calendar as CalendarIcon, List as ListIcon } from 'lucide-react';

interface ShoppingItem {
  ingredientId: string;
  name: string;
  unit: string;
  required: number;
  inStock: number;
  toOrder: number;
}

export default function PrepList() {
  const { t, i18n } = useTranslation(['prep', 'common', 'shoppingList', 'recipes', 'auth']);
  const language = useLanguage();
  const { toast } = useToast();
  const { recipes, ingredients, locations, lots, loading: dataLoading, getIngredient, getRecipe } = useData();
  const [productionRuns, setProductionRuns] = useState<ProductionRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  
  const [currentRun, setCurrentRun] = useState<Partial<ProductionRun>>({
    name: t('prep:untitledRun'),
    status: 'draft',
    items: []
  });
  
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{success: boolean, message: string} | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<'builder' | 'sops'>('builder');
  const [mobileView, setMobileView] = useState<'runs' | 'builder' | 'shopping'>('builder');

  const getActionEmoji = (actionType: string) => {
    switch (actionType) {
      case 'heat': return '🔥';
      case 'cool': return '❄️';
      case 'chop': return '✂️';
      case 'grind': return '⚙️';
      case 'mix': return '🔄';
      case 'jar': return '📦';
      default: return '📝';
    }
  };

  const [storeBatchModal, setStoreBatchModal] = useState<{
    isOpen: boolean;
    producedItems: { ingredientId: string, recipeId: string, recipeName: string, quantity: number, unit: string, locationId: string, locationInput?: string }[];
    onConfirm: (itemsWithLocations: { ingredientId: string, recipeId: string, recipeName: string, quantity: number, unit: string, locationId: string, locationInput?: string }[]) => void;
  }>({
    isOpen: false,
    producedItems: [],
    onConfirm: () => {}
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isAlert?: boolean;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: currentRun.name || 'Prep List',
  });

  useEffect(() => {
    const unsubRuns = onSnapshot(
      query(collection(db, 'productionRuns'), orderBy('createdAt', 'desc'), limit(50)),
      (snapshot) => {
        setProductionRuns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductionRun)));
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'productionRuns')
    );

    return () => {
      unsubRuns();
    };
  }, []);

  const handleCreateNewRun = () => {
    setCurrentRun({
      name: t('prep:untitledRun'),
      status: 'draft',
      items: []
    });
    setShoppingList([]);
    setSendResult(null);
  };

  const handleLoadRun = (run: ProductionRun) => {
    setCurrentRun(run);
    setShoppingList([]);
    setSendResult(null);
  };

  const handleSaveRun = async () => {
    if (!auth.currentUser) {
      toast.error(t('auth:pleaseSignIn'));
      return;
    }
    try {
      const finalName = currentRun.name?.trim() || `Run ${new Date().toLocaleDateString()}`;
      const data = {
        name: finalName,
        status: currentRun.status || 'draft',
        items: currentRun.items || [],
        notes: currentRun.notes || '',
        updatedAt: serverTimestamp()
      };

      if (currentRun.id) {
        await updateDoc(doc(db, 'productionRuns', currentRun.id), data);
        setSendResult({ success: true, message: t('prep:runUpdated') });
      } else {
        const docRef = await addDoc(collection(db, 'productionRuns'), {
          ...data,
          createdAt: serverTimestamp()
        });
        setCurrentRun({ ...currentRun, id: docRef.id });
        setSendResult({ success: true, message: t('prep:runSaved') });
      }
    } catch (error) {
      handleFirestoreError(error, currentRun.id ? OperationType.UPDATE : OperationType.CREATE, 'productionRuns');
    }
  };

  const handleDeleteRun = (id: string) => {
    if (!auth.currentUser) {
      toast.error(t('auth:pleaseSignIn'));
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: t('prep:deleteTitle'),
      message: t('prep:deleteMessage'),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'productionRuns', id));
          if (currentRun.id === id) {
            handleCreateNewRun();
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `productionRuns/${id}`);
        }
      }
    });
  };

  const addPrepItem = () => {
    setCurrentRun({
      ...currentRun,
      items: [...(currentRun.items || []), { recipeId: '', quantity: 1, notes: '' }]
    });
  };

  const executeCompletion = async (requiredIngredients: Map<string, number>, producedItems: { ingredientId: string, recipeId: string, recipeName: string, quantity: number, unit: string, locationId: string, locationInput?: string }[]) => {
    try {
      const batch = new SafeBatch(db);

      // 2. Deplete stock for required ingredients
      for (const [ingredientId, requiredQty] of Array.from(requiredIngredients.entries())) {
        const ingredient = getIngredient(ingredientId);
        if (!ingredient) continue;

        const ingredientLots = lots.filter(l => l.ingredientId === ingredientId);
        const lotsCopy = ingredientLots.map(lot => ({ ...lot }));
        const { modifiedLots, consumedLots } = depleteStock(lotsCopy, requiredQty);
        
        const newStock = Math.max(0, ingredient.stock - requiredQty);
        
        const ingRef = doc(db, 'ingredients', ingredientId);
        batch.update(ingRef, {
          updatedAt: serverTimestamp()
        });

        modifiedLots.forEach(lot => {
          updateLotQuantity(batch, db, lot, lot.quantity);
        });

        for (const consumed of consumedLots) {
          const txRef = doc(collection(db, 'inventoryTransactions'));
          batch.set(txRef, {
            ingredientId,
            referenceId: currentRun.id,
            type: 'consume',
            amount: -consumed.amount,
            costPerUnit: consumed.costPerUnit || ingredient.weightedAverageCost || ingredient.costPerUnit || 0,
            date: serverTimestamp(),
            reason: `${t('prep:title')}: ${currentRun.name || t('prep:untitledRun')}`,
            lotId: consumed.lotId || '',
            userId: auth.currentUser?.uid || 'system'
          });
        }
      }

      // 3. Add stock for produced WIP ingredients
      let usedDefaultCount = 0;
      for (const produced of producedItems) {
        const ingredientId = produced.ingredientId;
        const ingredient = getIngredient(ingredientId);
        if (!ingredient) continue;

        let finalLocationId = produced.locationId || '';
        if (produced.locationInput?.trim()) {
          const existingLocation = locations.find(l => l.name.toLowerCase() === produced.locationInput?.trim().toLowerCase());
          if (existingLocation) {
            finalLocationId = existingLocation.id;
          } else {
            const newLocRef = doc(collection(db, 'locations'));
            batch.set(newLocRef, { name: produced.locationInput.trim(), createdAt: serverTimestamp() });
            finalLocationId = newLocRef.id;
          }
        }

        const newLotRef = doc(collection(db, 'lots'));
        const newLotId = newLotRef.id;
        if (!currentRun.id) throw new Error('Cannot execute completion without run ID');
        const newLotNumber = lotNumberForProduction(currentRun.id, ingredientId);
        
        // Calculate cost per unit for the produced item based on the recipe cost
        const recipe = recipes.find(r => r.id === produced.recipeId);
        let costPerUnit = 0;
        if (recipe) {
          const totalCost = calculateRecipeCost(recipe, ingredients, recipes).cost;
          const totalYield = calculateTotalTargetYield(recipe, 1);
          if (totalYield > 0) {
            costPerUnit = totalCost / totalYield;
          }
        }

        const { expiresAt, usedDefault } = computeProducedLotExpiry(recipe);
        if (usedDefault && recipe) {
          usedDefaultCount++;
          console.warn(`[PrepList] Recipe "${recipe.name}" has no HACCP shelfLifeDays; produced lot will expire in ${DEFAULT_PRODUCED_LOT_SHELF_LIFE_DAYS} days (default).`);
        }

        batch.set(newLotRef, {
          id: newLotId,
          ingredientId,
          poNumber: newLotNumber,
          quantity: produced.quantity,
          initialQuantity: produced.quantity,
          locationId: finalLocationId,
          costPerUnit,
          receivedAt: serverTimestamp(),
          expiresAt,
        });

        // Update ingredient timestamp (stock and WAC handled by Cloud Function)
        const ingRef = doc(db, 'ingredients', ingredientId);
        batch.update(ingRef, {
          costPerUnit,
          updatedAt: serverTimestamp()
        });

        const txRef = doc(collection(db, 'inventoryTransactions'));
        batch.set(txRef, {
          ingredientId,
          referenceId: currentRun.id,
          type: 'yield',
          amount: produced.quantity,
          costPerUnit,
          date: serverTimestamp(),
          reason: `Produced from Run: ${currentRun.name || 'Untitled'}`,
          lotId: newLotId,
          lotNumber: newLotNumber,
          toLocationId: finalLocationId,
          userId: auth.currentUser?.uid || 'system'
        });
      }

      // 4. Update run status
      const runRef = doc(db, 'productionRuns', currentRun.id!);
      batch.update(runRef, {
        status: 'completed',
        updatedAt: serverTimestamp()
      });

      await batch.commit();

      if (usedDefaultCount > 0) {
        toast.warning(
          t('prep:expiryDefaultedToast', {
            count: usedDefaultCount,
            days: DEFAULT_PRODUCED_LOT_SHELF_LIFE_DAYS,
            defaultValue: `${usedDefaultCount} produced lot(s) used the default ${DEFAULT_PRODUCED_LOT_SHELF_LIFE_DAYS}-day shelf life. Set HACCP shelfLifeDays on recipes to customize.`
          })
        );
      }

      setCurrentRun({ ...currentRun, status: 'completed' });
      setSendResult({ success: true, message: t('prep:runCompleted') });
      setStoreBatchModal({ isOpen: false, producedItems: [], onConfirm: () => {} });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'productionRuns/inventory');
    }
  };

  const handleStatusChange = (newStatus: 'draft' | 'active' | 'completed') => {
    if (newStatus === 'completed' && currentRun.status !== 'completed') {
      setConfirmModal({
        isOpen: true,
        title: t('prep:completeTitle'),
        message: t('prep:completeMessage'),
        onConfirm: async () => {
          try {
            // 1. Calculate all required ingredients
            const requiredIngredients = new Map<string, number>();
            const producedIngredients = new Map<string, { recipeId: string, recipeName: string, quantity: number, unit: string }>();

            (currentRun.items || []).forEach(item => {
              if (!item.recipeId || item.quantity <= 0) return;
              
              const recipe = getRecipe(item.recipeId);
              if (!recipe) return;

              const totalYield = calculateTotalTargetYield(recipe, item.quantity);
              const totalWeight = calculateTotalTargetWeight(recipe, item.quantity);

              // Track WIP production
              if (recipe.outputIngredientId) {
                const outIng = getIngredient(recipe.outputIngredientId);
                const currentProduced = producedIngredients.get(recipe.outputIngredientId) || { recipeId: recipe.id, recipeName: recipe.name, quantity: 0, unit: outIng?.unit || 'units' };
                producedIngredients.set(recipe.outputIngredientId, {
                  recipeId: recipe.id,
                  recipeName: recipe.name,
                  quantity: currentProduced.quantity + totalYield,
                  unit: currentProduced.unit
                });
              }

              const subIngredients = getRecipeRawIngredients(recipe, item.quantity, recipes, ingredients);
              subIngredients.forEach((qty, id) => {
                const current = requiredIngredients.get(id) || 0;
                requiredIngredients.set(id, current + qty);
              });
            });

            const producedArray = Array.from(producedIngredients.entries()).map(([id, data]) => ({
              ingredientId: id,
              ...data,
              locationId: ''
            }));

            if (producedArray.length > 0) {
              setStoreBatchModal({
                isOpen: true,
                producedItems: producedArray,
                onConfirm: (itemsWithLocations) => executeCompletion(requiredIngredients, itemsWithLocations)
              });
            } else {
              await executeCompletion(requiredIngredients, []);
            }
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, 'productionRuns');
          }
        }
      });
      return;
    }
    
    setCurrentRun({ ...currentRun, status: newStatus });
  };

  const updatePrepItem = (index: number, field: keyof PrepItem, value: string | number) => {
    const newItems = [...(currentRun.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    setCurrentRun({ ...currentRun, items: newItems });
  };

  const removePrepItem = (index: number) => {
    setCurrentRun({
      ...currentRun,
      items: (currentRun.items || []).filter((_, i) => i !== index)
    });
  };

  const reorderPrepItems = (startIndex: number, endIndex: number) => {
    const result = Array.from(currentRun.items || []);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    setCurrentRun({ ...currentRun, items: result });
  };

  const calculateShoppingList = () => {
    const requiredIngredients = new Map<string, number>();

    (currentRun.items || []).forEach(item => {
      if (!item.recipeId || item.quantity <= 0) return;
      
      const recipe = getRecipe(item.recipeId);
      if (!recipe) return;

      const subIngredients = getRecipeRawIngredients(recipe, item.quantity, recipes, ingredients);
      subIngredients.forEach((qty, id) => {
        const current = requiredIngredients.get(id) || 0;
        requiredIngredients.set(id, current + qty);
      });
    });

    const list: ShoppingItem[] = [];
    requiredIngredients.forEach((requiredQty, ingredientId) => {
      const ingredient = getIngredient(ingredientId);
      if (!ingredient) return;

      const toOrder = Math.max(0, requiredQty - ingredient.stock);
      
      if (toOrder > 0) {
        list.push({
          ingredientId,
          name: ingredient.name,
          unit: ingredient.unit,
          required: Number(requiredQty.toFixed(2)),
          inStock: ingredient.stock,
          toOrder: Number(toOrder.toFixed(2))
        });
      }
    });

    setShoppingList(list.sort((a, b) => a.name.localeCompare(b.name)));
    setSendResult(null);
  };

  const sendShoppingList = async () => {
    if (shoppingList.length === 0) return;
    
    setIsSending(true);
    setSendResult(null);
    
    try {
      const items = shoppingList.map(item => ({
        name: item.name,
        quantity: item.toOrder,
        unit: item.unit
      }));

      const response = await fetch('/api/send-shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Here is the shopping list for production run "${currentRun.name}":`,
          items
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setSendResult({ success: true, message: t('prep:shoppingListSent') });
      } else {
        setSendResult({ success: false, message: data.error || t('prep:shoppingListFailed') });
      }
    } catch (error) {
      setSendResult({ success: false, message: t('prep:networkError') });
    } finally {
      setIsSending(false);
    }
  };

  const addToMasterShoppingList = async () => {
    if (shoppingList.length === 0) return;
    
    setIsSending(true);
    setSendResult(null);
    
    try {
      const batch = new SafeBatch(db);
      
      for (const item of shoppingList) {
        if (item.toOrder <= 0) continue;
        
        const ingredient = getIngredient(item.ingredientId);
        if (!ingredient) continue;

        await addManualShoppingListItem(ingredient, item.toOrder, { batch });
      }
      
      await batch.commit();
      setSendResult({ success: true, message: t('prep:itemsAdded') });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'shopping_list');
      setSendResult({ success: false, message: t('prep:itemsAddFailed') });
    } finally {
      setIsSending(false);
    }
  };

  if (loading) return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-stone-200 rounded w-3/4"></div><div className="space-y-2"><div className="h-4 bg-stone-200 rounded"></div><div className="h-4 bg-stone-200 rounded w-5/6"></div></div></div></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-stone-900">{t('prep:title')}</h2>
          <p className="text-stone-500 mt-1">{t('prep:subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-stone-100 p-1 rounded-xl flex">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${viewMode === 'list' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              <ListIcon className="w-4 h-4" />
              {t('prep:list')}
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${viewMode === 'calendar' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              <CalendarIcon className="w-4 h-4" />
              {t('prep:calendar')}
            </button>
          </div>
          <button
            onClick={handleCreateNewRun}
            className="bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors"
          >
            <FilePlus className="w-5 h-5" />
            {t('prep:newRun')}
          </button>
          <button
            onClick={handleSaveRun}
            className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors"
          >
            <Save className="w-5 h-5" />
            {t('prep:saveRun')}
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <ProductionCalendar 
          productionRuns={productionRuns} 
          onSelectRun={(run) => {
            handleLoadRun(run);
            setViewMode('list');
          }} 
        />
      ) : (
        <div className="space-y-6">
          {/* Mobile View Selector */}
          <div className="lg:hidden flex bg-stone-100 p-1 rounded-xl">
            <button
              onClick={() => setMobileView('runs')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mobileView === 'runs' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
            >
              {t('prep:savedRuns')}
            </button>
            <button
              onClick={() => setMobileView('builder')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mobileView === 'builder' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
            >
              {t('prep:builder')}
            </button>
            <button
              onClick={() => setMobileView('shopping')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mobileView === 'shopping' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
            >
              {t('nav:shoppingList')}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Sidebar: Saved Runs */}
            <div className={`${mobileView === 'runs' ? 'block' : 'hidden lg:block'} lg:col-span-1 bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col h-[calc(100vh-16rem)] lg:h-[calc(100vh-12rem)]`}>
              <div className="px-4 py-4 border-b border-stone-200 bg-stone-50">
                <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-amber-700" />
                  {t('prep:savedRuns')}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {productionRuns.length === 0 ? (
                  <div className="p-4 text-sm text-stone-500 text-center">{t('prep:noSavedRuns')}</div>
                ) : (
                  productionRuns.map(run => (
                    <div 
                      key={run.id}
                      className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${currentRun.id === run.id ? 'bg-amber-50 border border-amber-200' : 'hover:bg-stone-50 border border-transparent'}`}
                      onClick={() => handleLoadRun(run)}
                    >
                      <div className="truncate pr-2">
                        <div className={`font-medium text-sm ${currentRun.id === run.id ? 'text-amber-900' : 'text-stone-900'}`}>
                          {run.name || t('prep:untitledRun')}
                        </div>
                        <div className="text-xs text-stone-500 mt-0.5">
                          {run.items?.length || 0} {t('prep:items')} • {run.status === 'draft' ? t('prep:draft') : run.status === 'active' ? t('prep:active') : t('prep:completed')}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRun(run.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Middle Column: Prep List Builder */}
            <div className={`${mobileView === 'builder' ? 'block' : 'hidden lg:block'} lg:col-span-2 bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col h-[calc(100vh-16rem)] lg:h-[calc(100vh-12rem)]`}>
              <div className="px-6 py-5 border-b border-stone-200 bg-stone-50 space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={currentRun.name || ''}
                      onChange={(e) => setCurrentRun({ ...currentRun, name: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-stone-900"
                      placeholder={t('prep:runNamePlaceholder')}
                    />
                  </div>
                  <div className="w-32">
                    <select
                      value={currentRun.status || 'draft'}
                      onChange={(e) => handleStatusChange(e.target.value as 'draft' | 'active' | 'completed')}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    >
                      <option value="draft">{t('prep:draft')}</option>
                      <option value="active">{t('prep:active')}</option>
                      <option value="completed">{t('prep:completed')}</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex gap-4">
                    <button
                      onClick={() => setActiveTab('builder')}
                      className={`text-sm font-semibold uppercase tracking-wider pb-1 border-b-2 transition-colors ${activeTab === 'builder' ? 'border-amber-700 text-amber-800' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
                    >
                      {t('prep:dishesToPrepare')}
                    </button>
                    <button
                      onClick={() => setActiveTab('sops')}
                      className={`text-sm font-semibold uppercase tracking-wider pb-1 border-b-2 transition-colors ${activeTab === 'sops' ? 'border-amber-700 text-amber-800' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
                    >
                      {t('prep:productionSOPs')}
                    </button>
                  </div>
                  {activeTab === 'builder' && (
                    <button
                      onClick={addPrepItem}
                      className="text-sm text-amber-700 font-medium hover:text-amber-800 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> {t('prep:addDish')}
                    </button>
                  )}
                </div>
              </div>
              
              <div ref={printRef} className="p-6 flex-1 overflow-y-auto space-y-3 print:p-8 print:overflow-visible">
                <div className="hidden print:block mb-8">
                  <h1 className="text-3xl font-bold text-stone-900">{currentRun.name || t('prep:untitledRun')}</h1>
                  <p className="text-stone-500">{t('prep:date')} {new Date().toLocaleDateString()}</p>
                </div>

                {activeTab === 'builder' ? (
                  <>
                    {(currentRun.items || []).map((item, index) => (
                      <div 
                        key={index} 
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          setDraggedItemIndex(index);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (draggedItemIndex === null || draggedItemIndex === index) return;
                          reorderPrepItems(draggedItemIndex, index);
                          setDraggedItemIndex(index);
                        }}
                        onDragEnd={() => setDraggedItemIndex(null)}
                        className={`flex gap-3 items-start p-3 bg-white border border-stone-200 rounded-xl shadow-sm transition-all print:border-b print:border-stone-300 print:shadow-none print:rounded-none print:p-4 ${draggedItemIndex === index ? 'opacity-50' : 'hover:border-stone-300'}`}
                      >
                        <div className="cursor-grab active:cursor-grabbing p-2 -ml-1 text-stone-400 hover:text-stone-600 mt-0.5 print:hidden">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="hidden print:block w-5 h-5 border-2 border-stone-400 rounded-sm mt-1 shrink-0"></div>
                        <div className="flex-1 space-y-3">
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <select
                                value={item.recipeId}
                                onChange={(e) => updatePrepItem(index, 'recipeId', e.target.value)}
                                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 print:appearance-none print:border-none print:p-0 print:font-bold print:text-lg"
                              >
                                <option value="">{t('prep:selectDish')}</option>
                                {recipes.map(r => (
                                  <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="w-24 flex items-center gap-2">
                              <span className="hidden print:inline text-stone-500 font-medium">{t('prep:qty')}</span>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity || ''}
                                onChange={(e) => updatePrepItem(index, 'quantity', Number(e.target.value))}
                                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 print:border-none print:p-0 print:font-bold print:text-lg"
                                placeholder={t('prep:qty')}
                              />
                            </div>
                          </div>
                          <div>
                            <input
                              type="text"
                              value={item.notes || ''}
                              onChange={(e) => updatePrepItem(index, 'notes', e.target.value)}
                              className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-stone-50 print:bg-transparent print:border-none print:p-0 print:text-stone-600"
                              placeholder={t('prep:notesPlaceholder')}
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => removePrepItem(index)}
                          className="p-2 text-stone-400 hover:text-red-600 mt-0.5 print:hidden"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    
                    {(!currentRun.items || currentRun.items.length === 0) && (
                      <div className="text-center p-8 border-2 border-dashed border-stone-200 rounded-xl text-stone-500 print:hidden">
                        {t('prep:addDishesPrompt')}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-8">
                    {(currentRun.items || []).filter(i => i.recipeId && i.quantity > 0).map((item, index) => {
                      const recipe = getRecipe(item.recipeId);
                      if (!recipe) return null;

                      const totalYield = calculateTotalTargetYield(recipe, item.quantity);
                      const totalWeight = calculateTotalTargetWeight(recipe, item.quantity);

                      return (
                        <div key={index} className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden print:border-none print:shadow-none">
                          <div className="bg-stone-50 px-4 py-3 border-b border-stone-200 print:bg-transparent print:px-0 print:border-b-2 print:border-stone-800">
                            <div className="flex justify-between items-end">
                              <div>
                                <h2 className="text-xl font-bold text-stone-900"><LocalizedField field={recipe.nameI18n} legacyText={recipe.name} /></h2>
                                <p className="text-sm text-stone-500 mt-1">{t('prep:targetYield')} {totalYield} {t(`enums:units.${recipe.yield?.totalYieldUnit || 'units'}` as any, recipe.yield?.totalYieldUnit || 'units')} ({totalWeight.toFixed(1)}g {t('prep:total')})</p>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-medium text-stone-500 uppercase tracking-wider">{t('prep:multiplier')} {item.quantity}x</span>
                              </div>
                            </div>
                            {item.notes && (
                              <div className="mt-2 text-sm text-amber-800 bg-amber-50 p-2 rounded border border-amber-200 print:border-none print:bg-transparent print:p-0 print:mt-1">
                                <strong>{t('prep:notes')}</strong> {item.notes}
                              </div>
                            )}
                          </div>

                          <div className="p-4 space-y-6 print:px-0">
                            {(recipe.components || []).map((comp, compIdx) => {
                              const componentWeight = calculateComponentTargetWeight(comp, totalWeight, recipe.type, item.quantity);
                              
                              return (
                                <div key={compIdx} className="space-y-3">
                                  <div className="flex justify-between items-center border-b border-stone-100 pb-1">
                                    <h3 className="font-semibold text-stone-800 text-lg">{comp.name}</h3>
                                    <span className="text-sm text-stone-500">{componentWeight.toFixed(1)}g</span>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                      <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">{t('prep:ingredients')}</h4>
                                      <table className="w-full text-sm">
                                        <tbody>
                                          {comp.ingredients.map((ing, ingIdx) => {
                                            const baseIng = getIngredient(ing.ingredientId);
                                            const scaledQty = scaleIngredient(ing, comp, totalYield, componentWeight);
                                            return (
                                              <tr key={ingIdx} className="border-b border-stone-50 last:border-0">
                                                <td className="py-1.5 font-medium text-stone-700">{baseIng?.name || 'Unknown'}</td>
                                                <td className="py-1.5 text-right whitespace-nowrap">
                                                  {scaledQty.toFixed(2)} {t(`enums:units.${ing.unit || baseIng?.unit}` as any, ing.unit || baseIng?.unit)}
                                                </td>
                                                <td className="py-1.5 pl-2 text-stone-400 text-xs w-1/3">
                                                  {ing.state ? `${ing.state} ` : ''}
                                                  {ing.convertedQuantities ? `(${ing.convertedQuantities})` : ''}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                    
                                    <div>
                                      <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">{t('prep:sop')}</h4>
                                      {comp.steps && comp.steps.length > 0 ? (
                                        <div className="space-y-3">
                                          {comp.steps.map((step, stepIdx) => (
                                            <div key={stepIdx} className="flex gap-3 text-sm">
                                              <div className="flex flex-col items-center gap-1 shrink-0">
                                                <div className="w-5 h-5 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-[10px] font-bold text-stone-500">
                                                  {step.order}
                                                </div>
                                                <div className="text-lg" title={step.actionType}>
                                                  {getActionEmoji(step.actionType)}
                                                </div>
                                              </div>
                                              <div className="flex-1">
                                                <div className="font-semibold text-stone-800">{step.title}</div>
                                                <div className="text-stone-600 mt-0.5">{step.instruction}</div>
                                                {step.equipment && step.equipment.length > 0 && (
                                                  <div className="text-xs text-stone-500 mt-1">
                                                    <strong>Eq:</strong> {step.equipment.join(', ')}
                                                  </div>
                                                )}
                                                {step.warning && (
                                                  <div className="text-xs text-red-700 bg-red-50 border border-red-100 p-1.5 rounded mt-1">
                                                    <strong>⚠️</strong> {step.warning}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-sm text-stone-500 italic">{t('prep:noSOPs')}</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {(!currentRun.items || currentRun.items.filter(i => i.recipeId && i.quantity > 0).length === 0) && (
                      <div className="text-center p-8 border-2 border-dashed border-stone-200 rounded-xl text-stone-500 print:hidden">
                        {t('prep:addDishesSOPPrompt')}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="px-6 py-4 border-t border-stone-200 bg-stone-50">
                <button
                  onClick={calculateShoppingList}
                  disabled={!currentRun.items || currentRun.items.length === 0 || !currentRun.items.some(i => i.recipeId)}
                  className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Calculator className="w-5 h-5" />
                  {t('prep:calcShoppingList')}
                </button>
              </div>
            </div>

            {/* Right Sidebar: Shopping List */}
            <div className={`${mobileView === 'shopping' ? 'block' : 'hidden lg:block'} lg:col-span-1 bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col h-[calc(100vh-16rem)] lg:h-[calc(100vh-12rem)]`}>
              <div className="px-6 py-5 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-stone-900">{t('prep:shoppingList')}</h3>
                {shoppingList.length > 0 && (
                  <button
                    onClick={() => handlePrint()}
                    className="text-sm text-stone-600 hover:text-stone-900 font-medium flex items-center gap-1"
                  >
                    <Printer className="w-4 h-4" />
                    {t('prep:print')}
                  </button>
                )}
              </div>
              
              <div className="p-0 flex-1 overflow-auto">
                {shoppingList.length > 0 ? (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-auto">
                      <table className="min-w-full divide-y divide-stone-200">
                        <thead className="bg-white">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('prep:item')}</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-amber-700 uppercase tracking-wider">{t('prep:order')}</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-stone-100">
                          {shoppingList.map((item, idx) => (
                            <tr key={idx} className="hover:bg-amber-50/50">
                              <td className="px-4 py-3 text-sm font-medium text-stone-900">
                                {item.name}
                                <div className="text-xs text-stone-500 font-normal mt-0.5">
                                  {t('prep:req')} {item.required} | {t('prep:stock')} {item.inStock}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-amber-700">
                                {item.toOrder} {t(`enums:units.${item.unit}` as any, item.unit)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="bg-stone-50 p-4 border-t border-stone-200 shrink-0">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-stone-600">{t('prep:estCost')}</span>
                        <span className="font-bold text-stone-900">
                          {formatCurrency((currentRun.items || []).reduce((total, item) => {
                            const recipe = getRecipe(item.recipeId);
                            if (!recipe || !item.quantity) return total;
                            return total + (calculateRecipeCost(recipe, ingredients, recipes).cost * item.quantity);
                          }, 0), language)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-stone-500 text-center">
                    <ClipboardList className="w-12 h-12 text-stone-300 mb-3" />
                    <p className="text-sm">{t('prep:emptyShoppingList')}</p>
                  </div>
                )}
              </div>
              
              {shoppingList.length > 0 && (
                <div className="px-4 py-4 border-t border-stone-200 bg-stone-50 space-y-3">
                  {sendResult && (
                    <div className={`p-2 rounded-lg flex items-start gap-2 text-xs ${sendResult.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                      {sendResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                      <p>{sendResult.message}</p>
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={sendShoppingList}
                      disabled={isSending}
                      className="w-full bg-amber-700 hover:bg-amber-800 disabled:bg-amber-700/50 text-white font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      {isSending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          {t('prep:sendToChef')}
                        </>
                      )}
                    </button>
                    <button
                      onClick={addToMasterShoppingList}
                      disabled={isSending}
                      className="w-full bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 disabled:bg-stone-100 disabled:text-stone-400 font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {t('prep:addToMasterList')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {storeBatchModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-stone-50">
              <h3 className="text-lg font-semibold text-stone-900">{t('prep:storeBatchTitle')}</h3>
              <button onClick={() => setStoreBatchModal({ isOpen: false, producedItems: [], onConfirm: () => {} })} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <p className="text-sm text-stone-600">
                {t('prep:storeBatchDesc')}
              </p>
              
              {storeBatchModal.producedItems.map((item, itemIdx) => (
                <div key={item.ingredientId} className="border border-stone-200 rounded-xl overflow-hidden">
                  <div className="bg-stone-100 px-4 py-3 border-b border-stone-200 flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-stone-900">{item.recipeName}</h4>
                      <p className="text-xs text-stone-500">{t('prep:totalProduced')} {item.quantity} {t(`enums:units.${item.unit}` as any, item.unit)}</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-white">
                    <div className="flex gap-3 items-start bg-stone-50 p-3 rounded-lg border border-stone-200">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-stone-500 mb-1">{t('prep:storageLocation')}</label>
                        <Combobox
                          value={item.locationInput || ''}
                          onChange={(val, locItem) => {
                            const newItems = [...storeBatchModal.producedItems];
                            newItems[itemIdx].locationInput = val;
                            if (locItem) newItems[itemIdx].locationId = locItem.id;
                            setStoreBatchModal({ ...storeBatchModal, producedItems: newItems });
                          }}
                          items={locations.map(l => ({ id: l.id, name: l.name }))}
                          placeholder={t('common:typeToSearchOrCreate')}
                          accentColor="amber"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex justify-end gap-3">
              <button
                onClick={() => setStoreBatchModal({ isOpen: false, producedItems: [], onConfirm: () => {} })}
                className="px-4 py-2 text-stone-600 hover:bg-stone-200 rounded-lg font-medium transition-colors"
              >
                {t('prep:cancel')}
              </button>
              <button
                onClick={() => {
                  storeBatchModal.onConfirm(storeBatchModal.producedItems);
                }}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-medium transition-colors"
              >
                {t('prep:completeStore')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isAlert={confirmModal.isAlert}
        isDestructive={confirmModal.isDestructive}
      />
    </div>
  );
}
