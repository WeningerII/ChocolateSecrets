import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, PackagePlus, ArrowDownRight, MapPin, Calendar, DollarSign, ArrowRightLeft, Package, Archive, AlertCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';
import { useData } from '../contexts/DataContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatFirestoreDate } from '../utils/date';
import ReceiveGoodsModal from '../components/ReceiveGoodsModal';
import AdjustStockModal from '../components/AdjustStockModal';
import TransferStockModal from '../components/TransferStockModal';
import { SafeBatch, withTimestamps } from '../utils/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import Combobox from '../components/Combobox';
import { INGREDIENT_CATEGORIES } from '../constants';
import { useToast } from '../contexts/ToastContext';
import { addManualShoppingListItem } from '../utils/shoppingList';
import SourcingPanel from '../components/SourcingPanel';
import { attachIngredientLocalizedFields, stripUndefined } from '../utils/localized';
import { deriveIngredientDietaryFlags } from '../utils/dietary';
import { SupportedLanguage, Ingredient } from '../types';
import { resolveComposition, compositionSum, isCompositionComplete } from '../services/foodScience/universal';

export default function IngredientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['ingredients', 'common', 'inventory', 'auth']);
  const language = useLanguage();
  const { ingredients, lots, locations, suppliers, loading, getLocation, getLotsForIngredient } = useData();
  const { toast } = useToast();

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferLot, setTransferLot] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const ingredient = ingredients.find(i => i.id === id);

  // Edit Modal State
  const [formData, setFormData] = useState({
    name: '', unit: '', category: '', supplier: '', supplierId: '',
    brand: '', barcode: '', allergens: [] as string[], tags: [] as string[],
    customFields: [] as { name: string, value: string }[], isDiscrete: false
  });
  const [categoryInput, setCategoryInput] = useState('');
  const [supplierInput, setSupplierInput] = useState('');

  if (loading) {
    return <div className="animate-pulse p-8"><div className="h-8 bg-stone-200 rounded w-1/4 mb-4"></div></div>;
  }

  if (!ingredient) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-stone-900 mb-4">{t('ingredients:notFound')}</h2>
        <Link to="/ingredients" className="text-amber-600 hover:text-amber-700 font-medium">
          {t('ingredients:backToList')}
        </Link>
      </div>
    );
  }

  const activeLots = getLotsForIngredient(ingredient.id).filter(l => l.quantity > 0);

  const openEditModal = () => {
    setFormData({
      name: ingredient.name || '',
      unit: ingredient.unit || '',
      category: ingredient.category || '',
      supplier: ingredient.supplier || '',
      supplierId: ingredient.supplierId || '',
      brand: ingredient.brand || '',
      barcode: ingredient.barcode || '',
      allergens: ingredient.allergens || [],
      tags: ingredient.tags || [],
      customFields: ingredient.customFields || [],
      isDiscrete: ingredient.isDiscrete || false
    });
    setCategoryInput(ingredient.category || '');
    setSupplierInput(ingredient.supplier || '');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const batch = new SafeBatch(db);
      let finalSupplierId = formData.supplierId;
      let finalSupplierName = formData.supplier;

      if (supplierInput.trim()) {
        const existingSupplier = suppliers.find(s => s.name.toLowerCase() === supplierInput.trim().toLowerCase());
        if (existingSupplier) {
          finalSupplierId = existingSupplier.id;
          finalSupplierName = existingSupplier.name;
        } else {
          const newSupplierRef = doc(collection(db, 'suppliers'));
          finalSupplierId = newSupplierRef.id;
          finalSupplierName = supplierInput.trim();
          batch.set(newSupplierRef, { name: finalSupplierName, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        }
      } else {
        finalSupplierId = '';
        finalSupplierName = '';
      }

      const finalCategory = categoryInput.trim() || 'Uncategorized';

      const data: Record<string, any> = {
        ...formData,
        name: formData.name.trim() || 'Untitled Ingredient',
        category: finalCategory,
        supplier: finalSupplierName,
        supplierId: finalSupplierId,
        updatedAt: serverTimestamp()
      };

      data.dietary = deriveIngredientDietaryFlags(ingredient.composition);

      const uiLanguage = (i18n.language.split('-')[0] as SupportedLanguage);
      const updatedIngredient = attachIngredientLocalizedFields(
        data as unknown as Ingredient,
        ingredient,
        uiLanguage
      );

      batch.update(doc(db, 'ingredients', ingredient.id), withTimestamps(stripUndefined(updatedIngredient)));
      await batch.commit();
      setIsEditModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'ingredients');
    }
  };

  const handleAddToShoppingList = async () => {
    try {
      const qty = Math.max(0, ingredient.lowStockThreshold - ingredient.stock) || 1;
      await addManualShoppingListItem(ingredient, qty, { skipDedupCheck: false });
      toast.success(t('prep:addedToShoppingList'));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'shopping_list');
    }
  };

  const allCategories = Array.from(new Set([
    ...INGREDIENT_CATEGORIES,
    ...ingredients.map(i => i.category).filter(Boolean)
  ])).sort().map(name => ({ id: name, name }));

  const supplierItems = suppliers.map(s => ({ id: s.id, name: s.name }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Link to="/ingredients" className="p-2 text-stone-400 hover:text-stone-600 bg-white rounded-xl border border-stone-200 shadow-sm transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold text-stone-900 flex-1">{ingredient.name}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Header Card */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-semibold text-stone-900">{ingredient.name}</h3>
                {ingredient.category && (
                  <span className="px-2.5 py-1 bg-stone-100 text-stone-600 text-xs font-medium rounded-full">
                    {ingredient.category}
                  </span>
                )}
                {ingredient.isDiscrete && (
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                    {t('ingredients:discreteUnitBadge')}
                  </span>
                )}
              </div>
              <div className="text-sm text-stone-500 flex flex-wrap gap-x-4 gap-y-2">
                {ingredient.brand && <span>{t('ingredients:headerLabels.brand')} <span className="font-medium text-stone-700">{ingredient.brand}</span></span>}
                {ingredient.barcode && <span className="font-mono">{t('ingredients:headerLabels.upc')} {ingredient.barcode}</span>}
                {ingredient.supplier && <span>{t('ingredients:headerLabels.supplier')} <span className="font-medium text-stone-700">{ingredient.supplier}</span></span>}
              </div>
            </div>
            <button onClick={openEditModal} className="p-2 text-stone-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors">
              <Edit2 className="w-5 h-5" />
            </button>
          </div>
          
          {(ingredient.allergens?.length > 0 || ingredient.tags?.length > 0) && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-stone-100">
              {ingredient.allergens?.map(a => (
                <span key={a} className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-md font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {a}
                </span>
              ))}
              {ingredient.tags?.map(t => (
                <span key={t} className="px-2 py-1 bg-stone-100 text-stone-600 text-xs rounded-md">#{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Stock Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-1">{t('ingredients:currentStock')}</h3>
            <div className="flex items-baseline gap-2 mb-4">
              <span className={`text-4xl font-bold ${ingredient.stock <= ingredient.lowStockThreshold ? 'text-red-600' : 'text-stone-900'}`}>
                {ingredient.stock}
              </span>
              <span className="text-lg text-stone-500 font-medium">{t(`enums:units.${ingredient.unit}` as any, ingredient.unit)}</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>{t('ingredients:stockSummary.wac')}</span>
                <span className="font-medium">${(ingredient.weightedAverageCost || ingredient.costPerUnit || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>{t('ingredients:stockSummary.lastCost')}</span>
                <span className="font-medium">${(ingredient.costPerUnit || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>{t('ingredients:stockSummary.threshold')}</span>
                <span className="font-medium">{ingredient.lowStockThreshold} {t(`enums:units.${ingredient.unit}` as any, ingredient.unit)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>{t('ingredients:stockSummary.parLevel')}</span>
                <span className="font-medium">{ingredient.parLevel || 0} {t(`enums:units.${ingredient.unit}` as any, ingredient.unit)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={() => setIsReceiveModalOpen(true)} className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-2 rounded-xl font-medium transition-colors">
              <PackagePlus className="w-4 h-4" /> {t('ingredients:actions.receive')}
            </button>
            <button onClick={() => setIsAdjustModalOpen(true)} className="flex-1 flex items-center justify-center gap-2 bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-2 rounded-xl font-medium transition-colors">
              <ArrowDownRight className="w-4 h-4" /> {t('ingredients:actions.adjust')}
            </button>
          </div>
        </div>
      </div>

      {/* Composition Section */}
      {ingredient && (() => {
        const { composition, source, matchedFdcId } = resolveComposition(ingredient);
        const sum = compositionSum(composition);
        const complete = isCompositionComplete(composition);
        
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-stone-900">{t('ingredients:composition.label')}</h3>
                <p className="text-sm text-stone-500">{t(`ingredients:composition.source.${source}` as any)} {matchedFdcId ? `(FDC ${matchedFdcId})` : ''}</p>
              </div>
              <span className={`text-xs font-mono font-medium ${complete ? 'text-stone-500' : 'text-amber-600'}`}>
                {complete
                  ? t('ingredients:composition.sumIndicator', { sum: sum.toFixed(1) })
                  : t('ingredients:composition.sumIndicatorIncomplete', { sum: sum.toFixed(1) })}
              </span>
            </div>
            
            <table className="w-full text-sm font-mono mt-2 table-auto text-stone-700">
              <tbody>
                {Object.entries(composition)
                  .filter(([, val]) => val !== undefined && val > 0)
                  .map(([species, val]) => (
                    <tr key={species} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                      <td className="py-2 capitalize">{t(`ingredients:composition.species.${species}` as any)}</td>
                      <td className="py-2 text-right">{val.toFixed(2)}%</td>
                    </tr>
                  ))}
                {Object.keys(composition).length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-4 text-center text-stone-400 font-sans italic">
                      {t('ingredients:noData', 'No composition data available.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Active Lots Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-stone-500" /> {t('ingredients:activeLots')}
          </h3>
          <span className="text-sm text-stone-500">{activeLots.length === 1 ? t('ingredients:activeLots_one', { count: 1 }) : t('ingredients:activeLots_other', { count: activeLots.length })}</span>
        </div>
        {activeLots.length === 0 ? (
          <div className="p-8 text-center text-stone-500">{t('ingredients:noActiveLots')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('ingredients:lotsTable.lotPo')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('ingredients:lotsTable.location')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('ingredients:lotsTable.quantity')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('ingredients:lotsTable.cost')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('ingredients:lotsTable.dates')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('ingredients:lotsTable.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-200">
                {activeLots.map(lot => {
                  const location = getLocation(lot.locationId);
                  const receivedDate = formatFirestoreDate(lot.receivedAt, language, t('common:dates.unknown'));
                  const expirationDate = formatFirestoreDate(lot.expiresAt, language, t('common:dates.none'));
                  const utilization = Math.min(100, Math.max(0, (lot.quantity / (lot.initialQuantity || lot.quantity)) * 100));

                  return (
                    <tr key={lot.id} className="hover:bg-stone-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-stone-900">{lot.poNumber || `Lot ${lot.id.substring(0, 6)}`}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" /> {location?.name || t('ingredients:lotsTable.unknownLocation')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-stone-900">{lot.quantity} {t(`enums:units.${ingredient.unit}` as any, ingredient.unit)}</div>
                        <div className="w-24 h-1.5 bg-stone-100 rounded-full mt-1.5 overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${utilization}%` }} />
                        </div>
                        <div className="text-[10px] text-stone-400 mt-1">{t('ingredients:lotsTable.initialCount', { count: lot.initialQuantity })}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                        ${(lot.costPerUnit || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                        <div>{t('ingredients:lotsTable.rcv')} {receivedDate}</div>
                        <div className="text-amber-600">{t('ingredients:lotsTable.exp')} {expirationDate}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => { setTransferLot(lot); setIsTransferModalOpen(true); }}
                          className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title={t('ingredients:lotsTable.transferTitle')}
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Price History Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          <h3 className="text-lg font-semibold text-stone-900 mb-6">{t('ingredients:priceHistory')}</h3>
          {(!ingredient.priceHistory || ingredient.priceHistory.length === 0) ? (
            <div className="text-center py-8 text-stone-500">{t('ingredients:noPriceHistory')}</div>
          ) : (
            <>
              <div className="h-64 w-full mb-6" style={{ minWidth: 1, minHeight: 1 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <LineChart data={ingredient.priceHistory.map(h => ({
                    date: formatFirestoreDate(h.date, language, ''),
                    price: h.costPerUnit,
                    supplier: h.supplier
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                    <XAxis dataKey="date" stroke="#a8a29e" fontSize={12} tickMargin={10} />
                    <YAxis stroke="#a8a29e" fontSize={12} tickFormatter={(val) => `$${val}`} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, t('ingredients:priceHistoryTable.costTooltip')]}
                    />
                    <Line type="stepAfter" dataKey="price" stroke="#d97706" strokeWidth={2} dot={{ r: 4, fill: '#d97706' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-stone-500 uppercase">{t('ingredients:priceHistoryTable.date')}</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-stone-500 uppercase">{t('ingredients:priceHistoryTable.supplier')}</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-stone-500 uppercase">{t('ingredients:priceHistoryTable.cost')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {[...ingredient.priceHistory].reverse().map((h, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-sm text-stone-900">{formatFirestoreDate(h.date, language, '')}</td>
                        <td className="px-4 py-2 text-sm text-stone-500">{h.supplier || '-'}</td>
                        <td className="px-4 py-2 text-sm text-stone-900 text-right">${h.costPerUnit.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Ordering Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          <h3 className="text-lg font-semibold text-stone-900 mb-6">{t('ingredients:orderingInfo.title')}</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-stone-500 uppercase tracking-wider">{t('ingredients:orderingInfo.primarySupplier')}</label>
              <div className="font-medium text-stone-900 mt-1">{ingredient.supplier || '-'}</div>
            </div>
            <div>
              <label className="text-xs text-stone-500 uppercase tracking-wider">{t('ingredients:moq')}</label>
              <div className="font-medium text-stone-900 mt-1">{ingredient.moq || 0} {t(`enums:units.${ingredient.unit}` as any, ingredient.unit)}</div>
            </div>
            <div>
              <label className="text-xs text-stone-500 uppercase tracking-wider">{t('ingredients:orderUnit')}</label>
              <div className="font-medium text-stone-900 mt-1">{t(`enums:units.${ingredient.orderUnit || ingredient.unit}` as any, ingredient.orderUnit || ingredient.unit)}</div>
            </div>
            <button
              onClick={handleAddToShoppingList}
              className="w-full mt-4 bg-stone-900 text-white hover:bg-stone-800 px-4 py-2.5 rounded-xl font-medium transition-colors"
            >
              {t('ingredients:addToShoppingList')}
            </button>
          </div>
        </div>
      </div>

      {ingredient && ingredient.name && (
        <section className="mt-8">
          <SourcingPanel ingredientId={ingredient.id} ingredientName={ingredient.name} />
        </section>
      )}

      <ReceiveGoodsModal isOpen={isReceiveModalOpen} onClose={() => setIsReceiveModalOpen(false)} ingredient={ingredient} locations={locations} suppliers={suppliers} />
      <AdjustStockModal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} ingredient={ingredient} lots={lots} />
      {transferLot && (
        <TransferStockModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} lot={transferLot} ingredient={ingredient} locations={locations} />
      )}

      {/* Edit Metadata Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-stone-900">{t('ingredients:editModal.title')}</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('common:name')}</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('ingredients:brand')}</label>
                  <input type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('ingredients:barcode')}</label>
                  <input type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-mono text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('ingredients:category')}</label>
                  <Combobox
                    value={categoryInput}
                    onChange={(val) => setCategoryInput(val)}
                    items={allCategories}
                    placeholder={t('ingredients:editModal.categoryPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('ingredients:supplier')}</label>
                  <Combobox
                    value={supplierInput}
                    onChange={(val) => setSupplierInput(val)}
                    items={supplierItems}
                    placeholder={t('ingredients:editModal.supplierPlaceholder')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('ingredients:unit')}</label>
                  <input type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500" required />
                </div>
                <div className="flex items-center mt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.isDiscrete} onChange={e => setFormData({...formData, isDiscrete: e.target.checked})} className="rounded border-stone-300 text-amber-600 focus:ring-amber-500" />
                    <span className="text-sm font-medium text-stone-700">{t('ingredients:editModal.discreteUnitCheckbox')}</span>
                  </label>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-stone-100">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl transition-colors font-medium">{t('common:cancel')}</button>
                <button type="submit" className="px-4 py-2 bg-amber-700 text-white hover:bg-amber-800 rounded-xl transition-colors font-medium">{t('ingredients:editModal.saveChanges')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
