import React, { useState, useEffect } from 'react';
import { X, Camera, AlertCircle } from 'lucide-react';
import { Ingredient } from '../types';
import { estimateStockFromImage, EstimatedStockItem } from '../services/geminiService';
import { doc, writeBatch, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useTranslation } from 'react-i18next';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ingredients: Ingredient[];
}

export default function VisualAuditModal({ isOpen, onClose, ingredients }: Props) {
  const { t } = useTranslation(['visual', 'common', 'ingredients']);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimatedItems, setEstimatedItems] = useState<EstimatedStockItem[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setEstimatedItems([]);
      setError(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  const handleVisualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    try {
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
          } else {
            reject(new Error("Failed to read file"));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const known = ingredients.map(i => ({ id: i.id, name: i.name, brand: i.brand, unit: i.unit }));
      const data = await estimateStockFromImage({ base64: base64String, mimeType: file.type }, known);
      setEstimatedItems(data);
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message.includes('429')) {
        setError("You have exceeded your Gemini API quota. Please check your plan and billing details.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to analyze image");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const commitVisualCount = async () => {
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      for (const item of estimatedItems) {
        const ingredient = ingredients.find(i => i.id === item.ingredientId);
        if (ingredient) {
          const currentStock = ingredient.stock || 0;
          const newStock = Number(item.estimatedQuantity) || 0;
          const difference = newStock - currentStock;

          if (difference !== 0) {
            const txRef = doc(collection(db, 'inventoryTransactions'));
            batch.set(txRef, {
              ingredientId: item.ingredientId,
              type: 'audit_adjustment',
              amount: difference,
              costPerUnit: ingredient.weightedAverageCost || ingredient.costPerUnit || 0,
              date: serverTimestamp(),
              reason: 'Visual Audit',
              userId: auth.currentUser?.uid || 'system'
            });

            // Update updatedAt on ingredient to trigger potential listeners, stock handled by Cloud Function
            batch.update(doc(db, 'ingredients', item.ingredientId), {
              updatedAt: serverTimestamp()
            });
          }
        }
      }
      await batch.commit();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to commit visual count");
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-amber-600" />
            {t('visual:audit')}
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

          {estimatedItems.length === 0 ? (
            <div className="border-2 border-dashed border-stone-300 rounded-2xl p-12 text-center hover:bg-stone-50 transition-colors relative group">
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                onChange={handleVisualUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="bg-white w-16 h-16 rounded-full shadow-sm border border-stone-200 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Camera className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-medium text-stone-900 mb-1">{t('visual:snap')}</h3>
              <p className="text-sm text-stone-500 max-w-sm mx-auto">{t('visual:snapDesc')}</p>
              {isProcessing && <p className="mt-6 text-amber-600 font-medium animate-pulse bg-amber-50 py-2 px-4 rounded-full inline-block">{t('visual:analyzing')}</p>}
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-stone-900">{t('visual:estimatedStock')}</h3>
                  <p className="text-sm text-stone-500">{t('visual:reviewEstimates')}</p>
                </div>
                <button onClick={() => setEstimatedItems([])} className="text-sm text-stone-500 hover:text-stone-700 px-3 py-1.5 bg-stone-100 rounded-lg font-medium">
                  {t('visual:scanAnother')}
                </button>
              </div>

              <div className="border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-stone-200">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('visual:item')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('visual:current')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('visual:estimated')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-stone-200">
                    {estimatedItems.map((item, idx) => {
                      const dbItem = ingredients.find(i => i.id === item.ingredientId);
                      if (!dbItem) return null;
                      const diff = item.estimatedQuantity - dbItem.stock;
                      return (
                        <tr key={idx} className="hover:bg-stone-50">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-stone-900">{dbItem.name}</p>
                            <p className="text-xs text-stone-500 line-clamp-1" title={item.reasoning}>{item.reasoning}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-stone-500">{dbItem.stock} {dbItem.unit}</td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-bold text-stone-900">{item.estimatedQuantity} {item.unit}</span>
                            {diff !== 0 && (
                              <span className={`ml-2 text-xs font-bold ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {diff > 0 ? '+' : ''}{diff}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button 
                onClick={commitVisualCount}
                disabled={isProcessing}
                className="w-full bg-amber-600 text-white py-3.5 rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isProcessing ? t('common:saving') : t('visual:updateInventory')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
