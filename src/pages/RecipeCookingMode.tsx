import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useData } from '../contexts/DataContext';
import { X, Check } from 'lucide-react';
import ActionIcon from '../components/ActionIcon';
import { LocalizedField } from '../components/LocalizedField';
import IngredientInfo from '../components/IngredientInfo';
import FailureModeTrigger from '../components/FailureModeTrigger';

export default function RecipeCookingMode() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['recipes']);
  const language = i18n.language;
  const { recipes, ingredients, loading } = useData();
  
  const recipe = React.useMemo(
    () => recipes.find(r => r.id === id),
    [recipes, id]
  );
  
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    if (!id) return;
    const stored = sessionStorage.getItem(`cookingMode:${id}`);
    if (stored) {
      try {
        setCompletedSteps(new Set(JSON.parse(stored)));
      } catch {}
    }
  }, [id]);
  
  useEffect(() => {
    if (!id) return;
    sessionStorage.setItem(`cookingMode:${id}`, JSON.stringify(Array.from(completedSteps)));
  }, [id, completedSteps]);
  
  const toggleStep = (stepId: string) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };
  
  const getIngredient = (ingId: string) => ingredients.find(i => i.id === ingId);
  
  if (loading) {
    return <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-cocoa-500">{t('common:loading')}</div>
    </div>;
  }
  
  if (!recipe) {
    return <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-cocoa-500">{t('recipes:notFound')}</div>
    </div>;
  }
  
  const allSteps: Array<{step: any; componentName: string; stepKey: string}> = [];
  const components = recipe.components || [];
  components.forEach((comp, cIdx) => {
    (comp.steps || []).forEach((step, sIdx) => {
      allSteps.push({ 
        step, 
        componentName: comp.name,
        stepKey: step.id || `${cIdx}-${sIdx}`
      });
    });
  });
  
  const completedCount = allSteps.filter(s => completedSteps.has(s.stepKey)).length;
  const progressPercent = allSteps.length > 0 ? (completedCount / allSteps.length) * 100 : 0;
  
  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 bg-cream/95 backdrop-blur-sm border-b border-cocoa-100 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate(`/recipes/${id}`)}
            className="p-2 -ml-2 text-cocoa-500 hover:text-cocoa-900 rounded-lg hover:bg-cocoa-100 transition-colors"
            title={t('recipes:exitCooking')}
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-semibold text-cocoa-900 truncate">
              <LocalizedField
                field={recipe.nameI18n}
                legacyText={recipe.name}
                placeholder={t('recipes:editor.unnamed') || 'Unnamed Recipe'}
              />
            </h1>
            {allSteps.length > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1 bg-cocoa-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-pistachio transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs text-cocoa-500 shrink-0">
                  {completedCount}/{allSteps.length}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="max-w-3xl mx-auto px-6 py-8">
        <section className="mb-10 p-5 bg-white rounded-2xl border border-cocoa-100">
          <h2 className="font-display text-lg font-semibold text-cocoa-900 mb-4">
            {t('recipes:detail.ingredients')}
          </h2>
          <div className="space-y-2">
            {components.flatMap(comp => comp.ingredients).map((ing, idx) => {
              const ingredient = getIngredient(ing.ingredientId);
              const name = ingredient?.name || ing.name || '';
              return (
                <div key={idx} className="flex items-baseline gap-3 text-base">
                  <span className="text-cocoa-900 font-medium w-16 shrink-0">
                    {ing.quantity}
                    {t(`enums:units.${ing.unit}` as any, ing.unit)}
                  </span>
                  <span className="text-cocoa-700 flex-1">
                    <IngredientInfo name={name}>
                      <LocalizedField field={ingredient?.nameI18n} legacyText={name} />
                    </IngredientInfo>
                  </span>
                  {(ing.stateI18n || ing.state) && (
                    <LocalizedField
                      as="span"
                      className="text-cocoa-500 italic text-sm"
                      field={ing.stateI18n}
                      legacyText={ing.state}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
        
        <section>
          <ol className="space-y-6">
            {allSteps.map(({ step, componentName, stepKey }, idx) => {
              const isDone = completedSteps.has(stepKey);
              return (
                <li key={stepKey}>
                  <button
                    onClick={() => toggleStep(stepKey)}
                    className={`w-full text-left p-5 rounded-2xl border transition-all ${
                      isDone 
                        ? 'bg-pistachio/10 border-pistachio/30 opacity-60' 
                        : 'bg-white border-cocoa-100 hover:border-cocoa-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className="shrink-0">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                          isDone ? 'bg-pistachio text-white' : 'bg-parchment text-cocoa-700'
                        }`}>
                          {isDone ? (
                            <Check className="w-8 h-8" />
                          ) : (
                            <ActionIcon action={step.actionType || 'other'} size={36} />
                          )}
                        </div>
                        <div className="mt-2 text-center font-display text-sm font-medium text-cocoa-500">
                          {idx + 1}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-display text-xl font-semibold mb-2 ${
                          isDone ? 'line-through text-cocoa-500' : 'text-cocoa-900'
                        }`}>
                          <LocalizedField field={step.titleI18n} legacyText={step.title} />
                        </h3>
                        <LocalizedField
                          as="p"
                          className={`text-lg leading-relaxed ${
                            isDone ? 'text-cocoa-500' : 'text-cocoa-700'
                          }`}
                          field={step.instructionI18n}
                          legacyText={step.instruction}
                        />
                        {step.warning && !isDone && (
                          <div className="mt-3 p-3 bg-raspberry/10 border-l-4 border-raspberry text-cocoa-900 text-sm rounded-r">
                            <strong className="text-raspberry">{t('recipes:detail.warning')}:</strong> <LocalizedField field={step.warningI18n} legacyText={step.warning} />
                          </div>
                        )}
                        {step.actionType && !isDone && (
                          <div className="mt-3">
                            <FailureModeTrigger actionType={step.actionType} />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      </main>
    </div>
  );
}
