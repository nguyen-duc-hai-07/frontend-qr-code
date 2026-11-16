import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Utensils,
  Search,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  Loader2,
  MapPin,
  Phone,
  User,
  X,
  Clock,
  Coffee,
  Trash2,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { menuApi } from '@/api/menu.api';
import { orderApi } from '@/api/order.api';
import { Category } from '@/types/category';
import { Product } from '@/types/product';
import { useCart } from '@/contexts/CartContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency } from '@/utils/format';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Delivery form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { items, addItem, updateQuantity, removeItem, clearCart, totalCount, totalPrice, toOrderItems } =
    useCart();
  const { subscribe } = useWebSocket();
  const { showToast, showAlertModal } = useToast();

  // 1. Fetch menu & categories
  useEffect(() => {
    setLoading(true);
    Promise.all([menuApi.getActiveCategories(), menuApi.getProducts()])
      .then(([catsRes, prodsRes]) => {
        setCategories(catsRes.data);
        setProducts(prodsRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  // 2. Real-time availability change via WebSocket
  useEffect(() => {
    const unsubscribe = subscribe((payload) => {
      if (payload.action === 'PRODUCT_AVAILABILITY_CHANGED') {
        const ev = payload as { productId?: number; isAvailable?: boolean; data?: { id?: number; is_available?: boolean; name?: string } };
        const prodId = ev.data?.id ?? ev.productId;
        const isAvail = ev.data?.is_available !== undefined ? ev.data.is_available : ev.isAvailable;
        if (prodId !== undefined && isAvail !== undefined) {
          setProducts((prev) =>
            prev.map((p) => (p.id === prodId ? { ...p, is_available: isAvail } : p))
          );
          if (!isAvail) {
            const inCart = items.find((i) => i.product.id === prodId);
            if (inCart) {
              removeItem(prodId, inCart.cart_id);
              showToast(
                `Món "${inCart.product.name}" hiện đã hết hàng và đã được tự động bỏ khỏi giỏ hàng.`,
                'warning',
                'Món tạm hết'
              );
            }
          }
        }
      }
    });

    return unsubscribe;
  }, [subscribe, items, removeItem, showToast]);

  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCatId ? p.category_id === selectedCatId : true;
    const matchKw = keyword.trim()
      ? p.name.toLowerCase().includes(keyword.toLowerCase()) ||
        p.description?.toLowerCase().includes(keyword.toLowerCase())
      : true;
    return matchCat && matchKw;
  });

  const getItemQuantity = (productId: number): number => {
    const item = items.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  const handleCheckoutDelivery = async () => {
    if (!customerPhone.trim() || !deliveryAddress.trim()) {
      showAlertModal({
        title: 'Thiếu thông tin nhận hàng',
        message: 'Vui lòng nhập số điện thoại và địa chỉ nhận hàng!',
        type: 'warning',
        confirmText: 'Đã hiểu',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await orderApi.createOrder({
        order_type: 'DELIVERY',
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim(),
        delivery_address: deliveryAddress.trim(),
        note: orderNote.trim() || undefined,
        items: toOrderItems(),
      });

      clearCart();
      setIsCartOpen(false);
      navigate(`/track/${res.data.order_code}`);
    } catch (err: unknown) {
      const errorObj = err as {
        response?: {
          data?: {
            message?: string;
            data?: { code?: string; message?: string };
          };
        };
      };
      const detailedMsg =
        errorObj.response?.data?.data?.message ||
        errorObj.response?.data?.message ||
        'Có lỗi xảy ra khi tạo đơn giao hàng. Vui lòng thử lại!';

      const isUnavailable =
        errorObj.response?.data?.data?.code === 'org.oplearn.project.exception.ProductUnavailableException' ||
        detailedMsg.includes('tạm hết') ||
        detailedMsg.includes('hết hàng') ||
        detailedMsg.includes('ngưng phục vụ') ||
        detailedMsg.toLowerCase().includes('out of stock') ||
        detailedMsg.toLowerCase().includes('unavailable');

      if (isUnavailable) {
        menuApi.getProducts().then((res) => {
          if (res.data) {
            setProducts(res.data);
            const unavailableItems = items.filter((cartItem) => {
              const freshProduct = res.data.find((p) => p.id === cartItem.product.id);
              return freshProduct && !freshProduct.is_available;
            });
            if (unavailableItems.length > 0) {
              unavailableItems.forEach((unItem) => {
                removeItem(unItem.product.id, unItem.cart_id);
              });
              showAlertModal({
                title: 'Món đã tạm hết',
                message: `${detailedMsg}. Hệ thống đã tự động bỏ món đã hết khỏi giỏ hàng giúp bạn.`,
                type: 'warning',
                confirmText: 'Đã hiểu',
              });
              return;
            }
          }
          items.forEach((item) => {
            if (detailedMsg.includes(item.product.name)) {
              removeItem(item.product.id, item.cart_id);
            }
          });
          showAlertModal({
            title: 'Món đã tạm hết',
            message: `${detailedMsg}. Hệ thống đã tự động bỏ món đã hết khỏi giỏ hàng giúp bạn.`,
            type: 'warning',
            confirmText: 'Đã hiểu',
          });
        }).catch(() => {
          items.forEach((item) => {
            if (detailedMsg.includes(item.product.name)) {
              removeItem(item.product.id, item.cart_id);
            }
          });
          showAlertModal({
            title: 'Món đã tạm hết',
            message: `${detailedMsg}. Hệ thống đã tự động bỏ món đã hết khỏi giỏ hàng giúp bạn.`,
            type: 'warning',
            confirmText: 'Đã hiểu',
          });
        });
      } else {
        showAlertModal({
          title: 'Đặt đơn thất bại',
          message: detailedMsg,
          type: 'error',
          confirmText: 'Đóng',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] flex flex-col font-sans">
      <Navbar onOpenCart={() => setIsCartOpen(true)} />

      {/* Hero Banner - Warm & Cozy Light Café Aesthetic */}
      <section className="bg-[#fffdfa] border-b border-[#ede4d8] py-8 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/80 border border-amber-200/80 text-amber-900 text-xs font-semibold mb-1 shadow-2xs">
            <span>🛵 Nhận đặt ship từ 9h00 sáng • Hotline: 0986 013 093</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Thực Đơn Hoàng An Coffee & Billiard
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm max-w-lg mx-auto flex items-center justify-center flex-wrap gap-x-3 gap-y-1">
            <span>📍 KĐT Mới Thành Công - KM - HP</span>
            <span>•</span>
            <span>📞 Hotline: <a href="tel:0986013093" className="font-bold text-amber-800 hover:underline">0986 013 093</a></span>
          </p>

          {/* Search bar */}
          <div className="max-w-md mx-auto pt-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm món ăn, trà sữa, cafe..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full bg-[#fcf9f5] text-stone-800 text-xs sm:text-sm rounded-xl pl-10 pr-4 py-2.5 border border-[#e8ded2] shadow-2xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter Pills */}
      <div className="bg-[#fffdfa]/95 backdrop-blur border-b border-[#ede4d8] sticky top-14 z-20 px-4 py-3 shadow-2xs overflow-x-auto no-scrollbar">
        <div className="max-w-4xl mx-auto flex items-center space-x-2">
          <button
            onClick={() => setSelectedCatId(null)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              selectedCatId === null
                ? 'bg-amber-700 text-white shadow-xs font-bold'
                : 'bg-[#f5ede4] text-stone-700 hover:bg-[#ede1d3] hover:text-stone-900 border border-[#e8ded2]'
            }`}
          >
            Tất cả món
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectedCatId === cat.id
                  ? 'bg-amber-700 text-white shadow-xs font-bold'
                  : 'bg-[#f5ede4] text-stone-700 hover:bg-[#ede1d3] hover:text-stone-900 border border-[#e8ded2]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <main className="max-w-4xl mx-auto px-4 py-6 flex-1 w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-amber-700 animate-spin mb-2" />
            <p className="text-stone-500 text-xs font-medium">Đang nạp thực đơn quán...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <Coffee className="w-12 h-12 mx-auto mb-2 opacity-30 text-amber-700" />
            <p className="text-sm font-medium">Không tìm thấy món ăn nào!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredProducts.map((product) => {
              const qty = getItemQuantity(product.id);
              const isOutOfStock = !product.is_available;

              return (
                <div
                  key={product.id}
                  className={`bg-white rounded-2xl p-3 border border-[#ede4d8] shadow-2xs flex items-center space-x-3 transition-all ${
                    isOutOfStock ? 'opacity-70 bg-[#faf6f0]/70' : 'hover:shadow-md hover:border-amber-300'
                  }`}
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#faf6f0] flex-shrink-0 relative border border-[#f0e6da]">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className={`w-full h-full object-cover ${
                          isOutOfStock ? 'grayscale contrast-75' : ''
                        }`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-amber-700/50">
                        <Coffee className="w-8 h-8" />
                      </div>
                    )}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white bg-rose-600 px-1.5 py-0.5 rounded shadow">
                          Hết
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-stone-900 truncate">
                      {product.name}
                    </h3>
                    {isOutOfStock ? (
                      <p className="text-xs font-semibold text-rose-600 mt-0.5">Đã hết</p>
                    ) : (
                      <p className="text-sm font-black text-amber-800 mt-0.5">
                        {formatCurrency(product.price)}
                      </p>
                    )}
                    {product.description && (
                      <p className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">
                        {product.description}
                      </p>
                    )}

                    <div className="mt-2 flex items-center justify-end">
                      {isOutOfStock ? (
                        <button
                          disabled
                          className="px-5 py-1.5 bg-stone-100 text-stone-400 text-xs font-semibold rounded-lg cursor-not-allowed border border-stone-200"
                        >
                          Thêm
                        </button>
                      ) : qty > 0 ? (
                        <div className="flex items-center space-x-2 bg-amber-50/80 border border-amber-200/90 rounded-lg p-0.5">
                          <button
                            onClick={() => updateQuantity(product.id, qty - 1)}
                            className="w-6 h-6 rounded bg-white text-amber-900 flex items-center justify-center shadow-2xs hover:bg-stone-50"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-amber-900 min-w-[18px] text-center">
                            {qty}
                          </span>
                          <button
                            onClick={() => updateQuantity(product.id, qty + 1)}
                            className="w-6 h-6 rounded bg-amber-600 text-white flex items-center justify-center shadow-2xs hover:bg-amber-700"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addItem(product, 1)}
                          className="px-5 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 active:scale-95 transition-all shadow-xs shadow-amber-600/20"
                        >
                          Thêm
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Cart Button for Mobile */}
      {totalCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 inset-x-4 max-w-md mx-auto z-30">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-amber-700 hover:bg-amber-800 text-white px-5 py-3.5 rounded-2xl shadow-xl shadow-amber-900/25 flex items-center justify-between font-bold text-sm transition-all active:scale-[0.98]"
          >
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5" />
              <span>{totalCount} món</span>
            </div>
            <span>{formatCurrency(totalPrice)} • Đặt hàng</span>
          </button>
        </div>
      )}

      {/* Cart Drawer for Delivery */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black/50 transition-opacity"
          />

          <div className="relative bg-white w-full max-w-md h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-[#ebdcd0] flex items-center justify-between bg-[#fffdfa]">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-amber-800" />
                <h3 className="font-bold text-base text-stone-900">Giỏ hàng đặt món ({totalCount})</h3>
              </div>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-semibold"
                  >
                    Xóa tất cả
                  </button>
                )}
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
              {items.length === 0 ? (
                <div className="text-center py-16 text-stone-400">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-30 text-amber-700" />
                  <p className="text-sm">Chưa có món nào trong giỏ hàng!</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between pb-3 border-b border-stone-100"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-sm text-stone-900 truncate">
                            {item.product.name}
                          </p>
                          <p className="text-xs text-amber-800 font-bold">
                            {formatCurrency(Number(item.product.price) * item.quantity)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <div className="flex items-center space-x-1.5 bg-amber-50/80 border border-amber-200/90 rounded-lg p-0.5">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.cart_id)}
                              className="w-6 h-6 rounded bg-white text-amber-900 flex items-center justify-center shadow-2xs hover:bg-stone-50"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-bold text-amber-900 min-w-[18px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.cart_id)}
                              className="w-6 h-6 rounded bg-amber-600 text-white flex items-center justify-center shadow-2xs hover:bg-amber-700"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.product.id, item.cart_id)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Hủy món này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Delivery Inputs */}
                  <div className="pt-2 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                      Thông tin nhận hàng
                    </h4>
                    <div>
                      <label className="text-xs font-semibold text-stone-700 block mb-1">
                        Họ và tên
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Họ tên người nhận"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full text-xs pl-9 pr-3 py-2 bg-[#fcf9f5] border border-[#e8ded2] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-stone-700 block mb-1">
                        Số điện thoại nhận hàng <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          placeholder="0912 345 678"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full text-xs pl-9 pr-3 py-2 bg-[#fcf9f5] border border-[#e8ded2] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-stone-700 block mb-1">
                        Địa chỉ nhận hàng <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                        <textarea
                          rows={2}
                          placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          className="w-full text-xs pl-9 pr-3 py-2 bg-[#fcf9f5] border border-[#e8ded2] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-stone-700 block mb-1">
                        Ghi chú đơn hàng
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Gọi trước khi đến..."
                        value={orderNote}
                        onChange={(e) => setOrderNote(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-[#fcf9f5] border border-[#e8ded2] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-4 border-t border-[#ebdcd0] bg-[#fffdfa] space-y-2">
                <div className="flex justify-between text-base font-extrabold text-amber-800 pt-1 border-t border-stone-100">
                  <span>Tổng thanh toán:</span>
                  <span>{formatCurrency(totalPrice)}</span>
                </div>

                <button
                  onClick={handleCheckoutDelivery}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-amber-700 hover:bg-amber-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-900/20 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] mt-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tạo đơn hàng...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Xác nhận đặt hàng</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
