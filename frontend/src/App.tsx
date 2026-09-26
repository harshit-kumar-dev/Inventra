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
import { CategoryListPage } from './pages/categories/CategoryListPage';
import { WarehouseListPage } from './pages/warehouse/WarehouseListPage';
import { SupplierListPage } from './pages/suppliers/SupplierListPage';
import { ReceiptListPage } from './pages/operations/ReceiptListPage';
import { ReceiptDetailPage } from './pages/operations/ReceiptDetailPage';
import { DeliveryListPage } from './pages/operations/DeliveryListPage';
import { DeliveryDetailPage } from './pages/operations/DeliveryDetailPage';
import { TransferListPage } from './pages/operations/TransferListPage';
import { TransferDetailPage } from './pages/operations/TransferDetailPage';
import { AdjustmentListPage } from './pages/operations/AdjustmentListPage';
import { AdjustmentDetailPage } from './pages/operations/AdjustmentDetailPage';
import { MoveHistoryPage } from './pages/operations/MoveHistoryPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { LoadingState } from './components/LoadingState';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
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

// Public Route Guard (Redirect if already logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
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
              <Route path="/products" element={<ProductListPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/categories" element={<CategoryListPage />} />
              <Route path="/warehouse" element={<WarehouseListPage />} />
              <Route path="/suppliers" element={<SupplierListPage />} />

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

              {/* User Profile */}
              <Route path="/profile" element={<ProfilePage />} />
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
