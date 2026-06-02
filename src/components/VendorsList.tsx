import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Vendor } from '../types';
import { listVendors, listExpenseCategories } from '../services/vendorsService';
import { Store } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface VendorsListProps {
  onCardClick: (vendor: Vendor) => void;
}

export default function VendorsList({ onCardClick }: VendorsListProps) {
  const { t } = useTranslation(['expenses']);
  const { toast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [cats, vends] = await Promise.all([
          listExpenseCategories(),
          listVendors()
        ]);
        if (!mounted) return;
        const catMap: Record<string, string> = {};
        cats.forEach(c => { catMap[c.id] = c.name; });
        setCategories(catMap);
        setVendors(vends);
      } catch (err: any) {
        toast.error(t('expenses:errors.listVendorsFailed', { message: err?.message || '' }));
        console.error('List vendors failed', err);
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

  if (vendors.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-cocoa-100 border-dashed">
        <Store className="w-12 h-12 text-cocoa-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-cocoa-900 mb-1">{t('expenses:list.vendorsEmpty')}</h3>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {vendors.map(vendor => (
        <div
          key={vendor.id}
          onClick={() => onCardClick(vendor)}
          className={`bg-white rounded-2xl shadow-sm border border-cocoa-100 p-4 cursor-pointer hover:border-copper transition-colors flex justify-between items-center ${!vendor.isActive ? 'opacity-60' : ''}`}
        >
          <div>
            <div className="font-semibold text-cocoa-900 mb-1">
              {vendor.name}
              {!vendor.isActive && <span className="ml-2 px-2 py-0.5 bg-cocoa-100 text-cocoa-500 rounded-full text-xs">{t('expenses:list.inactiveBadge')}</span>}
            </div>
            <div className="text-sm text-cocoa-500 flex items-center gap-3">
              {vendor.accountIdentifier && (
                <span>{t('expenses:list.vendorCardAccount')}: {vendor.accountIdentifier}</span>
              )}
              {vendor.defaultPaymentMethod && (
                <span>| {t('expenses:vendorForm.defaultPaymentMethod')}: {t(`expenses:paymentMethod.${vendor.defaultPaymentMethod}` as any)}</span>
              )}
            </div>
          </div>
          <div className="text-sm text-cocoa-500">
            {categories[vendor.expenseCategoryId] || '—'}
          </div>
        </div>
      ))}
    </div>
  );
}

