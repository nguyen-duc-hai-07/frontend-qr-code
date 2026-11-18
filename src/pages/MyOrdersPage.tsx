import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
        setError(getErrorMessage(err, 'Không thể tải lịch sử đơn hàng!'));
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

      <main className="max-w-2xl mx-auto px-4 py-8 flex-1 w-full space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#ede4d8]">
          <div>
            <h1 className="text-xl font-bold text-stone-900">Lịch sử đơn hàng của tôi</h1>
            <p className="text-xs text-stone-500 mt-0.5">Theo dõi tất cả đơn đặt món của bạn</p>
          </div>
          <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200/90 shadow-2xs">
            {orders.length} đơn
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-amber-700 animate-spin mb-2" />
            <p className="text-stone-500 text-xs">Đang tải lịch sử đơn...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-rose-600 text-sm">{error}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-30 text-amber-700" />
            <p className="text-sm font-medium">Bạn chưa có đơn hàng nào!</p>
            <Link
              to="/"
              className="mt-4 inline-block px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
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
                className="block bg-white rounded-2xl p-4 border border-[#ede4d8] shadow-2xs hover:shadow-md hover:border-amber-300 transition-all group"
              >
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div>
                    <span className="text-xs text-stone-400 font-medium">Mã đơn:</span>
                    <span className="text-sm font-bold text-amber-800 ml-1.5">
                      #{order.order_code}
                    </span>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                <div className="py-2.5 space-y-1 text-xs text-stone-600">
                  <p>
                    <span className="text-stone-400">Loại đơn:</span>{' '}
                    <span className="font-semibold text-stone-800">
                      {order.order_type === 'AT_TABLE' ? 'Gọi tại bàn' : 'Giao tận nơi'}
                    </span>
                    {order.table_name && ` (${order.table_name}${order.zone ? ` - ${order.zone}` : ''})`}
                  </p>
                  <p>
                    <span className="text-stone-400">Món:</span>{' '}
                    {order.items?.map((i) => `${i.product_name} (${i.quantity})`).join(', ')}
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs text-stone-400">
                    {formatDateTime(order.created_at)}
                  </span>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm font-extrabold text-amber-800">
                      {formatCurrency(order.total_amount)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 group-hover:text-amber-700 transition-all" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
