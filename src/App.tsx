import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { ToastProvider } from '@/contexts/ToastContext';

import { TableLandingPage } from '@/pages/TableLandingPage';
import { OrderTrackingPage } from '@/pages/OrderTrackingPage';
import { HomePage } from '@/pages/HomePage';
import { MyOrdersPage } from '@/pages/MyOrdersPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          <CartProvider>
            <ToastProvider>
              <Routes>
                {/* ======================================================== */}
                {/* CỬA HÀNG & GỌI MÓN DÀNH CHO KHÁCH HÀNG                   */}
                {/* ======================================================== */}

                {/* 1. Trang chủ thực đơn & Đặt giao hàng tận nơi (Ship) */}
                <Route path="/" element={<HomePage />} />

                {/* 2. Khách quét mã QR tại bàn */}
                <Route path="/table/:qrToken" element={<TableLandingPage />} />
                <Route path="/menu/:token" element={<TableLandingPage />} />

                {/* 3. Theo dõi tiến trình đơn hàng (Ship hoặc Tại bàn) */}
                <Route path="/track/:orderCode" element={<OrderTrackingPage />} />

                {/* 4. Lịch sử đơn hàng cá nhân */}
                <Route path="/my-orders" element={<MyOrdersPage />} />

                {/* 5. Đăng nhập / Đăng ký tài khoản khách hàng */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

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
