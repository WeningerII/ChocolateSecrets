import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { X, Upload, AlertCircle, Check, ChevronRight } from 'lucide-react';
import { Ingredient } from '../types';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { parseLocaleNumber } from '../utils/number';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (ingredients: Partial<Ingredient>[]) => Promise<void>;
}

export default function CsvImportModal({ isOpen, onClose, onImport }: CsvImportModalProps) {
  const { t } = useTranslation(['inventory']);
  const { toast } = useToast();
  const [, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mapping from our fields to CSV headers
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({
    name: '',
    category: '',
    unit: '',
    stock: '',
    lowStockThreshold: '',
    costPerUnit: '',
    supplier: '',
    brand: '',
    barcode: ''
  });

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          setParsedData(results.data);
          const cols = Object.keys(results.data[0] as object);
          setHeaders(cols);
          
          // Auto-map fields based on common names
          const newMapping = { ...fieldMapping };
          cols.forEach(col => {
            const lowerCol = col.toLowerCase();
            if (lowerCol.includes('name') || lowerCol.includes('item')) newMapping.name = col;
            else if (lowerCol.includes('cat')) newMapping.category = col;
            else if (lowerCol === 'unit' || lowerCol.includes('uom')) newMapping.unit = col;
            else if (lowerCol.includes('stock') || lowerCol.includes('qty') || lowerCol.includes('quantity')) newMapping.stock = col;
            else if (lowerCol.includes('low') || lowerCol.includes('threshold') || lowerCol.includes('min')) newMapping.lowStockThreshold = col;
            else if (lowerCol.includes('cost') || lowerCol.includes('price')) newMapping.costPerUnit = col;
            else if (lowerCol.includes('supplier') || lowerCol.includes('vendor')) newMapping.supplier = col;
            else if (lowerCol.includes('brand')) newMapping.brand = col;
            else if (lowerCol.includes('barcode') || lowerCol.includes('upc')) newMapping.barcode = col;
          });
          setFieldMapping(newMapping);
          setStep(2);
        }
      },
      error: (error) => {
        console.error("Error parsing CSV:", error);
        toast.error(t('inventory:csv.errorParse'));
      }
    });
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const ingredientsToImport: Partial<Ingredient>[] = parsedData.map(row => {
        // Locale-tolerant parsing: a comma-decimal cell ("1,50") or a currency-
        // formatted value must not be silently coerced to 0. When a mapped numeric
        // column contains non-numeric junk, flag the row for review instead.
        const parseNum = (key: string) => (key ? parseLocaleNumber(row[key]) : { value: 0, ok: true });
        const stock = parseNum(fieldMapping.stock);
        const lowStockThreshold = parseNum(fieldMapping.lowStockThreshold);
        const costPerUnit = parseNum(fieldMapping.costPerUnit);
        const numericParseFailed = !stock.ok || !lowStockThreshold.ok || !costPerUnit.ok;

        return {
          name: row[fieldMapping.name] || t('inventory:csv.unnamed'),
          category: row[fieldMapping.category] || t('inventory:csv.uncategorized'),
          unit: row[fieldMapping.unit] || 'g',
          stock: stock.value,
          lowStockThreshold: lowStockThreshold.value,
          costPerUnit: costPerUnit.value,
          supplier: row[fieldMapping.supplier] || '',
          brand: row[fieldMapping.brand] || '',
          barcode: row[fieldMapping.barcode] || '',
          customFields: [],
          tags: [],
          needsReview: numericParseFailed
        };
      });

      await onImport(ingredientsToImport);
      onClose();
    } catch (error) {
      console.error("Import failed:", error);
      toast.error(t('inventory:csv.errorImport'));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-stone-50 rounded-t-2xl">
          <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-amber-700" />
            {t('inventory:csv.title')}
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="text-center py-12">
              <Upload className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-stone-900 mb-2">{t('inventory:csv.uploadTitle')}</h4>
              <p className="text-sm text-stone-500 mb-6">{t('inventory:csv.uploadDesc')}</p>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-amber-700 hover:bg-amber-800 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
              >
                {t('inventory:csv.selectFile')}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-amber-50 p-4 rounded-xl flex items-start gap-3 border border-amber-200">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-amber-800">{t('inventory:csv.mapColumns')}</h4>
                  <p className="text-xs text-amber-700 mt-1">
                    {t('inventory:csv.mapDesc', { count: parsedData.length })}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'name', label: t('inventory:csv.name'), required: true },
                  { key: 'category', label: t('inventory:csv.category') },
                  { key: 'unit', label: t('inventory:csv.unit') },
                  { key: 'stock', label: t('inventory:csv.stock') },
                  { key: 'lowStockThreshold', label: t('inventory:csv.threshold') },
                  { key: 'costPerUnit', label: t('inventory:csv.cost') },
                  { key: 'supplier', label: t('inventory:csv.supplier') },
                  { key: 'brand', label: t('inventory:csv.brand') },
                  { key: 'barcode', label: t('inventory:csv.barcode') }
                ].map(field => (
                  <div key={field.key} className="flex items-center gap-4">
                    <div className="w-1/3 text-sm font-medium text-stone-700">
                      {field.label}
                    </div>
                    <div className="flex-1">
                      <select
                        value={fieldMapping[field.key]}
                        onChange={(e) => setFieldMapping({ ...fieldMapping, [field.key]: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                      >
                        <option value="">{t('inventory:csv.ignoreField')}</option>
                        {headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-xl flex items-start gap-3 border border-green-200">
                <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-green-800">{t('inventory:csv.readyToImport')}</h4>
                  <p className="text-xs text-green-700 mt-1">
                    {t('inventory:csv.reviewSample', { count: parsedData.length })}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-stone-200 rounded-xl">
                <table className="min-w-full divide-y divide-stone-200">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-stone-500">{t('inventory:csv.colName')}</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-stone-500">{t('inventory:csv.colCategory')}</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-stone-500">{t('inventory:csv.colStock')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-stone-200">
                    {parsedData.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-sm text-stone-900">{row[fieldMapping.name] || '-'}</td>
                        <td className="px-4 py-2 text-sm text-stone-500">{row[fieldMapping.category] || '-'}</td>
                        <td className="px-4 py-2 text-sm text-stone-500">{row[fieldMapping.stock] || '0'} {row[fieldMapping.unit] || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 5 && (
                  <div className="px-4 py-2 text-xs text-stone-500 text-center bg-stone-50 border-t border-stone-200">
                    {t('inventory:csv.moreRows', { count: parsedData.length - 5 })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-stone-200 flex justify-between bg-stone-50 rounded-b-2xl">
          {step > 1 ? (
            <button
              onClick={() => setStep(step === 3 ? 2 : 1)}
              className="px-4 py-2 text-stone-600 font-medium hover:bg-stone-200 rounded-xl transition-colors"
            >
              {t('inventory:csv.back')}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-stone-600 font-medium hover:bg-stone-200 rounded-xl transition-colors"
            >
              {t('inventory:csv.cancel')}
            </button>
          )}

          {step === 2 && (
            <button
              onClick={() => setStep(3)}
              disabled={!fieldMapping.name}
              className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 text-white px-6 py-2 rounded-xl font-medium transition-colors"
            >
              {t('inventory:csv.reviewBtn')} <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 text-white px-6 py-2 rounded-xl font-medium transition-colors"
            >
              {isImporting ? t('inventory:csv.importing') : t('inventory:csv.confirmImport')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
