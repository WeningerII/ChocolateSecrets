import React, { useState, useEffect } from 'react';
import { PurchaseOrder, Supplier, Location, Ingredient } from '../types';
import { X, PackagePlus, CheckCircle2 } from 'lucide-react';
import { collection, doc, writeBatch, serverTimestamp, getDocs, query, where, increment } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { formatFirestoreDate } from '../utils/date';
import { lotNumberForPurchaseReceive } from '../utils/identifiers';
import { appendPriceHistoryIfChanged } from '../utils/inventory';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';
import { useToast } from '../contexts/ToastContext';

interface ReceivePOModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrder | null;
  supplier: Supplier | undefined;
  locations: Location[];
  ingredients: Ingredient[];
}

export default function ReceivePOModal({ isOpen, onClose, po, supplier, locations, ingredients }: ReceivePOModalProps) {
  const { t, i18n } = useTranslation(['po', 'common']);
  const language = useLanguage();
  const { toast } = useToast();
  const [receiveData, setReceiveData] = useState<Record<string, { quantity: number, locationId: string, expirationDate: string }>>({});
  const [isReceiving, setIsReceiving] = useState(false);

  useEffect(() => {
    if (po) {
      const initialData: Record<string, { quantity: number, locationId: string, expirationDate: string }> = {};
      po.items.forEach((item, index) => {
        const remaining = item.quantityOrdered - (item.quantityReceived || 0);
        initialData[index] = {
          quantity: remaining > 0 ? remaining : 0,
          locationId: '',
          expirationDate: ''
        };
      });
      setReceiveData(initialData);
    }
  }, [po]);

  if (!isOpen || !po) return null;

  const handleReceive = async () => {
    if (!auth.currentUser) return;
    setIsReceiving(true);

    try {
      const batch = writeBatch(db);
      let allReceived = true;
      let anyReceived = false;

      const updatedItems = [...po.items];

      for (let i = 0; i < po.items.length; i++) {
        const item = po.items[i];
        const data = receiveData[i];
        
        if (data && data.quantity > 0) {
          anyReceived = true;
          
          // 1. Update PO item received quantity
          updatedItems[i] = {
            ...item,
            quantityReceived: (item.quantityReceived || 0) + data.quantity
          };

          // 2. Create a new lot
          const lotRef = doc(collection(db, 'lots'));
          const lotNumber = lotNumberForPurchaseReceive(po.poNumber, item.ingredientId);
          
          batch.set(lotRef, {
            ingredientId: item.ingredientId,
            lotNumber,
            quantity: data.quantity,
            initialQuantity: data.quantity,
            costPerUnit: item.unitPrice,
            receivedAt: serverTimestamp(),
            expiresAt: data.expirationDate ? new Date(data.expirationDate) : null,
            locationId: data.locationId || null,
            poNumber: po.poNumber
          });

          // 3. Trigger ingredient update (stock & WAC handled by Cloud Function)
          const ingredientRef = doc(db, 'ingredients', item.ingredientId);
          const ingredient = ingredients.find(ing => ing.id === item.ingredientId);
          
          if (ingredient) {
            const supplierName = supplier?.name || '';
            const newPriceHistory = appendPriceHistoryIfChanged(ingredient, item.unitPrice, supplierName);
            batch.update(ingredientRef, {
              costPerUnit: item.unitPrice,
              priceHistory: newPriceHistory,
              updatedAt: serverTimestamp()
            });
          }

          // 4. Record inventory transaction
          const txRef = doc(collection(db, 'inventoryTransactions'));
          batch.set(txRef, {
            type: 'receive',
            ingredientId: item.ingredientId,
            amount: data.quantity,
            costPerUnit: item.unitPrice,
            date: serverTimestamp(),
            userId: auth.currentUser.uid,
            lotId: lotRef.id,
            lotNumber: lotNumber,
            toLocationId: data.locationId || null,
            referenceId: po.id,
            reason: `Received from PO ${po.poNumber}`
          });
        }

        if (updatedItems[i].quantityReceived < updatedItems[i].quantityOrdered) {
          allReceived = false;
        }
      }

      if (anyReceived) {
        // Update PO status and items
        const poRef = doc(db, 'purchaseOrders', po.id!);
        let newStatus = po.status;
        if (allReceived) {
          newStatus = 'fulfilled';
        } else if (po.status === 'sent' || po.status === 'draft') {
          newStatus = 'partially_received';
        }

        batch.update(poRef, {
          items: updatedItems,
          status: newStatus,
          updatedAt: serverTimestamp()
        });

        // Also update shopping list items if they exist
        const shoppingListQuery = query(collection(db, 'shopping_list'), where('status', '==', 'pending'));
        const shoppingListSnapshot = await getDocs(shoppingListQuery);
        
        shoppingListSnapshot.forEach(docSnap => {
          const slItem = docSnap.data();
          const receivedItem = po.items.find(pi => pi.ingredientId === slItem.ingredientId);
          if (receivedItem && receiveData[po.items.indexOf(receivedItem)]?.quantity > 0) {
            // For simplicity, if we receive anything for this ingredient, mark shopping list item as purchased
            // In a more complex system, we'd track exact quantities against shopping list items
            batch.update(docSnap.ref, { status: 'purchased' });
          }
        });

        await batch.commit();
        onClose();
      } else {
        toast.error(t('po:receive.errorZeroQty'));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'receive_po');
    } finally {
      setIsReceiving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-stone-50">
          <div>
            <h3 className="text-lg font-semibold text-stone-900">{t('po:receive.title', { poNumber: po.poNumber })}</h3>
            <p className="text-sm text-stone-500">{supplier?.name || t('po:receive.unknownSupplier')} • {formatFirestoreDate(po.createdAt, language)}</p>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('po:receive.item')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase">{t('po:receive.ordered')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase">{t('po:receive.rcvd')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase">{t('po:receive.toReceive')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('po:receive.location')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('po:receive.expiration')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {po.items.map((item, index) => {
                const remaining = item.quantityOrdered - (item.quantityReceived || 0);
                const isFullyReceived = remaining <= 0;

                return (
                  <tr key={index} className={isFullyReceived ? 'bg-stone-50 opacity-75' : ''}>
                    <td className="px-4 py-3 text-sm font-medium text-stone-900">
                      {item.name || t('po:receive.unknownItem')}
                      <div className="text-xs text-stone-500 font-normal">${item.unitPrice.toFixed(2)} / {item.unit}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-500 text-right">
                      {item.quantityOrdered} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-500 text-right">
                      {item.quantityReceived || 0} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isFullyReceived ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          {t('po:receive.rcvd')}
                        </span>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          max={remaining}
                          step="0.01"
                          value={receiveData[index]?.quantity ?? ''}
                          onChange={(e) => setReceiveData({
                            ...receiveData,
                            [index]: { ...receiveData[index], quantity: Number(e.target.value) }
                          })}
                          className="w-24 px-2 py-1 border border-stone-300 rounded text-right text-sm"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!isFullyReceived && (
                        <select
                          value={receiveData[index]?.locationId || ''}
                          onChange={(e) => setReceiveData({
                            ...receiveData,
                            [index]: { ...receiveData[index], locationId: e.target.value }
                          })}
                          className="w-full px-2 py-1 border border-stone-300 rounded text-sm"
                        >
                          <option value="">{t('po:receive.selectLocation')}</option>
                          {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!isFullyReceived && (
                        <input
                          type="date"
                          value={receiveData[index]?.expirationDate || ''}
                          onChange={(e) => setReceiveData({
                            ...receiveData,
                            [index]: { ...receiveData[index], expirationDate: e.target.value }
                          })}
                          className="w-full px-2 py-1 border border-stone-300 rounded text-sm"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-stone-600 hover:bg-stone-200 rounded-lg font-medium transition-colors"
          >
            {t('po:receive.cancel')}
          </button>
          <button
            onClick={handleReceive}
            disabled={isReceiving || po.status === 'fulfilled'}
            className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <PackagePlus className="w-4 h-4" />
            {isReceiving ? t('po:receive.receiving') : t('po:receive.receiveItems')}
          </button>
        </div>
      </div>
    </div>
  );
}
