/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DataProvider } from './contexts/DataContext';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Ingredients from './pages/Ingredients';
import IngredientDetail from './pages/IngredientDetail';
import Recipes from './pages/Recipes';
import PrepList from './pages/PrepList';
import ShoppingList from './pages/ShoppingList';
import Suppliers from './pages/Suppliers';
import Inventory from './pages/Inventory';
import InventoryTransactions from './pages/InventoryTransactions';
import PurchaseOrders from './pages/PurchaseOrders';
import Reports from './pages/Reports';
import RecipeDetail from './pages/RecipeDetail';
import RecipeEditPage from './pages/RecipeEditPage';
import RecipeCookingMode from './pages/RecipeCookingMode';
import RecipeAudit from './pages/RecipeAudit';
import Formulate from './pages/lab/Formulate';
import RestaurantSettings from './pages/RestaurantSettings';
import Expenses from './pages/Expenses';
import RequireAdmin from './components/RequireAdmin';

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <DataProvider>
          <BrowserRouter>
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
          </BrowserRouter>
        </DataProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
