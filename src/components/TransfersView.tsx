import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, writeBatch, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Location, Ingredient, Lot, InventoryTransaction } from '../types';
import { ArrowRightLeft, Plus, Search, CheckCircle2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';
import { formatFirestoreDate } from '../utils/date';
import { useData } from '../contexts/DataContext';
import { updateLotQuantity } from '../utils/firestore';
import { useToast } from '../contexts/ToastContext';

interface TransfersViewProps {
  locations: Location[];
}

export default function TransfersView({ locations }: TransfersViewProps) {
  const { t, i18n } = useTranslation(['inventory', 'ledger', 'dashboard', 'common']);
  const language = useLanguage();
  const { ingredients, lots, loading: dataLoading } = useData();
  const { toast } = useToast();
  const [transfers, setTransfers] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isNewTransferModalOpen, setIsNewTransferModalOpen] = useState(false);
  const [transferData, setTransferData] = useState({
    ingredientId: '',
    lotId: '',
    fromLocationId: '',
    toLocationId: '',
    quantity: 0,
    reason: ''
  });

  useEffect(() => {
    const unsubscribeTransfers = onSnapshot(
      query(collection(db, 'inventoryTransactions'), where('type', '==', 'transfer'), orderBy('date', 'desc')),
      (snapshot) => {
        setTransfers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryTransaction)));
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'inventoryTransactions')
    );

    return () => {
      unsubscribeTransfers();
    };
  }, []);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferData.ingredientId || !transferData.fromLocationId || !transferData.toLocationId || transferData.quantity <= 0) {
      toast.error(t('inventory:fillRequiredFields'));
      return;
    }

    if (transferData.fromLocationId === transferData.toLocationId) {
      toast.error(t('inventory:sameLocationError'));
      return;
    }

    try {
      const batch = writeBatch(db);
      
      let amountToTransfer = transferData.quantity;
      const ingredient = ingredients.find(i => i.id === transferData.ingredientId);
      
      // If a specific lot is selected, transfer from that lot
      if (transferData.lotId) {
        const lot = lots.find(l => l.id === transferData.lotId);
        if (!lot || lot.quantity < amountToTransfer) {
          toast.error(t('inventory:insufficientLotQty'));
          return;
        }

        // Deduct from source lot
        updateLotQuantity(batch, db, lot, lot.quantity - amountToTransfer);

        // Create new lot in destination
        const newLotRef = doc(collection(db, 'lots'));
        batch.set(newLotRef, {
          ...lot,
          id: undefined, // Remove old ID
          locationId: transferData.toLocationId,
          quantity: amountToTransfer,
          initialQuantity: amountToTransfer,
          receivedAt: serverTimestamp()
        });

        // Record transaction
        const txRef = doc(collection(db, 'inventoryTransactions'));
        batch.set(txRef, {
          type: 'transfer',
          ingredientId: transferData.ingredientId,
          amount: amountToTransfer,
          costPerUnit: lot.costPerUnit,
          date: serverTimestamp(),
          userId: auth.currentUser?.uid || 'unknown',
          fromLocationId: transferData.fromLocationId,
          toLocationId: transferData.toLocationId,
          reason: transferData.reason,
          lotId: lot.id // Original lot ID
        });
      } else {
        // FIFO transfer: Find lots in the source location
        const sourceLots = lots
          .filter(l => l.ingredientId === transferData.ingredientId && l.locationId === transferData.fromLocationId && l.quantity > 0)
          .sort((a, b) => {
            const dateA = a.expiresAt && 'toMillis' in a.expiresAt ? a.expiresAt.toMillis() : (a.receivedAt && 'toMillis' in a.receivedAt ? a.receivedAt.toMillis() : 0);
            const dateB = b.expiresAt && 'toMillis' in b.expiresAt ? b.expiresAt.toMillis() : (b.receivedAt && 'toMillis' in b.receivedAt ? b.receivedAt.toMillis() : 0);
            return dateA - dateB;
          });

        let remainingToTransfer = amountToTransfer;

        for (const lot of sourceLots) {
          if (remainingToTransfer <= 0) break;

          const transferQty = Math.min(lot.quantity, remainingToTransfer);
          
          // Deduct from source lot
          updateLotQuantity(batch, db, lot, lot.quantity - transferQty);

          // Create new lot in destination
          const newLotRef = doc(collection(db, 'lots'));
          batch.set(newLotRef, {
            ...lot,
            id: undefined,
            locationId: transferData.toLocationId,
            quantity: transferQty,
            initialQuantity: transferQty,
            receivedAt: serverTimestamp()
          });

          // Record transaction
          const txRef = doc(collection(db, 'inventoryTransactions'));
          batch.set(txRef, {
            type: 'transfer',
            ingredientId: transferData.ingredientId,
            amount: transferQty,
            costPerUnit: lot.costPerUnit,
            date: serverTimestamp(),
            userId: auth.currentUser?.uid || 'unknown',
            fromLocationId: transferData.fromLocationId,
            toLocationId: transferData.toLocationId,
            reason: transferData.reason,
            lotId: lot.id
          });

          remainingToTransfer -= transferQty;
        }

        if (remainingToTransfer > 0) {
          toast.error(t('inventory:insufficientTotalQty'));
          return;
        }
      }

      await batch.commit();
      setIsNewTransferModalOpen(false);
      setTransferData({
        ingredientId: '',
        lotId: '',
        fromLocationId: '',
        toLocationId: '',
        quantity: 0,
        reason: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'transfers');
    }
  };

  const availableLots = lots.filter(l => 
    l.ingredientId === transferData.ingredientId && 
    l.locationId === transferData.fromLocationId && 
    l.quantity > 0
  );

  const maxAvailable = transferData.lotId 
    ? availableLots.find(l => l.id === transferData.lotId)?.quantity || 0
    : availableLots.reduce((sum, l) => sum + l.quantity, 0);

  if (loading || dataLoading) {
    return <div className="animate-pulse h-32 bg-stone-100 rounded-2xl"></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">{t('inventory:internalTransfers')}</h2>
          <p className="text-stone-500">{t('inventory:transfersSubtitle')}</p>
        </div>
        <button
          onClick={() => setIsNewTransferModalOpen(true)}
          className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm"
        >
          <ArrowRightLeft className="w-5 h-5" />
          {t('inventory:newTransfer')}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="min-w-full divide-y divide-stone-200">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('ledger:date')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('dashboard:ingredient')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('inventory:from')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('inventory:to')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('inventory:quantity')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {transfers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-stone-500">
                  <ArrowRightLeft className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                  <p>{t('inventory:noTransfers')}</p>
                </td>
              </tr>
            ) : (
              transfers.map((tx) => {
                const ingredient = ingredients.find(i => i.id === tx.ingredientId);
                const fromLoc = locations.find(l => l.id === tx.fromLocationId);
                const toLoc = locations.find(l => l.id === tx.toLocationId);
                
                return (
                  <tr key={tx.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                      {formatFirestoreDate(tx.date, language)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-stone-900">{ingredient?.name || t('common:unknown')}</div>
                      {tx.reason && <div className="text-xs text-stone-500">{tx.reason}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                      {fromLoc?.name || t('common:unknown')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                      {toLoc?.name || t('common:unknown')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900 text-right">
                      {tx.amount} {ingredient?.unit}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isNewTransferModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-stone-900">{t('inventory:newTransfer')}</h3>
              <button onClick={() => setIsNewTransferModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleTransfer} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('dashboard:ingredient')}</label>
                <select
                  required
                  value={transferData.ingredientId}
                  onChange={(e) => setTransferData({ ...transferData, ingredientId: e.target.value, lotId: '' })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">{t('inventory:selectIngredient')}</option>
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>{ing.name}</option>
                  ))}
                </select>
              </div>

              {transferData.ingredientId && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('inventory:fromLocation')}</label>
                    <select
                      required
                      value={transferData.fromLocationId}
                      onChange={(e) => setTransferData({ ...transferData, fromLocationId: e.target.value, lotId: '' })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">{t('inventory:selectLocation')}</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>

                  {transferData.fromLocationId && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">{t('inventory:specificLotOptional')}</label>
                        <select
                          value={transferData.lotId}
                          onChange={(e) => setTransferData({ ...transferData, lotId: e.target.value, quantity: 0 })}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="">{t('inventory:anyLotFifo')}</option>
                          {availableLots.map(lot => (
                            <option key={lot.id} value={lot.id}>
                              {lot.poNumber || lot.id.slice(0, 8)} ({lot.quantity} available)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">{t('inventory:toLocation')}</label>
                        <select
                          required
                          value={transferData.toLocationId}
                          onChange={(e) => setTransferData({ ...transferData, toLocationId: e.target.value })}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="">{t('inventory:selectLocation')}</option>
                          {locations.filter(l => l.id !== transferData.fromLocationId).map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                          {t('inventory:quantity')} ({t('inventory:maxAvailable')} {maxAvailable})
                        </label>
                        <input
                          type="number"
                          required
                          min="0.01"
                          max={maxAvailable}
                          step="0.01"
                          value={transferData.quantity || ''}
                          onChange={(e) => setTransferData({ ...transferData, quantity: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">{t('inventory:reasonOptional')}</label>
                        <input
                          type="text"
                          value={transferData.reason}
                          onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewTransferModalOpen(false)}
                  className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg font-medium transition-colors"
                >
                  {t('common:cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!transferData.ingredientId || !transferData.fromLocationId || !transferData.toLocationId || transferData.quantity <= 0 || transferData.quantity > maxAvailable}
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {t('inventory:transferInventory')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
