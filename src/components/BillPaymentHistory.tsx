import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Payment } from '../types';
import { listPaymentsForBill } from '../services/paymentsService';
import { format } from 'date-fns';
import { getBill } from '../services/billsService';
import { useToast } from '../contexts/ToastContext';

interface BillPaymentHistoryProps {
  billId: string;
}

export default function BillPaymentHistory({ billId }: BillPaymentHistoryProps) {
  const { t } = useTranslation(['expenses']);
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [amountDue, setAmountDue] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [ps, b] = await Promise.all([
          listPaymentsForBill(billId),
          getBill(billId)
        ]);
        if (!mounted) return;
        setPayments(ps);
        if (b) {
          setPaidAmount(b.paidAmount || 0);
          setAmountDue(b.amountDue ?? b.totalAmount);
        }
      } catch (err: any) {
        toast.error(t('expenses:errors.paymentHistoryFailed', { message: err?.message || '' }));
        console.error('Load payment history failed', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [billId]);

  if (loading || payments.length === 0) return null;

  return (
    <section className="mt-8 pt-6 border-t border-cocoa-100">
      <h3 className="text-sm font-semibold text-cocoa-900 mb-3">{t('expenses:paymentHistory.title')}</h3>
      <div className="bg-white rounded-xl border border-cocoa-100 p-4 space-y-3">
        {payments.map(p => {
          const alloc = p.billAllocations.find(a => a.billId === billId);
          if (!alloc) return null;
          const pDateSecs = (p.paymentDate as any)?._seconds ?? (p.paymentDate as any)?.seconds;
          const dt = pDateSecs ? format(new Date(pDateSecs * 1000), 'MMM d, yyyy') : '';
          return (
            <div key={p.id} className="text-sm text-cocoa-700 flex flex-wrap gap-1">
              <span>{dt} — ${alloc.amount.toFixed(2)}</span>
              <span className="text-cocoa-500">
                ({t(`expenses:paymentMethod.${p.method}` as any)}{p.reference ? `, ${t('expenses:paymentHistory.referenceLabel')} ${p.reference}` : ''})
              </span>
            </div>
          );
        })}
        <div className="text-sm font-medium text-cocoa-900 pt-2 border-t border-cocoa-50">
          {t('expenses:paymentHistory.totalPaidOf', { paid: `$${paidAmount.toFixed(2)}`, due: `$${amountDue.toFixed(2)}` })}
        </div>
      </div>
    </section>
  );
}
