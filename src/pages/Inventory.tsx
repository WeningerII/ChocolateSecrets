import React, { useEffect, useState } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { Location } from '../types';
import { Plus, Pencil, Trash2, X, MapPin, ClipboardCheck, ArrowRightLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ConfirmModal from '../components/ConfirmModal';
import AuditsView from '../components/AuditsView';
import TransfersView from '../components/TransfersView';
import { useData } from '../contexts/DataContext';

export default function Inventory() {
  const { t } = useTranslation(['inventory', 'recipes', 'auth', 'common']);
  const { locations, loading } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [activeTab, setActiveTab] = useState<'locations' | 'audits' | 'transfers'>('locations');
  
  const [formData, setFormData] = useState<{
    name: string;
    type: string;
  }>({
    name: '',
    type: ''
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (!auth.currentUser) {
      setConfirmModal({
        isOpen: true,
        title: t('recipes:errorTitle'),
        message: t('auth:pleaseSignIn'),
        onConfirm: () => {},
      });
      return;
    }

    try {
      if (editingLocation) {
        await updateDoc(doc(db, 'locations', editingLocation.id), {
          name: formData.name,
          type: formData.type
        });
      } else {
        await addDoc(collection(db, 'locations'), {
          name: formData.name,
          type: formData.type,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingLocation(null);
      setFormData({ name: '', type: '' });
    } catch (error) {
      handleFirestoreError(error, editingLocation ? OperationType.UPDATE : OperationType.CREATE, 'locations');
    }
  };

  const handleDelete = (id: string) => {
    if (!auth.currentUser) {
      setConfirmModal({
        isOpen: true,
        title: t('recipes:errorTitle'),
        message: t('auth:pleaseSignIn'),
        onConfirm: () => {},
      });
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: t('inventory:deleteTitle'),
      message: t('inventory:deleteMessage'),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'locations', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `locations/${id}`);
        }
      }
    });
  };

  const openEditModal = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      type: location.type || ''
    });
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{t('inventory:title')}</h1>
          <p className="text-stone-500">{t('inventory:subtitle')}</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-stone-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('locations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'locations'
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <MapPin className="w-4 h-4" />
          {t('inventory:storageLocations')}
        </button>
        <button
          onClick={() => setActiveTab('audits')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'audits'
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          {t('inventory:inventoryAudits')}
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'transfers'
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          {t('inventory:internalTransfers')}
        </button>
      </div>

      {activeTab === 'locations' ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingLocation(null);
                setFormData({ name: '', type: '' });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              {t('inventory:addLocation')}
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('inventory:locationName')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('inventory:type')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('common:actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {locations.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-stone-500">
                    <MapPin className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                    <p>{t('inventory:noLocations')}</p>
                  </td>
                </tr>
              ) : (
                locations.map((location) => (
                  <tr key={location.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-stone-900 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-stone-400" />
                        {location.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                      {location.type || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(location)}
                          className="p-2 text-stone-400 hover:text-amber-600 transition-colors"
                          title={t('common:edit')}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(location.id)}
                          className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                          title={t('common:delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      ) : activeTab === 'audits' ? (
        <AuditsView locations={locations} />
      ) : (
        <TransfersView locations={locations} />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-stone-900">
                {editingLocation ? t('inventory:editLocation') : t('inventory:addLocation')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('inventory:locationName')}</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder={t('inventory:locationNamePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('inventory:typeOptional')}</label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder={t('inventory:locationTypePlaceholder')}
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-stone-600 font-medium hover:bg-stone-100 rounded-xl transition-colors"
                >
                  {t('common:cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded-xl transition-colors"
                >
                  {editingLocation ? t('common:save') : t('inventory:addLocation')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
