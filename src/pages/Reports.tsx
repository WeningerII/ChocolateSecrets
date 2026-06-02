import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db, reportFirestoreError, OperationType } from '../firebase';
import { InventoryTransaction, ProductionRun } from '../types';
import { BarChart3, TrendingDown, AlertTriangle, DollarSign, Calculator, ArrowRightLeft, Target } from 'lucide-react';
import { format, subDays, isAfter, startOfDay, endOfDay } from 'date-fns';
import { parseFirestoreDate } from '../utils/date';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../utils/formatters';
import { calculateFullyLoadedCost } from '../utils/recipeMath';
import { useData } from '../contexts/DataContext';
import { LocalizedField } from '../components/LocalizedField';

export default function Reports() {
  const { t, i18n } = useTranslation(['reports', 'common']);
  const language = i18n.language as 'en' | 'es' | 'ko';
  const { ingredients, recipes, loading: dataLoading } = useData();
  const [activeTab, setActiveTab] = useState<'avt' | 'recipes' | 'engineering'>('avt');
  const [dateRange, setDateRange] = useState<30 | 7 | 90>(30);
  
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [productionRuns, setProductionRuns] = useState<ProductionRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const startDate = Timestamp.fromDate(startOfDay(subDays(new Date(), dateRange)));

    const unsubTransactions = onSnapshot(
      query(
        collection(db, 'inventoryTransactions'), 
        where('date', '>=', startDate),
        orderBy('date', 'desc')
      ),
      (snapshot) => {
        setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryTransaction)));
      },
      (error) => { reportFirestoreError(error, OperationType.LIST, 'inventoryTransactions'); setLoading(false); }
    );

    const unsubRuns = onSnapshot(
      query(
        collection(db, 'productionRuns'), 
        where('createdAt', '>=', startDate),
        orderBy('createdAt', 'desc')
      ),
      (snapshot) => {
        setProductionRuns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductionRun)));
        setLoading(false);
      },
      (error) => { reportFirestoreError(error, OperationType.LIST, 'productionRuns'); setLoading(false); }
    );

    return () => {
      unsubTransactions();
      unsubRuns();
    };
  }, [dateRange]);

  // Calculate AvT Data
  const avtData = useMemo(() => {
    return ingredients.map(ing => {
      const ingTxs = transactions.filter(tx => tx.ingredientId === ing.id);
      
      let received = 0;
      let consumed = 0; // Theoretical Usage
      let waste = 0;
      let variance = 0; // Audit adjustments

      ingTxs.forEach(tx => {
        if (tx.type === 'receive') received += tx.amount;
        if (tx.type === 'consume') consumed += Math.abs(tx.amount);
        if (tx.type === 'waste') waste += Math.abs(tx.amount);
        if (tx.type === 'audit_adjustment') variance += tx.amount; // negative means missing, positive means found
      });

      const costPerUnit = ing.costPerUnit || 0;
      const varianceCost = variance * costPerUnit;
      const wasteCost = waste * costPerUnit;

      return {
        ingredient: ing,
        received,
        consumed,
        waste,
        variance,
        varianceCost,
        wasteCost
      };
    }).sort((a, b) => Math.abs(b.varianceCost) - Math.abs(a.varianceCost)); // Sort by largest variance impact
  }, [ingredients, transactions]);

  const totalVarianceCost = avtData.reduce((sum, item) => sum + item.varianceCost, 0);
  const totalWasteCost = avtData.reduce((sum, item) => sum + item.wasteCost, 0);

  // Calculate Menu Engineering Data
  const menuEngineeringData = useMemo(() => {
    const startDate = startOfDay(subDays(new Date(), dateRange));
    
    // Filter runs within date range
    const periodRuns = productionRuns.filter(run => {
      if (!run.plannedDate) return false;
      const runDate = parseFirestoreDate(run.plannedDate);
      return isAfter(runDate, startDate) && run.status === 'completed';
    });

    const data = recipes.map(recipe => {
      const { costPerUnit, unitWarnings } = calculateFullyLoadedCost(recipe, ingredients, recipes);
      // If unitWarnings has entries, the recipe has unconvertable units in one or more ingredients.
      // For now we just log; a future prompt can surface these in the UI.
      if (unitWarnings.length > 0) {
        console.warn(`[Reports] Recipe "${recipe.name}" has unit conversion warnings:`, unitWarnings);
      }

      const retailPrice = recipe.retailPrice || 0;
      const marginDollars = retailPrice > 0 ? retailPrice - costPerUnit : 0;
      
      // Calculate volume produced
      let volume = 0;
      periodRuns.forEach(run => {
        const item = run.items.find(i => i.recipeId === recipe.id);
        if (item) {
          volume += item.quantity;
        }
      });

      return {
        recipe,
        costPerUnit,
        retailPrice,
        marginDollars,
        volume,
        totalProfit: marginDollars * volume
      };
    }).filter(item => item.retailPrice > 0); // Only include items with a retail price

    if (data.length === 0) return { items: [], avgVolume: 0, avgMargin: 0 };

    const avgVolume = data.reduce((sum, item) => sum + item.volume, 0) / data.length;
    const avgMargin = data.reduce((sum, item) => sum + item.marginDollars, 0) / data.length;

    const categorizedItems = data.map(item => {
      let category = '';
      if (item.volume >= avgVolume && item.marginDollars >= avgMargin) category = 'Star';
      else if (item.volume >= avgVolume && item.marginDollars < avgMargin) category = 'Plowhorse';
      else if (item.volume < avgVolume && item.marginDollars >= avgMargin) category = 'Puzzle';
      else category = 'Dog';

      return { ...item, category };
    }).sort((a, b) => b.totalProfit - a.totalProfit);

    return { items: categorizedItems, avgVolume, avgMargin };
  }, [recipes, ingredients, productionRuns, dateRange]);

  if (loading) {
    return <div className="animate-pulse h-32 bg-stone-100 rounded-2xl"></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-stone-900">{t('reports:title')}</h2>
        <p className="text-stone-500 mt-1">{t('reports:subtitle')}</p>
      </div>

      <div className="flex space-x-1 bg-stone-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('avt')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'avt'
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          {t('reports:avt')}
        </button>
        <button
          onClick={() => setActiveTab('recipes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'recipes'
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <Calculator className="w-4 h-4" />
          {t('reports:recipeCosts')}
        </button>
        <button
          onClick={() => setActiveTab('engineering')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'engineering'
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <Target className="w-4 h-4" />
          {t('reports:menuEngineering')}
        </button>
      </div>

      {activeTab === 'avt' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-stone-900">{t('reports:varianceReport')}</h3>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(Number(e.target.value) as 7 | 30 | 90)}
              className="px-4 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value={7}>{t('reports:last7Days')}</option>
              <option value={30}>{t('reports:last30Days')}</option>
              <option value={90}>{t('reports:last90Days')}</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex items-center gap-4">
              <div className={`p-4 rounded-xl shrink-0 ${totalVarianceCost < 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-500 mb-1">{t('reports:netAuditVariance')}</p>
                <p className={`text-3xl font-bold ${totalVarianceCost < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {totalVarianceCost < 0 ? '-' : '+'}{formatCurrency(Math.abs(totalVarianceCost), language)}
                </p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex items-center gap-4">
              <div className="p-4 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                <TrendingDown className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-500 mb-1">{t('reports:knownWasteCost')}</p>
                <p className="text-3xl font-bold text-rose-600">{formatCurrency(totalWasteCost, language)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('reports:ingredient')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('reports:received')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('reports:theoreticalUsage')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('reports:knownWaste')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('reports:unexplainedVariance')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('reports:varianceImpact')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {avtData.map((row) => (
                    <tr key={row.ingredient.id} className="hover:bg-stone-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-stone-900">{row.ingredient.name}</div>
                        <div className="text-xs text-stone-500">{formatCurrency(row.ingredient.costPerUnit || 0, language)} / {t(`enums:units.${row.ingredient.unit}` as any, row.ingredient.unit)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-stone-600">
                        {row.received > 0 ? `+${row.received.toFixed(2)}` : '-'} {t(`enums:units.${row.ingredient.unit}` as any, row.ingredient.unit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-stone-600">
                        {row.consumed > 0 ? `-${row.consumed.toFixed(2)}` : '-'} {t(`enums:units.${row.ingredient.unit}` as any, row.ingredient.unit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-rose-600">
                        {row.waste > 0 ? `-${row.waste.toFixed(2)}` : '-'} {t(`enums:units.${row.ingredient.unit}` as any, row.ingredient.unit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        <span className={row.variance < 0 ? 'text-red-600' : row.variance > 0 ? 'text-emerald-600' : 'text-stone-400'}>
                          {row.variance > 0 ? '+' : ''}{row.variance !== 0 ? row.variance.toFixed(2) : '-'} {t(`enums:units.${row.ingredient.unit}` as any, row.ingredient.unit)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        <span className={row.varianceCost < 0 ? 'text-red-600' : row.varianceCost > 0 ? 'text-emerald-600' : 'text-stone-400'}>
                          {row.varianceCost < 0 ? '-' : row.varianceCost > 0 ? '+' : ''}
                          {row.varianceCost !== 0 ? `${formatCurrency(Math.abs(row.varianceCost), language)}` : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'recipes' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-stone-200">
              <h3 className="text-lg font-semibold text-stone-900">{t('reports:recipeCostAnalysis')}</h3>
              <p className="text-sm text-stone-500">{t('reports:recipeCostDesc')}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('reports:recipeName')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('reports:type')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('reports:targetYield')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('reports:totalCost')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('reports:costPerUnit')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('reports:retailPrice')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('reports:margin')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {recipes.map((recipe) => {
                    const { cost: totalCost, costPerUnit } = calculateFullyLoadedCost(recipe, ingredients, recipes);

                    const targetYield = recipe.yield?.totalYieldAmount || 0;
                    const unit = recipe.yield?.totalYieldUnit || 'units';
                    const retailPrice = recipe.retailPrice || 0;
                    const margin = retailPrice > 0 ? ((retailPrice - costPerUnit) / retailPrice) * 100 : 0;

                    return (
                      <tr key={recipe.id} className="hover:bg-stone-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-stone-900"><LocalizedField field={recipe.nameI18n} legacyText={recipe.name} /></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500 lowercase">
                          {recipe.type 
                            ? (i18n.exists(`enums:recipeTypes.${recipe.type}`) 
                                ? t(`enums:recipeTypes.${recipe.type}` as any) 
                                : <LocalizedField legacyText={recipe.type} />)
                            : t('enums:recipeTypes.standard')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-stone-600">
                          {targetYield} {t(`enums:units.${unit}` as any, unit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-amber-700">
                          {formatCurrency(totalCost, language)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-stone-900">
                          {formatCurrency(costPerUnit, language)} / {t(`enums:units.${unit}` as any, unit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-stone-900">
                          {retailPrice > 0 ? formatCurrency(retailPrice, language) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          {retailPrice > 0 ? (
                            <span className={margin >= (recipe.targetMarginPercentage || 70) ? 'text-emerald-600' : 'text-red-600'}>
                              {margin.toFixed(1)}%
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {recipes.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-stone-500">
                        {t('reports:noRecipes')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'engineering' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-stone-900">{t('reports:menuEngineeringTitle')}</h3>
              <p className="text-sm text-stone-500">{t('reports:menuEngineeringDesc')}</p>
            </div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(Number(e.target.value) as 7 | 30 | 90)}
              className="px-4 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value={7}>{t('reports:last7Days')}</option>
              <option value={30}>{t('reports:last30Days')}</option>
              <option value={90}>{t('reports:last90Days')}</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200">
              <h4 className="text-sm font-semibold text-emerald-700 flex items-center gap-2 mb-1">
                ⭐ {t('reports:stars')}
              </h4>
              <p className="text-xs text-stone-500">{t('reports:starsDesc')}</p>
              <p className="text-2xl font-bold text-stone-900 mt-2">
                {menuEngineeringData.items.filter(i => i.category === 'Star').length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200">
              <h4 className="text-sm font-semibold text-blue-700 flex items-center gap-2 mb-1">
                🐴 {t('reports:plowhorses')}
              </h4>
              <p className="text-xs text-stone-500">{t('reports:plowhorsesDesc')}</p>
              <p className="text-2xl font-bold text-stone-900 mt-2">
                {menuEngineeringData.items.filter(i => i.category === 'Plowhorse').length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200">
              <h4 className="text-sm font-semibold text-amber-700 flex items-center gap-2 mb-1">
                🧩 {t('reports:puzzles')}
              </h4>
              <p className="text-xs text-stone-500">{t('reports:puzzlesDesc')}</p>
              <p className="text-2xl font-bold text-stone-900 mt-2">
                {menuEngineeringData.items.filter(i => i.category === 'Puzzle').length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200">
              <h4 className="text-sm font-semibold text-red-700 flex items-center gap-2 mb-1">
                🐕 {t('reports:dogs')}
              </h4>
              <p className="text-xs text-stone-500">{t('reports:dogsDesc')}</p>
              <p className="text-2xl font-bold text-stone-900 mt-2">
                {menuEngineeringData.items.filter(i => i.category === 'Dog').length}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('reports:recipe')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('reports:category')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('reports:volume')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('reports:marginDollar')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('reports:totalProfit')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {menuEngineeringData.items.map((item) => (
                    <tr key={item.recipe.id} className="hover:bg-stone-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-stone-900"><LocalizedField field={item.recipe.nameI18n} legacyText={item.recipe.name} /></div>
                        <div className="text-xs text-stone-500">Retail: {formatCurrency(item.retailPrice, language)} | Cost: {formatCurrency(item.costPerUnit, language)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${item.category === 'Star' ? 'bg-emerald-100 text-emerald-800' : 
                            item.category === 'Plowhorse' ? 'bg-blue-100 text-blue-800' : 
                            item.category === 'Puzzle' ? 'bg-amber-100 text-amber-800' : 
                            'bg-red-100 text-red-800'}`}
                        >
                          {item.category === 'Star' && `⭐ ${t('reports:stars')}`}
                          {item.category === 'Plowhorse' && `🐴 ${t('reports:plowhorses')}`}
                          {item.category === 'Puzzle' && `🧩 ${t('reports:puzzles')}`}
                          {item.category === 'Dog' && `🐕 ${t('reports:dogs')}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-stone-900">
                        {item.volume}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-stone-900">
                        {formatCurrency(item.marginDollars, language)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-emerald-600">
                        {formatCurrency(item.totalProfit, language)}
                      </td>
                    </tr>
                  ))}
                  {menuEngineeringData.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-stone-500">
                        {t('reports:noRecipesRetail')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
