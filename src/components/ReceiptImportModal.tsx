import React, { useState, useEffect } from 'react';
import { X, Receipt, AlertCircle } from 'lucide-react';
import { Ingredient } from '../types';
import { extractReceiptData, ExtractedReceiptItem } from '../services/geminiService';
import { doc, writeBatch, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { newDocRef } from '../utils/identifiers';
import { useTranslation } from 'react-i18next';
import { findBestIngredientMatch } from '../utils/search';
import { appendPriceHistoryIfChanged } from '../utils/inventory';
import { useData } from '../contexts/DataContext';
import { prepareImageForUpload } from '../utils/image';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ingredients: Ingredient[];
}

export default function ReceiptImportModal({ isOpen, onClose, ingredients }: Props) {
  const { t } = useTranslation(['receipt', 'common', 'ingredients']);
  const { suppliers } = useData();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptItems, setReceiptItems] = useState<ExtractedReceiptItem[]>([]);

  const groupedItems = React.useMemo(() => {
    const groups = new Map<string, { match: Ingredient | null; totalQty: number; totalCost: number; lines: ExtractedReceiptItem[]; confidence: number }>();
    
    for (const extractedItem of receiptItems) {
      const matchResult = findBestIngredientMatch(
        extractedItem.name,
        ingredients.map(i => ({ id: i.id, name: i.name })),
        0.85
      );
      const match = matchResult ? ingredients.find(i => i.id === matchResult.id) || null : null;
      const matchConfidence = matchResult?.score ?? 0;
      
      const groupKey = match?.id || `__new__:${extractedItem.name.toLowerCase().trim()}`;
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          match,
          totalQty: 0,
          totalCost: 0,
          confidence: matchConfidence,
          lines: [],
        });
      }
      
      const group = groups.get(groupKey)!;
      const qty = Number(extractedItem.quantity) || 0;
      const itemCost = Number(extractedItem.costPerUnit) || 0;
      
      group.totalQty += qty;
      group.totalCost += (qty * itemCost);
      group.lines.push(extractedItem);
    }
    
    return Array.from(groups.values());
  }, [receiptItems, ingredients]);

  useEffect(() => {
    if (!isOpen) {
      setReceiptItems([]);
      setError(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    try {
      const imageData = await prepareImageForUpload(file, 1024);
      
      const data = await extractReceiptData(imageData);
      setReceiptItems(data);
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message.includes('429')) {
        setError("You have exceeded your Gemini API quota. Please check your plan and billing details.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to analyze receipt");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const commitReceipt = async () => {
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const newSuppliersMap = new Map<string, string>();
      
      const resolveSupplier = (rawName: string, existingSupplierId?: string) => {
        if (!rawName) return { name: '', id: existingSupplierId };
        if (existingSupplierId) return { name: rawName, id: existingSupplierId };

        const cleanName = rawName.replace(/[-\s]+$/, '').trim();
        
        if (newSuppliersMap.has(cleanName)) {
          return { name: cleanName, id: newSuppliersMap.get(cleanName)! };
        }
        
        const supplierMatch = findBestIngredientMatch(cleanName, suppliers.map(s => ({ id: s.id, name: s.name })), 0.8)
                           || findBestIngredientMatch(rawName, suppliers.map(s => ({ id: s.id, name: s.name })), 0.8);
                           
        if (supplierMatch) {
          return { name: supplierMatch.name, id: supplierMatch.id };
        }

        const newSupplierRef = doc(collection(db, 'suppliers'));
        const newId = newSupplierRef.id;
        batch.set(newSupplierRef, { 
          name: cleanName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        newSuppliersMap.set(cleanName, newId);
        newSuppliersMap.set(rawName, newId);
        
        return { name: cleanName, id: newId };
      };

      for (const group of groupedItems) {
        const { match, totalQty, totalCost, lines } = group;
        const firstLine = lines[0]; // Primary reference for synthetic un-matched items
        
        const newLotRef = newDocRef('lots');
        const newLotId = newLotRef.id;
        const receiptPoNumber = 'RECEIPT-' + new Date().toISOString().split('T')[0] + '-' + newLotId.slice(0, 6);
        const quantity = totalQty;
        const costPerUnit = totalQty > 0 ? totalCost / totalQty : 0;
        
        if (match) {
          batch.set(newLotRef, {
            id: newLotId,
            ingredientId: match.id,
            poNumber: receiptPoNumber,
            quantity: quantity,
            initialQuantity: quantity,
            locationId: '',
            costPerUnit: costPerUnit,
            receivedAt: serverTimestamp(),
            expiresAt: null
          });

          // Stock and WAC are handled by Cloud Function
          const rawSupplierName = firstLine.supplier || match.supplier || '';
          const resolvedSupplier = resolveSupplier(rawSupplierName, match.supplierId);
          
          const newPriceHistory = appendPriceHistoryIfChanged(match, costPerUnit, resolvedSupplier.name, resolvedSupplier.id);
          batch.update(doc(db, 'ingredients', match.id), {
            costPerUnit: costPerUnit || match.costPerUnit || 0,
            priceHistory: newPriceHistory,
            supplier: resolvedSupplier.name,
            ...(resolvedSupplier.id ? { supplierId: resolvedSupplier.id } : {})
          });

          const txRef = doc(collection(db, 'inventoryTransactions'));
          batch.set(txRef, {
            ingredientId: match.id,
            type: 'receive',
            amount: quantity,
            costPerUnit: costPerUnit,
            date: serverTimestamp(),
            reason: 'Receipt Import',
            lotId: newLotId,
            userId: auth.currentUser?.uid || 'system'
          });
        } else {
          const rawSupplierName = firstLine.supplier || '';
          const resolvedSupplier = resolveSupplier(rawSupplierName);

          const newRef = doc(collection(db, 'ingredients'));
          batch.set(newRef, {
            name: firstLine.name || 'Unknown Item',
            brand: firstLine.brand || '',
            unit: firstLine.unit || 'units',
            stock: 0,
            weightedAverageCost: 0,
            costPerUnit: costPerUnit,
            priceHistory: [{
              date: Timestamp.now(),
              costPerUnit: costPerUnit,
              supplier: resolvedSupplier.name,
              ...(resolvedSupplier.id ? { supplierId: resolvedSupplier.id } : {})
            }],
            supplier: resolvedSupplier.name,
            ...(resolvedSupplier.id ? { supplierId: resolvedSupplier.id } : {}),
            category: 'Uncategorized',
            lowStockThreshold: 0
          });

          batch.set(newLotRef, {
            id: newLotId,
            ingredientId: newRef.id,
            poNumber: receiptPoNumber,
            quantity: quantity,
            initialQuantity: quantity,
            locationId: '',
            costPerUnit: costPerUnit,
            receivedAt: serverTimestamp(),
            expiresAt: null
          });

          const txRef = doc(collection(db, 'inventoryTransactions'));
          batch.set(txRef, {
            ingredientId: newRef.id,
            type: 'receive',
            amount: quantity,
            costPerUnit: costPerUnit,
            date: serverTimestamp(),
            reason: 'Receipt Import',
            lotId: newLotId,
            userId: auth.currentUser?.uid || 'system'
          });
        }
      }
      
      await batch.commit();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to commit receipt");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-600" />
            {t('receipt:import')}
          </h2>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 border border-red-100">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {receiptItems.length === 0 ? (
            <div className="border-2 border-dashed border-stone-300 rounded-2xl p-12 text-center hover:bg-stone-50 transition-colors relative group">
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                onChange={handleReceiptUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="bg-white w-16 h-16 rounded-full shadow-sm border border-stone-200 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Receipt className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-medium text-stone-900 mb-1">{t('receipt:upload')}</h3>
              <p className="text-sm text-stone-500 max-w-sm mx-auto">{t('receipt:uploadDesc')}</p>
              {isProcessing && <p className="mt-6 text-amber-600 font-medium animate-pulse bg-amber-50 py-2 px-4 rounded-full inline-block">{t('receipt:analyzing')}</p>}
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-stone-900">{t('receipt:extractedItems')}</h3>
                  <p className="text-sm text-stone-500">{t('receipt:reviewItems')}</p>
                </div>
                <button onClick={() => setReceiptItems([])} className="text-sm text-stone-500 hover:text-stone-700 px-3 py-1.5 bg-stone-100 rounded-lg font-medium">
                  {t('receipt:scanAnother')}
                </button>
              </div>
              
              <div className="border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-stone-200">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('receipt:item')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('receipt:qty')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('receipt:costPerUnit')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-stone-200">
                    {groupedItems.map((group, idx) => {
                      const { match, totalQty, totalCost, confidence, lines } = group;
                      const displayLine = lines[0];
                      const displayUnit = displayLine.unit || 'units';
                      const displayCostPerUnit = totalQty > 0 ? totalCost / totalQty : 0;
                      const cleanDisplaySupplier = (displayLine.supplier || '').replace(/[-\s]+$/, '').trim();
                      
                      return (
                        <tr key={idx} className="hover:bg-stone-50">
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-stone-900 flex items-center gap-2">
                              {match ? (
                                <>
                                  <span>{match.name}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    confidence >= 0.95 ? 'bg-emerald-100 text-emerald-700' :
                                    confidence >= 0.85 ? 'bg-amber-100 text-amber-700' :
                                    'bg-stone-100 text-stone-600'
                                  }`}>
                                    {Math.round(confidence * 100)}%
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span>{displayLine.name}</span>
                                  <span className="text-stone-500 italic text-xs ml-2">{t('receipt:noMatchWillCreate')}</span>
                                </>
                              )}
                            </div>
                            <p className="text-xs text-stone-500 mt-0.5">
                              {cleanDisplaySupplier || t('receipt:unknownSupplier')}
                              {lines.length > 1 && ` • ${lines.length} lines combined`}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-sm text-stone-900 font-medium">{totalQty} {displayUnit}</td>
                          <td className="px-4 py-3 text-sm text-stone-900 font-medium">${displayCostPerUnit.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button 
                onClick={commitReceipt}
                disabled={isProcessing}
                className="w-full bg-amber-600 text-white py-3.5 rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isProcessing ? t('common:saving') : t('receipt:commit')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
