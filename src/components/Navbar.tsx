import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, LogIn, LogOut, Coffee } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { formatCurrency } from '@/utils/format';

interface NavbarProps {
  onOpenCart?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCart }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const { totalCount, totalPrice } = useCart();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="bg-white/95 backdrop-blur border-b border-[#ebdcd0] sticky top-0 z-30 shadow-2xs font-sans">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-600 flex items-center justify-center text-white font-bold shadow-md shadow-amber-600/25">
            <Coffee className="w-4 h-4" />
          </div>
          <span className="font-black text-stone-900 text-base tracking-tight">Hoàng An Coffee & Billiard</span>
        </Link>

        {/* Right side items */}
        <div className="flex items-center space-x-2">
          {/* Cart Icon */}
          {onOpenCart && (
            <button
              onClick={onOpenCart}
              className="relative p-2 text-stone-700 hover:bg-amber-50 rounded-full transition-colors flex items-center space-x-1"
            >
              <ShoppingBag className="w-5 h-5 text-amber-800" />
              {totalCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                  {totalCount}
                </span>
              )}
              {totalPrice > 0 && (
                <span className="hidden sm:inline text-xs font-bold text-amber-900 ml-1">
                  {formatCurrency(totalPrice)}
                </span>
              )}
            </button>
          )}

          {/* User Links */}
          {isAuthenticated ? (
            <div className="flex items-center space-x-2 pl-2 border-l border-[#ebdcd0]">
              <Link
                to="/my-orders"
                className="text-xs font-semibold text-stone-600 hover:text-amber-800 px-2.5 py-1.5 rounded-lg hover:bg-amber-50"
              >
                Đơn của tôi
              </Link>
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="p-1.5 text-stone-400 hover:text-rose-500 rounded-full cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center space-x-1 text-xs font-bold text-amber-900 bg-amber-50/80 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200/90 transition-colors shadow-2xs"
            >
              <LogIn className="w-3.5 h-3.5 text-amber-700" />
              <span>Đăng nhập</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
