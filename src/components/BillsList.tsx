import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bill } from '../types';
import { listRecentBills } from '../services/billsService';
import { Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { getVendorsByIds } from '../services/vendorsService';
import { useToast } from '../contexts/ToastContext';

interface BillsListProps {
  onCardClick: (bill: Bill) => void;
}

export default function BillsList({ onCardClick }: BillsListProps) {
  const { t } = useTranslation(['expenses']);
  const { toast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorNames, setVendorNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await listRecentBills(50);
        if (!mounted) return;
        setBills(data);
        
        // Fetch vendor names for resolved vendors
        const vendorIds = Array.from(new Set(data.map(b => b.vendorId).filter(Boolean))) as string[];
        const vs = vendorIds.length > 0 ? await getVendorsByIds(vendorIds) : [];
        const vendorMap: Record<string, string> = {};
        vs.forEach(v => { vendorMap[v.id] = v.name; });
        if (!mounted) return;
        setVendorNames(vendorMap);
      } catch (err: any) {
        toast.error(t('expenses:errors.listBillsFailed', { message: err?.message || '' }));
        console.error('List bills failed', err);
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
          <div key={i} className="animate-pulse bg-white border border-cocoa-100 rounded-2xl h-24" />
        ))}
      </div>
    );
  }

  if (bills.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-cocoa-100 border-dashed">
        <Receipt className="w-12 h-12 text-cocoa-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-cocoa-900 mb-1">{t('expenses:list.billsEmpty')}</h3>
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: string) => 
    new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'extracted': return 'bg-amber-100 text-amber-800';
      case 'reviewed': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-violet-100 text-violet-800';
      case 'paid': return 'bg-pistachio/20 text-cocoa-900';
      case 'partially_paid': return 'bg-amber-100 text-amber-800';
      case 'reconciled': return 'bg-pistachio/30 text-cocoa-900';
      case 'disputed': return 'bg-raspberry/20 text-raspberry';
      case 'void': return 'bg-cocoa-100 text-cocoa-500';
      default: return 'bg-cocoa-100 text-cocoa-500';
    }
  };

  return (
    <div className="space-y-4">
      {bills.map(bill => {
        const displayName = bill.vendorId ? vendorNames[bill.vendorId] || bill.extractedVendorName : bill.extractedVendorName;
        const bDateSeconds = (bill.billDate as any)?._seconds ?? (bill.billDate as any)?.seconds;
        const dDateSeconds = (bill.dueDate as any)?._seconds ?? (bill.dueDate as any)?.seconds;
        return (
          <div
            key={bill.id}
            onClick={() => onCardClick(bill)}
            className="bg-white rounded-2xl shadow-sm border border-cocoa-100 p-4 cursor-pointer hover:border-copper transition-colors flex justify-between items-center"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-cocoa-900">{displayName}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                  {t(`expenses:billStatus.${bill.status}` as any)}
                </span>
              </div>
              <div className="text-sm text-cocoa-500 flex items-center gap-3">
                {bDateSeconds && <span>{t('expenses:list.billCardBill')}: {format(new Date(bDateSeconds * 1000), 'MMM d, yyyy')}</span>}
                {dDateSeconds && (
                  <span>| {t('expenses:list.billCardDue')}: {format(new Date(dDateSeconds * 1000), 'MMM d, yyyy')}</span>
                )}
              </div>
            </div>
            <div className="font-medium text-cocoa-900">
              {formatCurrency(bill.totalAmount, bill.currency || 'USD')}
            </div>
          </div>
        );
      })}
    </div>
  );
}
