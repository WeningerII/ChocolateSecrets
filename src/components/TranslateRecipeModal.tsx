import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Recipe } from '../types';
import { translateRecipe, applyTranslationProposal, TranslationProposal } from '../services/translateRecipe';
import { X, Languages, AlertCircle } from 'lucide-react';

interface TranslateRecipeModalProps {
  isOpen: boolean;
  recipe: Recipe;
  onClose: () => void;
  onApply: (updatedRecipe: Recipe) => Promise<void>;
}

export function TranslateRecipeModal({ isOpen, recipe, onClose, onApply }: TranslateRecipeModalProps) {
  const { t } = useTranslation(['recipes', 'common']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<TranslationProposal | null>(null);
  const [excludedPaths, setExcludedPaths] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setProposal(null);
      setExcludedPaths(new Set());
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    translateRecipe(recipe)
      .then((p) => {
        if (cancelled) return;
        setProposal(p);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        console.error('[TranslateRecipeModal] translation failed:', e);
        setError(e.message || t('recipes:translateRecipe.errorDefault'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isOpen, recipe, t]);

  if (!isOpen) return null;

  const acceptableFills = (proposal?.fills || []).filter(f => f.status !== 'error');
  const erroredFills = (proposal?.fills || []).filter(f => f.status === 'error');

  // Group fills by path for the per-row display.
  const grouped = new Map<string, typeof acceptableFills>();
  for (const fill of acceptableFills) {
    if (!grouped.has(fill.path)) grouped.set(fill.path, []);
    grouped.get(fill.path)!.push(fill);
  }

  const togglePath = (path: string) => {
    setExcludedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleApply = async () => {
    if (!proposal) return;
    setApplying(true);
    try {
      const acceptedPaths = new Set<string>();
      for (const path of grouped.keys()) {
        if (!excludedPaths.has(path)) acceptedPaths.add(path);
      }
      const updated = applyTranslationProposal(recipe, proposal, acceptedPaths);
      await onApply(updated);
      onClose();
    } catch (e) {
      console.error('[TranslateRecipeModal] apply failed:', e);
      setError(t('recipes:translateRecipe.applyFailed'));
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-cocoa-100 flex justify-between items-start">
          <div>
            <h3 className="font-display text-xl font-semibold text-cocoa-900 flex items-center gap-2">
              <Languages className="w-5 h-5 text-copper" />
              {t('recipes:translateRecipe.title')}
            </h3>
            <p className="text-sm text-cocoa-500 mt-1">{t('recipes:translateRecipe.subtitle', { name: recipe.name })}</p>
          </div>
          <button onClick={onClose} className="text-cocoa-400 hover:text-cocoa-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-copper border-t-transparent" />
              <p className="mt-3 text-sm text-cocoa-500">{t('recipes:translateRecipe.translating')}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 flex gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{t('recipes:translateRecipe.errorHeading')}</p>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          )}

          {proposal && !loading && !error && (
            <div className="space-y-4">
              <div className="bg-cream rounded-lg p-4 text-sm text-cocoa-700">
                {t('recipes:translateRecipe.summary', {
                  fields: proposal.fieldsTranslated,
                  fills: acceptableFills.length,
                })}
              </div>

              {proposal.fieldsTranslated === 0 && (
                <div className="text-center py-8 text-cocoa-500 text-sm">
                  {t('recipes:translateRecipe.allTranslated')}
                </div>
              )}

              {erroredFills.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
                  {t('recipes:translateRecipe.errorsCount', { count: erroredFills.length })}
                </div>
              )}

              {Array.from(grouped.entries()).map(([path, fills]) => {
                const excluded = excludedPaths.has(path);
                return (
                  <div key={path} className={`border rounded-lg p-4 ${excluded ? 'border-cocoa-100 bg-cocoa-50/50 opacity-60' : 'border-cocoa-100 bg-white'}`}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!excluded}
                        onChange={() => togglePath(path)}
                        className="mt-1 rounded border-cocoa-300 text-copper focus:ring-copper"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-cocoa-500 mb-2">{path}</p>
                        <div className="space-y-1.5">
                          {fills.map((fill, i) => (
                            <div key={i} className="flex gap-2 text-sm">
                              <span className="font-mono text-xs uppercase text-cocoa-400 shrink-0 w-6">{fill.targetLanguage}</span>
                              <span className="text-cocoa-700">{fill.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-cocoa-100 flex justify-end gap-3 bg-cream">
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="px-4 py-2 text-cocoa-600 hover:bg-stone-100 rounded-xl transition-colors font-medium disabled:opacity-50"
          >
            {t('common:cancel')}
          </button>
          {acceptableFills.length > 0 && !error && (
            <button
              type="button"
              onClick={handleApply}
              disabled={applying || loading}
              className="px-4 py-2 bg-copper hover:bg-copper-dark text-white rounded-xl transition-colors font-medium disabled:opacity-50"
            >
              {applying ? t('recipes:translateRecipe.applying') : t('recipes:translateRecipe.apply')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
