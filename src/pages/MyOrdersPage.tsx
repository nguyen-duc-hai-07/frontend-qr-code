import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { orderApi } from '@/api/order.api';
import { Order } from '@/types/order';
import { formatCurrency, formatDateTime } from '@/utils/format';
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export const MyOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    orderApi
      .getMyOrders()
      .then((res) => setOrders(res.data))
      .catch((err) => {
        setError(err.response?.data?.message || 'Không thể tải lịch sử đơn hàng!');
      })
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            <span>Đang xử lý</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8 flex-1 w-full space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Lịch sử đơn hàng của tôi</h1>
            <p className="text-xs text-slate-500 mt-0.5">Theo dõi tất cả đơn đặt món của bạn</p>
          </div>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
            {orders.length} đơn
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
            <p className="text-slate-500 text-xs">Đang tải lịch sử đơn...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-rose-500 text-sm">{error}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Bạn chưa có đơn hàng nào!</p>
            <Link
              to="/"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700"
            >
              Khám phá thực đơn
            </Link>
          </div>
        ) : (
          <div className="space-y-3.5">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/track/${order.order_code}`}
                className="block bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all group"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-xs text-slate-400 font-medium">Mã đơn:</span>
                    <span className="text-sm font-bold text-blue-600 ml-1.5">
                      {order.order_code}
                    </span>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                <div className="py-2.5 space-y-1 text-xs text-slate-600">
                  <p>
                    <span className="text-slate-400">Loại đơn:</span>{' '}
                    <span className="font-semibold text-slate-800">
                      {order.order_type === 'AT_TABLE' ? 'Gọi tại bàn' : 'Giao tận nơi'}
                    </span>
                    {order.table_name && ` (${order.table_name})`}
                  </p>
                  <p>
                    <span className="text-slate-400">Món:</span>{' '}
                    {order.items?.map((i) => `${i.product_name} (${i.quantity})`).join(', ')}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {formatDateTime(order.created_at)}
                  </span>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm font-extrabold text-slate-900">
                      {formatCurrency(order.total_amount)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
