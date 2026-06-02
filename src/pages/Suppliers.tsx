import React, { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, updateDoc, addDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { Supplier } from '../types';
import { Plus, Search, Pencil, Trash2, X, Building2, Mail, Phone, Clock, DollarSign } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';
import { formatCurrency } from '../utils/formatters';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { attachSupplierLocalizedFields, stripUndefined } from '../utils/localized';
import { SupportedLanguage } from '../types';

export default function Suppliers() {
  const { t, i18n } = useTranslation(['suppliers', 'recipes', 'auth']);
  const language = useLanguage();
  const { toast } = useToast();
  const { suppliers, loading } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  
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

  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    leadTimeDays: 0,
    minimumOrderValue: 0,
    notes: ''
  });

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.contactName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactName: supplier.contactName || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      leadTimeDays: supplier.leadTimeDays || 0,
      minimumOrderValue: supplier.minimumOrderValue || 0,
      notes: supplier.notes || ''
    });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      contactName: '',
      email: '',
      phone: '',
      leadTimeDays: 0,
      minimumOrderValue: 0,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!auth.currentUser) {
      toast.error(t('auth:pleaseSignIn'));
      return;
    }

    try {
      const finalName = formData.name?.trim() || 'Untitled Supplier';

      const basePayload: Record<string, any> = {
        name: finalName,
        contactName: formData.contactName || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        leadTimeDays: Number(formData.leadTimeDays) > 0 ? Number(formData.leadTimeDays) : undefined,
        minimumOrderValue: Number(formData.minimumOrderValue) > 0 ? Number(formData.minimumOrderValue) : undefined,
        notes: formData.notes || undefined,
      };

      const uiLanguage = (i18n.language.split('-')[0] as SupportedLanguage);
      const supplierWithLocalized = attachSupplierLocalizedFields(
        basePayload as Supplier,
        editingSupplier || undefined,
        uiLanguage
      );
      const sanitized = stripUndefined(supplierWithLocalized);
      
      if (editingSupplier) {
        // UPDATE: use deleteField() for cleared values so Firestore actually removes them
        const updatePayload: Record<string, any> = {
          ...sanitized,
          updatedAt: serverTimestamp(),
        };
        
        // For each optional field, write the value if present, or deleteField() if the user cleared it
        const optionalFields = [
          'contactName', 'email', 'phone', 'leadTimeDays', 'minimumOrderValue', 'notes', 'notesI18n'
        ];
        
        for (const field of optionalFields) {
          if (updatePayload[field] === undefined) {
             updatePayload[field] = deleteField();
          }
        }
        
        await updateDoc(doc(db, 'suppliers', editingSupplier.id), updatePayload);
      } else {
        // CREATE: omit missing optional fields (existing behavior is fine for creates)
        const createPayload: Record<string, any> = {
          ...sanitized,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        await addDoc(collection(db, 'suppliers'), createPayload);
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingSupplier ? OperationType.UPDATE : OperationType.CREATE, 'suppliers');
    }
  };

  const handleDelete = (id: string) => {
    if (!auth.currentUser) {
      toast.error(t('auth:pleaseSignIn'));
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: t('suppliers:deleteTitle'),
      message: t('suppliers:deleteMessage'),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'suppliers', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `suppliers/${id}`);
        }
      }
    });
  };

  if (loading) return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-stone-200 rounded w-3/4"></div><div className="space-y-2"><div className="h-4 bg-stone-200 rounded"></div><div className="h-4 bg-stone-200 rounded w-5/6"></div></div></div></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-stone-900">{t('suppliers:title')}</h2>
          <p className="text-stone-500 mt-1">{t('suppliers:subtitle')}</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          {t('suppliers:addSupplier')}
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="text"
            placeholder={t('suppliers:search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map(supplier => (
          <div key={supplier.id} className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-stone-900">{supplier.name}</h3>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEditModal(supplier)} className="text-stone-400 hover:text-amber-700 transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(supplier.id)} className="text-stone-400 hover:text-red-600 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              {supplier.contactName && (
                <div className="flex items-center gap-2 text-stone-600">
                  <span className="font-medium text-stone-900">{t('suppliers:contact')}</span> {supplier.contactName}
                </div>
              )}
              {supplier.email && (
                <div className="flex items-center gap-2 text-stone-600">
                  <Mail className="w-4 h-4 text-stone-400" />
                  <a href={`mailto:${supplier.email}`} className="hover:text-amber-700">{supplier.email}</a>
                </div>
              )}
              {supplier.phone && (
                <div className="flex items-center gap-2 text-stone-600">
                  <Phone className="w-4 h-4 text-stone-400" />
                  <a href={`tel:${supplier.phone}`} className="hover:text-amber-700">{supplier.phone}</a>
                </div>
              )}
              
              <div className="pt-3 mt-3 border-t border-stone-100 grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-1.5 text-stone-500 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">{t('suppliers:leadTime')}</span>
                  </div>
                  <p className="font-medium text-stone-900">{supplier.leadTimeDays ? `${supplier.leadTimeDays} ${t('suppliers:days')}` : '-'}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-stone-500 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">{t('suppliers:minOrder')}</span>
                  </div>
                  <p className="font-medium text-stone-900">{supplier.minimumOrderValue ? formatCurrency(supplier.minimumOrderValue, language) : '-'}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filteredSuppliers.length === 0 && (
          <div className="col-span-full text-center py-12 text-stone-500 bg-white rounded-2xl border border-stone-200 border-dashed">
            {t('suppliers:noSuppliers')}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-stone-900">
                {editingSupplier ? t('suppliers:editSupplier') : t('suppliers:addSupplier')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('suppliers:companyName')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder={t('suppliers:placeholderName')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('suppliers:contactName')}</label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder={t('suppliers:placeholderContact')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('suppliers:email')}</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder={t('suppliers:placeholderEmail')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('suppliers:phone')}</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder={t('suppliers:placeholderPhone')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('suppliers:leadTimeDays')}</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.leadTimeDays || ''}
                    onChange={(e) => setFormData({ ...formData, leadTimeDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder={t('suppliers:placeholderLeadTime')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('suppliers:minOrderValue')} ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minimumOrderValue || ''}
                    onChange={(e) => setFormData({ ...formData, minimumOrderValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder={t('suppliers:placeholderMinOrder')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('suppliers:notes')}</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 h-24 resize-none"
                  placeholder={t('suppliers:notesPlaceholder')}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white border-t border-stone-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-stone-600 font-medium hover:bg-stone-100 rounded-xl transition-colors"
                >
                  {t('suppliers:cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded-xl transition-colors"
                >
                  {t('suppliers:saveSupplier')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isAlert={confirmModal.isAlert}
        isDestructive={confirmModal.isDestructive}
      />
    </div>
  );
}
