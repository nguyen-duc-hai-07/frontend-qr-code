import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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

export const OrderTrackingPage: React.FC = () => {
  const { orderCode } = useParams<{ orderCode: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { subscribe } = useWebSocket();

  const fetchOrder = () => {
    if (!orderCode) return;
    setLoading(true);
    orderApi
      .trackOrder(orderCode)
      .then((res) => {
        setOrder(res.data);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Không tìm thấy đơn hàng!');
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-slate-600 text-sm">Đang kiểm tra tiến độ đơn hàng...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Không tìm thấy đơn hàng</h2>
        <p className="text-slate-500 text-sm mt-1 mb-5">{error}</p>
        <Link
          to="/"
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 shadow-xs"
        >
          Về trang chủ
        </Link>
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (order.status) {
      case 'PENDING':
        return (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-2xl flex items-center space-x-3">
            <Clock className="w-6 h-6 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
            <div>
              <p className="font-bold text-sm">Bếp đã nhận đơn hàng</p>
              <p className="text-xs text-amber-600 mt-0.5">Món đang được chế biến, bạn vui lòng chờ nhé!</p>
            </div>
          </div>
        );
      case 'COMPLETED':
        return (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-2xl flex items-center space-x-3">
            <CheckCircle2 className="w-6 h-6 text-blue-600" />
            <div>
              <p className="font-bold text-sm">Đơn hàng đã hoàn thành</p>
              <p className="text-xs text-blue-600 mt-0.5">Chúc bạn có bữa ăn thật ngon miệng!</p>
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
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3.5 sticky top-0 z-20">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link to="/" className="text-slate-600 hover:text-slate-900 p-1 -ml-1">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="font-bold text-base text-slate-800">Tiến độ đơn hàng</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Status Alert Banner */}
        {getStatusBadge()}

        {/* Order Info Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs text-slate-400 font-medium">Mã đơn hàng</span>
              <p className="text-base font-extrabold text-blue-600 tracking-wide">
                {order.order_code}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 font-medium">Thời gian</span>
              <p className="text-xs text-slate-600 font-semibold">{formatDateTime(order.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-600">
            {order.order_type === 'AT_TABLE' ? (
              <>
                <Utensils className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-slate-800">
                  {order.table_name || 'Ăn tại bàn'} ({order.zone || 'Khu vực quán'})
                </span>
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="font-medium truncate">{order.delivery_address || 'Giao hàng tận nơi'}</span>
              </>
            )}
          </div>

          {order.note && (
            <p className="text-xs bg-slate-50 p-2.5 rounded-xl text-slate-600 italic">
              &quot;{order.note}&quot;
            </p>
          )}
        </div>

        {/* Items List */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
          <h2 className="font-bold text-sm text-slate-800 flex items-center space-x-1.5 pb-2 border-b border-slate-100">
            <Receipt className="w-4 h-4 text-slate-500" />
            <span>Danh sách món ({order.items.length})</span>
          </h2>

          <div className="divide-y divide-slate-100">
            {order.items.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between">
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatCurrency(item.unit_price)} × {item.quantity}
                  </p>
                  {item.note && (
                    <p className="text-[11px] text-amber-600 italic mt-0.5">{item.note}</p>
                  )}
                </div>
                <span className="text-sm font-bold text-slate-900">
                  {formatCurrency(item.subtotal)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Tạm tính</span>
              <span>{formatCurrency(order.subtotal_amount)}</span>
            </div>
            {Number(order.shipping_fee) > 0 && (
              <div className="flex justify-between text-xs text-slate-500">
                <span>Phí giao hàng</span>
                <span>{formatCurrency(order.shipping_fee)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-blue-600 pt-1 border-t border-slate-100">
              <span>Tổng cộng</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
