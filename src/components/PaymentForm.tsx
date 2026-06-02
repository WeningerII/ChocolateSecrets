import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bill, BillStatus, PaymentMethod } from '../types';
import { recordPayment } from '../services/paymentsService';
import { listRecentBills } from '../services/billsService';
import { format } from 'date-fns';
import { X, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../contexts/ToastContext';
import { PAYMENT_METHODS } from '../constants';

interface PaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialBill: Bill | null;
  onSaved: (result: { paymentId: string; updatedBills: Array<{ billId: string; newStatus: BillStatus }> }) => void;
}

export default function PaymentForm({ isOpen, onClose, initialBill, onSaved }: PaymentFormProps) {
  const { t } = useTranslation(['expenses']);
  const { toast } = useToast();
  
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [amount, setAmount] = useState<number>(0);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  
  const [allocations, setAllocations] = useState<Array<{ billId: string; amount: number; description: string; outstanding: number; bill: Bill }>>([]);
  const [otherBills, setOtherBills] = useState<Bill[]>([]);
  const [saving, setSaving] = useState(false);
  const [showOtherBillsDropdown, setShowOtherBillsDropdown] = useState(false);

  useEffect(() => {
    if (isOpen && initialBill) {
      const outstanding = (initialBill.amountDue ?? initialBill.totalAmount) - (initialBill.paidAmount || 0);
      
      const bDateSeconds = (initialBill.billDate as any)?._seconds ?? (initialBill.billDate as any)?.seconds;
      const dateDesc = bDateSeconds ? format(new Date(bDateSeconds * 1000), 'MMM d, yyyy') : '';
      const description = `${initialBill.extractedVendorName || t('expenses:paymentForm.unknownVendorFallback')} - ${initialBill.invoiceNumber || dateDesc}`;
      
      setAllocations([{
        billId: initialBill.id,
        amount: Math.max(0, outstanding),
        description,
        outstanding: Math.max(0, outstanding),
        bill: initialBill
      }]);
      setAmount(Math.max(0, outstanding));
      
      // Load other bills for vendor
      listRecentBills(200).then(all => {
        const others = all.filter(b => 
          b.vendorId === initialBill.vendorId && 
          b.id !== initialBill.id &&
          ['reviewed', 'scheduled', 'partially_paid'].includes(b.status)
        );
        setOtherBills(others);
      });
    } else {
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
      setMethod('');
      setAmount(0);
      setReference('');
      setNotes('');
      setAllocations([]);
      setOtherBills([]);
      setShowOtherBillsDropdown(false);
    }
  }, [isOpen, initialBill, t]);

  const allocationTotal = allocations.reduce((s, a) => s + a.amount, 0);
  const isMismatch = Math.abs(allocationTotal - amount) > 0.01;

  if (!isOpen) return null;

  const handleSave = async () => {
    if (amount <= 0) return toast.error(t('expenses:paymentForm.amountRequired'));
    if (!paymentDate) return toast.error(t('expenses:paymentForm.dateRequired'));
    if (!method) return toast.error(t('expenses:paymentForm.methodRequired'));
    if (allocations.length === 0) return toast.error(t('expenses:paymentForm.allocationsRequired'));
    if (isMismatch) return toast.error(t('expenses:paymentForm.mismatchWarning'));
    if (allocations.some(a => a.amount <= 0)) return toast.error(t('expenses:paymentForm.allocationsPositive'));

    const overAllocated = allocations.find(a => a.amount > a.outstanding + 0.01);
    if (overAllocated) {
      return toast.error(t('expenses:paymentForm.overAllocationWarning', {
        bill: overAllocated.description,
        outstanding: overAllocated.outstanding.toFixed(2),
      }));
    }
    
    setSaving(true);
    try {
      const res = await recordPayment({
        paymentDate,
        amount,
        method,
        reference: reference || undefined,
        notes: notes || undefined,
        billAllocations: allocations.map(a => ({ billId: a.billId, amount: a.amount }))
      });
      toast.success(t('expenses:paymentForm.savedToast'));
      onSaved(res);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t('expenses:paymentForm.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const addBill = (b: Bill) => {
    const outstanding = (b.amountDue ?? b.totalAmount) - (b.paidAmount || 0);
    const bDateSeconds = (b.billDate as any)?._seconds ?? (b.billDate as any)?.seconds;
    const dateDesc = bDateSeconds ? format(new Date(bDateSeconds * 1000), 'MMM d, yyyy') : '';
    const description = `${b.extractedVendorName || t('expenses:paymentForm.unknownVendorFallback')} - ${b.invoiceNumber || dateDesc}`;
    
    setAllocations([...allocations, {
      billId: b.id,
      amount: Math.max(0, outstanding),
      description,
      outstanding: Math.max(0, outstanding),
      bill: b
    }]);
    setAmount(prev => +(prev + Math.max(0, outstanding)).toFixed(2));
    setOtherBills(otherBills.filter(xb => xb.id !== b.id));
  };

  const removeAlloc = (idx: number) => {
    const removed = allocations[idx];
    setAllocations(allocations.filter((_, i) => i !== idx));
    setOtherBills(prev => [...prev, removed.bill]);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cocoa-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between p-6 border-b border-cocoa-100 shrink-0">
            <h2 className="text-xl font-display font-semibold text-cocoa-900">
              {t('expenses:paymentForm.title')}
            </h2>
            <button onClick={onClose} className="text-cocoa-400 hover:text-cocoa-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            <section>
              <h3 className="text-sm font-semibold text-cocoa-900 mb-3">{t('expenses:paymentForm.detailsSection')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('expenses:paymentForm.date')}</label>
                  <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full border border-cocoa-200 rounded-xl px-3 py-2 bg-white focus:border-copper focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('expenses:paymentForm.method')}</label>
                  <select value={method} onChange={e => setMethod(e.target.value as any)} className="w-full border border-cocoa-200 rounded-xl px-3 py-2 bg-white focus:border-copper focus:outline-none">
                    <option value="">--</option>
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>{t(`expenses:paymentMethod.${m}` as any)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('expenses:paymentForm.amount')}</label>
                  <input type="number" step="0.01" value={amount || ''} onChange={e => setAmount(parseFloat(e.target.value) || 0)} className="w-full border border-cocoa-200 rounded-xl px-3 py-2 bg-white focus:border-copper focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('expenses:paymentForm.reference')}</label>
                  <input type="text" value={reference} onChange={e => setReference(e.target.value)} className="w-full border border-cocoa-200 rounded-xl px-3 py-2 bg-white focus:border-copper focus:outline-none" />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-cocoa-700 mb-1">{t('expenses:paymentForm.notes')}</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full border border-cocoa-200 rounded-xl px-3 py-2 bg-white focus:border-copper focus:outline-none resize-none h-20" />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-cocoa-900 mb-3">{t('expenses:paymentForm.allocationsSection')}</h3>
              <div className="space-y-4">
                {allocations.map((a, idx) => (
                  <div key={a.billId} className="flex gap-4 items-center bg-cocoa-100 p-3 rounded-xl border border-cocoa-200">
                    <div className="flex-[2]">
                      <div className="text-sm font-medium text-cocoa-900">{a.description}</div>
                      <div className="text-xs text-cocoa-500">{t('expenses:paymentForm.outstandingBalance', { amount: '$' + a.outstanding.toFixed(2) })}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-cocoa-500 mb-1">{t('expenses:paymentForm.allocationAmount')}</label>
                      <input type="number" step="0.01" value={a.amount || ''} onChange={e => {
                        const newAlloc = [...allocations];
                        newAlloc[idx].amount = parseFloat(e.target.value) || 0;
                        setAllocations(newAlloc);
                      }} className="w-24 border border-cocoa-200 rounded-lg px-2 py-1.5 bg-white focus:border-copper focus:outline-none text-sm text-right" />
                    </div>
                    {allocations.length > 1 && (
                      <button onClick={() => removeAlloc(idx)} className="text-cocoa-400 hover:text-raspberry transition-colors mt-5">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                
                {otherBills.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowOtherBillsDropdown(v => !v)}
                      className="text-sm font-medium text-copper hover:text-copper-dark flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      {t('expenses:actions.addBillToPayment')}
                    </button>
                    {showOtherBillsDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowOtherBillsDropdown(false)}
                        />
                        <div className="absolute left-0 mt-1 w-full bg-white rounded-xl shadow-lg border border-cocoa-100 z-20 max-h-64 overflow-y-auto">
                          {otherBills.map(b => {
                            const outstanding = (b.amountDue ?? b.totalAmount) - (b.paidAmount || 0);
                            const bDateSeconds = (b.billDate as any)?._seconds ?? (b.billDate as any)?.seconds;
                            const dateDesc = bDateSeconds ? format(new Date(bDateSeconds * 1000), 'MMM d, yyyy') : '';
                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => {
                                  addBill(b);
                                  setShowOtherBillsDropdown(false);
                                }}
                                className="w-full text-left p-3 border-b border-cocoa-100 last:border-0 hover:bg-cocoa-100 transition-colors"
                              >
                                <div className="text-sm font-medium text-cocoa-900">{b.invoiceNumber || dateDesc}</div>
                                <div className="text-xs text-cocoa-500">
                                  {t('expenses:paymentForm.otherBillOutstanding', { amount: '$' + outstanding.toFixed(2) })}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                <div className={`p-3 rounded-xl border ${isMismatch ? 'bg-raspberry/5 border-raspberry/20 text-raspberry' : 'bg-pistachio/5 border-pistachio/20 text-pistachio'} font-medium text-sm flex justify-between`}>
                  <span>{t('expenses:paymentForm.allocationTotal')}: ${allocationTotal.toFixed(2)}</span>
                  <span>{t('expenses:paymentForm.paymentTotal')}: ${amount.toFixed(2)}</span>
                </div>
                {isMismatch && (
                  <div className="text-xs text-raspberry">{t('expenses:paymentForm.mismatchWarning')}</div>
                )}
              </div>
            </section>
          </div>

          <div className="p-6 border-t border-cocoa-100 bg-cocoa-100 shrink-0 flex justify-end gap-3">
            <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-cocoa-700 hover:text-cocoa-900">
              {t('expenses:actions.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-pistachio rounded-lg hover:bg-pistachio/80 disabled:opacity-50"
            >
              {saving ? t('expenses:actions.saving') : t('expenses:actions.recordPayment')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
