import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface CustomerRouteProps {
  children?: React.ReactNode;
}

/**
 * Route guard dành riêng cho khách hàng.
 * Quản trị viên (ADMIN) tuyệt đối không truy cập vào các trang người dùng (đặt món, xem đơn cá nhân, v.v.).
 * Nếu phát hiện tài khoản là ADMIN, tự động chuyển hướng ngay sang /admin/dashboard.
 */
export const CustomerRoute: React.FC<CustomerRouteProps> = ({ children }) => {
  const { isAuthenticated, user, isAdmin } = useAuth();

  if (isAuthenticated && (isAdmin || user?.role === 'ADMIN')) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
