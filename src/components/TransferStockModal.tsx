import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Ingredient, Lot, Location } from '../types';
import { useTranslation } from 'react-i18next';
import Combobox from './Combobox';

interface TransferStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredient: Ingredient | null;
  lot: Lot | null;
  locations: Location[];
}

export default function TransferStockModal({ isOpen, onClose, ingredient, lot, locations }: TransferStockModalProps) {
  const { t } = useTranslation(['inventory', 'common']);
  const [quantity, setQuantity] = useState<number | ''>('');
  const [toLocationId, setToLocationId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [locationInput, setLocationInput] = useState('');

  useEffect(() => {
    if (isOpen && lot) {
      setQuantity(lot.quantity);
      setToLocationId('');
      setLocationInput('');
    }
  }, [isOpen, lot]);

  if (!isOpen || !ingredient || !lot) return null;

  const currentLocation = locations.find(l => l.id === lot.locationId);
  const availableLocations = locations.filter(l => l.id !== lot.locationId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const transferQty = Number(quantity);
    if (!transferQty || transferQty <= 0 || transferQty > lot.quantity) return;
    
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);

      let finalToLocationId = toLocationId || lot.locationId;
      if (locationInput.trim()) {
        const existingLocation = locations.find(l => l.name.toLowerCase() === locationInput.trim().toLowerCase());
        if (existingLocation) {
          finalToLocationId = existingLocation.id;
        } else {
          const newLocRef = doc(collection(db, 'locations'));
          batch.set(newLocRef, { name: locationInput.trim(), createdAt: serverTimestamp() });
          finalToLocationId = newLocRef.id;
        }
      }

      let newLotId = lot.id;

      if (transferQty === lot.quantity) {
        // Full transfer: just update the location
        batch.update(doc(db, 'lots', lot.id), {
          locationId: finalToLocationId
        });
      } else {
        // Partial transfer: reduce current lot, create new lot
        batch.update(doc(db, 'lots', lot.id), {
          quantity: lot.quantity - transferQty
        });

        const newLotRef = doc(collection(db, 'lots'));
        newLotId = newLotRef.id;
        batch.set(newLotRef, {
          ...lot,
          id: newLotId,
          locationId: finalToLocationId,
          quantity: transferQty,
          initialQuantity: transferQty // Treat the transferred amount as the initial for this new split lot
        });
      }

      // Create transaction record
      const txRef = doc(collection(db, 'inventoryTransactions'));
      batch.set(txRef, {
        ingredientId: ingredient.id,
        type: 'transfer',
        amount: transferQty,
        costPerUnit: lot.costPerUnit,
        date: serverTimestamp(),
        userId: auth.currentUser?.uid || 'unknown',
        lotId: newLotId,
        lotNumber: lot.poNumber || undefined,
        fromLocationId: lot.locationId,
        toLocationId: finalToLocationId
      });

      await batch.commit();
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'lots');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-blue-50">
          <div className="flex items-center gap-2 text-blue-800">
            <ArrowRightLeft className="w-5 h-5" />
            <h3 className="text-lg font-semibold">{t('inventory:transfer.title')}</h3>
          </div>
          <button onClick={onClose} className="text-blue-600 hover:text-blue-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 mb-4">
            <p className="text-sm text-stone-500">{t('inventory:transfer.ingredient')}</p>
            <p className="font-medium text-stone-900">{ingredient.name}</p>
            <div className="mt-2 text-sm text-stone-600 flex justify-between">
              <span>{t('inventory:transfer.lot', { lot: lot.poNumber || lot.id.substring(0, 8) })}</span>
              <span>{t('inventory:transfer.available', { qty: lot.quantity, unit: ingredient.unit })}</span>
            </div>
            <div className="mt-1 text-sm text-stone-600">
              {t('inventory:transfer.currentLocation')} <span className="font-medium">{currentLocation?.name || t('inventory:transfer.unknown')}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('inventory:transfer.quantity')}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={lot.quantity}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-stone-500 text-sm whitespace-nowrap">{ingredient.unit}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('inventory:transfer.destination')}</label>
            <Combobox
              value={locationInput}
              onChange={(val, item) => {
                setLocationInput(val);
                if (item) setToLocationId(item.id);
              }}
              items={availableLocations.map(l => ({ id: l.id, name: l.name }))}
              placeholder={t('common:typeToSearchOrCreate')}
              accentColor="amber"
            />
            {!toLocationId && !locationInput.trim() && (
              <p className="text-amber-600 text-xs mt-1">{t('inventory:transfer.selectDestinationError')}</p>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-stone-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-600 hover:text-stone-900 font-medium transition-colors"
              disabled={isSubmitting}
            >
              {t('inventory:transfer.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!toLocationId && !locationInput.trim()) || !quantity || quantity <= 0 || quantity > lot.quantity}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? t('inventory:transfer.transferring') : t('inventory:transfer.transferBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
