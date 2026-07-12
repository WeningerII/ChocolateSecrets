import React from 'react';
import type { TFunction } from 'i18next';
import { Recipe } from '../../types';
import { Plus, GripVertical, Trash2 } from 'lucide-react';
import type { Action } from './recipeEditor.types';

interface DesignTabProps {
  state: Partial<Recipe>;
  dispatch: React.Dispatch<Action>;
  t: TFunction<readonly ['recipes', 'enums', 'common', 'chemistry']>;
  draggedDesignIndex: number | null;
  setDraggedDesignIndex: React.Dispatch<React.SetStateAction<number | null>>;
}

export function DesignTab({
  state,
  dispatch,
  t,
  draggedDesignIndex,
  setDraggedDesignIndex,
}: DesignTabProps) {
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-semibold text-cocoa-900 text-lg">{t('recipes:editor.designLayers')}</h4>
        <button type="button" onClick={() => dispatch({ type: 'ADD_DESIGN_LAYER', t })} className="text-sm text-copper-dark font-medium hover:text-copper-dark flex items-center gap-1">
          <Plus className="w-4 h-4" /> {t('recipes:editor.addLayer')}
        </button>
      </div>
      <div className="space-y-4">
        {(state.design || []).map((layer, idx) => (
          <div
            key={idx}
            draggable
            onDragStart={(e) => {
              // e.dataTransfer.effectAllowed = 'move'; // Optional
              setDraggedDesignIndex(idx);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (draggedDesignIndex === null || draggedDesignIndex === idx) return;
              dispatch({ type: 'REORDER_DESIGN_LAYERS', startIndex: draggedDesignIndex, endIndex: idx });
              setDraggedDesignIndex(idx);
            }}
            onDragEnd={() => setDraggedDesignIndex(null)}
            className={`flex gap-4 items-start bg-white p-4 rounded-xl border border-cocoa-100 shadow-sm transition-all ${draggedDesignIndex === idx ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center gap-2 shrink-0 mt-1">
              <div className="cursor-grab active:cursor-grabbing p-1 text-cocoa-300 hover:text-cocoa-700">
                <GripVertical className="w-5 h-5" />
              </div>
              <div className="flex flex-col items-center justify-center w-8 h-8 bg-cocoa-100 rounded-full text-cocoa-500 font-bold">
                {idx + 1}
              </div>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-cocoa-500 mb-1">{t('recipes:editor.technique')}</label>
                <input type="text" placeholder={t('recipes:editor.techniquePlaceholder')} value={layer.technique} onChange={(e) => dispatch({ type: 'UPDATE_DESIGN_LAYER', index: idx, field: 'technique', value: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" />
              </div>
              <div>
                <label className="block text-xs text-cocoa-500 mb-1">{t('recipes:editor.colors')}</label>
                <input type="text" placeholder={t('recipes:editor.colorsPlaceholder')} value={layer.colors.join(', ')} onChange={(e) => dispatch({ type: 'UPDATE_DESIGN_LAYER', index: idx, field: 'colors', value: e.target.value.split(',').map(c => c.trim()) })} className="w-full px-2 py-1 border rounded text-sm" />
                {layer.colors.filter(c => c).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {layer.colors.filter(c => c).map((color, cIdx) => (
                      <div key={cIdx} className="flex items-center gap-1 bg-cream px-1.5 py-0.5 rounded border border-cocoa-100">
                        <div
                          className="w-2.5 h-2.5 rounded-full border border-cocoa-300"
                          style={{ backgroundColor: color.toLowerCase().replace(/\s+/g, '') }}
                          title={color}
                        />
                        <span className="text-[10px] text-cocoa-700">{color}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs text-cocoa-500 mb-1">{t('recipes:editor.tool')}</label>
                <input type="text" placeholder={t('recipes:editor.toolPlaceholder')} value={layer.tool} onChange={(e) => dispatch({ type: 'UPDATE_DESIGN_LAYER', index: idx, field: 'tool', value: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" />
              </div>
              <div>
                <label className="block text-xs text-cocoa-500 mb-1">{t('recipes:editor.notes')}</label>
                <input type="text" placeholder={t('recipes:editor.notesPlaceholder')} value={layer.notes} onChange={(e) => dispatch({ type: 'UPDATE_DESIGN_LAYER', index: idx, field: 'notes', value: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" />
              </div>
            </div>
            <button type="button" onClick={() => dispatch({ type: 'REMOVE_DESIGN_LAYER', index: idx })} className="text-cocoa-300 hover:text-red-600 mt-6">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
        {(state.design || []).length === 0 && (
          <div className="text-sm text-cocoa-500 italic p-8 bg-cream rounded-xl text-center border border-cocoa-100 border-dashed">
            {t('recipes:editor.noDesignLayers')}
          </div>
        )}
      </div>
    </>
  );
}
