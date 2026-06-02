import React, { useState, useEffect } from 'react';
import { X, ArrowDownRight } from 'lucide-react';
import { collection, doc, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Ingredient, Lot } from '../types';
import { depleteStock } from '../utils/inventory';
import { useTranslation } from 'react-i18next';
import { updateLotQuantity } from '../utils/firestore';

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredient: Ingredient | null;
  lots: Lot[];
}

export default function AdjustStockModal({ isOpen, onClose, ingredient, lots }: AdjustStockModalProps) {
  const { t } = useTranslation(['inventory', 'common']);
  const [amount, setAmount] = useState<number | ''>('');
  const [type, setType] = useState<'consume' | 'waste' | 'audit_adjustment'>('consume');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && ingredient) {
      setAmount('');
      setType('consume');
      setReason('');
    }
  }, [isOpen, ingredient]);

  if (!isOpen || !ingredient) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const qtyToDeplete = Number(amount);
      const finalReason = reason?.trim() || 'Manual adjustment';

      // 1. Deplete Stock from Lots
      const ingredientLots = lots.filter(l => l.ingredientId === ingredient.id);
      // Create shallow copy of lots to avoid mutating the state directly
      const lotsCopy = ingredientLots.map(lot => ({ ...lot }));
      const depletion = depleteStock(lotsCopy, qtyToDeplete);

      // Update the lots in Firestore
      depletion.modifiedLots.forEach(lot => {
        updateLotQuantity(batch, db, lot, lot.quantity);
      });

      // 2. Create Inventory Transactions for each consumed lot
      if (depletion.consumedLots.length > 0) {
        depletion.consumedLots.forEach(cl => {
          const txRef = doc(collection(db, 'inventoryTransactions'));
          batch.set(txRef, {
            ingredientId: ingredient.id,
            type,
            amount: -cl.amount,
            reason: finalReason,
            costPerUnit: cl.costPerUnit,
            date: serverTimestamp(),
            userId: auth.currentUser?.uid || 'unknown',
            lotId: cl.lotId
          });
        });
      } else {
        // If there were no lots (or not enough), we still record the transaction
        const txRef = doc(collection(db, 'inventoryTransactions'));
        batch.set(txRef, {
          ingredientId: ingredient.id,
          type,
          amount: -qtyToDeplete,
          reason: finalReason,
          costPerUnit: ingredient.weightedAverageCost || ingredient.costPerUnit || 0,
          date: serverTimestamp(),
          userId: auth.currentUser?.uid || 'unknown'
        });
      }

      // 3. Update Ingredient Stock
      // Stock and shopping list check are handled by Cloud Function
      const ingredientRef = doc(db, 'ingredients', ingredient.id);
      
      batch.update(ingredientRef, {
        updatedAt: serverTimestamp()
      });

      await batch.commit();
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'ingredients');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-amber-50">
          <div className="flex items-center gap-2 text-amber-800">
            <ArrowDownRight className="w-5 h-5" />
            <h3 className="text-lg font-semibold">{t('inventory:adjust.title')}</h3>
          </div>
          <button onClick={onClose} className="text-amber-600 hover:text-amber-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 mb-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-stone-500">{t('inventory:adjust.ingredient')}</p>
              <p className="font-medium text-stone-900">{ingredient.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-stone-500">{t('inventory:adjust.currentStock')}</p>
              <p className="font-medium text-stone-900">{ingredient.stock} {ingredient.unit}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('inventory:adjust.type')}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'consume' | 'waste' | 'audit_adjustment')}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="consume">{t('inventory:adjust.typeConsume')}</option>
              <option value="waste">{t('inventory:adjust.typeWaste')}</option>
              <option value="audit_adjustment">{t('inventory:adjust.typeCorrection')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('inventory:adjust.amount')}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={ingredient.stock}
                value={amount}
                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-stone-500 text-sm whitespace-nowrap">{ingredient.unit}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('inventory:adjust.reason')}</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder={t('inventory:adjust.reasonPlaceholder')}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-stone-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-600 hover:text-stone-900 font-medium transition-colors"
              disabled={isSubmitting}
            >
              {t('inventory:adjust.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? t('inventory:adjust.adjusting') : t('inventory:adjust.adjustBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
