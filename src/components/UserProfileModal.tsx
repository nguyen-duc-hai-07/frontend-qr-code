import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  Phone,
  Lock,
  Edit2,
  Check,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Package,
  LogOut,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { userApi } from '@/api/user.api';
import { getErrorMessage } from '@/utils/error';
import { Link } from 'react-router-dom';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'PROFILE' | 'CHANGE_PASSWORD' | 'EDIT_PROFILE';

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, logout, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('PROFILE');

  // Form Edit Profile
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form Change Password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen || !user) return null;

  const handleOpenEdit = () => {
    setFullName(user.full_name || '');
    setPhoneNumber(user.phone_number || '');
    setProfileMsg(null);
    setActiveTab('EDIT_PROFILE');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    if (!fullName.trim()) {
      setProfileMsg({ type: 'error', text: 'Vui lòng nhập họ và tên của bạn!' });
      return;
    }
    try {
      setSavingProfile(true);
      await userApi.updateMyProfile({
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim() || undefined,
      });
      await refreshProfile();
      setProfileMsg({ type: 'success', text: 'Cập nhật thông tin thành công!' });
      setTimeout(() => {
        setActiveTab('PROFILE');
        setProfileMsg(null);
      }, 1000);
    } catch (err) {
      setProfileMsg({ type: 'error', text: getErrorMessage(err, 'Không thể cập nhật thông tin!') });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!oldPassword.trim()) {
      setPasswordMsg({ type: 'error', text: 'Vui lòng nhập mật khẩu hiện tại!' });
      return;
    }
    if (!newPassword.trim() || newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự!' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Xác nhận mật khẩu mới không trùng khớp!' });
      return;
    }

    try {
      setSavingPassword(true);
      await userApi.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      setPasswordMsg({ type: 'success', text: 'Đổi mật khẩu thành công! Vui lòng nhớ mật khẩu mới.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setActiveTab('PROFILE');
        setPasswordMsg(null);
      }, 1500);
    } catch (err) {
      setPasswordMsg({ type: 'error', text: getErrorMessage(err, 'Mật khẩu cũ không đúng hoặc có lỗi xảy ra!') });
    } finally {
      setSavingPassword(false);
    }
  };

  const initialLetter = (user.full_name || user.username || 'U')[0].toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden space-y-4">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-800 to-amber-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center font-black text-xl text-white shadow-inner">
              {initialLetter}
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                {user.full_name || user.username}
              </h3>
              <p className="text-amber-200 text-xs mt-0.5 font-medium">@{user.username}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-1">
          <div className="flex rounded-xl bg-stone-100 p-1 text-xs font-bold text-stone-600">
            <button
              type="button"
              onClick={() => setActiveTab('PROFILE')}
              className={`flex-1 py-1.5 rounded-lg transition cursor-pointer text-center ${
                activeTab === 'PROFILE' ? 'bg-white text-stone-900 shadow-2xs' : 'hover:text-stone-900'
              }`}
            >
              Thông tin tài khoản
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('CHANGE_PASSWORD');
                setPasswordMsg(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition cursor-pointer text-center ${
                activeTab === 'CHANGE_PASSWORD' ? 'bg-white text-stone-900 shadow-2xs' : 'hover:text-stone-900'
              }`}
            >
              Đổi mật khẩu
            </button>
          </div>
        </div>

        {/* Tab 1: View Profile */}
        {activeTab === 'PROFILE' && (
          <div className="px-5 pb-5 space-y-4 text-xs">
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2.5">
              <div className="flex items-center justify-between py-1 border-b border-stone-200/60">
                <span className="text-stone-400 font-medium flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-amber-700" />
                  Họ và tên
                </span>
                <span className="font-bold text-stone-800 text-sm">
                  {user.full_name || <em className="text-stone-400 font-normal">Chưa cập nhật</em>}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-stone-200/60">
                <span className="text-stone-400 font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  Tên đăng nhập
                </span>
                <span className="font-semibold text-stone-700 font-mono">@{user.username}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-stone-200/60">
                <span className="text-stone-400 font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-700" />
                  Số điện thoại
                </span>
                <span className="font-bold text-stone-800">
                  {user.phone_number || <em className="text-stone-400 font-normal">Chưa cập nhật</em>}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-stone-400 font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  Vai trò tài khoản
                </span>
                <span className="font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md text-[11px]">
                  {user.role === 'ADMIN' ? 'Quản trị viên' : 'Khách hàng'}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleOpenEdit}
                className="py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Edit2 className="w-3.5 h-3.5 text-stone-600" />
                <span>Sửa thông tin</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('CHANGE_PASSWORD');
                  setPasswordMsg(null);
                }}
                className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                <span>Đổi mật khẩu</span>
              </button>
            </div>

            <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
              <Link
                to="/my-orders"
                onClick={onClose}
                className="text-stone-600 hover:text-amber-800 font-bold inline-flex items-center gap-1.5 p-1 text-xs"
              >
                <Package className="w-4 h-4 text-amber-700" />
                <span>Xem đơn đã đặt</span>
              </Link>

              <button
                type="button"
                onClick={async () => {
                  onClose();
                  await logout();
                }}
                className="text-rose-600 hover:text-rose-700 font-bold inline-flex items-center gap-1 p-1 cursor-pointer text-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Edit Profile */}
        {activeTab === 'EDIT_PROFILE' && (
          <form onSubmit={handleSaveProfile} className="px-5 pb-5 space-y-3.5 text-xs">
            {profileMsg && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {profileMsg.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <div>
              <label className="block text-stone-700 font-bold mb-1">Tên đăng nhập (Username)</label>
              <input
                type="text"
                disabled
                value={user.username}
                className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl text-stone-500 cursor-not-allowed font-mono text-xs"
              />
              <p className="text-[10px] text-stone-400 mt-0.5">Tên đăng nhập không thể thay đổi</p>
            </div>

            <div>
              <label className="block text-stone-700 font-bold mb-1">Họ và tên *</label>
              <input
                type="text"
                required
                placeholder="Nhập họ và tên đầy đủ"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 bg-[#fcf9f5] border border-stone-200 rounded-xl text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-bold mb-1">Số điện thoại nhận hàng</label>
              <input
                type="tel"
                placeholder="Ví dụ: 0931504117"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 bg-[#fcf9f5] border border-stone-200 rounded-xl text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs font-medium"
              />
              <p className="text-[10px] text-stone-400 mt-0.5">Dùng để giao hàng và liên hệ khi đặt ship</p>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('PROFILE')}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="flex-1 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70 active:scale-95"
              >
                {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Lưu thông tin</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Change Password */}
        {activeTab === 'CHANGE_PASSWORD' && (
          <form onSubmit={handleChangePassword} className="px-5 pb-5 space-y-3 text-xs">
            {passwordMsg && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  passwordMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {passwordMsg.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <div>
              <label className="block text-stone-700 font-bold mb-1">Mật khẩu hiện tại *</label>
              <div className="relative">
                <input
                  type={showOldPass ? 'text' : 'password'}
                  required
                  placeholder="Nhập mật khẩu đang dùng"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-9 bg-[#fcf9f5] border border-stone-200 rounded-xl text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showOldPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-stone-700 font-bold mb-1">Mật khẩu mới *</label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  placeholder="Tối thiểu 6 ký tự"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-9 bg-[#fcf9f5] border border-stone-200 rounded-xl text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-stone-700 font-bold mb-1">Xác nhận mật khẩu mới *</label>
              <input
                type={showNewPass ? 'text' : 'password'}
                required
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#fcf9f5] border border-stone-200 rounded-xl text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs font-medium"
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('PROFILE')}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={savingPassword}
                className="flex-1 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70 active:scale-95"
              >
                {savingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                <span>Đổi mật khẩu</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
