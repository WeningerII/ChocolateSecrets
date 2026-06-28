import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BillsList from '../components/BillsList';
import VendorsList from '../components/VendorsList';
import PaymentsList from '../components/PaymentsList';
import RecurringExpectationsList from '../components/RecurringExpectationsList';
import BillUpload from '../components/BillUpload';
import BillReview from '../components/BillReview';
import VendorForm from '../components/VendorForm';
import PaymentForm from '../components/PaymentForm';
import RecurringExpectationForm from '../components/RecurringExpectationForm';
import { Bill, Vendor, RecurringExpectation } from '../types';
import { ExtractedBillResult, getBill } from '../services/billsService';
import { getRecurringExpectation } from '../services/recurringExpectationsService';
import { getVendor } from '../services/vendorsService';
import { UploadCloud, Store, Wallet, CalendarDays } from 'lucide-react';

export default function Expenses() {
  const { t } = useTranslation(['expenses']);
  const [activeTab, setActiveTab] = useState<'bills' | 'vendors' | 'recurring' | 'payments'>('bills');
  
  const [uploadOpen, setUploadOpen] = useState(false);
  
  const [reviewOpen, setReviewOpen] = useState(false);
  const [extractedResult, setExtractedResult] = useState<ExtractedBillResult | undefined>();
  const [existingBill, setExistingBill] = useState<Bill | undefined>();

  const [vendorFormOpen, setVendorFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | undefined>();

  const [recurringFormOpen, setRecurringFormOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpectation | undefined>();

  const [paymentFormOpen, setPaymentFormOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const handledDeepLink = useRef<string | null>(null);

  // Consume alert deep-links. AlertsBell navigates to /expenses?reviewBill=<id>
  // (due-soon + anomaly alerts), /expenses?recurringExpectation=<id> (missing-bill
  // alerts), or /expenses?editVendor=<id> (vendor alerts). Open the referenced
  // record once, switch to its tab, then strip the query param so it does not
  // re-open on re-render or after the modal is closed.
  useEffect(() => {
    const billId = searchParams.get('reviewBill');
    const expectationId = searchParams.get('recurringExpectation');
    const vendorId = searchParams.get('editVendor');
    const token = billId ? `bill:${billId}` : expectationId ? `exp:${expectationId}` : vendorId ? `vendor:${vendorId}` : null;
    if (!token || handledDeepLink.current === token) return;
    handledDeepLink.current = token;

    if (billId) {
      setActiveTab('bills');
      getBill(billId).then((bill) => {
        if (!bill) return;
        setExtractedResult(undefined);
        setExistingBill(bill);
        setReviewOpen(true);
      });
    } else if (expectationId) {
      setActiveTab('recurring');
      getRecurringExpectation(expectationId).then((exp) => {
        if (!exp) return;
        setEditingRecurring(exp);
        setRecurringFormOpen(true);
      });
    } else if (vendorId) {
      setActiveTab('vendors');
      getVendor(vendorId).then((vendor) => {
        if (!vendor) return;
        setEditingVendor(vendor);
        setVendorFormOpen(true);
      });
    }

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('reviewBill');
      next.delete('recurringExpectation');
      next.delete('editVendor');
      return next;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleExtracted = (result: ExtractedBillResult) => {
    setUploadOpen(false);
    setExtractedResult(result);
    setExistingBill(undefined);
    setReviewOpen(true);
  };

  const handleBillCardClick = (bill: Bill) => {
    setExtractedResult(undefined);
    setExistingBill(bill);
    setReviewOpen(true);
  };

  const handleVendorCardClick = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setVendorFormOpen(true);
  };

  const handleRecurringCardClick = (expectation: RecurringExpectation) => {
    setEditingRecurring(expectation);
    setRecurringFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-cream p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-cocoa-900 mb-2">
              {t('expenses:domain.title')}
            </h1>
            <p className="text-cocoa-500">{t('expenses:page.subtitle')}</p>
          </div>
          <div>
            {activeTab === 'bills' ? (
              <button
                onClick={() => setUploadOpen(true)}
                className="flex items-center gap-2 bg-copper hover:bg-copper-dark text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
              >
                <UploadCloud className="w-4 h-4" />
                {t('expenses:actions.uploadBill')}
              </button>
            ) : activeTab === 'vendors' ? (
              <button
                onClick={() => {
                  setEditingVendor(undefined);
                  setVendorFormOpen(true);
                }}
                className="flex items-center gap-2 bg-copper hover:bg-copper-dark text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
              >
                <Store className="w-4 h-4" />
                {t('expenses:actions.newVendor')}
              </button>
            ) : activeTab === 'recurring' ? (
              <button
                onClick={() => {
                  setEditingRecurring(undefined);
                  setRecurringFormOpen(true);
                }}
                className="flex items-center gap-2 bg-copper hover:bg-copper-dark text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
              >
                <CalendarDays className="w-4 h-4" />
                {t('expenses:recurring.newButton')}
              </button>
            ) : (
              <button
                onClick={() => setPaymentFormOpen(true)}
                className="flex items-center gap-2 bg-copper hover:bg-copper-dark text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
              >
                <Wallet className="w-4 h-4" />
                {t('expenses:actions.recordPayment')}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-cocoa-200 mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('bills')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'bills'
                  ? 'border-copper text-cocoa-900'
                  : 'border-transparent text-cocoa-500 hover:text-cocoa-700 hover:border-cocoa-300'
              }`}
            >
              {t('expenses:domain.bills')}
            </button>
            <button
              onClick={() => setActiveTab('vendors')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'vendors'
                  ? 'border-copper text-cocoa-900'
                  : 'border-transparent text-cocoa-500 hover:text-cocoa-700 hover:border-cocoa-300'
              }`}
            >
              {t('expenses:domain.vendors')}
            </button>
            <button
              onClick={() => setActiveTab('recurring')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'recurring'
                  ? 'border-copper text-cocoa-900'
                  : 'border-transparent text-cocoa-500 hover:text-cocoa-700 hover:border-cocoa-300'
              }`}
            >
              {t('expenses:recurring.title')}
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'payments'
                  ? 'border-copper text-cocoa-900'
                  : 'border-transparent text-cocoa-500 hover:text-cocoa-700 hover:border-cocoa-300'
              }`}
            >
              {t('expenses:domain.payments')}
            </button>
          </nav>
        </div>

        {activeTab === 'bills' && <BillsList onCardClick={handleBillCardClick} key={reviewOpen ? 'refresh' : 'idle'} />}
        {activeTab === 'vendors' && <VendorsList onCardClick={handleVendorCardClick} key={vendorFormOpen ? 'refresh' : 'idle'} />}
        {activeTab === 'recurring' && <RecurringExpectationsList onCardClick={handleRecurringCardClick} key={recurringFormOpen ? 'refresh' : 'idle'} />}
        {activeTab === 'payments' && <PaymentsList key={paymentFormOpen ? 'refresh' : 'idle'} />}

      </div>

      <BillUpload
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onExtracted={handleExtracted}
      />

      <BillReview
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        extractedResult={extractedResult}
        existingBill={existingBill}
        onSaved={() => {
          setReviewOpen(false);
          // the 'key' trick on BillsList will trigger a re-mount/re-fetch
        }}
      />

      <VendorForm
        isOpen={vendorFormOpen}
        onClose={() => setVendorFormOpen(false)}
        existingVendor={editingVendor}
        onSaved={() => {
          setVendorFormOpen(false);
        }}
      />
      
      <RecurringExpectationForm
        isOpen={recurringFormOpen}
        onClose={() => setRecurringFormOpen(false)}
        existing={editingRecurring}
        onSaved={() => {
          setRecurringFormOpen(false);
        }}
      />

      <PaymentForm
        isOpen={paymentFormOpen}
        onClose={() => setPaymentFormOpen(false)}
        initialBill={null}
        onSaved={() => {
          setPaymentFormOpen(false);
        }}
      />
    </div>
  );
}

