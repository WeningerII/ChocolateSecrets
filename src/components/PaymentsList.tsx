import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Payment } from '../types';
import { listRecentPayments } from '../services/paymentsService';
import { getVendorsByIds } from '../services/vendorsService';
import { getBillsByIds } from '../services/billsService';
import { format } from 'date-fns';
import { Receipt } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function PaymentsList() {
  const { t } = useTranslation(['expenses']);
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [vendorNames, setVendorNames] = useState<Record<string, string>>({});
  const [billDescriptions, setBillDescriptions] = useState<Record<string, string>>({});
  const [billVendorMap, setBillVendorMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await listRecentPayments(50);
        if (!mounted) return;
        setPayments(data);
        
        const billIds = Array.from(new Set(data.flatMap(p => p.billAllocations.map(a => a.billId))));
        const bills = billIds.length > 0 ? await getBillsByIds(billIds) : [];
        if (!mounted) return;
        
        const bDescMap: Record<string, string> = {};
        const bVendorMap: Record<string, string> = {};
        const vendorIds = new Set<string>();
        
        bills.forEach(b => {
          if (b.vendorId) {
            vendorIds.add(b.vendorId);
            bVendorMap[b.id] = b.vendorId;
          }
          const bDateSeconds = (b.billDate as any)?._seconds ?? (b.billDate as any)?.seconds;
          const dateDesc = bDateSeconds ? format(new Date(bDateSeconds * 1000), 'MMM d, yyyy') : '';
          bDescMap[b.id] = b.invoiceNumber || dateDesc;
        });
        setBillDescriptions(bDescMap);
        setBillVendorMap(bVendorMap);
        
        const vs = vendorIds.size > 0 ? await getVendorsByIds(Array.from(vendorIds)) : [];
        if (!mounted) return;
        
        const vMap: Record<string, string> = {};
        vs.forEach(v => { vMap[v.id] = v.name; });
        setVendorNames(vMap);
        
      } catch (err: any) {
        toast.error(t('expenses:errors.listPaymentsFailed', { message: err?.message || '' }));
        console.error('List payments failed', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-white border border-cocoa-200 rounded-2xl h-24" />
        ))}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-cocoa-200 border-dashed">
        <Receipt className="w-12 h-12 text-cocoa-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-cocoa-900 mb-1">{t('expenses:paymentsList.empty')}</h3>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {payments.map(payment => {
        const pDateSeconds = (payment.paymentDate as any)?._seconds ?? (payment.paymentDate as any)?.seconds;
        
        let vendorName: string = t('expenses:review.unknownVendor');
        if (payment.billAllocations.length > 0) {
           const firstBillId = payment.billAllocations[0].billId;
           const vId = billVendorMap[firstBillId];
           if (vId && vendorNames[vId]) vendorName = vendorNames[vId];
        }
        
        return (
          <div key={payment.id} className="bg-white rounded-2xl shadow-sm border border-cocoa-200 p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold text-cocoa-900 mb-1">{vendorName}</div>
                <div className="font-medium text-cocoa-800 flex items-center gap-2">
                  <span>${payment.amount.toFixed(2)}</span>
                  <span className="px-2 py-0.5 bg-cocoa-100 text-cocoa-600 rounded-full text-xs">{t(`expenses:paymentMethod.${payment.method}` as any)}</span>
                </div>
                {pDateSeconds && (
                  <div className="text-sm text-cocoa-500 mt-1">{format(new Date(pDateSeconds * 1000), 'MMM d, yyyy')}</div>
                )}
              </div>
              {payment.reference && (
                <div className="text-xs text-cocoa-400 font-mono">
                  {t('expenses:paymentHistory.referenceLabel')}: {payment.reference}
                </div>
              )}
            </div>
            <div className="mt-4 space-y-1">
              {payment.billAllocations.map((alloc, i) => (
                <div key={i} className="text-sm flex items-center gap-2 text-cocoa-600">
                  <span className="text-cocoa-400">↳</span>
                  <span>{billDescriptions[alloc.billId] || alloc.billId}</span>
                  <span className="text-cocoa-400">(${alloc.amount.toFixed(2)})</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
