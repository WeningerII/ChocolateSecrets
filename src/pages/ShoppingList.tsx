import React, { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, query, deleteDoc, doc, updateDoc, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, reportFirestoreError, OperationType, auth } from '../firebase';
import { ShoppingListItem, Ingredient } from '../types';
import { Trash2, CheckCircle2, Circle, Printer, AlertCircle, Building2, FileText, Plus, X } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import PurchaseOrderModal from '../components/PurchaseOrderModal';
import ConfirmModal from '../components/ConfirmModal';
import { useTranslation } from 'react-i18next';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { addManualShoppingListItem } from '../utils/shoppingList';

export default function ShoppingList() {
  const { t } = useTranslation(['shoppingList', 'common', 'auth', 'recipes']);
  const { toast } = useToast();
  const { suppliers, ingredients, loading: dataLoading } = useData();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);
  const [poModalSupplier, setPoModalSupplier] = useState<any | undefined>(undefined);
  const [poModalItems, setPoModalItems] = useState<ShoppingListItem[]>([]);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    ingredientId: '',
    name: '',
    quantity: 1,
    unit: 'g',
    supplierId: ''
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

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: t('shoppingList:title'),
  });

  useEffect(() => {
    const unsubscribeItems = onSnapshot(
      query(collection(db, 'shopping_list'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShoppingListItem)));
        setLoading(false);
      },
      (error) => { reportFirestoreError(error, OperationType.LIST, 'shopping_list'); setLoading(false); }
    );

    return () => {
      unsubscribeItems();
    };
  }, []);

  const toggleStatus = async (item: ShoppingListItem) => {
    if (!item.id) return;
    if (!auth.currentUser) {
      toast.error(t('auth:pleaseSignIn'));
      return;
    }
    try {
      await updateDoc(doc(db, 'shopping_list', item.id), {
        status: item.status === 'pending' ? 'purchased' : 'pending'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `shopping_list/${item.id}`);
    }
  };

  const handleDelete = (id: string) => {
    if (!auth.currentUser) {
      toast.error(t('auth:pleaseSignIn'));
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: t('shoppingList:removeItem'),
      message: t('shoppingList:removeMessage'),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'shopping_list', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `shopping_list/${id}`);
        }
      }
    });
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      if (newItem.ingredientId) {
        const ing = ingredients.find(i => i.id === newItem.ingredientId);
        if (ing) {
          await addManualShoppingListItem(ing, newItem.quantity, { skipDedupCheck: true });
        }
      } else if (newItem.name) {
        // Fallback for custom named items that don't match an ingredient
        await addManualShoppingListItem(
          {
            id: '',
            name: newItem.name,
            unit: newItem.unit || 'units',
            stock: 0,
            lowStockThreshold: 0
          } as Ingredient,
          newItem.quantity || 1,
          { skipDedupCheck: true }
        );
      }

      setIsAddModalOpen(false);
      setNewItem({ ingredientId: '', name: '', quantity: 1, unit: 'g', supplierId: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'shopping_list');
    }
  };

  if (loading) return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-stone-200 rounded w-3/4"></div><div className="space-y-2"><div className="h-4 bg-stone-200 rounded"></div><div className="h-4 bg-stone-200 rounded w-5/6"></div></div></div></div>;

  const pendingItems = items.filter(i => i.status === 'pending');
  const purchasedItems = items.filter(i => i.status === 'purchased');

  // Group pending items by supplier
  const groupedPendingItems = pendingItems.reduce((acc, item) => {
    const supplierId = item.supplierId || 'unassigned';
    if (!acc[supplierId]) {
      acc[supplierId] = [];
    }
    acc[supplierId].push(item);
    return acc;
  }, {} as Record<string, ShoppingListItem[]>);

  const getSupplier = (id: string) => suppliers.find(s => s.id === id);

  const calculateOrderTotal = (items: ShoppingListItem[]) => {
    return items.reduce((total, item) => {
      // If we have MOQ, we need to order in multiples of MOQ
      let orderQty = item.quantity;
      if (item.moq && item.moq > 0) {
        orderQty = Math.ceil(item.quantity / item.moq) * item.moq;
      }
      return total + (orderQty * (item.costPerUnit || 0));
    }, 0);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-stone-900">{t('shoppingList:title')}</h2>
          <p className="text-stone-500 mt-1">{t('shoppingList:subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            {t('shoppingList:addItem')}
          </button>
          <button
            onClick={() => handlePrint()}
            className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
          >
            <Printer className="w-5 h-5" />
            {t('shoppingList:printList')}
          </button>
        </div>
      </div>

      <div ref={printRef} className="print:p-8 space-y-8">
        <div className="hidden print:block mb-8">
          <h1 className="text-3xl font-bold text-stone-900">{t('shoppingList:title')}</h1>
          <p className="text-stone-500">{new Date().toLocaleDateString()}</p>
        </div>

        {Object.entries(groupedPendingItems).map(([supplierId, groupItems]) => {
          const supplier = getSupplier(supplierId);
          const orderTotal = calculateOrderTotal(groupItems);
          const isBelowMinOrder = supplier?.minimumOrderValue && orderTotal < supplier.minimumOrderValue;

          return (
            <div key={supplierId} className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden print:shadow-none print:border-none">
              <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 print:bg-transparent print:border-b-2 print:border-stone-900 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {supplier ? (
                    <>
                      <div className="p-2 bg-amber-100 text-amber-800 rounded-lg print:hidden">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-lg text-stone-900">{supplier.name}</h3>
                    </>
                  ) : (
                    <h3 className="font-semibold text-stone-900">{t('shoppingList:unassigned')}</h3>
                  )}
                </div>
                
                {supplier && (
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-stone-900">{t('shoppingList:estTotal')} ${orderTotal.toFixed(2)}</div>
                      {isBelowMinOrder && (
                        <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                          <AlertCircle className="w-3 h-3" />
                          {t('shoppingList:minOrderAlert')} ${supplier.minimumOrderValue?.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setPoModalSupplier(supplier);
                        setPoModalItems(groupItems);
                        setIsPoModalOpen(true);
                      }}
                      className="print:hidden flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      {t('shoppingList:generatePO')}
                    </button>
                  </div>
                )}
              </div>
              <ul className="divide-y divide-stone-200 print:divide-stone-300">
                {groupItems.map(item => {
                  let orderQty = item.quantity;
                  let displayUnit = item.unit;
                  let isMoqAdjusted = false;

                  if (item.moq && item.moq > 0) {
                    orderQty = Math.ceil(item.quantity / item.moq) * item.moq;
                    if (orderQty > item.quantity) isMoqAdjusted = true;
                  }
                  
                  if (item.orderUnit) {
                    displayUnit = item.orderUnit;
                  }

                  return (
                    <li key={item.id} className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors print:py-2 print:px-0">
                      <div className="flex items-center gap-4">
                        <button onClick={() => toggleStatus(item)} className="text-stone-400 hover:text-amber-600 transition-colors print:hidden">
                          <Circle className="w-6 h-6" />
                        </button>
                        <div className="hidden print:block w-4 h-4 border-2 border-stone-400 rounded-sm"></div>
                        <div>
                          <p className="font-medium text-stone-900">{item.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-stone-900 font-medium">{orderQty} {t(`enums:units.${displayUnit}` as any, displayUnit)}</p>
                            {isMoqAdjusted && (
                              <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                {t('shoppingList:moqAdjusted', { qty: item.quantity, unit: t(`enums:units.${item.unit}` as any, item.unit) })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {item.costPerUnit && (
                          <div className="text-sm text-stone-500 text-right print:hidden">
                            ${(orderQty * item.costPerUnit).toFixed(2)}
                          </div>
                        )}
                        <button onClick={() => item.id && handleDelete(item.id)} className="p-2 text-stone-400 hover:text-red-600 transition-colors print:hidden">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        {pendingItems.length === 0 && (
          <div className="p-8 text-center text-stone-500 bg-white rounded-2xl border border-stone-200 border-dashed print:p-4 print:text-left print:border-none">
            {t('shoppingList:noPending')}
          </div>
        )}

        {purchasedItems.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden opacity-75 mt-8 print:hidden">
            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50">
              <h3 className="font-semibold text-stone-900">{t('shoppingList:purchased', { count: purchasedItems.length })}</h3>
            </div>
            <ul className="divide-y divide-stone-200">
              {purchasedItems.map(item => (
                <li key={item.id} className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <button onClick={() => toggleStatus(item)} className="text-green-600 hover:text-stone-400 transition-colors">
                      <CheckCircle2 className="w-6 h-6" />
                    </button>
                    <div>
                      <p className="font-medium text-stone-500 line-through">{item.name}</p>
                      <p className="text-sm text-stone-400 line-through">{item.quantity} {t(`enums:units.${item.unit}` as any, item.unit)}</p>
                    </div>
                  </div>
                  <button onClick={() => item.id && handleDelete(item.id)} className="p-2 text-stone-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <PurchaseOrderModal
        isOpen={isPoModalOpen}
        onClose={() => setIsPoModalOpen(false)}
        supplier={poModalSupplier}
        items={poModalItems}
      />

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-stone-900">{t('shoppingList:addItem')}</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddItem} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('shoppingList:selectIngredient')}</label>
                <select
                  value={newItem.ingredientId}
                  onChange={(e) => {
                    const ing = ingredients.find(i => i.id === e.target.value);
                    setNewItem({
                      ...newItem,
                      ingredientId: e.target.value,
                      name: ing ? ing.name : '',
                      unit: ing ? ing.unit : newItem.unit,
                      supplierId: ing ? ing.supplierId || '' : newItem.supplierId
                    });
                  }}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="">{t('shoppingList:manualEntry')}</option>
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>{ing.name}</option>
                  ))}
                </select>
              </div>

              {!newItem.ingredientId && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('shoppingList:itemName')}</label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('shoppingList:quantity')}</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('shoppingList:unit')}</label>
                  <input
                    type="text"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    disabled={!!newItem.ingredientId}
                  />
                </div>
              </div>

              {!newItem.ingredientId && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('shoppingList:supplier')}</label>
                  <select
                    value={newItem.supplierId}
                    onChange={(e) => setNewItem({ ...newItem, supplierId: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="">{t('shoppingList:unassigned')}</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-stone-600 font-medium hover:bg-stone-100 rounded-xl transition-colors"
                >
                  {t('common:cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded-xl transition-colors"
                >
                  {t('shoppingList:addToList')}
                </button>
              </div>
            </form>
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
