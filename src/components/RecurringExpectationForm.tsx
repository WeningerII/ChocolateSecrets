import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { RecurringExpectation, Vendor, ExpenseCategory } from '../types';
import { createRecurringExpectation, updateRecurringExpectation } from '../services/recurringExpectationsService';
import { listVendors, listExpenseCategories } from '../services/vendorsService';
import { parseRRule, nextNOccurrences } from '../utils/rrule';
import { format } from 'date-fns';

interface RecurringExpectationFormProps {
  isOpen: boolean;
  onClose: () => void;
  existing?: RecurringExpectation;
  prefilledVendorId?: string;
  onSaved: (id: string) => void;
}

type CadencePreset = 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom';

export default function RecurringExpectationForm({ isOpen, onClose, existing, prefilledVendorId, onSaved }: RecurringExpectationFormProps) {
  const { t } = useTranslation(['expenses']);
  const { toast } = useToast();
  
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  
  const [vendorId, setVendorId] = useState('');
  const [expenseCategoryId, setExpenseCategoryId] = useState('');
  const [preset, setPreset] = useState<CadencePreset>('monthly');
  const [day, setDay] = useState<number>(15);
  const [month, setMonth] = useState<number>(1);
  const [rruleStr, setRruleStr] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expectedAmount, setExpectedAmount] = useState<number | ''>('');
  const [toleranceLow, setToleranceLow] = useState<number | ''>(50);
  const [toleranceHigh, setToleranceHigh] = useState<number | ''>(50);
  const [graceDays, setGraceDays] = useState<number | ''>(5);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      listVendors(true).then(vs => setVendors(vs.sort((a,b) => a.name.localeCompare(b.name)))).catch(console.error);
      listExpenseCategories().then(setCategories).catch(console.error);
      
      if (existing) {
        setVendorId(existing.vendorId);
        setExpenseCategoryId(existing.expenseCategoryId || '');
        setExpectedAmount(existing.expectedAmount);
        setToleranceLow(existing.tolerance.amountToleranceBand.low);
        setToleranceHigh(existing.tolerance.amountToleranceBand.high);
        setGraceDays(existing.tolerance.graceDays);
        setIsActive(existing.isActive);
        setNotes(existing.notes || '');
        setRruleStr(existing.rrule);
        
        // Try to reverse-engineer preset
        const rrule = existing.rrule.toUpperCase();
        if (rrule.includes('FREQ=MONTHLY;BYMONTHDAY=')) {
          const m = rrule.match(/BYMONTHDAY=(\d+)/);
          if (m && !rrule.includes('BYMONTH=')) {
            setPreset('monthly');
            setDay(parseInt(m[1], 10));
          } else {
            setPreset('custom');
            setShowAdvanced(true);
          }
        } else if (rrule.includes('FREQ=YEARLY') && rrule.includes('BYMONTH=1,4,7,10')) {
          setPreset('quarterly');
          const m = rrule.match(/BYMONTHDAY=(\d+)/);
          if (m) setDay(parseInt(m[1], 10));
        } else if (rrule.includes('FREQ=YEARLY') && rrule.includes('BYMONTH=1,7')) {
          setPreset('semiannual');
          const m = rrule.match(/BYMONTHDAY=(\d+)/);
          if (m) setDay(parseInt(m[1], 10));
        } else if (rrule.includes('FREQ=YEARLY') && !rrule.includes('1,4,7,10') && !rrule.includes('1,7')) {
          const mDay = rrule.match(/BYMONTHDAY=(\d+)/);
          const mMonth = rrule.match(/BYMONTH=(\d+)/);
          if (mDay && mMonth) {
            setPreset('annual');
            setDay(parseInt(mDay[1], 10));
            setMonth(parseInt(mMonth[1], 10));
          } else {
            setPreset('custom');
            setShowAdvanced(true);
          }
        } else {
          setPreset('custom');
          setShowAdvanced(true);
        }
      } else {
        setVendorId(prefilledVendorId || '');
        setExpenseCategoryId('');
        setPreset('monthly');
        setDay(15);
        setMonth(1);
        setRruleStr('');
        setShowAdvanced(false);
        setExpectedAmount('');
        setToleranceLow(50);
        setToleranceHigh(50);
        setGraceDays(5);
        setIsActive(true);
        setNotes('');
      }
    }
  }, [isOpen, existing, prefilledVendorId]);

  // Compute RRULE from presets
  const computedRrule = useMemo(() => {
    if (preset === 'custom') return rruleStr;
    const d = Math.max(1, Math.min(28, day)); // simplistic clamp for presets
    const m = Math.max(1, Math.min(12, month));
    switch (preset) {
      case 'monthly': return `FREQ=MONTHLY;BYMONTHDAY=${d}`;
      case 'quarterly': return `FREQ=YEARLY;BYMONTH=1,4,7,10;BYMONTHDAY=${d}`;
      case 'semiannual': return `FREQ=YEARLY;BYMONTH=1,7;BYMONTHDAY=${d}`;
      case 'annual': return `FREQ=YEARLY;BYMONTH=${m};BYMONTHDAY=${d}`;
      default: return '';
    }
  }, [preset, day, month, rruleStr]);

  const preview = useMemo(() => {
    if (!computedRrule) return null;
    let nextDates: Date[] = [];
    let error = '';
    let summaryText = '';
    
    try {
      const parsed = parseRRule(computedRrule);
      summaryText = parsed.toText();
      nextDates = nextNOccurrences(computedRrule, new Date(), 3);
    } catch (e: any) {
      error = e.message;
    }
    
    return { summary: summaryText, nextDates, error };
  }, [computedRrule]);

  useEffect(() => {
    if (vendorId && !expenseCategoryId) {
      const v = vendors.find(x => x.id === vendorId);
      if (v?.expenseCategoryId) {
        setExpenseCategoryId(v.expenseCategoryId);
      }
    }
  }, [vendorId, vendors, expenseCategoryId]);

  if (!isOpen) return null;

  async function handleSave() {
    if (!vendorId) return toast.error(t('expenses:recurring.form.vendorRequired'));
    if (!computedRrule) return toast.error(t('expenses:recurring.form.rruleEmpty'));
    if (expectedAmount === '' || expectedAmount <= 0) return toast.error(t('expenses:recurring.form.expectedAmountInvalid'));
    
    if (preview?.error) {
      return toast.error(t('expenses:recurring.form.rruleInvalid', { error: preview.error }));
    }
    if (!preview?.nextDates || preview.nextDates.length === 0) {
      return toast.error(t('expenses:recurring.form.rruleInvalid', { error: 'RRULE produces no future occurrences' }));
    }
    
    setSaving(true);
    try {
      const payload: Omit<RecurringExpectation, 'id' | 'createdAt' | 'updatedAt' | 'lastCheckedAt' | 'nextExpectedDate'> = {
        vendorId,
        expenseCategoryId: expenseCategoryId || undefined,
        rrule: computedRrule,
        expectedAmount: Number(expectedAmount),
        tolerance: {
          amountToleranceBand: {
            low: Number(toleranceLow || 0),
            high: Number(toleranceHigh || 0),
          },
          graceDays: Number(graceDays || 5),
        },
        isActive,
        notes: notes || undefined,
      };
      
      let savedId = existing?.id || '';
      if (savedId) {
        await updateRecurringExpectation(savedId, payload);
      } else {
        savedId = await createRecurringExpectation(payload);
      }
      
      toast.success(t('expenses:recurring.form.savedToast'));
      onSaved(savedId);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(t('expenses:recurring.form.saveError'));
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
           className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between p-6 border-b border-cocoa-100 shrink-0">
            <h2 className="text-xl font-display font-semibold text-cocoa-900">
              {existing ? t('expenses:recurring.form.editTitle') : t('expenses:recurring.form.newTitle')}
            </h2>
            <button onClick={onClose} className="text-cocoa-400 hover:text-cocoa-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('expenses:recurring.form.vendor')} *</label>
                <select
                  value={vendorId}
                  onChange={e => setVendorId(e.target.value)}
                  className="w-full border border-cocoa-100 rounded-xl px-3 py-2 bg-white focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/20"
                >
                  <option value="">--</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('expenses:recurring.form.category')}</label>
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
            </div>

            <div className="border border-cocoa-100 rounded-xl p-4 bg-cocoa-50/50">
              <label className="block text-sm font-medium text-cocoa-900 mb-3">{t('expenses:recurring.form.cadenceSection')}</label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" checked={preset === 'monthly'} onChange={() => setPreset('monthly')} className="text-copper" />
                  <span className="text-sm text-cocoa-700 flex items-center gap-2">
                    {String(t('expenses:recurring.form.cadenceMonthly')).replace('{{day}}', '')}
                    <input type="number" min="1" max="28" value={day} onChange={e => setDay(Number(e.target.value))} disabled={preset !== 'monthly'} className="w-16 px-2 py-1 text-sm border border-cocoa-200 rounded-lg text-center" />
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" checked={preset === 'quarterly'} onChange={() => setPreset('quarterly')} className="text-copper" />
                  <span className="text-sm text-cocoa-700 flex items-center gap-2">
                    {String(t('expenses:recurring.form.cadenceQuarterly')).replace('{{day}}', '')}
                    <input type="number" min="1" max="28" value={day} onChange={e => setDay(Number(e.target.value))} disabled={preset !== 'quarterly'} className="w-16 px-2 py-1 text-sm border border-cocoa-200 rounded-lg text-center" />
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" checked={preset === 'semiannual'} onChange={() => setPreset('semiannual')} className="text-copper" />
                  <span className="text-sm text-cocoa-700 flex items-center gap-2">
                    {String(t('expenses:recurring.form.cadenceSemiAnnual')).replace('{{day}}', '')}
                    <input type="number" min="1" max="28" value={day} onChange={e => setDay(Number(e.target.value))} disabled={preset !== 'semiannual'} className="w-16 px-2 py-1 text-sm border border-cocoa-200 rounded-lg text-center" />
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" checked={preset === 'annual'} onChange={() => setPreset('annual')} className="text-copper" />
                  <span className="text-sm text-cocoa-700 flex items-center gap-2">
                    {String(t('expenses:recurring.form.cadenceAnnual')).replace('{{date}}', '')}
                    <select value={month} onChange={e => setMonth(Number(e.target.value))} disabled={preset !== 'annual'} className="px-2 py-1 text-sm border border-cocoa-200 rounded-lg bg-white">
                      {Array.from({length: 12}).map((_, i) => (
                        <option key={i+1} value={i+1}>{format(new Date(2024, i, 1), 'MMM')}</option>
                      ))}
                    </select>
                    <input type="number" min="1" max="28" value={day} onChange={e => setDay(Number(e.target.value))} disabled={preset !== 'annual'} className="w-16 px-2 py-1 text-sm border border-cocoa-200 rounded-lg text-center" />
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer pb-2">
                  <input type="radio" checked={preset === 'custom'} onChange={() => {
                    if (!rruleStr && computedRrule) setRruleStr(computedRrule);
                    setPreset('custom');
                    setShowAdvanced(true);
                  }} className="text-copper" />
                  <span className="text-sm text-cocoa-700">{t('expenses:recurring.form.cadenceCustom')}</span>
                </label>
                
                <div className="pt-2 border-t border-cocoa-200/50">
                  <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs font-semibold text-copper flex items-center gap-1">
                    {showAdvanced ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    {t('expenses:recurring.form.advanced')}
                  </button>
                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="pt-3 pb-1">
                          <label className="block text-xs font-medium text-cocoa-500 mb-1">{t('expenses:recurring.form.rruleLabel')}</label>
                          <input
                            type="text"
                            value={preset === 'custom' ? rruleStr : computedRrule}
                            onChange={e => {
                              setPreset('custom');
                              setRruleStr(e.target.value);
                            }}
                            className="w-full font-mono text-xs border border-cocoa-200 rounded-xl px-3 py-2 focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/20"
                            placeholder="FREQ=MONTHLY;BYMONTHDAY=15"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('expenses:recurring.form.expectedAmount')} *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-cocoa-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={expectedAmount}
                    onChange={e => setExpectedAmount(e.target.value ? Number(e.target.value) : '')}
                    className="w-full border border-cocoa-100 rounded-xl pl-7 pr-3 py-2 focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/20"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('expenses:recurring.form.toleranceSection')}</label>
                <div className="flex gap-2 items-center text-sm text-cocoa-600">
                  <span className="w-28 opacity-70">↓ {String(t('expenses:recurring.form.toleranceLow', { amount: '' } as any)).replace(/Allow up to|below/gi, '').trim() || 'Low tol.'}</span>
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1 text-cocoa-400">$</span>
                    <input type="number" min="0" value={toleranceLow} onChange={e => setToleranceLow(e.target.value ? Number(e.target.value) : '')} className="w-full border border-cocoa-200 rounded-lg pl-5 pr-2 py-1 text-sm focus:border-copper focus:outline-none" />
                  </div>
                </div>
                <div className="flex gap-2 items-center text-sm text-cocoa-600">
                  <span className="w-28 opacity-70">↑ {String(t('expenses:recurring.form.toleranceHigh', { amount: '' } as any)).replace(/Allow up to|above/gi, '').trim() || 'High tol.'}</span>
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1 text-cocoa-400">$</span>
                    <input type="number" min="0" value={toleranceHigh} onChange={e => setToleranceHigh(e.target.value ? Number(e.target.value) : '')} className="w-full border border-cocoa-200 rounded-lg pl-5 pr-2 py-1 text-sm focus:border-copper focus:outline-none" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('expenses:recurring.form.graceDays')}</label>
              <div className="flex gap-3 ">
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={graceDays}
                 onChange={e => setGraceDays(e.target.value ? Number(e.target.value) : '')}
                  className="w-24 border border-cocoa-100 rounded-xl px-3 py-2 text-center focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/20"
                />
                <p className="text-xs text-cocoa-400 mt-2">{t('expenses:recurring.form.graceDaysHelp')}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('expenses:recurring.form.notes')}</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="w-full border border-cocoa-100 rounded-xl px-3 py-2 focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/20 resize-none"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recurringIsActive"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="rounded text-copper focus:ring-copper"
              />
              <label htmlFor="recurringIsActive" className="text-sm font-medium text-cocoa-700">{t('expenses:recurring.form.active')}</label>
            </div>
            
            {/* Live Preview */}
            <div className="bg-cocoa-50 rounded-xl p-4 border border-cocoa-100">
              <h4 className="text-xs font-semibold text-cocoa-800 uppercase tracking-wider mb-2">{t('expenses:recurring.form.previewSection')}</h4>
              {preview?.error ? (
                <div className="text-sm text-red-600">{t('expenses:recurring.form.rruleInvalid', { error: preview.error })}</div>
              ) : (
                <div className="space-y-1">
                  <div className="text-sm text-cocoa-900 capitalize font-medium">
                    {t('expenses:recurring.form.previewCadence', {
                      cadence: preview?.summary || '',
                      amount: `$${Number(expectedAmount || 0).toFixed(2)}`,
                      low: `$${Number(toleranceLow || 0).toFixed(2)}`,
                      high: `$${Number(toleranceHigh || 0).toFixed(2)}`,
                      grace: String(graceDays || 0)
                    })}
                  </div>
                  {preview?.nextDates && preview.nextDates.length > 0 && (
                    <div className="text-xs text-cocoa-500">
                      {t('expenses:recurring.form.previewNext', {
                        dates: preview.nextDates.map(d => format(d, 'MMM d, yyyy')).join(', ')
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="h-4"></div>
          </div>

          <div className="p-6 border-t border-cocoa-100 flex justify-end gap-3 bg-cocoa-100 shrink-0">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-cocoa-700 bg-white border border-cocoa-200 rounded-lg hover:bg-cocoa-100 transition-colors"
            >
              {t('expenses:actions.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !!preview?.error}
              className="px-4 py-2 text-sm font-medium text-white bg-copper rounded-lg hover:bg-copper-dark transition-colors disabled:opacity-50"
            >
              {existing ? t('expenses:actions.save') : t('expenses:actions.save')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
