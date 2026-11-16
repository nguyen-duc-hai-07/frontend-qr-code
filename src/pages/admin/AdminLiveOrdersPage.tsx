import React, { useEffect, useState, useMemo } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  XCircle,
  Utensils,
  MapPin,
  Phone,
  RefreshCw,
  Loader2,
  Flame,
} from 'lucide-react';
import { orderApi } from '@/api/order.api';
import { Order, OrderStatus, OrderType } from '@/types/order';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { formatCurrency, formatTimeAgo } from '@/utils/format';
import { Card, CardContent, Badge, Button } from '@/components/ui';

export const AdminLiveOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | OrderStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | OrderType>('ALL');

  const { subscribe } = useWebSocket();

  const fetchOrders = () => {
    setLoading(true);
    orderApi
      .getAllOrdersAdmin()
      .then((res) => setOrders(res.data || []))
      .catch((err) => console.error('Lỗi tải đơn hàng admin:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // WebSocket real-time updates
  useEffect(() => {
    const unsubscribe = subscribe((payload) => {
      if (payload.action === 'NEW_ORDER' && 'order' in payload) {
        const newOrder = payload.order as Order;
        setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
      } else if (
        (payload.action === 'ORDER_STATUS_UPDATED' || payload.action === 'ORDER_ITEM_REMOVED') &&
        'order' in payload
      ) {
        const updated = payload.order as Order;
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      }
    });

    return unsubscribe;
  }, [subscribe]);

  // Actions
  const handleUpdateStatus = async (orderId: number, status: OrderStatus) => {
    try {
      const res = await orderApi.updateOrderStatusAdmin(orderId, { status });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.data : o)));
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      alert(errorObj.response?.data?.message || 'Cập nhật trạng thái thất bại!');
    }
  };

  const handleRemoveItem = async (orderId: number, itemId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy/bớt món này khỏi đơn?')) return;

    try {
      const res = await orderApi.removeOrderItemAdmin(orderId, itemId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.data : o)));
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      alert(errorObj.response?.data?.message || 'Không thể xóa món!');
    }
  };

  const filteredOrders = useMemo(() => {
    const list = orders.filter((o) => {
      const matchStatus = activeTab === 'ALL' ? true : o.status === activeTab;
      const matchType = typeFilter === 'ALL' ? true : o.order_type === typeFilter;
      return matchStatus && matchType;
    });

    return [...list].sort((a, b) => {
      const pA = a.status === 'PREPARING' ? 1 : a.status === 'PENDING' ? 2 : a.status === 'COMPLETED' ? 3 : 4;
      const pB = b.status === 'PREPARING' ? 1 : b.status === 'PENDING' ? 2 : b.status === 'COMPLETED' ? 3 : 4;
      if (pA !== pB) {
        return pA - pB;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [orders, activeTab, typeFilter]);

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const preparingCount = orders.filter((o) => o.status === 'PREPARING').length;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* 1. Header Card */}
      <Card>
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Tất Cả Đơn Hàng & Yêu Cầu
              </h1>
              {preparingCount > 0 && (
                <Badge variant="warning">
                  {preparingCount} đang chế biến
                </Badge>
              )}
              {pendingCount > 0 && (
                <Badge variant="default">
                  {pendingCount} chờ tiếp nhận
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tự động nhận đơn hàng mới và cập nhật trạng thái tức thì qua WebSocket
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={fetchOrders} className="self-start sm:self-auto">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </Button>
        </CardContent>
      </Card>

      {/* 2. Filters & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'ALL', label: `Tất cả (${orders.length})` },
            { id: 'PREPARING', label: `Đang làm (${preparingCount})` },
            { id: 'PENDING', label: `Chờ nhận (${pendingCount})` },
            { id: 'COMPLETED', label: 'Hoàn thành' },
            { id: 'CANCELLED', label: 'Đã hủy' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200/80 shadow-2xs self-start sm:self-auto text-xs">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              typeFilter === 'ALL' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tất cả loại
          </button>
          <button
            onClick={() => setTypeFilter('AT_TABLE')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              typeFilter === 'AT_TABLE' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tại bàn
          </button>
          <button
            onClick={() => setTypeFilter('DELIVERY')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              typeFilter === 'DELIVERY' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Giao hàng
          </button>
        </div>
      </div>

      {/* 3. Orders Grid */}
      {loading ? (
        <div className="flex h-72 items-center justify-center bg-white rounded-2xl border border-slate-200/80">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 font-semibold text-slate-600 text-xs">Đang tải danh sách đơn hàng...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200/80 shadow-xs text-slate-400">
          <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-xs font-semibold">Chưa có đơn hàng nào trong bộ lọc này!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredOrders.map((order) => {
            const isPending = order.status === 'PENDING';
            const isPreparing = order.status === 'PREPARING';
            const isCompleted = order.status === 'COMPLETED';

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl p-4 border transition-all flex flex-col justify-between shadow-xs hover:shadow-md ${
                  isPreparing
                    ? 'border-amber-300 ring-1 ring-amber-300/40 bg-amber-50/10'
                    : isPending
                    ? 'border-blue-200 ring-1 ring-blue-200/40'
                    : 'border-slate-200/80'
                }`}
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div>
                      <span className="text-sm font-bold text-slate-900 tracking-wide">
                        #{order.order_code}
                      </span>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {formatTimeAgo(order.created_at)}
                      </p>
                    </div>

                    <Badge
                      variant={
                        isPreparing
                          ? 'warning'
                          : isPending
                          ? 'default'
                          : isCompleted
                          ? 'success'
                          : 'destructive'
                      }
                    >
                      {isPreparing
                        ? 'Đang chế biến'
                        : isPending
                        ? 'Chờ tiếp nhận'
                        : isCompleted
                        ? 'Đã xong'
                        : 'Đã hủy'}
                    </Badge>
                  </div>

                  {/* Destination / Customer */}
                  <div className="bg-slate-50 p-2.5 rounded-xl space-y-1 text-xs">
                    {order.order_type === 'AT_TABLE' ? (
                      <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                        <Utensils className="w-3.5 h-3.5 text-blue-600" />
                        <span>
                          {order.table_name || 'Bàn ăn'} {order.zone ? `• ${order.zone}` : ''}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                          <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="truncate">{order.delivery_address || 'Giao tận nơi'}</span>
                        </div>
                        {order.customer_phone && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{order.customer_phone}</span>
                            {order.customer_name && <span>({order.customer_name})</span>}
                          </div>
                        )}
                      </>
                    )}

                    {order.customer_name && order.order_type === 'AT_TABLE' && (
                      <p className="text-[11px] text-slate-500">Khách: {order.customer_name}</p>
                    )}

                    {order.note && (
                      <p className="text-[11px] text-amber-700 bg-amber-50/80 p-1.5 rounded-lg border border-amber-200/60 font-medium">
                        Ghi chú: {order.note}
                      </p>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto pr-1">
                    {order.items?.map((item) => (
                      <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-slate-800">
                            {item.quantity}× {item.product_name}
                          </span>
                          {item.note && (
                            <p className="text-[10px] text-slate-400 italic">{item.note}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-slate-800">
                            {formatCurrency(item.subtotal)}
                          </span>
                          {isPending && (
                            <button
                              onClick={() => handleRemoveItem(order.id, item.id)}
                              title="Hủy món này"
                              className="p-1 text-slate-300 hover:text-rose-500 rounded"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer & Actions */}
                <div className="pt-3 border-t border-slate-100 mt-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Tổng tiền:</span>
                    <span className="text-base font-bold text-blue-600">
                      {formatCurrency(order.total_amount)}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {isPending && (
                      <>
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          <span>Chế biến</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                          className="text-rose-600 hover:bg-rose-50"
                        >
                          Hủy
                        </Button>
                      </>
                    )}

                    {isPreparing && (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                        className="w-full"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Xong món</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
