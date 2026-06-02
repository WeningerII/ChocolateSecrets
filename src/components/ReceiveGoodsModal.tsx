import React, { useState, useEffect } from 'react';
import { X, PackagePlus } from 'lucide-react';
import { collection, addDoc, doc, serverTimestamp, Timestamp, query, where, getDocs, setDoc, runTransaction } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Ingredient, Location, Supplier } from '../types';
import { useTranslation } from 'react-i18next';
import { SafeBatch } from '../utils/firestore';
import { appendPriceHistoryIfChanged } from '../utils/inventory';
import Combobox from './Combobox';

interface ReceiveGoodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredient: Ingredient | null;
  locations: Location[];
  suppliers: Supplier[];
}

export default function ReceiveGoodsModal({ isOpen, onClose, ingredient, locations, suppliers }: ReceiveGoodsModalProps) {
  const { t } = useTranslation(['inventory', 'common']);
  const [quantity, setQuantity] = useState<number | ''>('');
  const [costPerUnit, setCostPerUnit] = useState<number | ''>('');
  const [locationId, setLocationId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [locationInput, setLocationInput] = useState('');
  const [supplierInput, setSupplierInput] = useState('');

  useEffect(() => {
    if (isOpen && ingredient) {
      setQuantity('');
      setCostPerUnit(ingredient.costPerUnit || '');
      setLocationId('');
      setLocationInput('');
      setSupplierId(ingredient.supplierId || '');
      setSupplierInput(ingredient.supplier || '');
      setLotNumber('');
      setExpirationDate('');
      setPoNumber('');
    }
  }, [isOpen, ingredient]);

  if (!isOpen || !ingredient) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || Number(quantity) <= 0) return;

    setIsSubmitting(true);
    try {
      const batch = new SafeBatch(db);

      let resolvedLocationId = locationId;
      if (locationInput.trim()) {
        const existingLocation = locations.find(l => l.name.toLowerCase() === locationInput.trim().toLowerCase());
        if (existingLocation) {
          resolvedLocationId = existingLocation.id;
        } else {
          const newLocRef = doc(collection(db, 'locations'));
          batch.set(newLocRef, { name: locationInput.trim(), createdAt: serverTimestamp() });
          resolvedLocationId = newLocRef.id;
        }
      } else if (!resolvedLocationId) {
        // Check if "General" location exists, create if not
        const locQuery = query(collection(db, 'locations'), where('name', '==', 'General'));
        const locSnap = await getDocs(locQuery);
        if (locSnap.empty) {
          const newLocRef = doc(collection(db, 'locations'));
          batch.set(newLocRef, { name: 'General', createdAt: serverTimestamp() });
          resolvedLocationId = newLocRef.id;
        } else {
          resolvedLocationId = locSnap.docs[0].id;
        }
      }

      let resolvedSupplierId = supplierId;
      if (supplierInput.trim()) {
        const existingSupplier = suppliers.find(s => s.name.toLowerCase() === supplierInput.trim().toLowerCase());
        if (existingSupplier) {
          resolvedSupplierId = existingSupplier.id;
        } else {
          const newSupplierRef = doc(collection(db, 'suppliers'));
          batch.set(newSupplierRef, { name: supplierInput.trim(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
          resolvedSupplierId = newSupplierRef.id;
        }
      } else {
        resolvedSupplierId = '';
      }

      const qty = Number(quantity);
      const cost = Number(costPerUnit) || 0;

      // 1. Create Lot
      const lotRef = doc(collection(db, 'lots'));
      batch.set(lotRef, {
        ingredientId: ingredient.id,
        locationId: resolvedLocationId,
        quantity: qty,
        initialQuantity: qty,
        costPerUnit: cost,
        receivedAt: serverTimestamp(),
        expiresAt: expirationDate ? Timestamp.fromDate(new Date(expirationDate)) : null,
        poNumber: poNumber || undefined,
        supplierId: resolvedSupplierId || undefined,
        lotNumber: lotNumber || undefined
      });

      // 2. Create Inventory Transaction
      const txRef = doc(collection(db, 'inventoryTransactions'));
      batch.set(txRef, {
        ingredientId: ingredient.id,
        type: 'receive',
        amount: qty,
        costPerUnit: cost,
        date: serverTimestamp(),
        userId: auth.currentUser?.uid || 'unknown',
        lotId: lotRef.id,
        lotNumber: lotNumber || undefined,
        toLocationId: resolvedLocationId,
        referenceId: poNumber || undefined
      });

      // 3. Update Ingredient costPerUnit (Stock and WAC handled by Cloud Function)
      const newPriceHistory = appendPriceHistoryIfChanged(ingredient, cost, supplierInput.trim() || '');
      batch.update(doc(db, 'ingredients', ingredient.id), {
        costPerUnit: cost,
        priceHistory: newPriceHistory,
        updatedAt: serverTimestamp()
      });
      
      await batch.commit();

      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'lots');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-emerald-50">
          <div className="flex items-center gap-2 text-emerald-800">
            <PackagePlus className="w-5 h-5" />
            <h3 className="text-lg font-semibold">{t('inventory:receive.title')}</h3>
          </div>
          <button onClick={onClose} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 mb-4">
            <p className="text-sm text-stone-500">{t('inventory:receive.receiving')}</p>
            <p className="font-medium text-stone-900">{ingredient.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('inventory:receive.quantity')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-stone-500 text-sm whitespace-nowrap">{ingredient.unit}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('inventory:receive.costPerUnit')}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costPerUnit}
                  onChange={(e) => setCostPerUnit(e.target.value ? Number(e.target.value) : '')}
                  className="w-full pl-8 pr-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('inventory:receive.storageLocation')}</label>
            <Combobox
              value={locationInput}
              onChange={(val, item) => {
                setLocationInput(val);
                if (item) setLocationId(item.id);
              }}
              items={locations.map(l => ({ id: l.id, name: l.name }))}
              placeholder={t('common:typeToSearchOrCreate')}
              accentColor="emerald"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('inventory:receive.lotNumber')}</label>
              <input
                type="text"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder={t('inventory:receive.optional')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('inventory:receive.expirationDate')}</label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('inventory:receive.supplier')}</label>
              <Combobox
                value={supplierInput}
                onChange={(val, item) => {
                  setSupplierInput(val);
                  if (item) setSupplierId(item.id);
                }}
                items={suppliers.map(s => ({ id: s.id, name: s.name }))}
                placeholder={t('common:typeToSearchOrCreate')}
                accentColor="emerald"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('inventory:receive.poNumber')}</label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder={t('inventory:receive.optional')}
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-stone-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-600 hover:text-stone-900 font-medium transition-colors"
              disabled={isSubmitting}
            >
              {t('inventory:receive.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? t('inventory:receive.receivingBtn') : t('inventory:receive.receiveGoods')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
