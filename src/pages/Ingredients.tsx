import React, { useState } from 'react';
import { collection, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { Ingredient, Lot, Supplier, Composition, SupportedLanguage } from '../types';
import { Plus, Pencil, Trash2, X, Search, Filter, Camera, Barcode, Receipt, CheckSquare, Square, AlertCircle, PackagePlus, ArrowDownRight } from 'lucide-react';
import { INGREDIENT_CATEGORIES } from '../constants';
import { isFuzzyMatch } from '../utils/search';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import ReceiptImportModal from '../components/ReceiptImportModal';
import VisualAuditModal from '../components/VisualAuditModal';
import ConfirmModal from '../components/ConfirmModal';
import ReceiveGoodsModal from '../components/ReceiveGoodsModal';
import AdjustStockModal from '../components/AdjustStockModal';
import CsvImportModal from '../components/CsvImportModal';
import { CompositionEditor } from '../components/CompositionEditor';
import Combobox from '../components/Combobox';
import { SafeBatch, withTimestamps } from '../utils/firestore';
import { appendPriceHistoryIfChanged } from '../utils/inventory';
import { addManualShoppingListItem } from '../utils/shoppingList';
import { useTranslation } from 'react-i18next';
import { formatFirestoreDate } from '../utils/date';
import { useData } from '../contexts/DataContext';
import { Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { LocalizedField } from '../components/LocalizedField';
import { attachIngredientLocalizedFields, stripUndefined } from '../utils/localized';
import { deriveIngredientDietaryFlags } from '../utils/dietary';

export default function Ingredients() {
  const { t, i18n } = useTranslation(['ingredients', 'common', 'recipes', 'auth', 'inventory', 'prep', 'enums', 'batch']);
  const language = i18n.language;
  const { toast } = useToast();
  const { ingredients, suppliers, locations, lots, loading, getIngredient } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receiveIngredient, setReceiveIngredient] = useState<Ingredient | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustIngredient, setAdjustIngredient] = useState<Ingredient | null>(null);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);

  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  const [visibleColumns, setVisibleColumns] = useState({
    brand: true,
    category: true,
    supplier: true,
    costPerUnit: true,
    stock: true,
    threshold: true,
  });
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [batchSupplierInput, setBatchSupplierInput] = useState('');
  const [isBatchSupplierModalOpen, setIsBatchSupplierModalOpen] = useState(false);
  
  const [batchCategoryInput, setBatchCategoryInput] = useState('');
  const [isBatchCategoryModalOpen, setIsBatchCategoryModalOpen] = useState(false);

  const [supplierInput, setSupplierInput] = useState('');
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const [categoryInput, setCategoryInput] = useState('');
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

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

  const [formData, setFormData] = useState<{
    name: string;
    unit: string;
    stock: number;
    lowStockThreshold: number;
    parLevel?: number;
    defaultPackSize?: number;
    category: string;
    costPerUnit?: number;
    supplier?: string;
    supplierId?: string;
    moq?: number;
    orderUnit?: string;
    brand?: string;
    barcode?: string;
    customFields?: { name: string; value: string }[];
    tags?: string[];
    allergens?: string[];
    isDiscrete?: boolean;
    needsReview?: boolean;
    aiExtractionNotes?: string;
    composition?: Composition;
    usdaFdcId?: number;
    bufferRef?: string;
  }>({
    name: '',
    unit: '',
    stock: 0,
    lowStockThreshold: 0,
    parLevel: 0,
    defaultPackSize: 0,
    category: '',
    costPerUnit: 0,
    supplier: '',
    supplierId: '',
    moq: 0,
    orderUnit: '',
    brand: '',
    barcode: '',
    customFields: [],
    tags: [],
    allergens: [],
    isDiscrete: false,
    needsReview: false,
    aiExtractionNotes: '',
    composition: undefined,
    usdaFdcId: undefined,
    bufferRef: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast.error(t('auth:pleaseSignIn'));
      return;
    }
    try {
      const batch = new SafeBatch(db);
      
      let finalSupplierId = formData.supplierId || '';
      let finalSupplierName = formData.supplier || '';

      if (supplierInput.trim()) {
        const existingSupplier = suppliers.find(s => s.name.toLowerCase() === supplierInput.trim().toLowerCase());
        if (existingSupplier) {
          finalSupplierId = existingSupplier.id;
          finalSupplierName = existingSupplier.name;
        } else {
          const newSupplierRef = doc(collection(db, 'suppliers'));
          finalSupplierId = newSupplierRef.id;
          finalSupplierName = supplierInput.trim();
          batch.set(newSupplierRef, {
            name: finalSupplierName,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      } else {
        finalSupplierId = '';
        finalSupplierName = '';
      }

      const finalCategory = categoryInput.trim() || 'Uncategorized';

      const data = {
        ...formData,
        name: formData.name?.trim() || 'Untitled Ingredient',
        unit: formData.unit?.trim() || 'g',
        category: finalCategory,
        supplier: finalSupplierName,
        supplierId: finalSupplierId,
        lowStockThreshold: Number(formData.lowStockThreshold) || 0,
        parLevel: Number(formData.parLevel) || 0,
        defaultPackSize: Number(formData.defaultPackSize) || 0,
        costPerUnit: Number(formData.costPerUnit) || 0,
        moq: Number(formData.moq) || 0,
        updatedAt: serverTimestamp()
      };

      let ingredientId = editingIngredient?.id;

      // Price history tracking
      const newCost = Number(formData.costPerUnit) || 0;
      const priceHistory = appendPriceHistoryIfChanged(
        editingIngredient || undefined,
        newCost,
        finalSupplierName
      );

      (data as any).dietary = deriveIngredientDietaryFlags(data.composition);

      const finalData = { ...data, priceHistory };
      // Remove legacy fields if they exist
      delete (finalData as any).lots;
      delete (finalData as any).positions;

      const uiLanguage = (i18n.language.split('-')[0] as SupportedLanguage);
      const ingredientWithLocalized = attachIngredientLocalizedFields(
        finalData as unknown as Ingredient,
        editingIngredient || undefined,
        uiLanguage
      );
      const sanitized = stripUndefined(ingredientWithLocalized);

      if (editingIngredient) {
        batch.update(doc(db, 'ingredients', editingIngredient.id), withTimestamps(sanitized));
      } else {
        const newDocRef = doc(collection(db, 'ingredients'));
        ingredientId = newDocRef.id;
        // New ingredients start with 0 stock. Stock is added via Receive Goods.
        batch.set(newDocRef, withTimestamps({ ...sanitized, stock: 0, weightedAverageCost: newCost }, true));
      }

      await batch.commit();

      setIsModalOpen(false);
      setEditingIngredient(null);
      setSupplierInput('');
      setCategoryInput('');
      setFormData({ name: '', unit: '', stock: 0, lowStockThreshold: 0, parLevel: 0, category: '', costPerUnit: 0, supplier: '', brand: '', barcode: '', allergens: [], customFields: [], tags: [], isDiscrete: false, needsReview: false, aiExtractionNotes: '', composition: undefined, usdaFdcId: undefined, bufferRef: '' });
    } catch (error) {
      handleFirestoreError(error, editingIngredient ? OperationType.UPDATE : OperationType.CREATE, 'ingredients');
    }
  };

  const handleDelete = (id: string) => {
    if (!auth.currentUser) {
      toast.error(t('auth:pleaseSignIn'));
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: t('ingredients:deleteTitle'),
      message: t('ingredients:deleteMessage'),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'ingredients', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `ingredients/${id}`);
        }
      }
    });
  };

  const openEditModal = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setSupplierInput(ingredient.supplier || '');
    setCategoryInput(ingredient.category || '');
    setFormData({
      name: ingredient.name || '',
      unit: ingredient.unit || '',
      stock: ingredient.stock || 0,
      lowStockThreshold: ingredient.lowStockThreshold || 0,
      parLevel: ingredient.parLevel || 0,
      defaultPackSize: ingredient.defaultPackSize || 0,
      category: ingredient.category || '',
      costPerUnit: ingredient.costPerUnit || 0,
      supplier: ingredient.supplier || '',
      supplierId: ingredient.supplierId || '',
      moq: ingredient.moq || 0,
      orderUnit: ingredient.orderUnit || '',
      brand: ingredient.brand || '',
      barcode: ingredient.barcode || '',
      allergens: ingredient.allergens || [],
      customFields: ingredient.customFields || [],
      tags: ingredient.tags || [],
      isDiscrete: ingredient.isDiscrete || false,
      needsReview: ingredient.needsReview || false,
      aiExtractionNotes: ingredient.aiExtractionNotes || '',
      composition: ingredient.composition,
      usdaFdcId: ingredient.usdaFdcId,
      bufferRef: ingredient.bufferRef || ''
    });
    setIsModalOpen(true);
  };

  const allCategories = Array.from(new Set([
    ...INGREDIENT_CATEGORIES,
    ...ingredients.map(i => i.category).filter(Boolean)
  ])).sort();

  const filteredIngredients = ingredients.filter(ing => {
    const matchesCategory = categoryFilter ? ing.category === categoryFilter : true;
    const matchesSearch = searchQuery 
      ? (ing.name.toLowerCase().includes(searchQuery.toLowerCase()) || isFuzzyMatch(searchQuery, ing.name))
      : true;
    return matchesCategory && matchesSearch;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredIngredients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIngredients.map(i => i.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBatchAddToShoppingList = async () => {
    try {
      const batch = new SafeBatch(db);
      for (const id of selectedIds) {
        const ingredient = getIngredient(id);
        if (ingredient) {
          const qty = Math.max(0, ingredient.lowStockThreshold - ingredient.stock) || 1;
          await addManualShoppingListItem(ingredient, qty, { batch, skipDedupCheck: false });
        }
      }
      await batch.commit();
      setSelectedIds(new Set());
      toast.success(t('prep:addedToShoppingList'));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'shopping_list');
    }
  };

  const handleBatchUpdateSupplier = async () => {
    try {
      const batch = new SafeBatch(db);
      selectedIds.forEach(id => {
        batch.update(doc(db, 'ingredients', id), { supplier: batchSupplierInput });
      });
      await batch.commit();
      setIsBatchSupplierModalOpen(false);
      setBatchSupplierInput('');
      setSelectedIds(new Set());
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'ingredients');
    }
  };

  const handleBatchUpdateCategory = async () => {
    try {
      const batch = new SafeBatch(db);
      selectedIds.forEach(id => {
        batch.update(doc(db, 'ingredients', id), { category: batchCategoryInput });
      });
      await batch.commit();
      setIsBatchCategoryModalOpen(false);
      setBatchCategoryInput('');
      setSelectedIds(new Set());
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'ingredients');
    }
  };

  const handleBatchDelete = () => {
    setConfirmModal({
      isOpen: true,
      title: t('ingredients:deleteIngredientsTitle'),
      message: t('ingredients:deleteIngredientsMessage', { count: selectedIds.size }),
      onConfirm: async () => {
        try {
          const batch = new SafeBatch(db);
          selectedIds.forEach(id => {
            batch.delete(doc(db, 'ingredients', id));
          });
          await batch.commit();
          setSelectedIds(new Set());
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'ingredients');
        }
      }
    });
  };

  const handleCsvImport = async (importedIngredients: Partial<Ingredient>[]) => {
    try {
      const batch = new SafeBatch(db);
      importedIngredients.forEach(ing => {
        const newDocRef = doc(collection(db, 'ingredients'));
        batch.set(newDocRef, {
          ...ing,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'ingredients');
    }
  };

  if (loading) return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-stone-200 rounded w-3/4"></div><div className="space-y-2"><div className="h-4 bg-stone-200 rounded"></div><div className="h-4 bg-stone-200 rounded w-5/6"></div></div></div></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-stone-900">{t('ingredients:title')}</h2>
          <p className="text-stone-500 mt-1">{t('ingredients:subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
            <button onClick={() => setIsCsvImportOpen(true)} className="p-2 text-stone-600 hover:text-amber-700 hover:bg-white rounded-lg transition-all shadow-sm" title={t('ingredients:importCsv')}>
              <PackagePlus className="w-5 h-5" />
            </button>
            <button onClick={() => setIsBarcodeOpen(true)} className="p-2 text-stone-600 hover:text-amber-700 hover:bg-white rounded-lg transition-all shadow-sm" title={t('ingredients:scanBarcode')}>
              <Barcode className="w-5 h-5" />
            </button>
            <button onClick={() => setIsReceiptOpen(true)} className="p-2 text-stone-600 hover:text-amber-700 hover:bg-white rounded-lg transition-all shadow-sm" title={t('ingredients:scanReceipt')}>
              <Receipt className="w-5 h-5" />
            </button>
            <button onClick={() => setIsAuditOpen(true)} className="p-2 text-stone-600 hover:text-amber-700 hover:bg-white rounded-lg transition-all shadow-sm" title={t('ingredients:visualAudit')}>
              <Camera className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={() => {
              setEditingIngredient(null);
              setSupplierInput('');
              setCategoryInput('');
              setFormData({ name: '', unit: 'g', stock: 0, lowStockThreshold: 0, category: '', costPerUnit: 0, supplier: '', brand: '', barcode: '', customFields: [], tags: [], isDiscrete: false, needsReview: false, aiExtractionNotes: '' });
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            {t('ingredients:addIngredient')}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl shadow-sm border border-stone-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="text"
            placeholder={t('ingredients:searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="relative sm:w-64">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none bg-transparent"
          >
            <option value="">{t('common:allCategories')}</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <button
            onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
            className="px-4 py-2 border border-stone-300 rounded-xl text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-2"
          >
            {t('ingredients:columns')}
          </button>
          {isColumnDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-stone-200 z-10 py-2">
              {Object.entries(visibleColumns).map(([key, isVisible]) => (
                <label key={key} className="flex items-center px-4 py-2 hover:bg-stone-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => setVisibleColumns(prev => ({ ...prev, [key]: !prev[key as keyof typeof visibleColumns] }))}
                    className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 mr-3"
                  />
                  <span className="text-sm text-stone-700 capitalize">{t(`ingredients:${key}` as any)}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <button onClick={toggleSelectAll} className="text-stone-400 hover:text-stone-600">
                  {selectedIds.size === filteredIngredients.length && filteredIngredients.length > 0 ? (
                    <CheckSquare className="w-5 h-5 text-amber-600" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('common:name')}</th>
              {visibleColumns.brand && <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('ingredients:brand')}</th>}
              {visibleColumns.category && <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('ingredients:category')}</th>}
              {visibleColumns.supplier && <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('ingredients:supplier')}</th>}
              {visibleColumns.costPerUnit && <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('ingredients:costPerUnit')}</th>}
              {visibleColumns.stock && <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('ingredients:stock')}</th>}
              {visibleColumns.threshold && <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('ingredients:threshold')}</th>}
              <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('common:actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-stone-200">
            {filteredIngredients.map((ingredient) => (
              <tr key={ingredient.id} className={`hover:bg-stone-50 ${selectedIds.has(ingredient.id) ? 'bg-amber-50/50' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button onClick={() => toggleSelect(ingredient.id)} className="text-stone-400 hover:text-stone-600">
                    {selectedIds.has(ingredient.id) ? (
                      <CheckSquare className="w-5 h-5 text-amber-600" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-stone-900 flex items-center">
                    <Link to={`/ingredients/${ingredient.id}`} className="hover:text-amber-700 hover:underline">
                      <LocalizedField field={ingredient.nameI18n} legacyText={ingredient.name} />
                    </Link>
                    {(ingredient.needsReview || (!ingredient.costPerUnit) || (ingredient.category === 'Uncategorized' && !ingredient.supplierId)) && (
                      <span className="inline-block w-2 h-2 bg-amber-400 rounded-full ml-2" title={t('ingredients:incompleteData')} />
                    )}
                  </div>
                  {ingredient.barcode && <div className="text-xs text-stone-400 font-mono mt-0.5">{ingredient.barcode}</div>}
                </td>
                {visibleColumns.brand && <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">{(ingredient.brandI18n || ingredient.brand) ? <LocalizedField field={ingredient.brandI18n} legacyText={ingredient.brand} /> : '-'}</td>}
                {visibleColumns.category && <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">{ingredient.category ? (i18n.exists(`enums:categories.${ingredient.category}`) ? t(`enums:categories.${ingredient.category}` as any) : <LocalizedField legacyText={ingredient.category} />) : '-'}</td>}
                {visibleColumns.supplier && <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">{ingredient.supplier ? <LocalizedField legacyText={ingredient.supplier} /> : '-'}</td>}
                {visibleColumns.costPerUnit && <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">{ingredient.costPerUnit ? `$${ingredient.costPerUnit.toFixed(2)}` : '-'}</td>}
                  {visibleColumns.stock && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-col">
                      <span className={`font-medium ${ingredient.stock <= ingredient.lowStockThreshold ? 'text-red-600' : 'text-stone-900'}`}>
                        {ingredient.stock} {t(`enums:units.${ingredient.unit}` as any, ingredient.unit)}
                      </span>
                    </div>
                  </td>
                )}
                {visibleColumns.threshold && <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">{ingredient.lowStockThreshold} {t(`enums:units.${ingredient.unit}` as any, ingredient.unit)}</td>}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => {
                      setReceiveIngredient(ingredient);
                      setIsReceiveModalOpen(true);
                    }} 
                    className="text-emerald-600 hover:text-emerald-900 mr-3"
                    title={t('inventory:receive.receiveGoods')}
                  >
                    <PackagePlus className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      setAdjustIngredient(ingredient);
                      setIsAdjustModalOpen(true);
                    }} 
                    className="text-amber-600 hover:text-amber-900 mr-3"
                    title={t('inventory:adjust.adjustBtn')}
                  >
                    <ArrowDownRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEditModal(ingredient)} className="text-stone-400 hover:text-stone-600 mr-3" title={t('ingredients:editMetadata')}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(ingredient.id)} className="text-red-400 hover:text-red-600" title={t('common:delete')}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredIngredients.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-stone-500">
                  {ingredients.length === 0 ? t('ingredients:noIngredients') : t('ingredients:noMatch')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-stone-900">
                {editingIngredient ? t('ingredients:editIngredient') : t('ingredients:addIngredient')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {editingIngredient && (
              <div className="px-6 py-3 border-b border-stone-200 bg-stone-50">
                <p className="text-sm text-stone-500">{t('ingredients:editingMetadataFor')} <span className="font-medium text-stone-900">{editingIngredient.name}</span></p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="block space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('common:name')}</label>
                    <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder={t('ingredients:namePlaceholder')}
                  />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('ingredients:brand')}</label>
                    <input
                      type="text"
                      value={formData.brand || ''}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder={t('ingredients:brandPlaceholder')}
                    />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('ingredients:barcode')}</label>
                  <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.barcode || ''}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm"
                        placeholder={t('ingredients:barcodePlaceholder')}
                      />
                    <button
                      type="button"
                      onClick={() => setIsBarcodeOpen(true)}
                      className="p-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors"
                      title={t('ingredients:scanBarcode')}
                    >
                      <Barcode className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('ingredients:category')}</label>
                  <Combobox
                    value={categoryInput}
                    onChange={(val) => {
                      setCategoryInput(val);
                      let newUnit = formData.unit;
                      if (!newUnit || newUnit === 'g') {
                        const lowerCat = val.toLowerCase();
                        if (lowerCat.includes('beverage') || lowerCat.includes('liquid') || lowerCat.includes('oil') || lowerCat.includes('extract')) {
                          newUnit = 'ml';
                        } else if (lowerCat.includes('packaging') || lowerCat.includes('consumable')) {
                          newUnit = 'pcs';
                        } else {
                          newUnit = 'g';
                        }
                      }
                      setFormData(prev => ({ ...prev, unit: newUnit }));
                    }}
                    items={allCategories.map(c => ({ id: c, name: c }))}
                    placeholder={t('common:typeToSearchOrCreate')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('ingredients:supplier')}</label>
                  <Combobox
                    value={supplierInput}
                    onChange={(val, item) => {
                      setSupplierInput(val);
                      if (item) {
                        setFormData({ ...formData, supplierId: item.id, supplier: item.name });
                      }
                    }}
                    items={suppliers.map(s => ({ id: s.id, name: s.name }))}
                    placeholder={t('common:typeToSearchOrCreate')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('ingredients:moq')}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.moq === 0 ? '' : formData.moq}
                      onChange={(e) => setFormData({ ...formData, moq: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder={t('ingredients:moqPlaceholder')}
                    />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('ingredients:orderUnit')}</label>
                    <input
                      type="text"
                      value={formData.orderUnit || ''}
                      onChange={(e) => setFormData({ ...formData, orderUnit: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder={t('ingredients:orderUnitPlaceholder')}
                    />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('ingredients:lowStockThreshold')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.lowStockThreshold === 0 ? '' : formData.lowStockThreshold}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('ingredients:parLevel')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.parLevel === 0 ? '' : formData.parLevel}
                    onChange={(e) => setFormData({ ...formData, parLevel: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder={t('ingredients:placeholderParLevel')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('ingredients:defaultPackSize', 'Pack size (per case)')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.defaultPackSize === 0 ? '' : formData.defaultPackSize}
                    onChange={(e) => setFormData({ ...formData, defaultPackSize: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder={t('ingredients:placeholderDefaultPackSize', 'e.g. 24')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('ingredients:currentStockReadOnly')}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      disabled
                      value={formData.stock}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-stone-50 text-stone-500 cursor-not-allowed"
                    />
                    <span className="text-stone-500 text-sm whitespace-nowrap">{formData.unit || t('ingredients:units')}</span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">{t('ingredients:receiveGoodsHelp')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('ingredients:unit')}</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder={t('ingredients:placeholderUnit')}
                  />
                </div>
                <div className="flex items-center h-full pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.isDiscrete}
                      onChange={(e) => setFormData({ ...formData, isDiscrete: e.target.checked })}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm text-stone-700">{t('batch:discreteItem')}</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('ingredients:costPerUnit')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.costPerUnit === 0 ? '' : formData.costPerUnit}
                    onChange={(e) => setFormData({ ...formData, costPerUnit: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder={t('ingredients:placeholderCost')}
                  />
                </div>
              </div>

              {editingIngredient && editingIngredient.priceHistory && editingIngredient.priceHistory.length > 0 && (
                <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
                  <h4 className="text-xs font-semibold text-stone-700 mb-2 uppercase tracking-wider">{t('ingredients:priceHistory')}</h4>
                  <div className="space-y-2">
                    {editingIngredient.priceHistory.slice(-3).reverse().map((entry, idx) => {
                      const date = formatFirestoreDate(entry.date, language as any, t('ingredients:unknownDate'));
                      return (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="text-stone-500">{date} {entry.supplier ? `(${entry.supplier})` : ''}</span>
                          <span className="font-medium text-stone-900">${entry.costPerUnit.toFixed(2)} / {editingIngredient.unit}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('ingredients:tagsPlaceholder')}</label>
                  <input
                    type="text"
                    value={(formData.tags || []).join(', ')}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder={t('ingredients:placeholderTags')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('ingredients:allergensPlaceholder')}</label>
                  <input
                    type="text"
                    value={(formData.allergens || []).join(', ')}
                    onChange={(e) => setFormData({ ...formData, allergens: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder={t('ingredients:placeholderAllergens')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('ingredients:bufferRef.label', 'Buffer Reference')}</label>
                  <Combobox
                    value={formData.bufferRef || ''}
                    onChange={(val) => setFormData({ ...formData, bufferRef: val })}
                    items={ingredients.filter(i => i.id !== editingIngredient?.id).map(i => ({ id: i.id, name: i.name }))}
                    placeholder={t('ingredients:bufferRef.placeholder', 'Select an ingredient')}
                  />
                  <p className="text-xs text-stone-500 mt-1">{t('ingredients:bufferRef.help', 'Link an acid ingredient for buffering')}</p>
                </div>
              </div>

              {formData.needsReview && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-800">{t('ingredients:aiNeedsReview')}</h4>
                    <p className="text-xs text-amber-700 mt-1">{formData.aiExtractionNotes || t('ingredients:aiReviewHelp')}</p>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, needsReview: false, aiExtractionNotes: '' })}
                      className="mt-2 text-xs font-medium text-amber-800 hover:text-amber-900 underline"
                    >
                      {t('ingredients:markAsReviewed')}
                    </button>
                  </div>
                </div>
              )}

              {/* Custom Fields Section */}
              <div className="pt-4 border-t border-stone-200">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold text-stone-900">{t('ingredients:additionalDetails')}</h4>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, customFields: [...(formData.customFields || []), { name: t('ingredients:fieldName'), value: '' }] })}
                    className="text-xs text-amber-700 font-medium hover:text-amber-800 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> {t('ingredients:addField')}
                  </button>
                </div>
                <div className="space-y-3">
                  {(formData.customFields || []).map((field, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="w-1/3">
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => {
                            const newFields = [...(formData.customFields || [])];
                            newFields[idx].name = e.target.value;
                            setFormData({ ...formData, customFields: newFields });
                          }}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm font-medium"
                          placeholder={t('ingredients:fieldName')}
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={field.value}
                          onChange={(e) => {
                            const newFields = [...(formData.customFields || [])];
                            newFields[idx].value = e.target.value;
                            setFormData({ ...formData, customFields: newFields });
                          }}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                          placeholder={t('ingredients:fieldValue')}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newFields = [...(formData.customFields || [])];
                          newFields.splice(idx, 1);
                          setFormData({ ...formData, customFields: newFields });
                        }}
                        className="p-2 text-stone-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Composition Editor */}
              <div className="pt-4 border-t border-stone-200">
                <CompositionEditor
                  ingredientName={formData.name}
                  composition={formData.composition}
                  category={categoryInput}
                  onChange={(composition) => setFormData(prev => ({ ...prev, composition }))}
                  onUsdaMatch={(fdcId) => setFormData(prev => ({ ...prev, usdaFdcId: fdcId }))}
                />
              </div>
              
              </div>

              <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-stone-600 font-medium hover:bg-stone-100 rounded-xl transition-colors"
                >
                  {t('common:cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded-xl transition-colors"
                >
                  {t('common:save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-40 animate-in slide-in-from-bottom-10">
          <span className="font-medium text-sm bg-stone-800 px-3 py-1 rounded-full">{t('ingredients:selected', { count: selectedIds.size })}</span>
          <div className="h-4 w-px bg-stone-700"></div>
          <button onClick={handleBatchAddToShoppingList} className="text-sm font-medium hover:text-amber-400 transition-colors">{t('ingredients:addToShoppingList')}</button>
          <button onClick={() => setIsBatchSupplierModalOpen(true)} className="text-sm font-medium hover:text-amber-400 transition-colors">{t('ingredients:updateSupplier')}</button>
          <button onClick={() => setIsBatchCategoryModalOpen(true)} className="text-sm font-medium hover:text-amber-400 transition-colors">{t('ingredients:updateCategory')}</button>
          <button onClick={handleBatchDelete} className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors">{t('common:delete')}</button>
        </div>
      )}

      {isBatchSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden p-6">
            <h3 className="text-lg font-semibold text-stone-900 mb-4">{t('ingredients:updateSupplier')}</h3>
            <Combobox
              value={batchSupplierInput}
              onChange={(val) => setBatchSupplierInput(val)}
              items={suppliers.map(s => ({ id: s.id, name: s.name }))}
              placeholder={t('ingredients:placeholderSupplierName')}
              className="mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsBatchSupplierModalOpen(false)} className="px-4 py-2 text-stone-600 font-medium hover:bg-stone-100 rounded-xl transition-colors">{t('common:cancel')}</button>
              <button onClick={handleBatchUpdateSupplier} className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded-xl transition-colors">{t('common:update')}</button>
            </div>
          </div>
        </div>
      )}

      {isBatchCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden p-6">
            <h3 className="text-lg font-semibold text-stone-900 mb-4">{t('ingredients:updateCategory')}</h3>
            <Combobox
              value={batchCategoryInput}
              onChange={(val) => setBatchCategoryInput(val)}
              items={allCategories.map(c => ({ id: c, name: c }))}
              placeholder={t('ingredients:placeholderSelectCategory')}
              className="mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsBatchCategoryModalOpen(false)} className="px-4 py-2 text-stone-600 font-medium hover:bg-stone-100 rounded-xl transition-colors">{t('common:cancel')}</button>
              <button onClick={handleBatchUpdateCategory} className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded-xl transition-colors">{t('common:update')}</button>
            </div>
          </div>
        </div>
      )}

      <BarcodeScannerModal 
        isOpen={isBarcodeOpen} 
        onClose={() => setIsBarcodeOpen(false)} 
        ingredients={ingredients} 
        onBarcodeScanned={(code) => {
          if (isModalOpen) {
            setFormData(prev => ({ ...prev, barcode: code }));
          }
        }}
      />
      <ReceiptImportModal isOpen={isReceiptOpen} onClose={() => setIsReceiptOpen(false)} ingredients={ingredients} />
      <VisualAuditModal isOpen={isAuditOpen} onClose={() => setIsAuditOpen(false)} ingredients={ingredients} />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isAlert={confirmModal.isAlert}
        isDestructive={confirmModal.isDestructive}
      />
      <ReceiveGoodsModal
        isOpen={isReceiveModalOpen}
        onClose={() => {
          setIsReceiveModalOpen(false);
          setReceiveIngredient(null);
        }}
        ingredient={receiveIngredient}
        locations={locations}
        suppliers={suppliers}
      />
      <AdjustStockModal
        isOpen={isAdjustModalOpen}
        onClose={() => {
          setIsAdjustModalOpen(false);
          setAdjustIngredient(null);
        }}
        ingredient={adjustIngredient}
        lots={lots}
      />
      <CsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        onImport={handleCsvImport}
      />
    </div>
  );
}
