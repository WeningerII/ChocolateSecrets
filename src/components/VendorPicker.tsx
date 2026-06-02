import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Vendor } from '../types';
import { VendorResolutionResult } from '../services/vendorsService';
import VendorSearchModal from './VendorSearchModal';

interface VendorPickerProps {
  resolution: VendorResolutionResult;
  selectedVendorId: string | null;
  onSelect: (vendorId: string) => void;
  onCreateNewFromExtraction: () => void;
  vendorsCache: Map<string, Vendor>;
}

export default function VendorPicker({
  resolution,
  selectedVendorId,
  onSelect,
  onCreateNewFromExtraction,
  vendorsCache
}: VendorPickerProps) {
  const { t } = useTranslation(['expenses']);
  const [searchOpen, setSearchOpen] = useState(false);

  const handleSearchSelect = (v: Vendor) => {
    // Make sure it's in the parent's cache or the parent can handle it if not?
    // The instructions say "call onSelect(newVendorId) and update the matched display."
    // We will just call onSelect and parent has to fetch/cache the vendor,
    // or we can assume it will be passed down in it's next render if parent updates.
    onSelect(v.id);
    vendorsCache.set(v.id, v); // optimistically update local cache
  };

  const isResolved = resolution.status === 'resolved' || selectedVendorId;
  const renderResolved = () => {
    const matchedVendorId = selectedVendorId || resolution.candidateVendorIds[0];
    const vendor = matchedVendorId ? vendorsCache.get(matchedVendorId) : null;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between bg-cocoa-100 rounded-xl p-3 border border-cocoa-200">
          <div>
            <span className="text-xs font-medium text-cocoa-500 uppercase tracking-wider block mb-0.5">{t('expenses:review.vendorMatched')}</span>
            <span className="text-sm font-semibold text-cocoa-900">{vendor?.name || t('expenses:review.unknownVendor')}</span>
          </div>
          <button
            onClick={() => setSearchOpen(true)}
            className="text-sm font-medium text-copper hover:text-copper-dark bg-white px-3 py-1.5 rounded-lg border border-cocoa-200"
          >
            {t('expenses:actions.change')}
          </button>
        </div>
        <VendorSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} onSelect={handleSearchSelect} />
      </div>
    );
  };

  if (isResolved) return renderResolved();

  return (
    <div className="space-y-3">
      {resolution.status === 'ambiguous' && (
        <div className="space-y-2">
          <span className="text-sm font-medium text-amber-700">{t('expenses:review.vendorAmbiguous')}</span>
          <div className="space-y-2">
            {resolution.candidateVendorIds.map(vid => {
              const v = vendorsCache.get(vid);
              if (!v) return null;
              return (
                <label key={vid} className="flex items-center gap-3 p-3 border border-cocoa-100 rounded-xl cursor-pointer hover:bg-cocoa-100">
                  <input
                    type="radio"
                    name="vendorSelection"
                    checked={selectedVendorId === vid}
                    onChange={() => onSelect(vid)}
                    className="text-copper focus:ring-copper"
                  />
                  <div>
                    <div className="text-sm font-medium text-cocoa-900">{v.name}</div>
                    {v.accountIdentifier && <div className="text-xs text-cocoa-500">{t('expenses:list.vendorCardAccount')}: {v.accountIdentifier}</div>}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {resolution.status === 'unresolved' && (
        <p className="text-sm font-medium text-cocoa-500 mb-2">{t('expenses:review.vendorNoMatch')}</p>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={onCreateNewFromExtraction}
          className="text-sm font-medium text-copper hover:text-copper-dark bg-copper/5 hover:bg-copper/10 px-4 py-2 rounded-lg text-left"
        >
          {t('expenses:actions.createNewFromExtraction')}
        </button>
        <button
          onClick={() => setSearchOpen(true)}
          className="text-sm font-medium text-cocoa-700 hover:text-cocoa-900 border border-cocoa-200 bg-white hover:bg-cocoa-100 px-4 py-2 rounded-lg text-left"
        >
          {t('expenses:actions.searchExisting')}
        </button>
      </div>

      <VendorSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} onSelect={handleSearchSelect} />
    </div>
  );
}

