import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Layouts
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { VerifyOtpPage } from './pages/auth/VerifyOtpPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

// Main Application Pages
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProductListPage } from './pages/products/ProductListPage';
import { ProductDetailPage } from './pages/products/ProductDetailPage';
import { StockPage } from './pages/stock/StockPage';
import { CategoryListPage } from './pages/categories/CategoryListPage';
import { SupplierListPage } from './pages/suppliers/SupplierListPage';

// Settings & Master Data Pages
import { SettingsPage } from './pages/settings/SettingsPage';
import { WarehouseListPage } from './pages/settings/WarehouseListPage';
import { LocationListPage } from './pages/settings/LocationListPage';

// Operations Pages
import { ReceiptListPage } from './pages/operations/ReceiptListPage';
import { ReceiptDetailPage } from './pages/operations/ReceiptDetailPage';
import { DeliveryListPage } from './pages/operations/DeliveryListPage';
import { DeliveryDetailPage } from './pages/operations/DeliveryDetailPage';
import { TransferListPage } from './pages/operations/TransferListPage';
import { TransferDetailPage } from './pages/operations/TransferDetailPage';
import { AdjustmentListPage } from './pages/operations/AdjustmentListPage';
import { AdjustmentDetailPage } from './pages/operations/AdjustmentDetailPage';
import { MoveHistoryPage } from './pages/operations/MoveHistoryPage';

// Administration & User Pages
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { LoadingState } from './components/LoadingState';

// Standard Protected Route Guard (Authenticated Users)
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingState text="Authenticating user session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Manager or Admin Role Guard (Settings, Warehouse, Locations, Master Config)
// Warehouse Staff users attempting direct URL access are strictly redirected to /dashboard
const ManagerOrAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingState text="Verifying role permissions..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isAuthorized = user?.role === 'ADMIN' || user?.role === 'INVENTORY_MANAGER';

  if (!isAuthorized) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Strict Admin Only Role Guard (User Management, System Auth Logs)
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingState text="Verifying system administrator privileges..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Public Route Guard (Redirect if already logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingState text="Loading StockSense..." />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route
              element={
                <PublicRoute>
                  <AuthLayout />
                </PublicRoute>
              }
            >
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/verify-otp" element={<VerifyOtpPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            {/* Protected App Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/stock" element={<StockPage />} />
              <Route path="/products" element={<ProductListPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />

              {/* Master Settings & Topology Routes (RBAC Protected: ADMIN & INVENTORY_MANAGER ONLY) */}
              <Route
                path="/settings"
                element={
                  <ManagerOrAdminRoute>
                    <SettingsPage />
                  </ManagerOrAdminRoute>
                }
              />
              <Route
                path="/settings/warehouse"
                element={
                  <ManagerOrAdminRoute>
                    <WarehouseListPage />
                  </ManagerOrAdminRoute>
                }
              />
              <Route
                path="/settings/locations"
                element={
                  <ManagerOrAdminRoute>
                    <LocationListPage />
                  </ManagerOrAdminRoute>
                }
              />
              {/* Legacy / Direct Route Redirect to Settings Warehouse */}
              <Route
                path="/warehouse"
                element={
                  <ManagerOrAdminRoute>
                    <WarehouseListPage />
                  </ManagerOrAdminRoute>
                }
              />
              <Route
                path="/categories"
                element={
                  <ManagerOrAdminRoute>
                    <CategoryListPage />
                  </ManagerOrAdminRoute>
                }
              />
              <Route
                path="/suppliers"
                element={
                  <ManagerOrAdminRoute>
                    <SupplierListPage />
                  </ManagerOrAdminRoute>
                }
              />

              {/* Operations */}
              <Route path="/receipts" element={<ReceiptListPage />} />
              <Route path="/receipts/:id" element={<ReceiptDetailPage />} />
              <Route path="/deliveries" element={<DeliveryListPage />} />
              <Route path="/deliveries/:id" element={<DeliveryDetailPage />} />
              <Route path="/transfers" element={<TransferListPage />} />
              <Route path="/transfers/:id" element={<TransferDetailPage />} />
              <Route path="/adjustments" element={<AdjustmentListPage />} />
              <Route path="/adjustments/:id" element={<AdjustmentDetailPage />} />
              <Route path="/move-history" element={<MoveHistoryPage />} />

              {/* User Profile & Administration */}
              <Route path="/profile" element={<ProfilePage />} />
              <Route
                path="/users"
                element={
                  <AdminRoute>
                    <UserManagementPage />
                  </AdminRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
