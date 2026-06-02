import React, { useRef, useState } from 'react';
import { ShoppingListItem, Supplier, PurchaseOrder } from '../types';
import { X, Printer, Mail, Save } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { useTranslation } from 'react-i18next';
import { collection, addDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { newDocRef, formatIdentifier } from '../utils/identifiers';
import { useToast } from '../contexts/ToastContext';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | undefined;
  items: ShoppingListItem[];
}

export default function PurchaseOrderModal({ isOpen, onClose, supplier, items }: PurchaseOrderModalProps) {
  const { t } = useTranslation(['po', 'common']);
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `PO-${supplier?.name || 'General'}-${new Date().toISOString().split('T')[0]}`,
  });

  if (!isOpen) return null;

  const orderTotal = items.reduce((total, item) => {
    let orderQty = item.quantity;
    if (item.moq && item.moq > 0) {
      orderQty = Math.ceil(item.quantity / item.moq) * item.moq;
    }
    return total + (orderQty * (item.costPerUnit || 0));
  }, 0);

  const poRef = useRef(newDocRef('purchaseOrders'));
  const poNumber = formatIdentifier('PO', poRef.current);
  const dateStr = new Date().toLocaleDateString();

  const handleSavePO = async () => {
    if (!supplier) {
      toast.error(t('po:cannotSave'));
      return;
    }
    
    setIsSaving(true);
    try {
      const poData: Partial<PurchaseOrder> = {
        poNumber,
        supplierId: supplier.id,
        status: 'draft',
        totalAmount: orderTotal,
        items: items.map(item => {
          let orderQty = item.quantity;
          if (item.moq && item.moq > 0) {
            orderQty = Math.ceil(item.quantity / item.moq) * item.moq;
          }
          return {
            ingredientId: item.ingredientId,
            quantityOrdered: orderQty,
            quantityReceived: 0,
            unitPrice: item.costPerUnit || 0,
            name: item.name,
            unit: item.orderUnit || item.unit
          };
        }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(poRef.current, poData);
      poRef.current = newDocRef('purchaseOrders'); // Reset for next PO
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'purchaseOrders');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-stone-50">
          <h3 className="text-lg font-semibold text-stone-900">{t('po:statusDraft')}</h3>
          <div className="flex items-center gap-2">
            {supplier && (
              <button 
                onClick={handleSavePO} 
                disabled={isSaving}
                className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? t('po:saving') : t('po:save')}
              </button>
            )}
            <button onClick={() => handlePrint()} className="p-2 text-stone-600 hover:text-amber-700 hover:bg-white rounded-lg transition-all shadow-sm" title={t('po:print')}>
              <Printer className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8" ref={printRef}>
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-stone-900 mb-2">{t('po:printTitle')}</h1>
              <p className="text-stone-500 font-medium">{t('po:printNumber')} {poNumber}</p>
              <p className="text-stone-500 font-medium">{t('po:printDate')} {dateStr}</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-stone-900">{t('common:companyName')}</h2>
              <p className="text-stone-500">{t('common:companyAddress1')}</p>
              <p className="text-stone-500">{t('common:companyAddress2')}</p>
            </div>
          </div>

          <div className="mb-8 p-4 bg-stone-50 rounded-xl border border-stone-200">
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">{t('po:vendor')}</h3>
            {supplier ? (
              <>
                <p className="font-bold text-stone-900 text-lg">{supplier.name}</p>
                {supplier.contactName && <p className="text-stone-700">{supplier.contactName}</p>}
                {supplier.email && <p className="text-stone-700">{supplier.email}</p>}
                {supplier.phone && <p className="text-stone-700">{supplier.phone}</p>}
              </>
            ) : (
              <p className="font-bold text-stone-900 text-lg">{t('po:generalUnassigned')}</p>
            )}
          </div>

          <table className="min-w-full divide-y divide-stone-200 mb-8">
            <thead>
              <tr>
                <th className="py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('po:itemDescription')}</th>
                <th className="py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('po:qty')}</th>
                <th className="py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('po:unit')}</th>
                <th className="py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('po:unitPrice')}</th>
                <th className="py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('po:total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map(item => {
                let orderQty = item.quantity;
                let displayUnit = item.unit;
                if (item.moq && item.moq > 0) {
                  orderQty = Math.ceil(item.quantity / item.moq) * item.moq;
                }
                if (item.orderUnit) {
                  displayUnit = item.orderUnit;
                }
                const lineTotal = orderQty * (item.costPerUnit || 0);

                return (
                  <tr key={item.id}>
                    <td className="py-3 text-sm font-medium text-stone-900">{item.name}</td>
                    <td className="py-3 text-sm text-stone-900 text-right">{orderQty}</td>
                    <td className="py-3 text-sm text-stone-500 text-right">{displayUnit}</td>
                    <td className="py-3 text-sm text-stone-500 text-right">${(item.costPerUnit || 0).toFixed(2)}</td>
                    <td className="py-3 text-sm font-medium text-stone-900 text-right">${lineTotal.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="py-4 text-right font-bold text-stone-900">{t('po:printTotalLabel')}</td>
                <td className="py-4 text-right font-bold text-stone-900">${orderTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          {supplier?.notes && (
            <div className="mt-8 pt-8 border-t border-stone-200">
              <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">{t('po:printNotesTerms')}</h3>
              <p className="text-stone-700 whitespace-pre-wrap">{supplier.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
