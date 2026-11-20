import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  XCircle,
  Utensils,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Receipt,
  MapPin,
  Phone,
  User,
  FileText,
  Bike,
} from 'lucide-react';
import { orderApi } from '@/api/order.api';
import { Order } from '@/types/order';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { getErrorMessage } from '@/utils/error';

export const OrderTrackingPage: React.FC = () => {
  const { orderCode } = useParams<{ orderCode: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { subscribe } = useWebSocket();

  // Determine back URL
  const getBackUrl = () => {
    // 1. If passed via React Router navigation state (e.g. from /my-orders)
    if (location.state && (location.state as { from?: string }).from) {
      return (location.state as { from: string }).from;
    }
    if (location.state && (location.state as { fromTableUrl?: string }).fromTableUrl) {
      return (location.state as { fromTableUrl: string }).fromTableUrl;
    }

    // 2. Nếu là đơn đặt giao hàng tận nơi (DELIVERY) -> luôn quay về trang chủ đặt giao hàng
    if (order?.order_type === 'DELIVERY') {
      return '/';
    }

    // 3. Nếu là đơn tại bàn (AT_TABLE):
    if (order && order.order_type === 'AT_TABLE') {
      const savedTablePath = localStorage.getItem('hoangan_last_table_path');
      if (savedTablePath) {
        return savedTablePath;
      }
      if (order.table_id) {
        return `/table/${order.table_id}`;
      }
    }

    // 4. Default fallback to home
    return '/';
  };

  const handleGoBack = () => {
    navigate(getBackUrl());
  };

  const fetchOrder = () => {
    if (!orderCode) return;
    setLoading(true);
    orderApi
      .trackOrder(orderCode)
      .then((res) => {
        setOrder(res.data);
      })
      .catch((err) => {
        setError(getErrorMessage(err, 'Không tìm thấy đơn hàng!'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrder();
  }, [orderCode]);

  // WebSocket real-time update on status change
  useEffect(() => {
    const unsubscribe = subscribe((payload) => {
      if (
        (payload.action === 'ORDER_STATUS_UPDATED' || payload.action === 'ORDER_ITEM_REMOVED') &&
        'order' in payload
      ) {
        const updatedOrder = payload.order as Order;
        if (updatedOrder.order_code === orderCode) {
          setOrder(updatedOrder);
        }
      }
    });

    return unsubscribe;
  }, [orderCode, subscribe]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-amber-700 animate-spin mb-3" />
        <p className="text-stone-600 text-sm font-medium">Đang kiểm tra tiến độ đơn hàng...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-stone-800">Không tìm thấy đơn hàng</h2>
        <p className="text-stone-500 text-sm mt-1 mb-5">{error}</p>
        <button
          type="button"
          onClick={handleGoBack}
          className="px-5 py-2.5 bg-amber-700 text-white rounded-xl text-xs font-bold hover:bg-amber-800 shadow-xs transition"
        >
          Quay lại thực đơn
        </button>
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (order.status) {
      case 'PENDING':
        return (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-2xl flex items-center space-x-3">
            <Clock className="w-6 h-6 text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
            <div>
              <p className="font-bold text-sm">Bếp đã nhận đơn hàng</p>
              <p className="text-xs text-amber-700 mt-0.5">Món đang được chế biến, bạn vui lòng chờ nhé!</p>
            </div>
          </div>
        );
      case 'COMPLETED':
        return (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center space-x-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <div>
              <p className="font-bold text-sm">Đơn hàng đã hoàn thành</p>
              <p className="text-xs text-emerald-700 mt-0.5">Chúc bạn có bữa ăn thật ngon miệng!</p>
            </div>
          </div>
        );
      case 'CANCELLED':
        return (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl flex items-center space-x-3">
            <XCircle className="w-6 h-6 text-rose-500" />
            <div>
              <p className="font-bold text-sm">Đơn hàng đã bị hủy</p>
              <p className="text-xs text-rose-600 mt-0.5">{order.note || 'Đơn hàng đã hủy.'}</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const isDelivery = order.order_type === 'DELIVERY';

  return (
    <div className="min-h-screen bg-[#faf7f2] pb-16 font-sans">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur border-b border-[#ede4d8] px-4 py-3.5 sticky top-0 z-20">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={handleGoBack}
            className="flex items-center gap-1 text-stone-600 hover:text-amber-800 p-1 -ml-1 transition-colors text-xs font-semibold active:scale-95"
            title="Quay lại bàn gọi món"
          >
            <ChevronLeft className="w-6 h-6" />
            <span className="font-bold">Quay lại</span>
          </button>
          <h1 className="font-bold text-base text-stone-900">Tiến độ đơn hàng</h1>
          <div className="text-right">
            {order.table_name ? (
              <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200">
                {order.table_name}
              </span>
            ) : isDelivery ? (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-200 inline-flex items-center gap-1">
                <Bike className="w-3 h-3 text-amber-800" />
                <span>Đặt Ship</span>
              </span>
            ) : (
              <div className="w-8" />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Status Alert Banner */}
        {getStatusBadge()}

        {/* Order Info Card */}
        <div className="bg-white rounded-2xl p-4 border border-[#ede4d8] shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <span className="text-xs text-stone-400 font-medium">Mã đơn hàng</span>
              <p className="text-base font-black text-amber-800 tracking-wide">
                #{order.order_code}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-stone-400 font-medium">Thời gian đặt</span>
              <p className="text-xs text-stone-600 font-semibold">{formatDateTime(order.created_at)}</p>
            </div>
          </div>

          {/* KHỐI THÔNG TIN GIAO NHẬN HÀNG (ĐẶT SHIP) HOẶC ĂN TẠI BÀN */}
          {isDelivery ? (
            <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/90 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60">
                <span className="font-bold text-amber-900 inline-flex items-center gap-1.5 text-xs bg-amber-100/90 px-2 py-0.5 rounded-md">
                  <Bike className="w-3.5 h-3.5 text-amber-800" />
                  <span>ĐẶT GIAO HÀNG TẬN NƠI (SHIP)</span>
                </span>
                {order.customer_phone && (
                  <a
                    href={`tel:${order.customer_phone}`}
                    className="inline-flex items-center gap-1 font-bold text-amber-800 hover:text-amber-900 hover:underline px-2 py-1 bg-white rounded-lg border border-amber-200 shadow-2xs"
                    title="Gọi cho người nhận"
                  >
                    <Phone className="w-3 h-3 text-amber-700" />
                    <span>{order.customer_phone}</span>
                  </a>
                )}
              </div>

              <div className="space-y-2 text-stone-700">
                <div className="flex items-start gap-2">
                  <User className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-stone-400">Tên người nhận: </span>
                    <strong className="text-stone-900 text-sm">{order.customer_name || 'Khách đặt ship'}</strong>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Phone className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-stone-400">Số điện thoại: </span>
                    <strong className="text-stone-900 text-sm">{order.customer_phone || 'Chưa cung cấp'}</strong>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-stone-400">Địa chỉ giao hàng: </span>
                    <strong className="text-stone-900 text-sm block">{order.delivery_address || 'Địa chỉ giao hàng'}</strong>
                  </div>
                </div>

                {order.note ? (
                  <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-amber-200/70">
                    <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-stone-400">Ghi chú đơn hàng: </span>
                      <p className="text-stone-800 italic font-medium mt-0.5">&quot;{order.note}&quot;</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-stone-400 italic text-[11px] pt-0.5">
                    <FileText className="w-3 h-3 text-stone-300 shrink-0" />
                    <span>Không có ghi chú thêm</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1.5">
              <div className="flex items-center space-x-2 text-xs text-stone-600 font-semibold">
                <Utensils className="w-4 h-4 text-amber-700" />
                <span className="text-stone-800">
                  {order.table_name || 'Ăn tại bàn'}{order.zone ? ` - ${order.zone}` : ''}
                </span>
                {order.customer_name && <span className="text-stone-400">({order.customer_name})</span>}
              </div>
              {order.note && (
                <p className="text-xs bg-white border border-stone-200 p-2 rounded-lg text-stone-600 italic">
                  &quot;{order.note}&quot;
                </p>
              )}
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="bg-white rounded-2xl p-4 border border-[#ede4d8] shadow-2xs space-y-3">
          <h2 className="font-bold text-sm text-stone-900 flex items-center space-x-1.5 pb-2 border-b border-stone-100">
            <Receipt className="w-4 h-4 text-amber-700" />
            <span>Danh sách món ({order.items.length})</span>
          </h2>

          <div className="divide-y divide-stone-100">
            {order.items.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between">
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-semibold text-stone-800 truncate">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-stone-400">
                    {formatCurrency(item.unit_price)} × {item.quantity}
                  </p>
                  {item.note && (
                    <p className="text-[11px] text-amber-700 italic mt-0.5">{item.note}</p>
                  )}
                </div>
                <span className="text-sm font-bold text-stone-900">
                  {formatCurrency(item.subtotal)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-stone-100 space-y-1.5">
            <div className="flex justify-between text-xs text-stone-500">
              <span>Tạm tính</span>
              <span>{formatCurrency(order.subtotal_amount)}</span>
            </div>
            {Number(order.shipping_fee) > 0 && (
              <div className="flex justify-between text-xs text-stone-500">
                <span>Phí giao hàng</span>
                <span>{formatCurrency(order.shipping_fee)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-amber-800 pt-1 border-t border-stone-100">
              <span>Tổng cộng</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Nút quay lại bàn hoặc xem thực đơn */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              if (order.order_type === 'DELIVERY') {
                navigate('/');
              } else {
                handleGoBack();
              }
            }}
            className="w-full py-3.5 bg-amber-700 hover:bg-amber-800 text-white rounded-2xl text-sm font-bold shadow-md shadow-amber-900/15 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Utensils className="w-4 h-4" />
            <span>
              {order.order_type === 'AT_TABLE'
                ? `Quay lại ${order.table_name || 'bàn'} để tiếp tục gọi món`
                : 'Tiếp tục xem thực đơn & Đặt món'}
            </span>
          </button>
        </div>
      </main>
    </div>
  );
};
