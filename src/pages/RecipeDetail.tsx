import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { Pencil, Trash2, Printer, ChefHat, ArrowLeft, Languages, ShieldAlert, Beaker } from 'lucide-react';
import { deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import ActionIcon from '../components/ActionIcon';
import { calculateRecipeCost } from '../utils/recipeMath';
import { formatCurrency } from '../utils/formatters';
import { LocalizedField } from '../components/LocalizedField';
import { useRestaurantSettings } from '../hooks/useRestaurantSettings';
import { deriveAllergens, ALLERGEN_LABELS, AllergenKey, AllergenFlag } from '../services/culinaryTools';
import IngredientInfo from '../components/IngredientInfo';
import FailureModeTrigger from '../components/FailureModeTrigger';
import { TranslateRecipeModal } from '../components/TranslateRecipeModal';
import { useRecipePhysics } from '../hooks/useRecipePhysics';
import { evaluateStepCondition, renderStepTemplate, type DslContext } from '../services/foodScience/confectionery/stepDsl';
import { RecipeOutputStrip } from '../components/RecipeOutputStrip';
import { RecipeCostDrivers } from '../components/RecipeCostDrivers';
import { RecipePhysicsTier } from '../components/RecipePhysicsTier';
import { RecipePhysicsDetail } from '../components/RecipePhysicsDetail';
import { DosingPanel } from '../components/DosingPanel';
import { TransportPanel } from '../components/TransportPanel';
import { PipelinePanel } from '../components/PipelinePanel';
import { RecipeWarningsList } from '../components/RecipeWarningsList';
import { attachRecipeLocalizedFields, stripUndefined } from '../utils/localized';

import { useAutoTranslate } from '../hooks/useAutoTranslate';

import { Language, SupportedLanguage } from '../types';

import { RecipeFrozenTier } from '../components/RecipeFrozenTier';
import { RecipeBreadTier } from '../components/RecipeBreadTier';
import ConfirmModal from '../components/ConfirmModal';

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['recipes', 'common', 'enums']);
  const language = (i18n.language || 'en') as Language;
  const { recipes, ingredients, loading } = useData();
  const { restaurant } = useRestaurantSettings();
  const { toast } = useToast();
  const [translateModalOpen, setTranslateModalOpen] = useState(false);
  const [physicsDetailOpen, setPhysicsDetailOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  
  const recipe = React.useMemo(
    () => recipes.find(r => r.id === id),
    [recipes, id]
  );
  
  const aggregatedAllergens = React.useMemo((): AllergenFlag[] => {
    if (!recipe) return [];

    // Gather ingredient names from all components
    const ingredientNames: string[] = [];
    for (const comp of recipe.components || []) {
      for (const ing of comp.ingredients) {
        const resolved = ingredients.find(i => i.id === ing.ingredientId);
        const name = resolved?.name || (ing as any).name;
        if (name) ingredientNames.push(name);
        // Also include the ingredient-state field which often carries form info
        if (ing.state) ingredientNames.push(`${name} ${ing.state}`);
      }
    }

    const derived = deriveAllergens(ingredientNames);

    // Merge in the restaurant's standing disclaimer as may_contain entries.
    // Only add entries not already present with stronger certainty.
    const merged = new Map<AllergenKey, AllergenFlag>();
    for (const flag of derived) merged.set(flag.allergen, flag);

    const disclaimer = restaurant?.standingAllergenDisclaimer || [];
    for (const key of disclaimer) {
      const allergenKey = key as AllergenKey;
      if (!merged.has(allergenKey)) {
        merged.set(allergenKey, {
          allergen: allergenKey,
          certainty: 'may_contain',
          source: 'kitchen cross-contact disclaimer',
        });
      }
    }

    return Array.from(merged.values()).sort((a, b) => {
      // contains before may_contain
      const rank = { contains: 0, may_contain: 1, cross_contact_risk: 2 };
      return rank[a.certainty] - rank[b.certainty];
    });
  }, [recipe, ingredients, restaurant]);

  const getIngredient = (ingId: string) => ingredients.find(i => i.id === ingId);
  
  useAutoTranslate(recipe ?? null);

  const physics = useRecipePhysics(recipe, ingredients, recipes, 1);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-cocoa-100 rounded w-3/4"></div>
          <div className="h-4 bg-cocoa-100 rounded w-1/2"></div>
          <div className="h-64 bg-cocoa-100 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (!recipe) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h2 className="font-display text-3xl text-cocoa-900 mb-4">{t('recipes:notFound')}</h2>
        <Link to="/recipes" className="text-copper hover:text-copper-dark font-medium">
          {t('recipes:backToList')}
        </Link>
      </div>
    );
  }
  
  const costResult = calculateRecipeCost(recipe, ingredients, recipes);
  const cost = costResult.cost;
  const warnings = costResult.unitWarnings;
  
  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'recipes', recipe.id!));
      toast.success(t('recipes:deleted'));
      navigate('/recipes');
    } catch (e) {
      toast.error(t('recipes:deleteFailed'));
    } finally {
      setDeleteModalOpen(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-cream">
      <div className="border-b border-cocoa-100 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link 
            to="/recipes" 
            className="inline-flex items-center gap-2 text-cocoa-500 hover:text-cocoa-900 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('recipes:backToList')}
          </Link>
          <div className="flex flex-wrap items-center gap-1">
            {recipe.categories?.includes('confectionery') && (
              <Link
                to={`/lab/formulate?baseRecipeId=${recipe.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cream-100 hover:bg-cream-200 border border-cream-300 text-cocoa-700 rounded-lg text-sm font-medium transition-colors"
              >
                <Beaker className="w-4 h-4" />
                {t('recipes:detail.optimize' as any)}
              </Link>
            )}
            <Link
              to="/recipes/audit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cream-100 hover:bg-cream-200 border border-cream-300 text-cocoa-700 rounded-lg text-sm font-medium transition-colors"
            >
              <ShieldAlert className="w-4 h-4" />
              {t('recipes:auditRecipe' as any, 'Audit Recipe')}
            </Link>
            <Link
              to={`/recipes/${recipe.id}/cook`}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-copper hover:bg-copper-dark text-white rounded-lg font-medium text-sm transition-colors"
            >
              <ChefHat className="w-4 h-4" />
              {t('recipes:cookingMode')}
            </Link>
            <Link
              to={`/recipes/${recipe.id}/edit`}
              className="p-2 text-cocoa-500 hover:text-cocoa-900 rounded-lg hover:bg-cocoa-100 transition-colors"
              title={t('recipes:editRecipe')}
            >
              <Pencil className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setTranslateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-copper hover:bg-copper-dark text-white rounded-lg text-sm font-medium transition-colors"
              title={t('recipes:translateRecipe.buttonTooltip')}
            >
              <Languages className="w-4 h-4" />
              {t('recipes:translateRecipe.button')}
            </button>
            <button
              onClick={() => setDeleteModalOpen(true)}
              className="p-2 text-cocoa-500 hover:text-raspberry rounded-lg hover:bg-raspberry/10 transition-colors"
              title={t('recipes:deleteTitle')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={t('recipes:deleteTitle')}
        message={t('recipes:deleteConfirm', { name: recipe.name })}
        confirmText={t('common:delete')}
        cancelText={t('common:cancel')}
      />
      
      <article className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        <header className="mb-12">
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-cocoa-900 leading-tight">
            <LocalizedField
              field={recipe.nameI18n}
              legacyText={recipe.name}
              placeholder={t('recipes:editor.unnamed') || 'Unnamed Recipe'}
            />
          </h1>
          {(recipe.descriptionI18n || recipe.description) && (
            <LocalizedField
              as="p"
              className="text-lg text-cocoa-700 mt-4 leading-relaxed"
              field={recipe.descriptionI18n}
              legacyText={recipe.description}
            />
          )}
          <div className="flex flex-wrap gap-3 mt-6 text-sm text-cocoa-500">
            <span>
              {recipe.type 
                ? (i18n.exists(`enums:recipeTypes.${recipe.type}`) 
                    ? t(`enums:recipeTypes.${recipe.type}` as any) 
                    : <LocalizedField legacyText={recipe.type} />)
                : t('enums:recipeTypes.standard')}
            </span>
            {recipe.yield && (
              <>
                <span className="text-cocoa-300">·</span>
                <span>{t('recipes:yields')} {recipe.yield.totalYieldAmount} {t(`enums:units.${recipe.yield.totalYieldUnit}` as any, recipe.yield.totalYieldUnit)}</span>
              </>
            )}
            <span className="text-cocoa-300">·</span>
            <span>{t('recipes:cost')}: {cost > 0 ? formatCurrency(cost, language) : '——'}</span>
          </div>
          {warnings && warnings.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 text-red-800 text-sm rounded border border-red-200">
              <span className="font-bold">{t('recipes:detail.unitConversionWarnings')}</span>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                {warnings.map((w, i) => {
                  const key = w.subjectType === 'sub_recipe'
                    ? 'recipes:detail.unitConversionSubRecipe'
                    : 'recipes:detail.unitConversionIngredient';
                  return (
                    <li key={i}>
                      {t(key, { fromUnit: w.fromUnit, toUnit: w.toUnit, name: w.subjectName })}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {aggregatedAllergens.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {aggregatedAllergens.map(flag => (
                <span
                  key={flag.allergen}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium ${
                    flag.certainty === 'contains'
                      ? 'bg-raspberry/10 text-raspberry'
                      : 'bg-cocoa-100 text-cocoa-700'
                  }`}
                  title={flag.certainty === 'contains'
                    ? t('recipes:containsAllergen', { allergen: t(`enums:allergens.${flag.allergen}` as any, ALLERGEN_LABELS[flag.allergen]) })
                    : t('recipes:mayContainAllergenSource', { allergen: t(`enums:allergens.${flag.allergen}` as any, ALLERGEN_LABELS[flag.allergen]), source: flag.source })}
                >
                  {flag.certainty === 'may_contain' && <span className="opacity-60">~</span>}
                  {t(`enums:allergens.${flag.allergen}` as any, ALLERGEN_LABELS[flag.allergen])}
                </span>
              ))}
            </div>
          )}
          {recipe.crossContactRisks && recipe.crossContactRisks.length > 0 && (
            <section className="mb-6 mt-4">
              <h3 className="font-display text-base font-medium text-cocoa-900 mb-2">
                {t('recipes:detail.crossContactRisks')}
              </h3>
              <ul className="space-y-1">
                {recipe.crossContactRisks.map((risk, idx) => {
                  // Legacy string-shaped entries from pre-Phase-5 documents.
                  // The migration flips these to structured shape; this branch
                  // catches anything that hasn't been migrated yet.
                  if (typeof risk === 'string') {
                    return (
                      <li key={idx} className="text-sm text-raspberry flex items-start gap-2">
                        <span className="text-raspberry mt-0.5">⚠</span>
                        <span>{risk}</span>
                      </li>
                    );
                  }
                  const allergenLabel = t(`enums:allergens.${risk.allergen}` as any, ALLERGEN_LABELS[risk.allergen]);
                  const stationLabel = risk.station
                    ? t(`enums:stations.${risk.station}` as any, risk.station)
                    : t('recipes:detail.crossContactRiskGenericWorkspace');
                  return (
                    <li key={idx} className="text-sm text-raspberry flex items-start gap-2">
                      <span className="text-raspberry mt-0.5">⚠</span>
                      <span>{t('recipes:detail.crossContactRiskLine', { allergen: allergenLabel, station: stationLabel })}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </header>

        {physics && (
          <div className="flex flex-col gap-3 my-6">
            <RecipeOutputStrip recipe={recipe} ingredients={ingredients} physics={physics} />
            <RecipePhysicsTier
              physics={physics}
              expanded={physicsDetailOpen}
              onToggle={() => setPhysicsDetailOpen(o => !o)}
            />
            {physicsDetailOpen && <RecipePhysicsDetail physics={physics} recipe={recipe} />}
            {physicsDetailOpen && <DosingPanel recipe={recipe} ingredients={ingredients} recipes={recipes} />}
            {physicsDetailOpen && <TransportPanel recipe={recipe} ingredients={ingredients} recipes={recipes} />}
            {physicsDetailOpen && <PipelinePanel recipe={recipe} ingredients={ingredients} recipes={recipes} />}
            {physicsDetailOpen && <RecipeCostDrivers physics={physics} ingredients={ingredients} language={language} />}
            {recipe.categories?.includes('frozen') && physics.frozen && <RecipeFrozenTier physics={physics} />}
            {recipe.categories?.includes('bread') && physics.bread && <RecipeBreadTier bread={physics.bread} />}
            {(physics.warnings.length > 0 || physics.confectionery?.warnings.length || physics.frozen?.warnings.length || physics.bread?.warnings.length) && (
              <RecipeWarningsList
                universal={physics.warnings}
                confectionery={physics.confectionery?.warnings}
                frozen={physics.frozen?.warnings}
                bread={physics.bread?.warnings}
              />
            )}
          </div>
        )}
        
        <section className="mb-12">
          <h2 className="font-display text-2xl font-semibold text-cocoa-900 mb-6 pb-2 border-b border-cocoa-100">
            {t('recipes:detail.ingredients')}
          </h2>
          
          {(recipe.components || []).length === 0 && (
            <p className="text-cocoa-500 italic">{t('recipes:detail.noIngredients')}</p>
          )}
          
          {(recipe.components || []).map((component, compIdx) => (
            <div key={component.id || compIdx} className={compIdx > 0 ? 'mt-8' : ''}>
              {(recipe.components || []).length > 1 && (
                <h3 className="font-display text-lg font-medium text-cocoa-700 mb-3">
                  <LocalizedField field={component.nameI18n} legacyText={component.name} />
                  {component.percentageOfTotalWeight > 0 && (
                    <span className="text-cocoa-500 font-normal text-base ml-2">
                      ({component.percentageOfTotalWeight}%)
                    </span>
                  )}
                </h3>
              )}
              
              <div className="overflow-hidden border border-cocoa-100 rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="bg-parchment">
                      <th className="text-left px-4 py-2.5 font-display font-medium text-sm text-cocoa-700 w-1/2">
                        {t('recipes:detail.ingredient')}
                      </th>
                      <th className="text-left px-4 py-2.5 font-display font-medium text-sm text-cocoa-700">
                        {t('recipes:detail.amount')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cocoa-100">
                    {component.ingredients.map((ing, ingIdx) => {
                      const ingredient = getIngredient(ing.ingredientId);
                      const name = ingredient?.name || (ing as any).name || t('recipes:detail.unknownIngredient');
                      return (
                        <tr key={ingIdx} className="hover:bg-cream/50">
                          <td className="px-4 py-3">
                            <div className="text-cocoa-900 text-base">
                              <IngredientInfo name={name}>
                                <LocalizedField field={ingredient?.nameI18n} legacyText={name} />
                              </IngredientInfo>
                            </div>
                            {(ing.stateI18n || ing.state) && (
                              <LocalizedField
                                as="div"
                                className="text-sm text-cocoa-500 italic mt-0.5"
                                field={ing.stateI18n}
                                legacyText={ing.state}
                              />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-cocoa-900 text-base font-medium">
                              {ing.quantity}{ing.unit ? ` ${t(`enums:units.${ing.unit}` as any, ing.unit)}` : ''}
                            </div>
                            {ing.convertedQuantities && (
                              <div className="text-sm text-cocoa-500 mt-0.5">{ing.convertedQuantities}</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
        
        {(() => {
          const allSteps: Array<{step: any; componentName: string; componentNameI18n?: import('../types').LocalizedString; isMultiComponent: boolean; renderedInstruction: string}> = [];
          const components = recipe.components || [];
          const isMultiComponent = components.length > 1;

          const dslCtx: DslContext | null = physics ? {
            aw: physics.aw,
            pH: physics.pH,
            fatRegime: physics.fatRegime,
            awBandKey: physics.awBand.key,
            shelfLifeWeeks: physics.shelfLife.weeks,
            resolved: physics.resolvedIngredients,
            confectionery: physics.confectionery,
          } : null;
          
          components.forEach(comp => {
            (comp.steps || []).forEach(step => {
              if (step.condition && dslCtx) {
                if (!evaluateStepCondition(step.condition, dslCtx)) return;
              }

              let renderedInst = step.instruction;
              if (step.templateInstruction && step.slots && dslCtx) {
                renderedInst = renderStepTemplate(language === 'en' ? step.templateInstruction : (step.templateInstructionI18n?.[language] || step.templateInstruction), step.slots, dslCtx);
              }

              allSteps.push({ step, componentName: comp.name, componentNameI18n: comp.nameI18n, isMultiComponent, renderedInstruction: renderedInst });
            });
          });
          
          if (allSteps.length === 0) return null;
          
          return (
            <section className="mb-12">
              <h2 className="font-display text-2xl font-semibold text-cocoa-900 mb-6 pb-2 border-b border-cocoa-100">
                {t('recipes:detail.steps')}
              </h2>
              
              <ol className="space-y-8">
                {allSteps.map(({ step, componentName, componentNameI18n, isMultiComponent, renderedInstruction }, idx) => (
                  <li key={step.id || idx} className="flex gap-5">
                    <div className="shrink-0 w-16 sm:w-20">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-parchment flex items-center justify-center text-cocoa-700">
                        <ActionIcon action={step.actionType || 'other'} size={40} />
                      </div>
                      <div className="mt-2 text-center font-display text-sm font-medium text-cocoa-500">
                        {idx + 1}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                        <h3 className="font-display text-xl font-semibold text-cocoa-900">
                          <LocalizedField field={step.titleI18n} legacyText={step.title} />
                        </h3>
                        {isMultiComponent && (
                          <span className="text-xs text-cocoa-500 uppercase tracking-wide">
                            <LocalizedField field={componentNameI18n} legacyText={componentName} />
                          </span>
                        )}
                      </div>
                      
                      {step.templateInstruction && step.slots ? (
                        <p className="text-lg text-cocoa-700 leading-relaxed font-mono text-[15px] p-3 bg-cream-50 rounded border border-cream-200">
                          {renderedInstruction}
                        </p>
                      ) : (
                        <LocalizedField
                          as="p"
                          className="text-lg text-cocoa-700 leading-relaxed"
                          field={step.instructionI18n}
                          legacyText={step.instruction}
                        />
                      )}
                      
                      {step.warning && (
                        <div className="mt-3 p-3 bg-raspberry/10 border-l-4 border-raspberry text-cocoa-900 text-sm rounded-r">
                          <strong className="text-raspberry">{t('recipes:detail.warning')}:</strong> <LocalizedField field={step.warningI18n} legacyText={step.warning} />
                        </div>
                      )}
                      
                      {step.equipment && step.equipment.length > 0 && (
                        <div className="mt-3 text-sm text-cocoa-500">
                          <span className="font-medium">{t('recipes:detail.equipment')}:</span> <LocalizedField legacyText={step.equipment.join(', ')} />
                        </div>
                      )}
                      
                      {step.actionType && (
                        <div className="mt-3">
                          <FailureModeTrigger actionType={step.actionType} />
                        </div>
                      )}
                      
                      {step.parameters && (step.parameters.temperatureTarget || step.parameters.durationSeconds) && (
                        <div className="mt-3 flex gap-4 text-sm text-cocoa-500">
                          {step.parameters.temperatureTarget && (
                            <span>{step.parameters.temperatureTarget}°</span>
                          )}
                          {step.parameters.durationSeconds && (
                            <span>
                              {step.parameters.durationSeconds >= 60 
                                ? `${Math.floor(step.parameters.durationSeconds / 60)}m ${step.parameters.durationSeconds % 60}s`
                                : `${step.parameters.durationSeconds}s`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          );
        })()}
        
        {recipe.yield && (
          <aside className="mt-16 p-6 bg-vanilla-cream border border-copper/20 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="shrink-0 text-copper">
                <Printer className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-display text-xl font-semibold text-cocoa-900 mb-1">
                  {t('recipes:detail.yieldCallout')}
                </p>
                <p className="text-cocoa-700 leading-relaxed">
                  {t('recipes:detail.yieldDescription', {
                    total: `${recipe.yield.totalYieldAmount} ${t(`enums:units.${recipe.yield.totalYieldUnit}` as any, recipe.yield.totalYieldUnit)}`,
                    portion: `${recipe.yield.portionAmount} ${t(`enums:units.${recipe.yield.portionUnit}` as any, recipe.yield.portionUnit)}`,
                  })}
                </p>
                {recipe.yield.portionApplication && (
                  <p className="text-cocoa-500 italic mt-2 text-sm">{recipe.yield.portionApplication}</p>
                )}
              </div>
            </div>
          </aside>
        )}
      </article>
      {recipe && (
        <TranslateRecipeModal
          isOpen={translateModalOpen}
          recipe={recipe}
          onClose={() => setTranslateModalOpen(false)}
          onApply={async (updated) => {
            const uiLanguage = (i18n.language.split('-')[0] as SupportedLanguage);
            const withLocalized = attachRecipeLocalizedFields(updated, recipe, uiLanguage);
            const sanitized = stripUndefined(withLocalized);
            await updateDoc(doc(db, 'recipes', recipe.id!), {
              ...sanitized,
              updatedAt: serverTimestamp(),
            });
          }}
        />
      )}
    </div>
  );
}
