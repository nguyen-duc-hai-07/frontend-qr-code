import React from 'react';
import { ArrowUp, Clock, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const year = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className={`border-t border-[#ede4d8] bg-[#fffdfa] text-stone-800 mt-auto ${className}`}>
      <div className="max-w-6xl mx-auto px-4 py-10 md:px-6 md:py-14">
        <div className="grid gap-10 md:grid-cols-3 md:gap-12">
          {/* Cột 1: Thương hiệu */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Hoàng An
            </h2>
            <p className="mt-1 text-sm font-bold text-amber-800">
              Hoàng An Coffee & Billiard
            </p>
            <p className="mt-4 max-w-sm text-xs sm:text-sm leading-relaxed text-stone-500">
              Gọi món ngay tại bàn bằng mã QR, hoặc đặt giao hàng tận nơi.
            </p>
          </div>

          {/* Cột 2: Thông tin liên hệ */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">
              Liên hệ
            </h3>
            <ul className="mt-4 space-y-3 text-xs sm:text-sm text-stone-600">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-700/70" />
                <span>KĐT Mới Thành Công - KM - HP</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700/70" />
                <span>Nhận đặt giao hàng từ 9h00 sáng</span>
              </li>
              <li>
                <a
                  href="tel:0986013093"
                  className="inline-flex items-center gap-2.5 font-bold text-amber-800 hover:text-amber-900 hover:underline transition-colors"
                >
                  <Phone className="h-4 w-4 shrink-0 text-amber-700" />
                  <span>Hotline 0986 013 093</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Cột 3: Khám phá */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">
              Khám phá
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs sm:text-sm font-medium">
              <li>
                <Link
                  to="/"
                  className="text-stone-600 hover:text-amber-800 hover:underline transition-colors block py-0.5"
                >
                  Thực đơn
                </Link>
              </li>
              <li>
                <Link
                  to="/my-orders"
                  className="text-stone-600 hover:text-amber-800 hover:underline transition-colors block py-0.5"
                >
                  Đơn của tôi
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="text-stone-600 hover:text-amber-800 hover:underline transition-colors block py-0.5"
                >
                  Đăng nhập
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/login"
                  className="text-stone-400 hover:text-stone-600 hover:underline transition-colors block py-0.5 text-[11px]"
                >
                  Dành cho quản lý (Admin)
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Dòng bản quyền & nút lên đầu trang */}
        <div className="mt-10 pt-6 border-t border-[#ede4d8] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs text-stone-500">
          <p>© {year} Hoàng An Coffee & Billiard</p>
          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-2 self-start sm:self-auto rounded-full border border-[#e8ded2] bg-[#fcf9f5] px-4 py-2 text-xs font-bold text-stone-700 hover:bg-[#f5ede4] hover:text-stone-900 transition-all active:scale-95 shadow-2xs"
          >
            <ArrowUp className="h-3.5 w-3.5" />
            <span>Lên đầu trang</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
