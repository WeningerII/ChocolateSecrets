import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isAlert?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isDestructive = true,
  isAlert = false
}: ConfirmModalProps) {
  const { t } = useTranslation(['common']);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            {isDestructive && <AlertTriangle className="w-5 h-5 text-red-600" />}
            {title}
          </h2>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-stone-600">{message}</p>
        </div>
        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex justify-end gap-3">
          {!isAlert && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-colors"
            >
              {cancelText || t('common:cancel')}
            </button>
          )}
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              isAlert ? 'bg-stone-800 hover:bg-stone-900' : (isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700')
            }`}
          >
            {confirmText || (isAlert ? 'OK' : t('common:confirm'))}
          </button>
        </div>
      </div>
    </div>
  );
}
