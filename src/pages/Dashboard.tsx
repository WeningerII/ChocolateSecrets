import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, where, limit, orderBy, Timestamp } from 'firebase/firestore';
import { db, reportFirestoreError, OperationType } from '../firebase';
import { ProductionRun, InventoryTransaction, Ingredient } from '../types';
import { Plus, PackagePlus, ClipboardList, Play, ShoppingCart, BarChart3, TrendingDown, AlertTriangle, Package, BookOpen, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, subDays, isAfter, addDays } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';
import { parseFirestoreDate } from '../utils/date';
import { formatCurrency } from '../utils/formatters';
import { calculateTotalTargetYield, calculateTotalTargetWeight, calculateComponentTargetWeight, scaleIngredient } from '../utils/recipeMath';
import { convertUnit } from '../utils/units';
import { useData } from '../contexts/DataContext';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export default function Dashboard() {
  const { t, i18n } = useTranslation(['dashboard', 'nav', 'inventory', 'prep', 'recipes']);
  const language = useLanguage();
  const { ingredients, recipes, suppliers, loading: dataLoading, getRecipe, getSupplier } = useData();
  const [productionRuns, setProductionRuns] = useState<ProductionRun[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const thirtyDaysAgo = Timestamp.fromDate(subDays(new Date(), 30));

    const unsubRuns = onSnapshot(
      query(collection(db, 'productionRuns'), orderBy('updatedAt', 'desc'), limit(50)),
      (snapshot) => {
        setProductionRuns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductionRun)));
      },
      (error) => { reportFirestoreError(error, OperationType.LIST, 'productionRuns'); setLoading(false); }
    );

    const unsubTransactions = onSnapshot(
      query(collection(db, 'inventoryTransactions'), where('date', '>=', thirtyDaysAgo), orderBy('date', 'desc')),
      (snapshot) => {
        setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryTransaction)));
        setLoading(false);
      },
      (error) => { reportFirestoreError(error, OperationType.LIST, 'inventoryTransactions'); setLoading(false); }
    );

    return () => {
      unsubRuns();
      unsubTransactions();
    };
  }, []);

  const lowStockIngredients = ingredients.filter(i => i.stock <= i.lowStockThreshold);
  const activeRuns = productionRuns.filter(r => r.status === 'active');
  
  const wasteTransactions = useMemo(() => transactions.filter(tx => tx.type === 'waste'), [transactions]);
  const consumeTransactions = useMemo(() => transactions.filter(tx => tx.type === 'consume'), [transactions]);
  const auditAdjustments = useMemo(() => transactions.filter(tx => tx.type === 'audit_adjustment'), [transactions]);
  
  // Calculate total waste cost
  const totalWasteCost = wasteTransactions.reduce((total, tx) => {
    return total + Math.abs((tx.amount || 0) * (tx.costPerUnit || 0)); 
  }, 0);

  // Calculate total variance cost (from audit adjustments)
  // Negative amount means missing stock (loss), positive means found stock (gain)
  const totalVarianceCost = auditAdjustments.reduce((total, tx) => {
    return total + ((tx.amount || 0) * (tx.costPerUnit || 0)); 
  }, 0);

  // Process data for charts (Last 30 days)
  const chartData = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    
    // Initialize array for the last 30 days
    const daysMap = new Map<string, { date: string, wasteCost: number, varianceCost: number, runsCompleted: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = subDays(new Date(), i);
      daysMap.set(format(d, 'MMM dd'), { date: format(d, 'MMM dd'), wasteCost: 0, varianceCost: 0, runsCompleted: 0 });
    }

    // Aggregate Waste
    wasteTransactions.forEach(tx => {
      if (!tx.date) return;
      const txDate = parseFirestoreDate(tx.date);
      if (isAfter(txDate, thirtyDaysAgo)) {
        const dateStr = format(txDate, 'MMM dd');
        if (daysMap.has(dateStr)) {
          const current = daysMap.get(dateStr)!;
          current.wasteCost += Math.abs((tx.amount || 0) * (tx.costPerUnit || 0));
        }
      }
    });

    // Aggregate Variance
    auditAdjustments.forEach(tx => {
      if (!tx.date) return;
      const txDate = parseFirestoreDate(tx.date);
      if (isAfter(txDate, thirtyDaysAgo)) {
        const dateStr = format(txDate, 'MMM dd');
        if (daysMap.has(dateStr)) {
          const current = daysMap.get(dateStr)!;
          // We'll plot absolute variance cost, or maybe just net variance
          current.varianceCost += ((tx.amount || 0) * (tx.costPerUnit || 0));
        }
      }
    });

    // Aggregate Production Runs
    productionRuns.forEach(run => {
      if (run.status !== 'completed' || !run.updatedAt) return;
      const runDate = parseFirestoreDate(run.updatedAt);
      if (isAfter(runDate, thirtyDaysAgo)) {
        const dateStr = format(runDate, 'MMM dd');
        if (daysMap.has(dateStr)) {
          const current = daysMap.get(dateStr)!;
          current.runsCompleted += 1;
        }
      }
    });

    return Array.from(daysMap.values());
  }, [wasteTransactions, productionRuns]);

  // Forecast Ingredient Needs
  const ingredientForecast = useMemo(() => {
    const forecastMap = new Map<string, {
      ingredient: Ingredient;
      scheduledConsumption: number;
      historical30DayConsumption: number;
      weeklyProjection: number;
      totalNeed: number;
      currentStock: number;
      deficit: number;
    }>();

    // Initialize map
    ingredients.forEach(ing => {
      forecastMap.set(ing.id, {
        ingredient: ing,
        scheduledConsumption: 0,
        historical30DayConsumption: 0,
        weeklyProjection: 0,
        totalNeed: 0,
        currentStock: ing.stock,
        deficit: 0
      });
    });

    const nextSevenDays = addDays(new Date(), 7);

    // 1. Calculate needs from active production runs
    activeRuns.forEach(run => {
      if (run.plannedDate) {
        const runDate = parseFirestoreDate(run.plannedDate);
        if (isAfter(runDate, nextSevenDays)) return;
      }

      (run.items || []).forEach(item => {
        if (!item.recipeId || item.quantity <= 0) return;
        const recipe = getRecipe(item.recipeId);
        if (!recipe) return;

        const totalYield = calculateTotalTargetYield(recipe, item.quantity);
        const totalWeight = calculateTotalTargetWeight(recipe, item.quantity);

        (recipe.components || []).forEach(component => {
          const componentWeight = calculateComponentTargetWeight(component, totalWeight, recipe.type, item.quantity);

          component.ingredients.forEach(ing => {
            const baseIng = forecastMap.get(ing.ingredientId);
            if (!baseIng) return;

            let qtyToAdd = scaleIngredient(ing, component, totalYield, componentWeight);
            
            if (ing.unit && baseIng.ingredient.unit && ing.unit !== baseIng.ingredient.unit) {
              const converted = convertUnit(qtyToAdd, ing.unit, baseIng.ingredient.unit, baseIng.ingredient.density);
              if (converted !== null) {
                qtyToAdd = converted;
              }
            }

            baseIng.scheduledConsumption += qtyToAdd;
          });
        });
      });
    });

    // 2. Calculate historical consumption (last 30 days)
    const thirtyDaysAgo = subDays(new Date(), 30);
    consumeTransactions.forEach(tx => {
      if (!tx.date || !tx.ingredientId) return;
      const txDate = parseFirestoreDate(tx.date);
      if (isAfter(txDate, thirtyDaysAgo)) {
        const baseIng = forecastMap.get(tx.ingredientId);
        if (baseIng) {
          // amount is negative for consumption, so we take absolute value
          baseIng.historical30DayConsumption += Math.abs(tx.amount || 0);
        }
      }
    });

    // avgDailyConsumption is a 30-day trailing average. weeklyProjection = avgDailyConsumption × 7.
    // scheduledConsumption filters production runs whose plannedDate falls within the next 7 days.
    Array.from(forecastMap.values()).forEach(item => {
      item.weeklyProjection = (item.historical30DayConsumption / 30) * 7;
      item.totalNeed = item.scheduledConsumption + item.weeklyProjection;
      item.deficit = Math.max(0, item.totalNeed - item.currentStock);
    });

    // Filter to only those with a deficit, and sort by deficit descending
    return Array.from(forecastMap.values())
      .filter(item => item.deficit > 0)
      .map(item => {
        const supplier = getSupplier(item.ingredient.supplierId || '');
        const leadTimeDays = supplier?.leadTimeDays || 0;
        const dailyNeed = item.totalNeed / 7;
        const daysUntilStockout = dailyNeed > 0 ? item.currentStock / dailyNeed : Infinity;
        const reorderDate = addDays(new Date(), daysUntilStockout - leadTimeDays);
        return { ...item, leadTimeDays, reorderDate, isUrgent: daysUntilStockout - leadTimeDays <= 0 };
      })
      .sort((a, b) => b.deficit - a.deficit);
  }, [ingredients, activeRuns, consumeTransactions, getRecipe, getSupplier]);

  if (loading) return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-cocoa-100 rounded w-3/4"></div><div className="space-y-2"><div className="h-4 bg-cocoa-100 rounded"></div><div className="h-4 bg-cocoa-100 rounded w-5/6"></div></div></div></div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-4xl font-semibold tracking-tight text-cocoa-900">{t('nav:dashboard')}</h2>
        <p className="text-cocoa-500 mt-1 text-base">{t('dashboard:subtitle')}</p>
      </div>

      {(() => {
        type Signal = { 
          priority: number; 
          label: string; 
          value: string; 
          valueColor: string;
          Icon: typeof Package; 
          iconBg: string;
          context?: string;
        };
        
        const signals: Signal[] = [];
        
        if (lowStockIngredients.length > 0) {
          signals.push({
            priority: 100,
            label: t('dashboard:lowStockItems'),
            value: String(lowStockIngredients.length),
            valueColor: 'text-raspberry',
            Icon: AlertTriangle,
            iconBg: 'bg-raspberry/10 text-raspberry',
            context: t('dashboard:lowStockNeedsReorder'),
          });
        }
        
        if (totalWasteCost > 100) {
          signals.push({
            priority: 80,
            label: t('dashboard:wasteCost'),
            value: formatCurrency(totalWasteCost, language),
            valueColor: 'text-raspberry',
            Icon: TrendingDown,
            iconBg: 'bg-raspberry/10 text-raspberry',
            context: t('dashboard:wasteContext'),
          });
        }
        
        if (signals.length === 0) {
          signals.push({
            priority: 0,
            label: t('dashboard:allClear'),
            value: String(ingredients.length),
            valueColor: 'text-pistachio',
            Icon: Package,
            iconBg: 'bg-pistachio/10 text-pistachio',
            context: t('dashboard:allClearContext'),
          });
        }
        
        const primary = signals.sort((a, b) => b.priority - a.priority)[0];
        const PrimaryIcon = primary.Icon;
        
        return (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-cocoa-100 flex items-center gap-6 mb-4">
            <div className={`p-4 ${primary.iconBg} rounded-2xl shrink-0`}>
              <PrimaryIcon className="w-8 h-8" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-cocoa-500">{primary.label}</p>
              <p className={`font-display text-4xl font-semibold ${primary.valueColor} mt-1`}>{primary.value}</p>
              {primary.context && (
                <p className="text-sm text-cocoa-700 mt-1">{primary.context}</p>
              )}
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-cream p-3 rounded-xl border border-cocoa-100">
          <p className="text-xs text-cocoa-500">{t('dashboard:totalIngredients')}</p>
          <p className="text-xl font-semibold text-cocoa-900 mt-0.5">{ingredients.length}</p>
        </div>
        <div className="bg-cream p-3 rounded-xl border border-cocoa-100">
          <p className="text-xs text-cocoa-500">{t('dashboard:totalRecipes')}</p>
          <p className="text-xl font-semibold text-cocoa-900 mt-0.5">{recipes.length}</p>
        </div>
        <div className="bg-cream p-3 rounded-xl border border-cocoa-100">
          <p className="text-xs text-cocoa-500">{t('dashboard:activeRuns')}</p>
          <p className="text-xl font-semibold text-cocoa-900 mt-0.5">{activeRuns.length}</p>
        </div>
        <div className="bg-cream p-3 rounded-xl border border-cocoa-100">
          <p className="text-xs text-cocoa-500">{t('dashboard:auditVariance')}</p>
          <p className={`text-xl font-semibold mt-0.5 ${totalVarianceCost < 0 ? 'text-raspberry' : 'text-pistachio'}`}>
            {totalVarianceCost < 0 ? '-' : '+'}{formatCurrency(Math.abs(totalVarianceCost), language)}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/ingredients" className="bg-white p-4 rounded-2xl border border-cocoa-100 shadow-sm hover:border-amber-300 hover:bg-vanilla-cream/30 transition-all flex flex-col items-center text-center gap-2 group">
          <div className="p-2 bg-vanilla-cream text-copper-dark rounded-lg group-hover:scale-110 transition-transform">
            <PackagePlus className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold text-cocoa-900">{t('inventory:receive.receiveGoods')}</span>
        </Link>
        <Link to="/prep-list" className="bg-white p-4 rounded-2xl border border-cocoa-100 shadow-sm hover:border-amber-300 hover:bg-vanilla-cream/30 transition-all flex flex-col items-center text-center gap-2 group">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-lg group-hover:scale-110 transition-transform">
            <Play className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold text-cocoa-900">{t('prep:startRun')}</span>
        </Link>
        <Link to="/shopping-list" className="bg-white p-4 rounded-2xl border border-cocoa-100 shadow-sm hover:border-amber-300 hover:bg-vanilla-cream/30 transition-all flex flex-col items-center text-center gap-2 group">
          <div className="p-2 bg-pistachio/10 text-pistachio rounded-lg group-hover:scale-110 transition-transform">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold text-cocoa-900">{t('nav:shoppingList')}</span>
        </Link>
        <Link to="/recipes" className="bg-white p-4 rounded-2xl border border-cocoa-100 shadow-sm hover:border-amber-300 hover:bg-vanilla-cream/30 transition-all flex flex-col items-center text-center gap-2 group">
          <div className="p-2 bg-cocoa-100 text-cocoa-700 rounded-lg group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold text-cocoa-900">{t('recipes:addRecipe')}</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Charts */}
        <div className="bg-white rounded-2xl shadow-sm border border-cocoa-100 overflow-hidden lg:col-span-2">
          <div className="px-6 py-5 border-b border-cocoa-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-cocoa-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-copper-dark" />
              {t('dashboard:analytics30Days')}
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="w-full min-w-0">
              <h4 className="text-sm font-medium text-cocoa-500 mb-4 text-center">{t('dashboard:wasteAndVariance')}</h4>
              <div className="h-72 w-full" style={{ minWidth: 1, minHeight: 1 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} minTickGap={20} />
                    <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value, language)} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number, name: string) => {
                        if (name === 'wasteCost') return [formatCurrency(value, language), t('dashboard:wasteCost')];
                        if (name === 'varianceCost') return [formatCurrency(value, language), t('dashboard:varianceCost')];
                        return [value, name];
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="wasteCost" name={t('dashboard:wasteCost')} stroke="#e11d48" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="varianceCost" name={t('dashboard:varianceCost')} stroke="#059669" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="w-full min-w-0">
              <h4 className="text-sm font-medium text-cocoa-500 mb-4 text-center">{t('dashboard:completedProductionRuns')}</h4>
              <div className="h-72 w-full" style={{ minWidth: 1, minHeight: 1 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} minTickGap={20} />
                    <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [value, t('dashboard:completedProductionRuns')]}
                      cursor={{ fill: '#f5f5f4' }}
                    />
                    <Bar dataKey="runsCompleted" fill="#b45309" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Ingredient Forecast */}
        <div className="bg-white rounded-2xl shadow-sm border border-cocoa-100 overflow-hidden lg:col-span-2">
          <div className="px-6 py-5 border-b border-cocoa-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-cocoa-900 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-copper-dark" />
              {t('dashboard:ingredientForecast')}
            </h3>
          </div>
          
          {ingredientForecast.length === 0 ? (
            <div className="p-6 text-center text-cocoa-500">
              {t('dashboard:noDeficits')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200">
                <thead className="bg-cream">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-cocoa-500 uppercase tracking-wider">{t('dashboard:ingredient')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-cocoa-500 uppercase tracking-wider">{t('dashboard:currentStock')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-cocoa-500 uppercase tracking-wider">{t('dashboard:activeRunsNeed')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-cocoa-500 uppercase tracking-wider">{t('dashboard:historical7DayNeed')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-cocoa-500 uppercase tracking-wider">{t('dashboard:totalForecastedNeed')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-cocoa-500 uppercase tracking-wider">{t('dashboard:forecastedDeficit')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-cocoa-500 uppercase tracking-wider">{t('dashboard:leadTime')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-cocoa-500 uppercase tracking-wider">{t('dashboard:orderBy')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-200">
                  {ingredientForecast.map(item => (
                    <tr key={item.ingredient.id} className="hover:bg-cream">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-cocoa-900">{item.ingredient.name}</div>
                        <div className="text-xs text-cocoa-500">{item.ingredient.category}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-cocoa-900">
                        {item.currentStock.toFixed(2)} {t(`enums:units.${item.ingredient.unit}` as any, item.ingredient.unit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-cocoa-900">
                        {item.scheduledConsumption.toFixed(2)} {t(`enums:units.${item.ingredient.unit}` as any, item.ingredient.unit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-cocoa-900">
                        {item.weeklyProjection.toFixed(2)} {t(`enums:units.${item.ingredient.unit}` as any, item.ingredient.unit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-cocoa-900">
                        {item.totalNeed.toFixed(2)} {t(`enums:units.${item.ingredient.unit}` as any, item.ingredient.unit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-raspberry">
                        {item.deficit.toFixed(2)} {t(`enums:units.${item.ingredient.unit}` as any, item.ingredient.unit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-cocoa-900">
                        {item.leadTimeDays} {t('dashboard:days')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.isUrgent ? 'bg-raspberry/10 text-red-800' : 'bg-vanilla-cream text-amber-800'}`}>
                          {item.isUrgent ? t('dashboard:asap') : format(item.reorderDate, 'MMM dd, yyyy')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl shadow-sm border border-cocoa-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-cocoa-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-cocoa-900">{t('dashboard:lowStockAlerts')}</h3>
            <Link to="/ingredients" className="text-sm font-medium text-copper-dark hover:text-amber-800">
              {t('dashboard:viewAll')} &rarr;
            </Link>
          </div>
          
          {lowStockIngredients.length === 0 ? (
            <div className="p-6 text-center text-cocoa-500">
              {t('dashboard:allStocked')}
            </div>
          ) : (
            <ul className="divide-y divide-stone-200">
              {lowStockIngredients.map(item => (
                <li key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-cream transition-colors">
                  <div>
                    <p className="text-sm font-medium text-cocoa-900">{item.name}</p>
                    <p className="text-xs text-cocoa-500">{item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-raspberry">
                      {item.stock} {t(`enums:units.${item.unit}` as any, item.unit)}
                    </p>
                    <p className="text-xs text-cocoa-500">
                      {t('dashboard:threshold')} {item.lowStockThreshold} {t(`enums:units.${item.unit}` as any, item.unit)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Production Runs */}
        <div className="bg-white rounded-2xl shadow-sm border border-cocoa-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-cocoa-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-cocoa-900">{t('dashboard:activeProductionRuns')}</h3>
            <Link to="/prep-list" className="text-sm font-medium text-copper-dark hover:text-amber-800">
              {t('dashboard:viewAll')} &rarr;
            </Link>
          </div>
          
          {productionRuns.length === 0 ? (
            <div className="p-6 text-center text-cocoa-500">
              {t('dashboard:noRuns')}
            </div>
          ) : (
            <ul className="divide-y divide-stone-200">
              {productionRuns.slice(0, 5).map(run => (
                <li key={run.id} className="px-6 py-4 flex items-center justify-between hover:bg-cream transition-colors">
                  <div>
                    <p className="text-sm font-medium text-cocoa-900">{run.name || t('dashboard:untitledRun')}</p>
                    <p className="text-xs text-cocoa-500">{run.items?.length || 0} {t('dashboard:items')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize
                      ${run.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        run.status === 'active' ? 'bg-blue-100 text-blue-800' : 
                        'bg-cocoa-100 text-cocoa-900'}`}
                    >
                      {run.status === 'completed' ? t('prep:completed') : run.status === 'active' ? t('prep:active') : t('prep:draft')}
                    </span>
                    <Link to="/prep-list" className="text-cocoa-300 hover:text-copper-dark">
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
