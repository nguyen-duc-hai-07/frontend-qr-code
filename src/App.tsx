import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { ToastProvider } from '@/contexts/ToastContext';

// Customer Pages
import { TableLandingPage } from '@/pages/TableLandingPage';
import { OrderTrackingPage } from '@/pages/OrderTrackingPage';
import { HomePage } from '@/pages/HomePage';
import { MyOrdersPage } from '@/pages/MyOrdersPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';

// Admin Components & Pages
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { CustomerRoute } from '@/components/CustomerRoute';
import { AdminTableMapPage } from '@/pages/admin/AdminTableMapPage';
import { AdminLiveOrdersPage } from '@/pages/admin/AdminLiveOrdersPage';
import { AdminKitchenPage } from '@/pages/admin/AdminKitchenPage';
import { AdminAnalyticsPage } from '@/pages/admin/AdminAnalyticsPage';
import { AdminTablesPage } from '@/pages/admin/AdminTablesPage';
import { AdminMenuPage } from '@/pages/admin/AdminMenuPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          <CartProvider>
            <ToastProvider>
              <Routes>
                {/* ======================================================== */}
                {/* QUÉT MÃ QR TẠI BÀN & THEO DÕI ĐƠN HÀNG                   */}
                {/* Mọi khách hàng / bàn đều truy cập trực tiếp              */}
                {/* ======================================================== */}
                <Route path="/table/:qrToken" element={<TableLandingPage />} />
                <Route path="/menu/:token" element={<TableLandingPage />} />
                <Route path="/track/:orderCode" element={<OrderTrackingPage />} />

                {/* ======================================================== */}
                {/* GIAO DIỆN KHÁCH HÀNG (ĐẶT SHIP & TÀI KHOẢN KHÁCH)         */}
                {/* Quản trị viên (ADMIN) không được vào các trang này        */}
                {/* ======================================================== */}
                <Route element={<CustomerRoute />}>
                  {/* Trang chủ thực đơn & Đặt giao hàng tận nơi (Ship) */}
                  <Route path="/" element={<HomePage />} />

                  {/* Lịch sử đơn hàng cá nhân */}
                  <Route path="/my-orders" element={<MyOrdersPage />} />

                  {/* Đăng nhập / Đăng ký tài khoản khách hàng */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                </Route>

                {/* ======================================================== */}
                {/* HỆ THỐNG QUẢN TRỊ & VẬN HÀNH (ADMIN POS)                 */}
                {/* ======================================================== */}

                {/* Phân vùng Admin được bảo vệ */}
                <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="dashboard" element={<AdminTableMapPage />} />
                    <Route path="orders" element={<AdminLiveOrdersPage />} />
                    <Route path="kitchen" element={<AdminKitchenPage />} />
                    <Route path="analytics" element={<AdminAnalyticsPage />} />
                    <Route path="tables" element={<AdminTablesPage />} />
                    <Route path="menu" element={<AdminMenuPage />} />
                    <Route path="users" element={<AdminUsersPage />} />
                  </Route>
                </Route>

                {/* Fallback điều hướng về Trang chủ */}
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
