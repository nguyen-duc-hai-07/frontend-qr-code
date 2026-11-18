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

  // Determine back URL: Prioritize table order origin so guest never gets dumped onto homepage
  const getBackUrl = () => {
    // 1. If passed via React Router navigation state
    if (location.state && (location.state as { fromTableUrl?: string }).fromTableUrl) {
      return (location.state as { fromTableUrl: string }).fromTableUrl;
    }
    // 2. If saved in localStorage from TableLandingPage
    const savedTablePath = localStorage.getItem('hoangan_last_table_path');
    if (savedTablePath) {
      return savedTablePath;
    }
    // 3. If order has table_id
    if (order && order.order_type === 'AT_TABLE' && order.table_id) {
      return `/table/${order.table_id}`;
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
          Quay lại thực đơn bàn
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
        <div className="bg-white rounded-2xl p-4 border border-[#ede4d8] shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <span className="text-xs text-stone-400 font-medium">Mã đơn hàng</span>
              <p className="text-base font-black text-amber-800 tracking-wide">
                #{order.order_code}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-stone-400 font-medium">Thời gian</span>
              <p className="text-xs text-stone-600 font-semibold">{formatDateTime(order.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-stone-600">
            {order.order_type === 'AT_TABLE' ? (
              <>
                <Utensils className="w-4 h-4 text-amber-700" />
                <span className="font-semibold text-stone-800">
                  {order.table_name || 'Ăn tại bàn'}{order.zone ? ` - ${order.zone}` : ''}
                </span>
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 text-amber-700" />
                <span className="font-medium truncate">{order.delivery_address || 'Giao hàng tận nơi'}</span>
              </>
            )}
          </div>

          {order.note && (
            <p className="text-xs bg-[#fcf9f5] border border-[#e8ded2] p-2.5 rounded-xl text-stone-600 italic">
              &quot;{order.note}&quot;
            </p>
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

        {/* Nút quay lại bàn gọi món tiếp */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleGoBack}
            className="w-full py-3.5 bg-amber-700 hover:bg-amber-800 text-white rounded-2xl text-sm font-bold shadow-md shadow-amber-900/15 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Utensils className="w-4 h-4" />
            <span>
              {order.order_type === 'AT_TABLE'
                ? `Quay lại ${order.table_name || 'bàn'} để tiếp tục gọi món`
                : 'Tiếp tục xem thực đơn'}
            </span>
          </button>
        </div>
      </main>
    </div>
  );
};
