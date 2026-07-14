import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Bill, ExpenseCategory, FieldMeta, Vendor } from '../types';
import { ExtractedBillResult, createBill, updateBill } from '../services/billsService';
import { listExpenseCategories, getVendorsByIds, VendorResolutionResult, resolveVendor } from '../services/vendorsService';
import { X, HelpCircle, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../contexts/ToastContext';
import VendorPicker from './VendorPicker';
import VendorForm from './VendorForm';
import { format } from 'date-fns';
import { parseFirestoreDate } from '../utils/date';
import BillPaymentHistory from './BillPaymentHistory';
import PaymentForm from './PaymentForm';
import { Timestamp } from 'firebase/firestore';

interface BillReviewProps {
  isOpen: boolean;
  onClose: () => void;
  extractedResult?: ExtractedBillResult;
  existingBill?: Bill;
  onSaved: (billId: string) => void;
}

export default function BillReview({ isOpen, onClose, extractedResult, existingBill, onSaved }: BillReviewProps) {
  const { t } = useTranslation(['expenses']);
  const { toast } = useToast();

  const [vendorId, setVendorId] = useState<string | null>(null);
  const [expenseCategoryId, setExpenseCategoryId] = useState('');
  
  const [billDateStr, setBillDateStr] = useState('');
  const [dueDateStr, setDueDateStr] = useState('');
  const [periodStartStr, setPeriodStartStr] = useState('');
  const [periodEndStr, setPeriodEndStr] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [amountDue, setAmountDue] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentAddressOrAccount, setPaymentAddressOrAccount] = useState('');
  const [paymentDueIfPaidByStr, setPaymentDueIfPaidByStr] = useState('');
  const [notes, setNotes] = useState('');
  
  const [lineItems, setLineItems] = useState<Array<{ description: string; amount: number; quantity?: number; unitPrice?: number }>>([]);
  const [taxes, setTaxes] = useState<Array<{ description: string; amount: number; rate?: number }>>([]);
  
  const [fieldMeta, setFieldMeta] = useState<Record<string, FieldMeta>>({});
  
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [vendorsCache, setVendorsCache] = useState<Map<string, Vendor>>(new Map());
  const [resolution, setResolution] = useState<VendorResolutionResult | undefined>();
  const [rawExtractedVendorName, setRawExtractedVendorName] = useState('');

  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [vendorFormOpen, setVendorFormOpen] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);

  const resolveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dateToYMD = (ts: any): string => {
    if (!ts) return '';
    const d = parseFirestoreDate(ts, new Date(0));
    return d.getTime() !== 0 ? format(d, 'yyyy-MM-dd') : '';
  };

  const getYMDToTs = (ymd: string): Timestamp | null => {
    if (!ymd) return null;
    return Timestamp.fromDate(new Date(ymd + 'T12:00:00Z'));
  };

  useEffect(() => {
    if (!isOpen) return;
    
    listExpenseCategories().then(setCategories).catch(console.error);

    if (existingBill) {
      setVendorId(existingBill.vendorId);
      setExpenseCategoryId(existingBill.expenseCategoryId);
      setBillDateStr(dateToYMD(existingBill.billDate));
      setDueDateStr(dateToYMD(existingBill.dueDate));
      setPeriodStartStr(dateToYMD(existingBill.periodStart));
      setPeriodEndStr(dateToYMD(existingBill.periodEnd));
      setInvoiceNumber(existingBill.invoiceNumber || '');
      setAccountNumber(existingBill.accountNumber || '');
      setTotalAmount(existingBill.totalAmount);
      setAmountDue(existingBill.amountDue);
      setCurrency(existingBill.currency || 'USD');
      setLineItems(existingBill.lineItems || []);
      setTaxes(existingBill.taxes || []);
      if (existingBill.paymentInstructions) {
        setPaymentMethod(existingBill.paymentInstructions.method);
        setPaymentAddressOrAccount(existingBill.paymentInstructions.addressOrAccount);
        setPaymentDueIfPaidByStr(dateToYMD(existingBill.paymentInstructions.dueIfPaidBy));
      } else {
        setPaymentMethod('');
        setPaymentAddressOrAccount('');
        setPaymentDueIfPaidByStr('');
      }
      setNotes(existingBill.notes || '');
      setFieldMeta(existingBill.fieldMeta || {});
      setRawExtractedVendorName(existingBill.extractedVendorName || '');
      
      // we don't have resolution object, but we have a resolved vendor
      setResolution({
        status: existingBill.vendorId ? 'resolved' : 'unresolved',
        candidateVendorIds: existingBill.vendorId ? [existingBill.vendorId] : [],
        rawExtractedVendorName: existingBill.extractedVendorName || ''
      });
      
      if (existingBill.vendorId) {
        getVendorsByIds([existingBill.vendorId]).then(vs => {
          const m = new Map(vendorsCache);
          vs.forEach(v => m.set(v.id, v));
          setVendorsCache(m);
        });
      }
    } else if (extractedResult) {
      const ext = extractedResult.extraction;
      setRawExtractedVendorName(extractedResult.vendorResolution.rawExtractedVendorName);
      setResolution(extractedResult.vendorResolution);
      
      if (extractedResult.vendorResolution.status === 'resolved') {
        setVendorId(extractedResult.vendorResolution.candidateVendorIds[0]);
      } else {
        setVendorId(null);
      }
      
      setExpenseCategoryId(''); // will auto-set below if vendor loaded
      setBillDateStr(dateToYMD(ext.billDate));
      setDueDateStr(dateToYMD(ext.dueDate));
      setPeriodStartStr(dateToYMD(ext.periodStart));
      setPeriodEndStr(dateToYMD(ext.periodEnd));
      setInvoiceNumber(ext.invoiceNumber || '');
      setAccountNumber(ext.accountNumber || '');
      setTotalAmount(ext.totalAmount || 0);
      setAmountDue(ext.amountDue || 0);
      setCurrency(ext.currency || 'USD');
      setLineItems(ext.lineItems || []);
      setTaxes(ext.taxes || []);
      if (ext.paymentInstructions) {
        setPaymentMethod(ext.paymentInstructions.method);
        setPaymentAddressOrAccount(ext.paymentInstructions.addressOrAccount);
        setPaymentDueIfPaidByStr(dateToYMD(ext.paymentInstructions.dueIfPaidBy));
      } else {
        setPaymentMethod('');
        setPaymentAddressOrAccount('');
        setPaymentDueIfPaidByStr('');
      }
      setNotes('');
      setFieldMeta(ext.fieldMeta || {});
      
      if (extractedResult.vendorResolution.candidateVendorIds.length > 0) {
        getVendorsByIds(extractedResult.vendorResolution.candidateVendorIds).then(vs => {
          const m = new Map(vendorsCache);
          vs.forEach(v => m.set(v.id, v));
          setVendorsCache(m);
        });
      }
    }
  }, [isOpen, existingBill, extractedResult]);

  // Handle vendor auto-category
  useEffect(() => {
    if (vendorId && vendorsCache.has(vendorId) && !expenseCategoryId) {
      const v = vendorsCache.get(vendorId);
      if (v && v.expenseCategoryId) {
        setExpenseCategoryId(v.expenseCategoryId);
      }
    }
  }, [vendorId, vendorsCache, expenseCategoryId]);

  const recordEdit = (field: string) => {
    setFieldMeta(prev => ({
      ...prev,
      [field]: { provenance: 'user_edited', confidence: undefined }
    }));
  };

  const getStyleForField = (field: string) => {
    const meta = fieldMeta[field];
    if (!meta) return '';
    if (meta.provenance === 'user_edited') {
      return 'border-l-2 border-l-pistachio bg-pistachio/5 pl-2';
    }
    if (meta.provenance && ['inferred_high', 'inferred_low', 'ocr_low_confidence'].includes(meta.provenance) && typeof meta.confidence === 'number') {
      if (meta.confidence < 0.9) return 'border-l-2 border-l-amber-400 bg-amber-50/50 pl-2';
    }
    return '';
  };

  const renderConfidence = (field: string) => {
    const meta = fieldMeta[field];
    if (!meta) return null;
    if (meta.provenance === 'user_edited') {
      return (
        <span className="text-[10px] uppercase font-bold tracking-widest text-pistachio ml-2">
          {t('expenses:review.userEditedLabel')}
        </span>
      );
    }
    if (meta.provenance && ['inferred_high', 'inferred_low', 'ocr_low_confidence'].includes(meta.provenance) && typeof meta.confidence === 'number' && meta.confidence < 0.9) {
      return (
        <div className="relative group inline-block ml-2 text-amber-500 cursor-help">
          <HelpCircle className="w-4 h-4" />
          <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1 p-2 bg-cocoa-900 text-white text-xs rounded whitespace-nowrap z-10">
            {t('expenses:review.confidenceLabel')}: {Math.round(meta.confidence * 100)}%
          </div>
        </div>
      );
    }
    return null;
  };

  if (!isOpen) return null;

  const handleRawVendorNameChange = (val: string) => {
    setRawExtractedVendorName(val);
    recordEdit('vendorName');
    
    if (resolveTimeoutRef.current) clearTimeout(resolveTimeoutRef.current);
    resolveTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await resolveVendor(val, accountNumber);
        setResolution(res);
        if (res.status === 'resolved') {
          setVendorId(res.candidateVendorIds[0]);
        } else {
          setVendorId(null);
        }
        if (res.candidateVendorIds.length > 0) {
          const vs = await getVendorsByIds(res.candidateVendorIds);
          const m = new Map(vendorsCache);
          vs.forEach(v => m.set(v.id, v));
          setVendorsCache(m);
        }
      } catch (err) {
        console.error('Resolution err', err);
      }
    }, 500);
  };

  const handleSave = async (asStatus: string) => {
    if (!vendorId) return toast.error(t('expenses:review.vendorRequired'));
    if (!expenseCategoryId) return toast.error(t('expenses:review.categoryRequired'));
    if (!billDateStr) return toast.error(t('expenses:review.billDateRequired'));
    if (totalAmount <= 0) return toast.error(t('expenses:review.totalAmountInvalid'));

    setSavingStatus(asStatus);
    try {
      const billData: Omit<Bill, 'id' | 'createdAt' | 'updatedAt'> = {
        status: asStatus as any,
        extractedVendorName: rawExtractedVendorName,
        vendorId,
        expenseCategoryId,
        billDate: getYMDToTs(billDateStr) as any,
        dueDate: getYMDToTs(dueDateStr) as any,
        periodStart: getYMDToTs(periodStartStr) as any,
        periodEnd: getYMDToTs(periodEndStr) as any,
        accountNumber: accountNumber || undefined,
        invoiceNumber: invoiceNumber || undefined,
        totalAmount,
        amountDue,
        currency,
        lineItems,
        taxes,
        paymentInstructions: paymentMethod ? { 
          method: paymentMethod as any, 
          addressOrAccount: paymentAddressOrAccount, 
          dueIfPaidBy: paymentDueIfPaidByStr ? getYMDToTs(paymentDueIfPaidByStr) as any : undefined 
        } : undefined,
        notes: notes || undefined,
        extractedJson: extractedResult ? JSON.stringify(extractedResult.extraction) : existingBill?.extractedJson || null,
        imageStoragePath: existingBill?.imageStoragePath || null,
        fieldMeta,
      };

      if (existingBill) {
        await updateBill(existingBill.id, billData);
        onSaved(existingBill.id);
      } else {
        const id = await createBill(billData);
        onSaved(id);
      }
      toast.success(t('expenses:review.savedToast'));
    } catch (err) {
      console.error(err);
      toast.error(t('expenses:review.saveError'));
    } finally {
      setSavingStatus(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cocoa-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between p-6 border-b border-cocoa-100 shrink-0">
            <h2 className="text-xl font-display font-semibold text-cocoa-900">
              {t('expenses:review.title')}
            </h2>
            <button
              onClick={onClose}
              disabled={!!savingStatus}
              className="text-cocoa-400 hover:text-cocoa-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            <section>
              <h3 className="text-sm font-semibold text-cocoa-900 mb-3">{t('expenses:review.vendorSection')}</h3>
              <div className={`rounded-xl border border-cocoa-100 p-4 ${getStyleForField('vendorName')}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <label className="text-xs font-medium text-cocoa-500 uppercase tracking-wider">{t('expenses:review.vendorEditRawName')}</label>
                    {renderConfidence('vendorName')}
                  </div>
                </div>
                <input
                  type="text"
                  value={rawExtractedVendorName}
                  onChange={e => handleRawVendorNameChange(e.target.value)}
                  className="w-full border border-cocoa-100 rounded-xl px-3 py-2 bg-white focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/20 mb-4 font-semibold text-cocoa-900"
                />

                {resolution && (
                  <VendorPicker
                    resolution={resolution}
                    selectedVendorId={vendorId}
                    onSelect={setVendorId}
                    onCreateNewFromExtraction={() => setVendorFormOpen(true)}
                    vendorsCache={vendorsCache}
                  />
                )}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-cocoa-900 mb-3 flex items-center">
                {t('expenses:review.categorySection')}
              </h3>
              <div className="rounded-xl border border-cocoa-100 p-4">
                <select
                  value={expenseCategoryId}
                  onChange={e => setExpenseCategoryId(e.target.value)}
                  className="w-full border border-cocoa-100 rounded-xl px-3 py-2 bg-white focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/20"
                >
                  <option value="">-- {t('expenses:review.categoryRequired')} --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {extractedResult && extractedResult.extraction.suggestedCategoryHint && !expenseCategoryId && (
                  <p className="mt-2 text-sm text-copper font-medium">
                    {t('expenses:review.categorySuggested')}: {extractedResult.extraction.suggestedCategoryHint}
                  </p>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-cocoa-900 mb-3">{t('expenses:review.amountsSection')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-1 rounded ${getStyleForField('totalAmount')}`}>
                  <label className="block text-xs font-medium text-cocoa-500 uppercase tracking-wider mb-1">
                    {t('expenses:review.totalAmount')} {renderConfidence('totalAmount')}
                  </label>
                  <input
                    type="number" step="0.01"
                    value={totalAmount || ''}
                    onChange={e => { setTotalAmount(parseFloat(e.target.value) || 0); recordEdit('totalAmount'); }}
                    className="w-full border border-cocoa-100 rounded-xl px-3 py-2 bg-white focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/20 text-lg font-semibold"
                  />
                </div>
                <div className={`p-1 rounded ${getStyleForField('amountDue')}`}>
                  <label className="block text-xs font-medium text-cocoa-500 uppercase tracking-wider mb-1">
                    {t('expenses:review.amountDue')} {renderConfidence('amountDue')}
                  </label>
                  <input
                    type="number" step="0.01"
                    value={amountDue || ''}
                    onChange={e => { setAmountDue(parseFloat(e.target.value) || 0); recordEdit('amountDue'); }}
                    className="w-full border border-cocoa-100 rounded-xl px-3 py-2 bg-white focus:border-copper focus:outline-none"
                  />
                </div>
                <div className={`p-1 rounded ${getStyleForField('currency')}`}>
                  <label className="block text-xs font-medium text-cocoa-500 uppercase tracking-wider mb-1">
                    {t('expenses:review.currency')}
                  </label>
                  <select
                    value={currency}
                    onChange={e => { setCurrency(e.target.value); recordEdit('currency'); }}
                    className="w-full border border-cocoa-100 rounded-xl px-3 py-2 bg-white focus:border-copper focus:outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="MXN">MXN</option>
                    <option value="KRW">KRW</option>
                  </select>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-cocoa-900 mb-3">{t('expenses:review.datesSection')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-1 rounded ${getStyleForField('billDate')}`}>
                  <label className="block text-xs font-medium text-cocoa-500 tracking-wider mb-1">{t('expenses:review.billDate')} {renderConfidence('billDate')}</label>
                  <input type="date" value={billDateStr} onChange={e => { setBillDateStr(e.target.value); recordEdit('billDate'); }} className="w-full border border-cocoa-100 rounded-xl px-3 py-2 bg-white focus:border-copper focus:outline-none" />
                </div>
                <div className={`p-1 rounded ${getStyleForField('dueDate')}`}>
                  <label className="block text-xs font-medium text-cocoa-500 tracking-wider mb-1">{t('expenses:review.dueDate')} {renderConfidence('dueDate')}</label>
                  <input type="date" value={dueDateStr} onChange={e => { setDueDateStr(e.target.value); recordEdit('dueDate'); }} className="w-full border border-cocoa-100 rounded-xl px-3 py-2 bg-white focus:border-copper focus:outline-none" />
                </div>
                <div className={`p-1 rounded ${getStyleForField('periodStart')}`}>
                  <label className="block text-xs font-medium text-cocoa-500 tracking-wider mb-1">{t('expenses:review.periodStart')} {renderConfidence('periodStart')}</label>
                  <input type="date" value={periodStartStr} onChange={e => { setPeriodStartStr(e.target.value); recordEdit('periodStart'); }} className="w-full border border-cocoa-100 rounded-xl px-3 py-2 bg-white focus:border-copper focus:outline-none" />
                </div>
                <div className={`p-1 rounded ${getStyleForField('periodEnd')}`}>
                  <label className="block text-xs font-medium text-cocoa-500 tracking-wider mb-1">{t('expenses:review.periodEnd')} {renderConfidence('periodEnd')}</label>
                  <input type="date" value={periodEndStr} onChange={e => { setPeriodEndStr(e.target.value); recordEdit('periodEnd'); }} className="w-full border border-cocoa-100 rounded-xl px-3 py-2 bg-white focus:border-copper focus:outline-none" />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-cocoa-900 mb-3">{t('expenses:review.identifiersSection')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-1 rounded ${getStyleForField('invoiceNumber')}`}>
                  <label className="block text-xs font-medium text-cocoa-500 uppercase tracking-wider mb-1">{t('expenses:review.invoiceNumber')} {renderConfidence('invoiceNumber')}</label>
                  <input type="text" value={invoiceNumber} onChange={e => { setInvoiceNumber(e.target.value); recordEdit('invoiceNumber'); }} className="w-full border border-cocoa-100 rounded-xl px-3 py-2 bg-white focus:border-copper focus:outline-none font-mono text-sm" />
                </div>
                <div className={`p-1 rounded ${getStyleForField('accountNumber')}`}>
                  <label className="block text-xs font-medium text-cocoa-500 uppercase tracking-wider mb-1">{t('expenses:review.accountNumber')} {renderConfidence('accountNumber')}</label>
                  <input type="text" value={accountNumber} onChange={e => { setAccountNumber(e.target.value); recordEdit('accountNumber'); }} className="w-full border border-cocoa-100 rounded-xl px-3 py-2 bg-white focus:border-copper focus:outline-none font-mono text-sm" />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-cocoa-900 mb-3">{t('expenses:review.lineItemsSection')}</h3>
              <div className={`rounded-xl border border-cocoa-100 p-4 ${getStyleForField('lineItems')}`}>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-[3] text-xs font-medium text-cocoa-500 uppercase tracking-wider">{t('expenses:review.lineItemDescription')}</div>
                    <div className="flex-1 text-xs font-medium text-cocoa-500 uppercase tracking-wider">{t('expenses:review.lineItemQty')}</div>
                    <div className="flex-1 text-xs font-medium text-cocoa-500 uppercase tracking-wider">{t('expenses:review.lineItemUnitPrice')}</div>
                    <div className="flex-1 text-xs font-medium text-cocoa-500 uppercase tracking-wider">{t('expenses:review.lineItemAmount')}</div>
                    <div className="w-8"></div>
                  </div>
                  {lineItems.length === 0 && (
                    <div className="flex gap-2 items-center">
                      <input type="text" placeholder={t('expenses:review.lineItemDescription')} className="flex-[3] border border-cocoa-100 rounded-lg px-2 py-1.5 focus:border-copper focus:outline-none text-sm" readOnly />
                      <input type="number" placeholder="0" className="flex-1 border border-cocoa-100 rounded-lg px-2 py-1.5 focus:border-copper focus:outline-none text-sm" readOnly />
                      <input type="number" placeholder="0.00" className="flex-1 border border-cocoa-100 rounded-lg px-2 py-1.5 focus:border-copper focus:outline-none text-sm" readOnly />
                      <input type="number" placeholder="0.00" className="flex-1 border border-cocoa-100 rounded-lg px-2 py-1.5 focus:border-copper focus:outline-none text-sm" readOnly />
                      <div className="w-8"></div>
                    </div>
                  )}
                  {lineItems.map((li, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input type="text" value={li.description} onChange={e => { const items = [...lineItems]; items[idx].description = e.target.value; setLineItems(items); recordEdit('lineItems'); }} className="flex-[3] border border-cocoa-100 rounded-lg px-2 py-1.5 bg-white focus:border-copper focus:outline-none text-sm" />
                      <input type="number" value={li.quantity ?? ''} onChange={e => { const items = [...lineItems]; items[idx].quantity = e.target.value ? parseFloat(e.target.value) : undefined; setLineItems(items); recordEdit('lineItems'); }} className="flex-1 border border-cocoa-100 rounded-lg px-2 py-1.5 bg-white focus:border-copper focus:outline-none text-sm" />
                      <input type="number" step="0.01" value={li.unitPrice ?? ''} onChange={e => { const items = [...lineItems]; items[idx].unitPrice = e.target.value ? parseFloat(e.target.value) : undefined; setLineItems(items); recordEdit('lineItems'); }} className="flex-1 border border-cocoa-100 rounded-lg px-2 py-1.5 bg-white focus:border-copper focus:outline-none text-sm" />
                      <input type="number" step="0.01" value={li.amount ?? ''} onChange={e => { const items = [...lineItems]; items[idx].amount = parseFloat(e.target.value) || 0; setLineItems(items); recordEdit('lineItems'); }} className="flex-1 border border-cocoa-100 rounded-lg px-2 py-1.5 bg-white focus:border-copper focus:outline-none text-sm" />
                      <button onClick={() => { const items = lineItems.filter((_, i) => i !== idx); setLineItems(items); recordEdit('lineItems'); }} className="w-8 text-cocoa-400 hover:text-raspberry flex justify-center"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button onClick={() => { setLineItems([...lineItems, { description: '', amount: 0 }]); recordEdit('lineItems'); }} className="text-xs font-medium text-copper hover:text-copper-dark flex items-center gap-1 mt-2">
                    <Plus className="w-3 h-3" /> {t('expenses:actions.addLineItem')}
                  </button>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-cocoa-900 mb-3">{t('expenses:review.taxesSection')}</h3>
              <div className={`rounded-xl border border-cocoa-100 p-4 ${getStyleForField('taxes')}`}>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-[3] text-xs font-medium text-cocoa-500 uppercase tracking-wider">{t('expenses:review.taxDescription')}</div>
                    <div className="flex-1 text-xs font-medium text-cocoa-500 uppercase tracking-wider">{t('expenses:review.taxRate')}</div>
                    <div className="flex-1 text-xs font-medium text-cocoa-500 uppercase tracking-wider">{t('expenses:review.taxAmount')}</div>
                    <div className="w-8"></div>
                  </div>
                  {taxes.length === 0 && (
                    <div className="flex gap-2 items-center">
                      <input type="text" placeholder={t('expenses:review.taxDescription')} className="flex-[3] border border-cocoa-100 rounded-lg px-2 py-1.5 focus:border-copper focus:outline-none text-sm" readOnly />
                      <input type="number" placeholder="0.00" className="flex-1 border border-cocoa-100 rounded-lg px-2 py-1.5 focus:border-copper focus:outline-none text-sm" readOnly />
                      <input type="number" placeholder="0.00" className="flex-1 border border-cocoa-100 rounded-lg px-2 py-1.5 focus:border-copper focus:outline-none text-sm" readOnly />
                      <div className="w-8"></div>
                    </div>
                  )}
                  {taxes.map((tLine, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input type="text" value={tLine.description} onChange={e => { const items = [...taxes]; items[idx].description = e.target.value; setTaxes(items); recordEdit('taxes'); }} className="flex-[3] border border-cocoa-100 rounded-lg px-2 py-1.5 bg-white focus:border-copper focus:outline-none text-sm" />
                      <div className="flex-1 relative">
                        <input type="number" step="0.01" value={typeof tLine.rate === 'number' ? tLine.rate * 100 : ''} onChange={e => { const items = [...taxes]; items[idx].rate = e.target.value ? parseFloat(e.target.value) / 100 : undefined; setTaxes(items); recordEdit('taxes'); }} className="w-full border border-cocoa-100 rounded-lg px-2 py-1.5 pr-6 bg-white focus:border-copper focus:outline-none text-sm" />
                        <span className="absolute right-2 top-1.5 text-cocoa-400 text-sm">%</span>
                      </div>
                      <input type="number" step="0.01" value={tLine.amount ?? ''} onChange={e => { const items = [...taxes]; items[idx].amount = parseFloat(e.target.value) || 0; setTaxes(items); recordEdit('taxes'); }} className="flex-1 border border-cocoa-100 rounded-lg px-2 py-1.5 bg-white focus:border-copper focus:outline-none text-sm" />
                      <button onClick={() => { const items = taxes.filter((_, i) => i !== idx); setTaxes(items); recordEdit('taxes'); }} className="w-8 text-cocoa-400 hover:text-raspberry flex justify-center"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button onClick={() => { setTaxes([...taxes, { description: '', amount: 0 }]); recordEdit('taxes'); }} className="text-xs font-medium text-copper hover:text-copper-dark flex items-center gap-1 mt-2">
                    <Plus className="w-3 h-3" /> {t('expenses:actions.addTaxLine')}
                  </button>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-cocoa-900 mb-3">{t('expenses:review.paymentInstructionsSection')}</h3>
              <details className="group rounded-xl border border-cocoa-100 bg-white" open={!!(paymentMethod || paymentAddressOrAccount || paymentDueIfPaidByStr)}>
                <summary className="p-4 font-medium text-sm text-cocoa-900 cursor-pointer list-none flex justify-between items-center group-open:border-b group-open:border-cocoa-100">
                  {t('expenses:review.paymentInstructionsSection')}
                  <span className="text-cocoa-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className={`p-4 gap-4 grid grid-cols-1 sm:grid-cols-3 ${getStyleForField('paymentInstructions')}`}>
                  <div>
                    <label className="block text-xs font-medium text-cocoa-500 tracking-wider mb-1">{t('expenses:review.paymentMethod')}</label>
                    <select
                      value={paymentMethod}
                      onChange={e => { setPaymentMethod(e.target.value); recordEdit('paymentInstructions'); }}
                      className="w-full border border-cocoa-100 rounded-xl px-3 py-2 bg-white focus:border-copper focus:outline-none"
                    >
                      <option value="">--</option>
                      {['ach', 'card', 'check', 'wire', 'auto_debit', 'cash', 'other'].map(m => (
                        <option key={m} value={m}>{t(`expenses:paymentMethod.${m}` as any)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-cocoa-500 tracking-wider mb-1">{t('expenses:review.paymentAddressOrAccount')}</label>
                    <input type="text" value={paymentAddressOrAccount} onChange={e => { setPaymentAddressOrAccount(e.target.value); recordEdit('paymentInstructions'); }} className="w-full border border-cocoa-100 rounded-xl px-3 py-2 bg-white focus:border-copper focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-cocoa-500 tracking-wider mb-1">{t('expenses:review.paymentDueIfPaidBy')}</label>
                    <input type="date" value={paymentDueIfPaidByStr} onChange={e => { setPaymentDueIfPaidByStr(e.target.value); recordEdit('paymentInstructions'); }} className="w-full border border-cocoa-100 rounded-xl px-3 py-2 bg-white focus:border-copper focus:outline-none" />
                  </div>
                </div>
              </details>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-cocoa-900 mb-3">{t('expenses:review.notesSection')}</h3>
              <textarea
                value={notes} onChange={e => { setNotes(e.target.value); recordEdit('notes'); }}
                className="w-full border border-cocoa-100 rounded-xl px-3 py-2 bg-white focus:border-copper focus:outline-none resize-none" rows={3}
              />
            </section>

            {existingBill?.id && <BillPaymentHistory billId={existingBill.id} />}
          </div>

          <div className="p-6 border-t border-cocoa-100 flex justify-end gap-3 bg-cocoa-100 shrink-0">
            {existingBill && ['reviewed', 'scheduled', 'partially_paid'].includes(existingBill.status) && (
              <button
                onClick={() => setPaymentFormOpen(true)}
                disabled={!!savingStatus}
                className="px-4 py-2 text-sm font-medium text-white bg-pistachio rounded-lg hover:bg-pistachio/80 mr-auto"
              >
                {t('expenses:actions.recordPayment')}
              </button>
            )}
            <button onClick={onClose} disabled={!!savingStatus} className="px-4 py-2 text-sm font-medium text-cocoa-700 bg-white border border-cocoa-200 rounded-lg hover:bg-cocoa-100">
              {t('expenses:actions.cancel')}
            </button>
            <button onClick={() => handleSave('extracted')} disabled={!!savingStatus} className="px-4 py-2 text-sm font-medium text-cocoa-700 bg-white border border-cocoa-200 rounded-lg hover:bg-cocoa-100">
              {savingStatus === 'extracted' ? '...' : t('expenses:actions.saveDraft')}
            </button>
            <button onClick={() => handleSave('reviewed')} disabled={!!savingStatus} className="px-4 py-2 text-sm font-medium text-white bg-copper rounded-lg hover:bg-copper-dark">
              {savingStatus === 'reviewed' ? '...' : t('expenses:actions.saveReviewed')}
            </button>
          </div>
        </motion.div>
      </div>

      {vendorFormOpen && (
        <VendorForm
          isOpen={vendorFormOpen}
          onClose={() => setVendorFormOpen(false)}
          prefilledFromExtraction={{ name: rawExtractedVendorName, accountIdentifier: accountNumber }}
          onSaved={(vendor) => {
            setVendorId(vendor.id);
            const m = new Map(vendorsCache);
            m.set(vendor.id, vendor);
            setVendorsCache(m);
            setVendorFormOpen(false);
          }}
        />
      )}
      <PaymentForm
        isOpen={paymentFormOpen}
        onClose={() => setPaymentFormOpen(false)}
        initialBill={existingBill || null}
        onSaved={() => {
          setPaymentFormOpen(false);
          onClose(); // Close BillReview as well to trigger list refresh
        }}
      />
    </AnimatePresence>
  );
}

