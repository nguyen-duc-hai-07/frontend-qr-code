import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, User, Loader2, ArrowRight, Coffee, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/utils/error';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const loggedUser = await login({ username, password });
      if (loggedUser.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Tên đăng nhập hoặc mật khẩu không chính xác!'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-block group">
          <div className="w-14 h-14 rounded-2xl bg-amber-600 mx-auto flex items-center justify-center text-white shadow-xl shadow-amber-600/25 mb-3.5 group-hover:scale-105 transition-transform">
            <Coffee className="w-7 h-7" />
          </div>
        </Link>
        <h2 className="text-2xl font-black text-stone-900 tracking-tight">
          Hoàng An Coffee & Billiard
        </h2>
        <p className="mt-1 text-xs font-bold uppercase tracking-wider text-amber-800">
          Đăng Nhập Tài Khoản
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-stone-200/50 rounded-3xl sm:px-10 border border-[#ede4d8]">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Tên đăng nhập / Số điện thoại
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập hoặc số điện thoại"
                  className="w-full text-xs pl-10 pr-4 py-2.5 bg-[#fcf9f5] border border-[#e8ded2] text-stone-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs pl-10 pr-10 py-2.5 bg-[#fcf9f5] border border-[#e8ded2] text-stone-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-amber-700 hover:bg-amber-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-900/20 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-stone-500 space-y-2">
            <div>
              Khách hàng mới?{' '}
              <Link to="/register" className="font-bold text-amber-800 hover:text-amber-900 hover:underline">
                Đăng ký tài khoản ngay
              </Link>
            </div>
            <div>
              <Link to="/" className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-400 hover:text-amber-800 hover:underline transition-colors">
                ← Quay về trang chủ thực đơn
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
