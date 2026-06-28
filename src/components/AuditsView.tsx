import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, reportFirestoreError, OperationType } from '../firebase';
import { Audit, AuditItem, Location, StockPosition } from '../types';
import { ClipboardCheck, Plus, Play, CheckCircle2, X, Boxes } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';
import { formatFirestoreDate } from '../utils/date';
import { useData } from '../contexts/DataContext';
import { updateLotQuantity } from '../utils/firestore';
import { computeCountedQty, EMPTY_STOCK_COUNT } from '../utils/stockCount';

interface AuditsViewProps {
  locations: Location[];
}

export default function AuditsView({ locations }: AuditsViewProps) {
  const { t } = useTranslation(['inventory', 'dashboard', 'common']);
  const language = useLanguage();
  const { ingredients, lots, loading: dataLoading } = useData();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeAudit, setActiveAudit] = useState<Audit | null>(null);
  const [isNewAuditModalOpen, setIsNewAuditModalOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  // Lots the counter has switched into by-container entry mode (lotId set).
  const [containerModeLots, setContainerModeLots] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribeAudits = onSnapshot(
      query(collection(db, 'audits'), orderBy('startedAt', 'desc')),
      (snapshot) => {
        setAudits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Audit)));
        setLoading(false);
      },
      (error) => { reportFirestoreError(error, OperationType.LIST, 'audits'); setLoading(false); }
    );

    return () => {
      unsubscribeAudits();
    };
  }, []);

  const handleStartAudit = async () => {
    try {
      const batch = writeBatch(db);
      const newAuditRef = doc(collection(db, 'audits'));
      
      // Determine which lots to audit
      const lotsToAudit = selectedLocationId 
        ? lots.filter(l => l.locationId === selectedLocationId && l.quantity > 0)
        : lots.filter(l => l.quantity > 0);

      const auditItems: AuditItem[] = lotsToAudit.map(lot => ({
        ingredientId: lot.ingredientId,
        lotId: lot.id,
        expectedQty: lot.quantity,
        actualQty: null,
        variance: null
      }));

      const newAudit: Partial<Audit> = {
        status: 'in_progress',
        startedAt: serverTimestamp(),
        locationId: selectedLocationId || undefined,
        items: auditItems
      };

      batch.set(newAuditRef, newAudit);
      await batch.commit();
      
      setIsNewAuditModalOpen(false);
      setSelectedLocationId('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'audits');
    }
  };

  const handleUpdateAuditItem = async (auditId: string, lotId: string, actualQty: number) => {
    const audit = audits.find(a => a.id === auditId);
    if (!audit) return;

    const updatedItems = audit.items.map(item => {
      if (item.lotId === lotId) {
        // Direct number entry — drop any by-container breakdown so the two modes
        // never disagree (count is rebuilt if the user switches back to containers).
        const { count, ...rest } = item;
        return {
          ...rest,
          actualQty,
          variance: actualQty - item.expectedQty
        };
      }
      return item;
    });

    try {
      await writeBatch(db).update(doc(db, 'audits', auditId), { items: updatedItems }).commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'audits');
    }
  };

  // By-container entry: store the breakdown and derive actualQty from it.
  const handleUpdateAuditCount = async (auditId: string, lotId: string, count: StockPosition) => {
    const audit = audits.find(a => a.id === auditId);
    if (!audit) return;

    const actualQty = computeCountedQty(count);
    const updatedItems = audit.items.map(item =>
      item.lotId === lotId
        ? { ...item, count, actualQty, variance: actualQty - item.expectedQty }
        : item
    );

    try {
      await writeBatch(db).update(doc(db, 'audits', auditId), { items: updatedItems }).commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'audits');
    }
  };

  // Toggle a lot between direct-number and by-container entry. Leaving container
  // mode keeps the running total but drops the breakdown.
  const toggleContainerMode = (auditId: string, lotId: string, currentlyOn: boolean, currentActualQty: number | null) => {
    setContainerModeLots(prev => {
      const next = new Set(prev);
      if (currentlyOn) next.delete(lotId); else next.add(lotId);
      return next;
    });
    if (currentlyOn) handleUpdateAuditItem(auditId, lotId, currentActualQty ?? 0);
  };

  const handleCompleteAudit = async (audit: Audit) => {
    try {
      const batch = writeBatch(db);

      batch.update(doc(db, 'audits', audit.id), {
        status: 'completed',
        completedAt: serverTimestamp()
      });

      const freshItems = audit.items.map(item => {
        const currentLot = lots.find(l => l.id === item.lotId);
        const freshExpectedQty = currentLot ? currentLot.quantity : 0;
        const freshVariance = item.actualQty !== null 
          ? item.actualQty - freshExpectedQty 
          : null;
        return {
          ...item,
          refreshedExpectedQty: freshExpectedQty,
          refreshedVariance: freshVariance,
        };
      });

      // Persist the refreshed values onto the audit record itself for audit-trail purposes
      batch.update(doc(db, 'audits', audit.id), {
        items: freshItems.map(({ refreshedExpectedQty, refreshedVariance, ...rest }) => ({
          ...rest,
          expectedQtyAtCompletion: refreshedExpectedQty,
          varianceAtCompletion: refreshedVariance,
        })),
      });

      for (const item of freshItems) {
        if (item.refreshedVariance !== null && item.refreshedVariance !== 0 && item.actualQty !== null) {
          const lot = lots.find(l => l.id === item.lotId);
          if (lot) {
            updateLotQuantity(batch, db, lot, item.actualQty);
          }

          const ingredient = ingredients.find(i => i.id === item.ingredientId);
          const txRef = doc(collection(db, 'inventoryTransactions'));
          batch.set(txRef, {
            ingredientId: item.ingredientId,
            type: 'audit_adjustment',
            amount: item.refreshedVariance,
            costPerUnit: lot?.costPerUnit || ingredient?.costPerUnit || 0,
            date: serverTimestamp(),
            userId: auth.currentUser?.uid || 'unknown',
            lotId: item.lotId,
            poNumber: lot?.poNumber || undefined,
            referenceId: audit.id
          });
        }
      }

      await batch.commit();
      setActiveAudit(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'audits');
    }
  };

  if (loading || dataLoading) {
    return <div className="animate-pulse h-32 bg-stone-100 rounded-2xl"></div>;
  }

  if (activeAudit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">{t('inventory:activeAudit')}</h2>
            <p className="text-stone-500">
              {activeAudit.locationId 
                ? `${t('inventory:locationName')}: ${locations.find(l => l.id === activeAudit.locationId)?.name}`
                : t('inventory:fullInventoryAudit')}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setActiveAudit(null)}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-medium transition-colors"
            >
              {activeAudit.status === 'completed' ? t('common:back', 'Back') : t('inventory:saveAndPause')}
            </button>
            {activeAudit.status !== 'completed' && (
              <button
                onClick={() => handleCompleteAudit(activeAudit)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                {t('inventory:completeAudit')}
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('dashboard:ingredient')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('inventory:lot')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase">{t('inventory:expected')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase">{t('inventory:actualCount')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase">{t('inventory:variance')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {activeAudit.items.map(item => {
                const ingredient = ingredients.find(i => i.id === item.ingredientId);
                const lot = lots.find(l => l.id === item.lotId);
                if (!ingredient || !lot) return null;

                // A saved breakdown (item.count) keeps a row in container mode across reloads.
                const inContainerMode = containerModeLots.has(item.lotId) || !!item.count;
                const count = item.count ?? EMPTY_STOCK_COUNT;

                return (
                  <tr key={item.lotId} className="hover:bg-stone-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-stone-900">
                      {ingredient.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                      {lot.poNumber || lot.id.substring(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-stone-500">
                      {item.expectedQtyAtCompletion ?? item.expectedQty} {ingredient.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {activeAudit.status === 'completed' ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-stone-900 font-medium">{item.actualQty !== null ? item.actualQty : '-'}</span>
                          <span className="text-stone-500 text-sm w-8 text-left">{ingredient.unit}</span>
                        </div>
                      ) : inContainerMode ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number" min="0" step="1" value={count.containerCount || ''}
                            placeholder={t('inventory:audit.containers', 'Cases')}
                            onChange={(e) => handleUpdateAuditCount(activeAudit.id, item.lotId, { ...count, containerCount: e.target.value ? Number(e.target.value) : 0 })}
                            className="w-14 px-2 py-1 text-right border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <span className="text-stone-400 text-xs">×</span>
                          <input
                            type="number" min="0" step="0.01" value={count.unitsPerContainer || ''}
                            placeholder={t('inventory:audit.pack', 'Pack')}
                            onChange={(e) => handleUpdateAuditCount(activeAudit.id, item.lotId, { ...count, unitsPerContainer: e.target.value ? Number(e.target.value) : 0 })}
                            className="w-16 px-2 py-1 text-right border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <span className="text-stone-400 text-xs">+</span>
                          <input
                            type="number" min="0" step="0.01" value={count.looseUnits || ''}
                            placeholder={t('inventory:audit.loose', 'Loose')}
                            onChange={(e) => handleUpdateAuditCount(activeAudit.id, item.lotId, { ...count, looseUnits: e.target.value ? Number(e.target.value) : 0 })}
                            className="w-16 px-2 py-1 text-right border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <span className="text-stone-600 text-sm font-medium w-20 text-right">= {item.actualQty ?? 0} {ingredient.unit}</span>
                          <button
                            type="button"
                            onClick={() => toggleContainerMode(activeAudit.id, item.lotId, true, item.actualQty)}
                            title={t('inventory:audit.directEntry', 'Enter total directly')}
                            className="p-1 text-amber-600 hover:text-amber-700"
                          >
                            <Boxes className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number" min="0" step="0.01" value={item.actualQty === null ? '' : item.actualQty}
                            onChange={(e) => handleUpdateAuditItem(activeAudit.id, item.lotId, e.target.value ? Number(e.target.value) : 0)}
                            className="w-24 px-2 py-1 text-right border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                            placeholder={t('inventory:count')}
                          />
                          <span className="text-stone-500 text-sm w-8 text-left">{ingredient.unit}</span>
                          <button
                            type="button"
                            onClick={() => toggleContainerMode(activeAudit.id, item.lotId, false, item.actualQty)}
                            title={t('inventory:audit.countByContainer', 'Count by container')}
                            className="p-1 text-stone-400 hover:text-amber-600"
                          >
                            <Boxes className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {activeAudit.status === 'completed' && item.varianceAtCompletion !== undefined ? (
                        item.varianceAtCompletion !== null ? (
                          <span className={`font-medium ${item.varianceAtCompletion > 0 ? 'text-emerald-600' : item.varianceAtCompletion < 0 ? 'text-red-600' : 'text-stone-400'}`}>
                            {item.varianceAtCompletion > 0 ? '+' : ''}{item.varianceAtCompletion}
                          </span>
                        ) : (
                          <span className="text-stone-300">-</span>
                        )
                      ) : (
                        item.variance !== null ? (
                          <span className={`font-medium ${item.variance > 0 ? 'text-emerald-600' : item.variance < 0 ? 'text-red-600' : 'text-stone-400'}`}>
                            {item.variance > 0 ? '+' : ''}{item.variance}
                          </span>
                        ) : (
                          <span className="text-stone-300">-</span>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">{t('inventory:inventoryAudits')}</h2>
          <p className="text-stone-500">{t('inventory:auditsSubtitle')}</p>
        </div>
        <button
          onClick={() => setIsNewAuditModalOpen(true)}
          className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          {t('inventory:newAudit')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {audits.map(audit => {
          const isCompleted = audit.status === 'completed';
          const location = locations.find(l => l.id === audit.locationId);
          const date = formatFirestoreDate(audit.startedAt, language, t('common:dates.unknown'));

          return (
            <div key={audit.id} className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className={`w-5 h-5 ${isCompleted ? 'text-emerald-500' : 'text-amber-500'}`} />
                  <h3 className="font-semibold text-stone-900">
                    {location ? location.name : t('inventory:fullInventoryAudit')}
                  </h3>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {isCompleted ? t('inventory:completed') : t('inventory:inProgress')}
                </span>
              </div>
              
              <div className="text-sm text-stone-500 mb-4 flex-1">
                <p>{t('inventory:started')} {date}</p>
                <p>{t('inventory:lotsToCount', { count: audit.items.length })}</p>
              </div>

              {!isCompleted ? (
                <button
                  onClick={() => setActiveAudit(audit)}
                  className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  {t('inventory:resumeAudit')}
                </button>
              ) : (
                <button
                  onClick={() => setActiveAudit(audit)}
                  className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  {t('inventory:viewAudit', 'View Audit')}
                </button>
              )}
            </div>
          );
        })}
        {audits.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-stone-200 border-dashed">
            <ClipboardCheck className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500">{t('inventory:noAudits')}</p>
          </div>
        )}
      </div>

      {isNewAuditModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-stone-900">{t('inventory:startNewAudit')}</h3>
              <button onClick={() => setIsNewAuditModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('inventory:auditScope')}</label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="">{t('inventory:fullInventoryAllLocations')}</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
                <p className="text-xs text-stone-500 mt-2">
                  {t('inventory:auditScopeHelp')}
                </p>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  onClick={() => setIsNewAuditModalOpen(false)}
                  className="px-4 py-2 text-stone-600 font-medium hover:bg-stone-100 rounded-xl transition-colors"
                >
                  {t('common:cancel')}
                </button>
                <button
                  onClick={handleStartAudit}
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded-xl transition-colors"
                >
                  {t('inventory:startCounting')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
