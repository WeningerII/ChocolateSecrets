import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { X, UploadCloud, Camera, FileText, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractBill, fileToBase64, ExtractedBillResult } from '../services/billsService';

interface BillUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onExtracted: (result: ExtractedBillResult) => void;
}

export default function BillUpload({ isOpen, onClose, onExtracted }: BillUploadProps) {
  const { t } = useTranslation(['expenses']);
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);

  if (!isOpen) return null;

  const handleFile = (selectedFile: File) => {
    setFile(selectedFile);
    if (selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true);
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const result = await extractBill(base64, mimeType);
      onExtracted(result);
    } catch (err: any) {
      console.error('Extraction error', err);
      toast.error(t(err.message || 'expenses:upload.errorExtraction'));
    } finally {
      setExtracting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cocoa-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between p-6 border-b border-cocoa-100">
            <h2 className="text-xl font-display font-semibold text-cocoa-900">
              {t('expenses:upload.title')}
            </h2>
            <button
              onClick={onClose}
              disabled={extracting}
              className="text-cocoa-400 hover:text-cocoa-600 transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-8">
            {!file ? (
              <div
                className="border-2 border-dashed border-cocoa-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-cocoa-100/50"
                onDragOver={onDragOver}
                onDrop={onDrop}
              >
                <UploadCloud className="w-12 h-12 text-copper mb-4" />
                <p className="text-sm font-medium text-cocoa-900 mb-4">{t('expenses:upload.dropZone')}</p>
                <div className="flex items-center justify-center gap-4 w-full">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-cocoa-200 shadow-sm rounded-xl text-sm font-medium text-cocoa-700 hover:bg-cocoa-100"
                  >
                    <Camera className="w-4 h-4" />
                    {t('expenses:upload.takePhoto')}
                  </button>
                  <span className="text-cocoa-400 text-sm">{t('expenses:upload.or')}</span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-cocoa-200 shadow-sm rounded-xl text-sm font-medium text-cocoa-700 hover:bg-cocoa-100"
                  >
                    <FileText className="w-4 h-4" />
                    {t('expenses:upload.chooseFile')}
                  </button>
                </div>
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center">
                {preview ? (
                  <img src={preview} alt="Preview" className="w-full max-h-64 object-contain rounded-xl border border-cocoa-100 mb-4" />
                ) : (
                  <div className="w-full max-h-64 bg-cocoa-100 rounded-xl border border-cocoa-100 mb-4 flex flex-col items-center justify-center py-12">
                    <FileText className="w-16 h-16 text-cocoa-300 mb-2" />
                    <span className="text-cocoa-700 font-medium">{file.name}</span>
                  </div>
                )}
                
                {extracting ? (
                  <div className="flex items-center gap-2 text-copper font-medium">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('expenses:upload.extracting')}
                  </div>
                ) : (
                  <div className="flex gap-4 w-full">
                    <button
                      onClick={() => { setFile(null); setPreview(null); }}
                      className="flex-1 px-4 py-3 bg-white border border-cocoa-200 rounded-xl text-sm font-medium text-cocoa-700 hover:bg-cocoa-100"
                    >
                      {t('expenses:actions.cancel')}
                    </button>
                    <button
                      onClick={handleExtract}
                      className="flex-1 px-4 py-3 bg-copper rounded-xl text-sm font-medium text-white hover:bg-copper-dark shadow-sm"
                    >
                      {t('expenses:actions.extract')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

