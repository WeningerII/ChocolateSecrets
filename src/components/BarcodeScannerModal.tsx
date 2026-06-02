import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Barcode, AlertCircle, Plus, Minus } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Ingredient } from '../types';
import { extractProductLabel, ExtractedProductLabel } from '../services/geminiService';
import { doc, writeBatch, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useTranslation } from 'react-i18next';
import { prepareImageForUpload } from '../utils/image';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ingredients: Ingredient[];
  onBarcodeScanned?: (barcode: string) => void;
}

export default function BarcodeScannerModal({ isOpen, onClose, ingredients, onBarcodeScanned }: Props) {
  const { t } = useTranslation(['barcode', 'common']);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [matchedIngredient, setMatchedIngredient] = useState<Ingredient | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState<number>(0);
  const [newLabelData, setNewLabelData] = useState<ExtractedProductLabel | null>(null);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setScannedBarcode(null);
    setMatchedIngredient(null);
    setStockAdjustment(0);
    setNewLabelData(null);
    setError(null);
    setIsProcessing(false);
  };

  useEffect(() => {
    let controls: ReturnType<BrowserMultiFormatReader['decodeFromVideoDevice']> extends Promise<infer T> ? T | null : unknown = null;
    const codeReader = new BrowserMultiFormatReader();

    if (isOpen && !scannedBarcode && videoRef.current) {
      codeReader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
        if (result) {
          handleBarcodeScanned(result.getText());
        }
      }).then(c => controls = c).catch(console.error);
    }

    return () => {
      if (controls) controls.stop();
    };
  }, [isOpen, scannedBarcode]);

  const handleBarcodeScanned = (code: string) => {
    if (onBarcodeScanned) {
      onBarcodeScanned(code);
      onClose();
      return;
    }
    
    setScannedBarcode(code);
    const match = ingredients.find(i => i.barcode === code);
    if (match) {
      setMatchedIngredient(match);
      setStockAdjustment(match.stock);
    } else {
      setMatchedIngredient(null);
    }
  };

  const handleLabelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    try {
      const imageData = await prepareImageForUpload(file, 1024);
      
      const data = await extractProductLabel(imageData);
      setNewLabelData(data);
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message.includes('429')) {
        setError("You have exceeded your Gemini API quota. Please check your plan and billing details.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to analyze label");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const commitBarcodeAdjustment = async () => {
    if (!matchedIngredient) return;
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const difference = Number(stockAdjustment) - (matchedIngredient.stock || 0);

      if (difference !== 0) {
        const txRef = doc(collection(db, 'inventoryTransactions'));
        batch.set(txRef, {
          ingredientId: matchedIngredient.id,
          type: 'audit_adjustment',
          amount: difference,
          costPerUnit: matchedIngredient.weightedAverageCost || matchedIngredient.costPerUnit || 0,
          date: serverTimestamp(),
          reason: 'Barcode Scan Adjustment',
          userId: auth.currentUser?.uid || 'system'
        });

        batch.update(doc(db, 'ingredients', matchedIngredient.id), {
          updatedAt: serverTimestamp()
        });
      }

      await batch.commit();
      resetState(); // Go back to scanning
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to adjust stock");
      setIsProcessing(false);
    }
  };

  const commitNewIngredient = async () => {
    if (!newLabelData || !scannedBarcode) return;
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const newRef = doc(collection(db, 'ingredients'));
      
      const initialQty = Number(stockAdjustment) || 0;
      
      batch.set(newRef, {
        name: newLabelData.name || 'Unknown Item',
        brand: newLabelData.brand || '',
        barcode: scannedBarcode,
        unit: newLabelData.unit || 'units',
        category: newLabelData.category || 'Uncategorized',
        stock: 0,
        lowStockThreshold: 0,
        costPerUnit: 0,
        weightedAverageCost: 0
      });

      if (initialQty > 0) {
        const txRef = doc(collection(db, 'inventoryTransactions'));
        batch.set(txRef, {
          ingredientId: newRef.id,
          type: 'receive',
          amount: initialQty,
          costPerUnit: 0,
          date: serverTimestamp(),
          reason: 'Initial Barcode Creation',
          userId: auth.currentUser?.uid || 'system'
        });
      }

      await batch.commit();
      resetState(); // Go back to scanning
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add ingredient");
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Barcode className="w-5 h-5 text-amber-600" />
            {t('barcode:scan')}
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

          {!scannedBarcode ? (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center shadow-inner">
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                <div className="w-full h-full border-2 border-amber-500 rounded-lg"></div>
              </div>
              <p className="absolute bottom-4 text-white text-sm font-medium bg-black/60 px-4 py-1.5 rounded-full backdrop-blur-md">
                {t('barcode:pointCamera')}
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-200">
                <div>
                  <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">{t('barcode:scannedCode')}</p>
                  <p className="text-lg font-mono text-stone-900">{scannedBarcode}</p>
                </div>
                <button onClick={resetState} className="text-sm text-amber-600 hover:text-amber-700 font-medium px-3 py-1.5 bg-amber-50 rounded-lg">
                  {t('barcode:rescan')}
                </button>
              </div>

              {matchedIngredient ? (
                <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xl font-bold text-stone-900 mb-1">{matchedIngredient.name}</h3>
                  <p className="text-stone-500 text-sm mb-6">{matchedIngredient.brand || t('barcode:noBrand')} • {matchedIngredient.category}</p>
                  
                  <div className="flex items-center justify-center gap-6">
                    <button 
                      onClick={() => setStockAdjustment(Math.max(0, stockAdjustment - 1))}
                      className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 transition-colors active:scale-95"
                    >
                      <Minus className="w-6 h-6" />
                    </button>
                    <div className="text-center w-32">
                      <p className="text-4xl font-bold text-stone-900">{stockAdjustment}</p>
                      <p className="text-stone-500 text-sm">{matchedIngredient.unit}</p>
                    </div>
                    <button 
                      onClick={() => setStockAdjustment(stockAdjustment + 1)}
                      className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 transition-colors active:scale-95"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>

                  <button 
                    onClick={commitBarcodeAdjustment}
                    disabled={isProcessing || stockAdjustment === matchedIngredient.stock}
                    className="w-full mt-8 bg-amber-600 text-white py-3.5 rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isProcessing ? t('common:saving') : t('barcode:updateStock')}
                  </button>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                  <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-amber-900 mb-2">{t('barcode:unknown')}</h3>
                  <p className="text-amber-700 text-sm mb-6">{t('barcode:notInDatabase')}</p>
                  
                  {!newLabelData ? (
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        onChange={handleLabelUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <button className="w-full bg-amber-600 text-white py-3.5 rounded-xl font-medium hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
                        <Camera className="w-5 h-5" />
                        {t('barcode:snapLabel')}
                      </button>
                    </div>
                  ) : (
                    <div className="text-left bg-white p-4 rounded-xl border border-amber-200 space-y-4 shadow-sm">
                      <div>
                        <label className="block text-xs font-medium text-stone-500 uppercase">{t('barcode:extractedName')}</label>
                        <input type="text" value={newLabelData.name} onChange={e => setNewLabelData({...newLabelData, name: e.target.value})} className="mt-1 block w-full rounded-lg border-stone-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-stone-500 uppercase">{t('barcode:brand')}</label>
                          <input type="text" value={newLabelData.brand || ''} onChange={e => setNewLabelData({...newLabelData, brand: e.target.value})} className="mt-1 block w-full rounded-lg border-stone-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-stone-500 uppercase">{t('barcode:unit')}</label>
                          <input type="text" value={newLabelData.unit} onChange={e => setNewLabelData({...newLabelData, unit: e.target.value})} className="mt-1 block w-full rounded-lg border-stone-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm" />
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-stone-100">
                        <label className="block text-xs font-medium text-stone-500 uppercase mb-2">{t('barcode:initialStock')}</label>
                        <div className="flex items-center gap-4">
                          <button onClick={() => setStockAdjustment(Math.max(0, stockAdjustment - 1))} className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 active:scale-95"><Minus className="w-4 h-4" /></button>
                          <span className="text-xl font-bold w-12 text-center">{stockAdjustment}</span>
                          <button onClick={() => setStockAdjustment(stockAdjustment + 1)} className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 active:scale-95"><Plus className="w-4 h-4" /></button>
                        </div>
                      </div>

                      <button 
                        onClick={commitNewIngredient}
                        disabled={isProcessing}
                        className="w-full mt-4 bg-amber-600 text-white py-3.5 rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm"
                      >
                        {isProcessing ? t('common:saving') : t('barcode:saveNew')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
