import React, { useState } from 'react';
import {
  X,
  Phone,
  MapPin,
  User,
  Clock,
  Utensils,
  Flame,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  FileText,
  DollarSign,
  ArrowLeftRight,
  Trash2,
  Plus,
} from 'lucide-react';
import { Order, OrderStatus } from '@/types/order';
import { formatCurrency, formatDateTime, formatTimeAgo } from '@/utils/format';
import { Badge, Button } from '@/components/ui';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onUpdateStatus?: (orderId: number, status: OrderStatus) => Promise<void>;
  onRemoveItem?: (orderId: number, itemId: number) => void;
  onExchangeItem?: (
    orderId: number,
    itemId: number,
    orderCode: string,
    oldProductName: string,
    oldQuantity: number,
    oldUnitPrice?: number,
    tableName?: string,
    zone?: string
  ) => void;
  onAddItem?: (
    orderId: number,
    orderCode: string,
    tableName?: string,
    zone?: string
  ) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  onClose,
  order,
  onUpdateStatus,
  onRemoveItem,
  onExchangeItem,
  onAddItem,
}) => {
  const [copiedField, setCopiedField] = useState<'phone' | 'address' | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen || !order) return null;

  const isDelivery = order.order_type === 'DELIVERY';
  const isPending = order.status === 'PENDING';
  const isPreparing = order.status === 'PREPARING';
  const isCompleted = order.status === 'COMPLETED';
  const isCancelled = order.status === 'CANCELLED';

  const copyToClipboard = async (text: string, field: 'phone' | 'address') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!onUpdateStatus) return;
    try {
      setIsUpdating(true);
      await onUpdateStatus(order.id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Đơn #{order.order_code}
              </span>

              {isDelivery ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <span>🛵 Giao hàng tận nơi (Ship)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <Utensils className="w-3 h-3" />
                  <span>
                    {order.table_name || 'Bàn ăn'} {order.zone ? `- ${order.zone}` : ''}
                  </span>
                </span>
              )}

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

            <p className="text-[11px] text-slate-400 font-medium mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>
                {formatDateTime(order.created_at)} ({formatTimeAgo(order.created_at)})
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Thông tin giao hàng / Khách hàng */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              {isDelivery ? <span>Thông Tin Nhận Hàng (Ship)</span> : <span>Thông Tin Khách Hàng</span>}
            </h4>

            {/* Tên khách */}
            <div className="flex items-start gap-2.5">
              <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block text-[11px]">Họ tên khách hàng:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {order.customer_name || 'Khách vãng lai'}
                </span>
              </div>
            </div>

            {/* Số điện thoại */}
            {order.customer_phone && (
              <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-200/50">
                <div className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 block text-[11px]">Số điện thoại:</span>
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="font-bold text-blue-600 hover:underline text-sm"
                    >
                      {order.customer_phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(order.customer_phone!, 'phone')}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200/80 transition cursor-pointer flex items-center gap-1"
                    title="Sao chép số điện thoại"
                  >
                    {copiedField === 'phone' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-[10px] text-emerald-600 font-bold">Đã copy</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span className="text-[10px]">Copy</span>
                      </>
                    )}
                  </button>
                  <a
                    href={`tel:${order.customer_phone}`}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition text-[11px] flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Gọi</span>
                  </a>
                </div>
              </div>
            )}

            {/* Địa chỉ giao hàng */}
            {isDelivery && (
              <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-200/50">
                <div className="flex items-start gap-2.5 min-w-0">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-slate-400 block text-[11px]">Địa chỉ giao hàng tận nơi:</span>
                    <p className="font-bold text-slate-900 break-words leading-relaxed">
                      {order.delivery_address || 'Chưa cung cấp địa chỉ'}
                    </p>
                  </div>
                </div>

                {order.delivery_address && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(order.delivery_address!, 'address')}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200/80 transition cursor-pointer flex items-center gap-1 shrink-0 self-start mt-2"
                    title="Sao chép địa chỉ giao hàng"
                  >
                    {copiedField === 'address' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-[10px] text-emerald-600 font-bold">Đã copy</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span className="text-[10px]">Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Ghi chú */}
            {order.note && (
              <div className="pt-1 border-t border-slate-200/50">
                <span className="text-amber-800 font-semibold block text-[11px]">Ghi chú của khách:</span>
                <p className="text-amber-900 bg-amber-50 p-2 rounded-xl border border-amber-200/80 mt-0.5 font-medium">
                  {order.note}
                </p>
              </div>
            )}
          </div>

          {/* Danh sách món ăn */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Món Đã Gọi ({order.items?.length || 0} món)
              </h4>

              {(isPending || isPreparing) && onAddItem && (
                <button
                  type="button"
                  onClick={() =>
                    onAddItem(order.id, order.order_code, order.table_name, order.zone)
                  }
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Thêm món</span>
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-2xs">
              {(order.items || []).map((item) => (
                <div key={item.id} className="p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md text-xs">
                        x{item.quantity}
                      </span>
                      <p className="font-bold text-slate-900 text-xs sm:text-sm">
                        {item.product_name}
                      </p>
                    </div>

                    {item.note && (
                      <p className="text-[11px] text-amber-700 bg-amber-50/70 px-2 py-0.5 rounded-md mt-1 inline-block border border-amber-200/50">
                        {item.note}
                      </p>
                    )}

                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Đơn giá: {formatCurrency(item.unit_price)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      {formatCurrency(item.subtotal)}
                    </span>

                    {(isPending || isPreparing) && (
                      <div className="flex items-center gap-0.5">
                        {onExchangeItem && (
                          <button
                            type="button"
                            onClick={() =>
                              onExchangeItem(
                                order.id,
                                item.id,
                                order.order_code,
                                item.product_name,
                                item.quantity,
                                Number(item.unit_price),
                                order.table_name,
                                order.zone
                              )
                            }
                            className="p-1 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded transition cursor-pointer"
                            title="Đổi món khác"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onRemoveItem && (
                          <button
                            type="button"
                            onClick={() => onRemoveItem(order.id, item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="Hủy món này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tổng tiền thanh toán */}
          <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-2xl flex items-center justify-between">
            <span className="font-bold text-slate-700">Tổng thanh toán:</span>
            <span className="text-base sm:text-lg font-black text-blue-700">
              {formatCurrency(order.total_amount)}
            </span>
          </div>
        </div>

        {/* Modal Footer: Action Buttons */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2.5">
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>

          <div className="flex items-center gap-2">
            {isPending && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('CANCELLED')}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  <span>Hủy đơn</span>
                </Button>
                <Button
                  variant="warning"
                  size="sm"
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('PREPARING')}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Bắt đầu chế biến</span>
                </Button>
              </>
            )}

            {isPreparing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('CANCELLED')}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  <span>Hủy đơn</span>
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('COMPLETED')}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Xong món & Trả đơn</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
