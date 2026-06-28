import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Vendor, ExpenseCategory, RecurringExpectation } from '../types';
import { createVendor, updateVendor, listExpenseCategories } from '../services/vendorsService';
import { listRecurringExpectationsForVendor } from '../services/recurringExpectationsService';
import { parseRRule } from '../utils/rrule';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../contexts/ToastContext';

interface VendorFormProps {
  isOpen: boolean;
  onClose: () => void;
  existingVendor?: Vendor;
  prefilledFromExtraction?: {
    name: string;
    address?: string;
    accountIdentifier?: string;
  };
  onSaved: (vendor: Vendor) => void;
}

export default function VendorForm({ isOpen, onClose, existingVendor, prefilledFromExtraction, onSaved }: VendorFormProps) {
  const { t } = useTranslation(['expenses']);
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [expenseCategoryId, setExpenseCategoryId] = useState('');
  const [accountIdentifier, setAccountIdentifier] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [vendorRecurring, setVendorRecurring] = useState<RecurringExpectation[]>([]);

  useEffect(() => {
    if (isOpen) {
      listExpenseCategories().then(setCategories).catch(console.error);
      setVendorRecurring([]);
      if (existingVendor?.id) {
        listRecurringExpectationsForVendor(existingVendor.id).then(setVendorRecurring).catch(console.error);
      }
      if (existingVendor) {
        setName(existingVendor.name || '');
        setExpenseCategoryId(existingVendor.expenseCategoryId || '');
        setAccountIdentifier(existingVendor.accountIdentifier || '');
        setAddress(existingVendor.address || '');
        setWebsite(existingVendor.website || '');
        setPhone(existingVendor.phone || '');
        setDefaultPaymentMethod(existingVendor.defaultPaymentMethod || '');
        setNotes(existingVendor.notes || '');
        setIsActive(existingVendor.isActive ?? true);
      } else if (prefilledFromExtraction) {
        setName(prefilledFromExtraction.name || '');
        setAddress(prefilledFromExtraction.address || '');
        setAccountIdentifier(prefilledFromExtraction.accountIdentifier || '');
        setExpenseCategoryId('');
        setWebsite('');
        setPhone('');
        setDefaultPaymentMethod('');
        setNotes('');
        setIsActive(true);
      } else {
        setName('');
        setExpenseCategoryId('');
        setAccountIdentifier('');
        setAddress('');
        setWebsite('');
        setPhone('');
        setDefaultPaymentMethod('');
        setNotes('');
        setIsActive(true);
      }
    }
  }, [isOpen, existingVendor, prefilledFromExtraction]);

  if (!isOpen) return null;

  async function handleSave() {
    if (!name.trim()) return toast.error(t('expenses:vendorForm.nameRequired'));
    if (!expenseCategoryId) return toast.error(t('expenses:vendorForm.categoryRequired'));
    
    setSaving(true);
    try {
      const vendorData: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'> = {
        name,
        isActive,
        expenseCategoryId,
        accountIdentifier: accountIdentifier || undefined,
        address: address || undefined,
        website: website || undefined,
        phone: phone || undefined,
        defaultPaymentMethod: defaultPaymentMethod as any || undefined,
        notes: notes || undefined,
      };
      
      let savedVendor: Vendor;
      if (existingVendor?.id) {
        await updateVendor(existingVendor.id, vendorData);
        savedVendor = { ...vendorData, id: existingVendor.id } as Vendor;
      } else {
        const id = await createVendor(vendorData);
        savedVendor = { ...vendorData, id } as Vendor;
      }
      toast.success(t('expenses:vendorForm.savedToast'));
      onSaved(savedVendor);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(t('expenses:vendorForm.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cocoa-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between p-6 border-b border-cocoa-100">
            <h2 className="text-xl font-display font-semibold text-cocoa-900">
              {existingVendor ? t('expenses:vendorForm.editTitle') : t('expenses:vendorForm.newTitle')}
            </h2>
            <button
              onClick={onClose}
              className="text-cocoa-400 hover:text-cocoa-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('expenses:vendorForm.name')} *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-cocoa-100 rounded-xl px-3 py-2 focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/20"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('expenses:vendorForm.expenseCategory')} *</label>
                <select
                  value={expenseCategoryId}
                  onChange={e => setExpenseCategoryId(e.target.value)}
                  className="w-full border border-cocoa-100 rounded-xl px-3 py-2 bg-white focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/20"
                >
                  <option value="">--</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('expenses:vendorForm.accountIdentifier')}</label>
                <input
                  type="text"
                  value={accountIdentifier}
                  onChange={e => setAccountIdentifier(e.target.value)}
                  className="w-full border border-cocoa-100 rounded-xl px-3 py-2 focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('expenses:vendorForm.address')}</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full border border-cocoa-100 rounded-xl px-3 py-2 focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/20"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('expenses:vendorForm.website')}</label>
                <input
                  type="text"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  className="w-full border border-cocoa-100 rounded-xl px-3 py-2 focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('expenses:vendorForm.phone')}</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full border border-cocoa-100 rounded-xl px-3 py-2 focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('expenses:vendorForm.defaultPaymentMethod')}</label>
              <select
                value={defaultPaymentMethod}
                onChange={e => setDefaultPaymentMethod(e.target.value)}
                className="w-full border border-cocoa-100 rounded-xl px-3 py-2 bg-white focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/20"
              >
                <option value="">--</option>
                <option value="ACH">ACH</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Check">Check</option>
                <option value="Cash">Cash</option>
                <option value="Wire">Wire</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('expenses:vendorForm.notes')}</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full border border-cocoa-100 rounded-xl px-3 py-2 focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/20 resize-none"
              />
            </div>

            {existingVendor && vendorRecurring.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-cocoa-700 mb-1">
                  {t('expenses:vendorForm.recurringFromVendor', 'Recurring bills from this vendor')}
                </label>
                <ul className="space-y-1 text-sm text-cocoa-600 bg-cocoa-50 rounded-xl p-3 border border-cocoa-100">
                  {vendorRecurring.map(exp => {
                    let cadence = '';
                    try { cadence = parseRRule(exp.rrule).toText(); } catch { cadence = exp.rrule; }
                    return (
                      <li key={exp.id} className="flex justify-between gap-2">
                        <span className="capitalize">{cadence}</span>
                        <span className="font-mono">{`$${exp.expectedAmount.toFixed(2)}`}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                id="vendorIsActive"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="rounded text-copper focus:ring-copper"
              />
              <label htmlFor="vendorIsActive" className="text-sm font-medium text-cocoa-700">{t('expenses:vendorForm.isActive')}</label>
            </div>
            <div className="h-4"></div>
          </div>

          <div className="p-6 border-t border-cocoa-100 flex justify-end gap-3 bg-cocoa-100">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-cocoa-700 bg-white border border-cocoa-200 rounded-lg hover:bg-cocoa-100 transition-colors"
            >
              {t('expenses:actions.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-copper rounded-lg hover:bg-copper-dark transition-colors disabled:opacity-50"
            >
              {t('expenses:actions.saveVendor')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

