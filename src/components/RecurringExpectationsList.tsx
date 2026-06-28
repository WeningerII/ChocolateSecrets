import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { RecurringExpectation, Vendor } from '../types';
import { listRecurringExpectations } from '../services/recurringExpectationsService';
import { listVendors } from '../services/vendorsService';
import { parseRRule, previousOccurrence } from '../utils/rrule';
import { useToast } from '../contexts/ToastContext';

interface RecurringExpectationsListProps {
  onCardClick: (expectation: RecurringExpectation) => void;
}

export default function RecurringExpectationsList({ onCardClick }: RecurringExpectationsListProps) {
  const { t } = useTranslation(['expenses']);
  const { toast } = useToast();
  const [expectations, setExpectations] = useState<RecurringExpectation[]>([]);
  const [vendors, setVendors] = useState<Record<string, Vendor>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [exps, vends] = await Promise.all([
          listRecurringExpectations(),
          listVendors()
        ]);
        setExpectations(exps);
        
        const vendorMap: Record<string, Vendor> = {};
        for (const v of vends) {
          if (v.id) vendorMap[v.id] = v;
        }
        setVendors(vendorMap);
      } catch (err: any) {
        toast.error(t('expenses:errors.listRecurringFailed', { message: err?.message || '' }));
        console.error('Failed to load recurring expectations', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-white border border-cocoa-100 rounded-xl p-5 h-32" />
        ))}
      </div>
    );
  }

  if (expectations.length === 0) {
    return (
      <div className="bg-white border text-center border-cocoa-100 rounded-xl p-12 text-cocoa-500">
        {t('expenses:recurring.emptyState')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {expectations.map(exp => {
        const vendorName = vendors[exp.vendorId]?.name || 'Unknown Vendor';
        let cadenceSummary = '';
        try {
          cadenceSummary = parseRRule(exp.rrule).toText();
        } catch {
          cadenceSummary = exp.rrule;
        }

        const amtStr = `≈ $${exp.expectedAmount.toFixed(2)} ± $${exp.tolerance.amountToleranceBand.low} / $${exp.tolerance.amountToleranceBand.high}`;
        
        // Overdue: an active, never-satisfied expectation whose previous expected
        // window has already passed (and post-dates its creation, so brand-new
        // expectations aren't falsely flagged).
        let overdue = false;
        if (exp.isActive && !exp.lastSatisfiedBillId) {
          const createdSec = (exp.createdAt as any)?._seconds ?? (exp.createdAt as any)?.seconds;
          const createdDate = createdSec ? new Date(createdSec * 1000) : null;
          try {
            const prev = previousOccurrence(exp.rrule, new Date());
            if (prev && (!createdDate || prev > createdDate)) overdue = true;
          } catch { /* unparseable rrule — leave not-overdue */ }
        }

        const nextSec = (exp.nextExpectedDate as any)?._seconds ?? (exp.nextExpectedDate as any)?.seconds;
        const nextDate = nextSec ? new Date(nextSec * 1000) : null;
        let nextExpectedStr = '';
        if (nextDate) {
           const relative = formatDistanceToNowStrict(nextDate, { addSuffix: true });
           nextExpectedStr = t('expenses:recurring.card.nextExpected', {
             date: format(nextDate, 'MMM d, yyyy'),
             relative
           });
        }

        return (
          <div
            key={exp.id}
            onClick={() => onCardClick(exp)}
            className="group block w-full text-left bg-white border border-cocoa-100 rounded-xl p-5 hover:border-copper/50 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-base font-semibold text-cocoa-900">{vendorName}</h3>
              <div className="flex items-center gap-2 shrink-0">
                {overdue && (
                  <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-700">
                    {t('expenses:recurring.card.overdue', 'Overdue')}
                  </span>
                )}
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${exp.isActive ? 'bg-pistachio/20 text-pistachio-dark' : 'bg-cocoa-100 text-cocoa-500'}`}>
                  {exp.isActive ? t('expenses:recurring.card.active') : t('expenses:recurring.card.inactive')}
                </span>
              </div>
            </div>
            
            <p className="text-sm font-medium text-cocoa-700 capitalize mb-1">
              {cadenceSummary} • {amtStr}
            </p>
            
            <div className="text-xs text-cocoa-500 space-y-1">
              <p>{nextExpectedStr}</p>
              {exp.lastSatisfiedBillId ? (
                <p>
                  {t('expenses:recurring.card.lastSatisfied', {
                     date: 'Recently', // Simplified for list view, full date requires joining bill
                     invoice: exp.lastSatisfiedBillId.substring(0, 8)
                  })}
                </p>
              ) : (
                <p>{t('expenses:recurring.card.neverSatisfied')}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
