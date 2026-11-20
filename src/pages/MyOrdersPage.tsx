import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { orderApi } from '@/api/order.api';
import { Order } from '@/types/order';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { getErrorMessage } from '@/utils/error';
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Loader2,
  AlertCircle,
  MapPin,
  Phone,
  User,
  FileText,
  Utensils,
  Bike,
  Receipt,
  X,
  Eye,
  ExternalLink,
} from 'lucide-react';

export const MyOrdersPage: React.FC = () => {
  const { isAuthenticated, user, isAdmin } = useAuth();

  // Quản trị viên (ADMIN) không vào trang đơn cá nhân của khách
  if (isAuthenticated && (isAdmin || user?.role === 'ADMIN')) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    orderApi
      .getMyOrders()
      .then((res) => setOrders(res.data))
      .catch((err) => {
        setError(getErrorMessage(err, 'Không thể tải lịch sử đơn hàng!'));
      })
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
            <span>Đang xử lý</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Hoàn thành</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            <span>Đã hủy</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] flex flex-col font-sans">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8 flex-1 w-full space-y-4">
        {/* Tiêu đề trang */}
        <div className="flex items-center justify-between pb-3 border-b border-[#ede4d8]">
          <div>
            <h1 className="text-xl font-bold text-stone-900">Lịch sử đơn hàng của tôi</h1>
            <p className="text-xs text-stone-500 mt-0.5">Theo dõi chi tiết các đơn giao hàng và ăn tại quán</p>
          </div>
          <span className="text-xs font-bold text-amber-900 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/90 shadow-2xs">
            {orders.length} đơn hàng
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-amber-700 animate-spin mb-2" />
            <p className="text-stone-500 text-xs">Đang tải lịch sử đơn hàng...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-rose-600 text-sm bg-rose-50 rounded-2xl border border-rose-200 p-4">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-rose-500" />
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-stone-400 bg-white rounded-3xl border border-[#ede4d8] p-8 shadow-2xs">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-30 text-amber-700" />
            <p className="text-sm font-semibold text-stone-700">Bạn chưa có đơn hàng nào!</p>
            <p className="text-xs text-stone-400 mt-1">Hãy đặt món ngon để chúng tôi giao tận nơi cho bạn nhé.</p>
            <Link
              to="/"
              className="mt-4 inline-block px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
            >
              Khám phá thực đơn & Đặt ship
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isDelivery = order.order_type === 'DELIVERY';
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-[#ede4d8] shadow-2xs hover:shadow-md hover:border-amber-300 transition-all space-y-3.5"
                >
                  {/* Hàng 1: Mã đơn, Thời gian & Trạng thái */}
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-400 font-medium">Mã đơn:</span>
                      <span className="text-sm sm:text-base font-extrabold text-amber-800 tracking-wide">
                        #{order.order_code}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-400">
                        {formatDateTime(order.created_at)}
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>

                  {/* Hàng 2: Khối thông tin Đặt Ship / Ăn tại bàn */}
                  {isDelivery ? (
                    <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md text-[11px]">
                          <Bike className="w-3.5 h-3.5 text-amber-800" />
                          <span>Đặt giao hàng (Ship)</span>
                        </span>
                        {order.customer_phone && (
                          <a
                            href={`tel:${order.customer_phone}`}
                            className="inline-flex items-center gap-1 font-bold text-amber-800 hover:text-amber-900 hover:underline"
                            title="Bấm để gọi"
                          >
                            <Phone className="w-3 h-3 text-amber-700" />
                            <span>{order.customer_phone}</span>
                          </a>
                        )}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-2 text-stone-700 pt-1">
                        <div className="flex items-start gap-1.5">
                          <User className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-stone-400">Người nhận: </span>
                            <span className="font-bold text-stone-800">
                              {order.customer_name || 'Khách đặt ship'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-1.5 sm:col-span-2">
                          <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-stone-400">Địa chỉ: </span>
                            <span className="font-semibold text-stone-900">
                              {order.delivery_address || 'Giao hàng tận nơi'}
                            </span>
                          </div>
                        </div>

                        {order.note && (
                          <div className="flex items-start gap-1.5 sm:col-span-2 bg-white/70 p-2 rounded-lg border border-amber-200/50">
                            <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-stone-400">Ghi chú: </span>
                              <span className="text-stone-700 italic font-medium">
                                &quot;{order.note}&quot;
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5 text-xs text-stone-700">
                      <div className="flex items-center gap-1.5 font-bold text-stone-800">
                        <Utensils className="w-3.5 h-3.5 text-amber-700" />
                        <span>Ăn tại bàn: {order.table_name || 'Bàn phục vụ'}{order.zone ? ` (${order.zone})` : ''}</span>
                      </div>
                      {order.customer_name && (
                        <p className="text-stone-600">
                          <span className="text-stone-400">Khách gọi:</span> {order.customer_name}
                        </p>
                      )}
                      {order.note && (
                        <p className="text-stone-600 italic">
                          <span className="text-stone-400">Ghi chú:</span> &quot;{order.note}&quot;
                        </p>
                      )}
                    </div>
                  )}

                  {/* Hàng 3: Danh sách món tóm tắt */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-1 text-stone-400 font-semibold uppercase tracking-wider text-[10px]">
                      <Receipt className="w-3.5 h-3.5 text-amber-700" />
                      <span>Món đã gọi ({order.items?.length || 0})</span>
                    </div>
                    <div className="bg-[#fcf9f5] rounded-xl p-2.5 border border-[#ede4d8] divide-y divide-stone-100">
                      {order.items?.map((item) => (
                        <div key={item.id} className="py-1 flex items-center justify-between text-stone-700">
                          <span className="font-medium">
                            <strong className="text-stone-900">{item.quantity}x</strong> {item.product_name}
                            {item.note ? <span className="text-amber-700 italic ml-1">({item.note})</span> : ''}
                          </span>
                          <span className="font-semibold text-stone-800">
                            {formatCurrency(item.subtotal || item.unit_price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hàng 4: Tổng tiền & Nút bấm Chi tiết / Theo dõi */}
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-xs text-stone-400">Tổng thanh toán: </span>
                      <span className="text-base font-extrabold text-amber-800">
                        {formatCurrency(order.total_amount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer"
                        title="Xem chi tiết đơn này"
                      >
                        <Eye className="w-3.5 h-3.5 text-stone-600" />
                        <span>Xem chi tiết</span>
                      </button>

                      <Link
                        to={`/track/${order.order_code}`}
                        state={{ from: '/my-orders' }}
                        className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1 active:scale-95"
                      >
                        <span>Tiến độ</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL CHI TIẾT ĐƠN HÀNG KHI BẤM "XEM CHI TIẾT" */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <span className="text-xs text-stone-400 font-medium">Chi tiết đơn hàng</span>
                <h3 className="text-lg font-black text-amber-800">#{selectedOrder.order_code}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thông tin nhận hàng (đặt ship) */}
            {selectedOrder.order_type === 'DELIVERY' ? (
              <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 inline-flex items-center gap-1.5 text-sm">
                    <Bike className="w-4 h-4 text-amber-700" />
                    <span>Đơn đặt ship (Giao tận nơi)</span>
                  </span>
                  {getStatusBadge(selectedOrder.status)}
                </div>

                <div className="space-y-2 pt-1 border-t border-amber-200/60">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-stone-500">Tên người nhận: </span>
                      <strong className="text-stone-900 text-sm">
                        {selectedOrder.customer_name || 'Khách đặt ship'}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-stone-500">Số điện thoại: </span>
                      {selectedOrder.customer_phone ? (
                        <a
                          href={`tel:${selectedOrder.customer_phone}`}
                          className="font-bold text-amber-800 text-sm hover:underline"
                        >
                          {selectedOrder.customer_phone}
                        </a>
                      ) : (
                        <span className="text-stone-400 italic">Chưa cung cấp</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-stone-500">Địa chỉ giao hàng: </span>
                      <strong className="text-stone-900 text-sm block">
                        {selectedOrder.delivery_address || 'Địa chỉ giao tận nơi'}
                      </strong>
                    </div>
                  </div>

                  {selectedOrder.note && (
                    <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                      <FileText className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-stone-500">Ghi chú của khách: </span>
                        <p className="text-stone-800 italic font-medium mt-0.5">
                          &quot;{selectedOrder.note}&quot;
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-stone-500 text-[11px] pt-1">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span>Thời gian đặt: {formatDateTime(selectedOrder.created_at)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800 inline-flex items-center gap-1.5 text-sm">
                    <Utensils className="w-4 h-4 text-amber-700" />
                    <span>Đơn tại bàn: {selectedOrder.table_name || 'Bàn ăn'}{selectedOrder.zone ? ` (${selectedOrder.zone})` : ''}</span>
                  </span>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                {selectedOrder.customer_name && (
                  <p><span className="text-stone-500">Tên khách:</span> <strong>{selectedOrder.customer_name}</strong></p>
                )}
                {selectedOrder.note && (
                  <p className="italic text-stone-600 bg-white p-2 rounded-lg border border-stone-200">
                    &quot;{selectedOrder.note}&quot;
                  </p>
                )}
              </div>
            )}

            {/* Chi tiết từng món */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-amber-700" />
                <span>Chi tiết các món ({selectedOrder.items?.length || 0})</span>
              </h4>

              <div className="divide-y divide-stone-100 bg-stone-50/60 rounded-2xl p-3 border border-stone-200/70 text-xs">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="py-2 flex items-start justify-between">
                    <div>
                      <p className="font-bold text-stone-800 text-sm">
                        {item.product_name} <span className="text-amber-800">x{item.quantity}</span>
                      </p>
                      <p className="text-stone-400 text-xs">
                        Đơn giá: {formatCurrency(item.unit_price)}
                      </p>
                      {item.note && (
                        <p className="text-amber-700 italic mt-0.5">Ghi chú: {item.note}</p>
                      )}
                    </div>
                    <span className="font-bold text-stone-900 text-sm">
                      {formatCurrency(item.subtotal || item.unit_price * item.quantity)}
                    </span>
                  </div>
                ))}

                <div className="pt-3 mt-1 flex justify-between items-center text-sm font-extrabold text-amber-800 border-t border-stone-200">
                  <span>Tổng tiền thanh toán</span>
                  <span className="text-base">{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
              </div>
            </div>

            {/* Nút hành động */}
            <div className="pt-2 flex items-center gap-2">
              <Link
                to={`/track/${selectedOrder.order_code}`}
                state={{ from: '/my-orders' }}
                onClick={() => setSelectedOrder(null)}
                className="flex-1 py-3 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-xs text-center flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <span>Xem trang tiến độ theo dõi</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
