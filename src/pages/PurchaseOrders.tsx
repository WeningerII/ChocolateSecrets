import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { PurchaseOrder } from '../types';
import { FileText, CheckCircle2, Clock, Trash2, PackagePlus } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import ReceivePOModal from '../components/ReceivePOModal';
import { formatFirestoreDate } from '../utils/date';
import { useTranslation } from 'react-i18next';
import { useData } from '../contexts/DataContext';

export default function PurchaseOrders() {
  const { t, i18n } = useTranslation(['po', 'common']);
  const language = i18n.language as 'en' | 'es' | 'ko';
  const { suppliers, locations, ingredients, loading: dataLoading } = useData();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isAlert?: boolean;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    const unsubscribePOs = onSnapshot(
      query(collection(db, 'purchaseOrders'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setPurchaseOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder)));
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'purchaseOrders')
    );

    return () => {
      unsubscribePOs();
    };
  }, []);

  const updateStatus = async (id: string, status: PurchaseOrder['status']) => {
    try {
      await updateDoc(doc(db, 'purchaseOrders', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `purchaseOrders/${id}`);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: t('po:deleteTitle'),
      message: t('po:deleteMessage'),
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'purchaseOrders', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `purchaseOrders/${id}`);
        }
      }
    });
  };

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'draft':
        return <span className="px-2 py-1 bg-stone-100 text-stone-600 rounded-full text-xs font-medium">{t('po:statusDraft')}</span>;
      case 'sent':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> {t('po:statusSent')}</span>;
      case 'partially_received':
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">{t('po:statusPartial')}</span>;
      case 'fulfilled':
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {t('po:statusReceived')}</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">{t('po:statusCancelled')}</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-stone-200 rounded w-3/4"></div><div className="space-y-2"><div className="h-4 bg-stone-200 rounded"></div><div className="h-4 bg-stone-200 rounded w-5/6"></div></div></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{t('po:title')}</h1>
          <p className="text-stone-500">{t('po:subtitle')}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="min-w-full divide-y divide-stone-200">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('po:poNumber')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('po:date')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('po:supplier')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('po:status')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('po:total')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('po:actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-stone-200">
            {purchaseOrders.map((po) => {
              const supplier = suppliers.find(s => s.id === po.supplierId);
              return (
                <tr key={po.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-stone-400" />
                      <span className="text-sm font-medium text-stone-900">{po.poNumber}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                    {formatFirestoreDate(po.createdAt, language)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">
                    {supplier?.name || t('po:statusUnknown')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(po.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900 text-right">
                    ${(po.totalAmount || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {po.status !== 'fulfilled' && po.status !== 'cancelled' && (
                      <button
                        onClick={() => {
                          setSelectedPO(po);
                          setIsReceiveModalOpen(true);
                        }}
                        className="mr-3 text-amber-600 hover:text-amber-900 font-medium"
                      >
                        {t('po:receiveItems')}
                      </button>
                    )}
                    <select
                      value={po.status}
                      onChange={(e) => updateStatus(po.id!, e.target.value as PurchaseOrder['status'])}
                      className="mr-3 text-sm border-stone-300 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500"
                    >
                      <option value="draft">{t('po:statusDraft')}</option>
                      <option value="sent">{t('po:statusSent')}</option>
                      <option value="partially_received">{t('po:statusPartial')}</option>
                      <option value="fulfilled">{t('po:statusReceived')}</option>
                      <option value="cancelled">{t('po:statusCancelled')}</option>
                    </select>
                    
                    <button 
                      onClick={() => handleDelete(po.id!)} 
                      className="text-red-400 hover:text-red-600" 
                      title={t('po:deleteTitle')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {purchaseOrders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-stone-500">
                  {t('po:noPOs')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ReceivePOModal
        isOpen={isReceiveModalOpen}
        onClose={() => {
          setIsReceiveModalOpen(false);
          setSelectedPO(null);
        }}
        po={selectedPO}
        supplier={suppliers.find(s => s.id === selectedPO?.supplierId)}
        locations={locations}
        ingredients={ingredients}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        isAlert={confirmModal.isAlert}
        isDestructive={confirmModal.isDestructive}
      />
    </div>
  );
}
