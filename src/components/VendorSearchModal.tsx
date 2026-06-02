import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Vendor } from '../types';
import { listVendors, listExpenseCategories } from '../services/vendorsService';
import { X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../contexts/ToastContext';

interface VendorSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (vendor: Vendor) => void;
}

export default function VendorSearchModal({ isOpen, onClose, onSelect }: VendorSearchModalProps) {
  const { t } = useTranslation(['expenses']);
  const { toast } = useToast();
  
  const [query, setQuery] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([listVendors(true), listExpenseCategories()])
        .then(([vs, cats]) => {
          setVendors(vs);
          const catMap: Record<string, string> = {};
          cats.forEach(c => { catMap[c.id] = c.name; });
          setCategories(catMap);
        })
        .catch((err: any) => {
          toast.error(t('expenses:errors.vendorSearchFailed', { message: err?.message || '' }));
          console.error('Vendor search load failed', err);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!query) return vendors;
    const q = query.toLowerCase();
    return vendors.filter(v => 
      v.name.toLowerCase().includes(q) || 
      (v.accountIdentifier && v.accountIdentifier.toLowerCase().includes(q))
    );
  }, [query, vendors]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cocoa-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]"
        >
          <div className="flex items-center justify-between p-6 border-b border-cocoa-100 shrink-0">
            <h2 className="text-xl font-display font-semibold text-cocoa-900">
              {t('expenses:vendorSearch.title')}
            </h2>
            <button
              onClick={onClose}
              className="text-cocoa-400 hover:text-cocoa-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-4 border-b border-cocoa-100 bg-cocoa-100/30">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-400" />
              <input
                type="text"
                placeholder={t('expenses:vendorSearch.placeholder')}
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-cocoa-200 rounded-xl bg-white focus:outline-none focus:border-copper focus:ring-1 focus:ring-copper"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading && <div className="text-center text-sm text-cocoa-500 py-4">{t('expenses:states.loading')}</div>}
            
            {!loading && vendors.length === 0 && (
              <div className="text-center text-sm text-cocoa-500 py-8">
                {t('expenses:vendorSearch.noVendorsYet')}
              </div>
            )}
            
            {!loading && vendors.length > 0 && filtered.length === 0 && (
              <div className="text-center text-sm text-cocoa-500 py-8">
                {t('expenses:vendorSearch.empty')}
              </div>
            )}

            {!loading && filtered.map(v => (
              <button
                key={v.id}
                onClick={() => { onSelect(v); onClose(); }}
                className="w-full text-left p-3 border border-cocoa-100 rounded-xl hover:border-copper/30 hover:bg-copper/5 transition-colors group flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-cocoa-900 group-hover:text-copper transition-colors">{v.name}</div>
                  {v.accountIdentifier && (
                    <div className="text-xs text-cocoa-500 mt-0.5">
                      {t('expenses:list.vendorCardAccount')}: {v.accountIdentifier}
                    </div>
                  )}
                </div>
                {v.expenseCategoryId && categories[v.expenseCategoryId] && (
                  <div className="text-xs font-medium text-cocoa-400 bg-cocoa-100 px-2 py-1 rounded">
                    {categories[v.expenseCategoryId]}
                  </div>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
