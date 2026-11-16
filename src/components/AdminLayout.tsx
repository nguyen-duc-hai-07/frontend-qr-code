import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  ClipboardList,
  UtensilsCrossed,
  QrCode,
  Users,
  LogOut,
  Bell,
  Menu,
  X,
  ExternalLink,
  Maximize2,
  Minimize2,
  AlertTriangle,
  ShoppingBag,
  Flame,
  BarChart3,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { playOrderNotificationSound, subscribe } = useWebSocket();
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [staffAlert, setStaffAlert] = useState<{ tableName: string; message: string } | null>(null);

  // Modal đổi mật khẩu
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Toggle Toàn màn hình
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Lắng nghe yêu cầu gọi nhân viên từ khách tại bàn (CALL_STAFF)
  useEffect(() => {
    const unsubscribe = subscribe((payload) => {
      const data = payload as { action: string; tableName?: string; table_name?: string; message?: string };
      if (data.action === 'CALL_STAFF') {
        const table = data.tableName || data.table_name || 'Bàn khách';
        setStaffAlert({
          tableName: table,
          message: data.message || `${table} đang gọi nhân viên phục vụ!`,
        });
        setTimeout(() => setStaffAlert(null), 10000);
      }
    });
    return unsubscribe;
  }, [subscribe]);

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      alert('Vui lòng điền đầy đủ thông tin mật khẩu!');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Mật khẩu mới xác nhận không khớp!');
      return;
    }
    setPasswordSuccess(true);
    setTimeout(() => {
      setPasswordSuccess(false);
      setIsPasswordModalOpen(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 1500);
  };

  const navItems = [
    {
      to: '/admin/dashboard',
      icon: <LayoutGrid className="w-4 h-4" />,
      label: 'Sơ đồ bàn',
    },
    {
      to: '/admin/pos',
      icon: <ShoppingBag className="w-4 h-4" />,
      label: 'Bán hàng (POS)',
    },
    {
      to: '/admin/orders',
      icon: <ClipboardList className="w-4 h-4" />,
      label: 'Yêu cầu gọi món',
    },
    {
      to: '/admin/kitchen',
      icon: <Flame className="w-4 h-4 text-amber-500" />,
      label: 'Màn hình bếp',
    },
    {
      to: '/admin/analytics',
      icon: <BarChart3 className="w-4 h-4" />,
      label: 'Doanh thu & lợi nhuận',
    },
    {
      to: '/admin/tables',
      icon: <QrCode className="w-4 h-4" />,
      label: 'Bàn & Mã QR',
    },
    {
      to: '/admin/menu',
      icon: <UtensilsCrossed className="w-4 h-4" />,
      label: 'Menu & Món ăn',
    },
    {
      to: '/admin/users',
      icon: <Users className="w-4 h-4" />,
      label: 'Nhân viên & Tài khoản',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col md:flex-row font-sans text-slate-800">
      {/* Toast Alert Khách gọi nhân viên */}
      {staffAlert && (
        <div className="fixed top-4 right-4 z-50 bg-rose-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-3 border-2 border-rose-400 animate-bounce">
          <AlertTriangle className="w-6 h-6 text-white" />
          <div>
            <p className="font-extrabold text-sm">{staffAlert.tableName} CẦN HỖ TRỢ!</p>
            <p className="text-xs text-rose-100">{staffAlert.message}</p>
          </div>
          <button
            onClick={() => setStaffAlert(null)}
            className="p-1 hover:bg-rose-700 rounded-lg text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-slate-200/80 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <span className="font-bold text-base text-slate-900">Hoàng An Coffee & Billiard</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={playOrderNotificationSound}
            title="Thử chuông báo đơn"
            className="p-1.5 text-slate-500 hover:text-blue-600"
          >
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Sidebar - Bright, Clean & Modern White Theme */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/90 text-slate-700 flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-xs shadow-md shadow-blue-500/20">
              HA
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-xs text-slate-900 truncate tracking-tight">
                Hoàng An Coffee & Billiard
              </h1>
              <p className="text-[11px] text-slate-400">Quản lý quán ăn</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-bold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}

          <div className="pt-2 border-t border-slate-100 mt-2">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-3 px-3.5 py-2 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 text-xs font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Xem trang Khách</span>
            </a>
          </div>
        </nav>

        {/* Sidebar Footer with Store Status, Password & Logout Buttons */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
          {/* Free quota or status text matching template */}
          <div className="text-[11px] text-slate-400 px-1 font-medium">
            Còn 39 đơn miễn phí tháng này
          </div>

          {/* User info */}
          <div className="px-1 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 truncate">
              {user?.full_name || user?.username || 'Admin'}
            </span>
            <span className="text-[10px] bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {user?.role || 'ADMIN'}
            </span>
          </div>

          {/* Action Buttons matching reference template */}
          <button
            type="button"
            onClick={() => setIsPasswordModalOpen(true)}
            className="w-full py-2 px-3 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 hover:bg-white hover:border-slate-300 transition-all flex items-center justify-center gap-1.5 shadow-xs"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-400" />
            <span>Đổi mật khẩu</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2 px-3 border border-rose-200/90 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-all flex items-center justify-center gap-1.5 shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs"
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 p-4 sm:p-6 lg:p-7 overflow-y-auto">
        <Outlet />
      </main>

      {/* Modal: Đổi Mật Khẩu */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Đổi Mật Khẩu</h3>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passwordSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-blue-600 mx-auto" />
                <p className="text-sm font-bold text-slate-800">Cập nhật mật khẩu thành công!</p>
              </div>
            ) : (
              <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mật khẩu hiện tại
                  </label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tối thiểu 6 ký tự"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition"
                  >
                    Lưu mật khẩu
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
