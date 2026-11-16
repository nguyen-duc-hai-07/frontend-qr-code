import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { ToastProvider } from '@/contexts/ToastContext';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminLayout } from '@/components/AdminLayout';

import { TableLandingPage } from '@/pages/TableLandingPage';
import { OrderTrackingPage } from '@/pages/OrderTrackingPage';
import { HomePage } from '@/pages/HomePage';
import { MyOrdersPage } from '@/pages/MyOrdersPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';

import { AdminLiveOrdersPage } from '@/pages/admin/AdminLiveOrdersPage';
import { AdminMenuPage } from '@/pages/admin/AdminMenuPage';
import { AdminTablesPage } from '@/pages/admin/AdminTablesPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminTableMapPage } from '@/pages/admin/AdminTableMapPage';
import { AdminPosPage } from '@/pages/admin/AdminPosPage';
import { AdminKitchenPage } from '@/pages/admin/AdminKitchenPage';
import { AdminAnalyticsPage } from '@/pages/admin/AdminAnalyticsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          <CartProvider>
            <ToastProvider>
              <Routes>
              {/* ======================================================== */}
              {/* PUBLIC / CUSTOMER / GUEST ROUTES                         */}
              {/* ======================================================== */}

              {/* 1. Khách quét mã QR tại bàn (Hỗ trợ cả /table/:qrToken và /menu/:token chuẩn web-qr-order) */}
              <Route path="/table/:qrToken" element={<TableLandingPage />} />
              <Route path="/menu/:token" element={<TableLandingPage />} />

              {/* 2. Theo dõi tiến độ đơn hàng thời gian thực */}
              <Route path="/track/:orderCode" element={<OrderTrackingPage />} />

              {/* 3. Trang chủ thực đơn & Đặt giao hàng tận nơi */}
              <Route path="/" element={<HomePage />} />

              {/* 4. Lịch sử đơn hàng cá nhân (cần đăng nhập) */}
              <Route path="/my-orders" element={<MyOrdersPage />} />

              {/* 5. Đăng nhập / Đăng ký */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* ======================================================== */}
              {/* ADMIN MANAGEMENT ROUTES (Bảo vệ bởi ROLE_ADMIN)          */}
              {/* ======================================================== */}
              <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<AdminTableMapPage />} />
                  <Route path="pos" element={<AdminPosPage />} />
                  <Route path="orders" element={<AdminLiveOrdersPage />} />
                  <Route path="kitchen" element={<AdminKitchenPage />} />
                  <Route path="analytics" element={<AdminAnalyticsPage />} />
                  <Route path="menu" element={<AdminMenuPage />} />
                  <Route path="tables" element={<AdminTablesPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </CartProvider>
        </WebSocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
