/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DataProvider } from './contexts/DataContext';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/Layout';
import RequireAdmin from './components/RequireAdmin';
import PageSpinner from './components/PageSpinner';

// Pages are code-split: each route loads its own chunk on demand, shrinking the
// initial bundle. Suspense boundaries (here and around Layout's Outlet) show a
// spinner while a chunk loads.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Ingredients = lazy(() => import('./pages/Ingredients'));
const IngredientDetail = lazy(() => import('./pages/IngredientDetail'));
const Recipes = lazy(() => import('./pages/Recipes'));
const PrepList = lazy(() => import('./pages/PrepList'));
const ShoppingList = lazy(() => import('./pages/ShoppingList'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const Inventory = lazy(() => import('./pages/Inventory'));
const InventoryTransactions = lazy(() => import('./pages/InventoryTransactions'));
const PurchaseOrders = lazy(() => import('./pages/PurchaseOrders'));
const Reports = lazy(() => import('./pages/Reports'));
const RecipeDetail = lazy(() => import('./pages/RecipeDetail'));
const RecipeEditPage = lazy(() => import('./pages/RecipeEditPage'));
const RecipeCookingMode = lazy(() => import('./pages/RecipeCookingMode'));
const RecipeAudit = lazy(() => import('./pages/RecipeAudit'));
const Formulate = lazy(() => import('./pages/lab/Formulate'));
const RestaurantSettings = lazy(() => import('./pages/RestaurantSettings'));
const Expenses = lazy(() => import('./pages/Expenses'));

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <DataProvider>
          <BrowserRouter>
            <Suspense fallback={<PageSpinner />}>
              <Routes>
              <Route path="/recipes/:id/cook" element={<RecipeCookingMode />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="ingredients" element={<Ingredients />} />
                <Route path="ingredients/:id" element={<IngredientDetail />} />
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="purchase-orders" element={<PurchaseOrders />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="transactions" element={<InventoryTransactions />} />
                <Route path="recipes" element={<Recipes />} />
                <Route path="recipes/audit" element={<RecipeAudit />} />
                <Route path="lab/formulate" element={<Formulate />} />
                <Route path="recipes/:id" element={<RecipeDetail />} />
                <Route path="recipes/new/edit" element={<RecipeEditPage />} />
                <Route path="recipes/:id/edit" element={<RecipeEditPage />} />
                <Route path="prep-list" element={<PrepList />} />
                <Route path="shopping-list" element={<ShoppingList />} />
                <Route path="reports" element={<Reports />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="admin/restaurant" element={<RequireAdmin><RestaurantSettings /></RequireAdmin>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </DataProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
