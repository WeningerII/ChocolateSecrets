import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit, startAfter, where, getDocs, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { InventoryTransaction } from '../types';
import { ArrowDownRight, ArrowUpRight, Search, Filter, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { parseFirestoreDate } from '../utils/date';
import { useData } from '../contexts/DataContext';

const PAGE_SIZE = 50;

export default function InventoryTransactions() {
  const { t } = useTranslation(['ledger']);
  const { getIngredient, loading: dataLoading } = useData();
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<number | ''>('');
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [hasNewEntries, setHasNewEntries] = useState(false);

  const fetchTransactions = async (isInitial = true) => {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      let baseQuery = collection(db, 'inventoryTransactions');
      let constraints: any[] = [orderBy('date', 'desc')];
      
      if (typeFilter) {
        constraints.unshift(where('type', '==', typeFilter));
      }
      if (dateFilter) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - dateFilter);
        constraints.unshift(where('date', '>=', startDate));
      }

      if (!isInitial && lastVisible) {
        constraints.push(startAfter(lastVisible));
      }
      
      constraints.push(limit(PAGE_SIZE));

      const q = query(baseQuery, ...constraints);
      const snapshot = await getDocs(q);
      const newDocs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as InventoryTransaction));

      if (isInitial) {
        setTransactions(newDocs);
        setHasNewEntries(false);
      } else {
        setTransactions(prev => [...prev, ...newDocs]);
      }

      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'inventoryTransactions');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchTransactions(true);
  }, [typeFilter, dateFilter]);

  // Tiny subscription to watch for new transactions
  useEffect(() => {
    let baseQuery = collection(db, 'inventoryTransactions');
    let constraints: any[] = [orderBy('date', 'desc'), limit(1)];
    
    if (typeFilter) {
      constraints.unshift(where('type', '==', typeFilter));
    }
    const q = query(baseQuery, ...constraints);

    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const latestId = snapshot.docs[0].id;
        setTransactions(prev => {
          if (prev.length > 0 && !prev.find(t => t.id === latestId)) {
            setHasNewEntries(true);
          }
          return prev;
        });
      }
    });

    return () => unsub();
  }, [typeFilter]);

  const loadMore = () => fetchTransactions(false);

  const getIngredientName = (id: string) => {
    return getIngredient(id)?.name || 'Unknown Ingredient';
  };

  const getIngredientUnit = (id: string) => {
    return getIngredient(id)?.unit || '';
  };

  const filteredTransactions = transactions.filter(tx => {
    const ingredientName = getIngredientName(tx.ingredientId).toLowerCase();
    const matchesSearch = ingredientName.includes(searchQuery.toLowerCase()) || 
                          (tx.reason || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading || dataLoading) return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-stone-200 rounded w-3/4"></div><div className="space-y-2"><div className="h-4 bg-stone-200 rounded"></div><div className="h-4 bg-stone-200 rounded w-5/6"></div></div></div></div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-stone-900">{t('ledger:title')}</h2>
        <p className="text-stone-500 mt-1">{t('ledger:subtitle')}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl shadow-sm border border-stone-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="text"
            placeholder={t('ledger:searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="relative sm:w-64">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none bg-transparent"
          >
            <option value="">{t('ledger:allTypes')}</option>
            <option value="receive">{t('ledger:receive')}</option>
            <option value="consume">{t('ledger:consume')}</option>
            <option value="waste">{t('ledger:waste')}</option>
            <option value="transfer">{t('ledger:transfer')}</option>
            <option value="audit_adjustment">{t('ledger:auditAdjustment')}</option>
          </select>
        </div>
        <div className="relative sm:w-48">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none bg-transparent"
          >
            <option value="">{t('ledger:dateFilter.allTime')}</option>
            <option value={7}>{t('ledger:dateFilter.last7Days')}</option>
            <option value={30}>{t('ledger:dateFilter.last30Days')}</option>
            <option value={90}>{t('ledger:dateFilter.last90Days')}</option>
          </select>
        </div>
      </div>

      {hasNewEntries && (
        <button
          onClick={() => fetchTransactions(true)}
          className="w-full py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-2xl border border-amber-200 text-sm font-medium transition-colors"
        >
          {t('ledger:newTransactionsAvailable', 'New transactions available — click to refresh')}
        </button>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="min-w-full divide-y divide-stone-200">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('ledger:date')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('ledger:item')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('ledger:type')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('ledger:amount')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('ledger:reason')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('ledger:cost')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-stone-200">
            {filteredTransactions.map((tx) => {
              const date = parseFirestoreDate(tx.date);
              const isPositive = tx.type === 'receive' || tx.amount > 0;
              const unit = getIngredientUnit(tx.ingredientId);
              
              return (
                <tr key={tx.id} className="hover:bg-stone-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                    {format(date, 'MMM d, yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-stone-900">{getIngredientName(tx.ingredientId)}</div>
                    {tx.lotId && <div className="text-xs text-stone-500">Lot: {tx.lotId}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                      ${tx.type === 'receive' ? 'bg-green-100 text-green-800' : 
                        tx.type === 'consume' ? 'bg-blue-100 text-blue-800' : 
                        tx.type === 'waste' ? 'bg-red-100 text-red-800' : 
                        tx.type === 'transfer' ? 'bg-purple-100 text-purple-800' :
                        tx.type === 'audit_adjustment' ? 'bg-amber-100 text-amber-800' :
                        'bg-stone-100 text-stone-800'}`}
                    >
                      {tx.type === 'audit_adjustment' ? t('ledger:auditAdjustment') : t(`ledger:${tx.type}` as any)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`flex items-center gap-1 font-medium ${tx.type === 'transfer' ? 'text-purple-600' : isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type !== 'transfer' && (isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />)}
                      {Math.abs(tx.amount)} {unit}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-stone-600">
                    {tx.reason || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-stone-900">
                    {tx.costPerUnit && tx.type !== 'transfer' ? `$${(Math.abs(tx.amount) * tx.costPerUnit).toFixed(2)}` : '-'}
                  </td>
                </tr>
              );
            })}
            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-stone-500">
                  {t('ledger:noTransactions')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-xl hover:bg-stone-50 font-medium transition-colors disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('common:loading')}
              </>
            ) : (
              t('ledger:loadMore', 'Load More')
            )}
          </button>
        </div>
      )}
    </div>
  );
}
