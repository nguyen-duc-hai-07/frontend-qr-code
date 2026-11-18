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
  LayoutGrid,
  List,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { menuApi } from '@/api/menu.api';
import { orderApi } from '@/api/order.api';
import { Category } from '@/types/category';
import { Product, ProductTopping } from '@/types/product';
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

  // View Mode: 'grid' (dạng lưới) or 'list' (dạng danh sách)
  const [menuView, setMenuView] = useState<'grid' | 'list'>(() => {
    try {
      return (localStorage.getItem('hoangan_menu_view') as 'grid' | 'list') || 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleViewChange = (view: 'grid' | 'list') => {
    setMenuView(view);
    try {
      localStorage.setItem('hoangan_menu_view', view);
    } catch {}
  };

  // State for Topping Popup Modal
  const [selectedProductForTopping, setSelectedProductForTopping] = useState<Product | null>(null);
  const [chosenToppings, setChosenToppings] = useState<ProductTopping[]>([]);
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemNote, setItemNote] = useState<string>('');

  const handleProductAddClick = (product: Product) => {
    if (!product.is_available) return;
    if (product.toppings && product.toppings.length > 0) {
      setSelectedProductForTopping(product);
      setChosenToppings([]);
      setItemQuantity(1);
      setItemNote('');
    } else {
      addItem(product, 1);
    }
  };

  const toggleTopping = (topping: ProductTopping) => {
    setChosenToppings((prev) => {
      const exists = prev.some((t) => t.name === topping.name);
      if (exists) {
        return prev.filter((t) => t.name !== topping.name);
      }
      return [...prev, topping];
    });
  };

  const handleConfirmAddTopping = () => {
    if (!selectedProductForTopping) return;
    addItem(
      selectedProductForTopping,
      itemQuantity,
      itemNote.trim() || undefined,
      chosenToppings
    );
    setSelectedProductForTopping(null);
  };

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

          {/* Search bar & View Toggle */}
          <div className="max-w-xl mx-auto pt-2.5 flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm món ăn, trà sữa, cafe..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full bg-[#fcf9f5] text-stone-800 text-xs sm:text-sm rounded-xl pl-10 pr-9 py-2.5 border border-[#e8ded2] shadow-2xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => setKeyword('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div
              role="group"
              aria-label="Kiểu hiển thị thực đơn"
              className="inline-flex shrink-0 gap-1 rounded-xl border border-[#e8ded2] bg-[#fcf9f5] p-1 shadow-2xs"
            >
              <button
                type="button"
                onClick={() => handleViewChange('grid')}
                className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 sm:px-3 text-xs font-bold transition-all active:scale-95 ${
                  menuView === 'grid'
                    ? 'bg-amber-700 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-[#f5ede4]'
                }`}
                title="Dạng lưới"
                aria-pressed={menuView === 'grid'}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Dạng lưới</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewChange('list')}
                className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 sm:px-3 text-xs font-bold transition-all active:scale-95 ${
                  menuView === 'list'
                    ? 'bg-amber-700 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-[#f5ede4]'
                }`}
                title="Dạng danh sách"
                aria-pressed={menuView === 'list'}
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Dạng danh sách</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter Pills - Hiển thị tất cả danh mục, tự động xuống dòng trên mobile để khách không phải lướt */}
      <div className="bg-[#fffdfa]/95 backdrop-blur border-b border-[#ede4d8] sticky top-14 z-20 px-4 py-3 shadow-2xs">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedCatId(null)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
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
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
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
          <>
            <div className="flex items-center justify-between mb-3 px-0.5">
              <span className="text-xs sm:text-sm font-semibold text-stone-500">
                {filteredProducts.length} món
              </span>
            </div>

            {menuView === 'grid' ? (
              /* Dạng lưới (Grid View) - Thẻ dọc nhiều cột */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {filteredProducts.map((product) => {
                  const qty = getItemQuantity(product.id);
                  const isOutOfStock = !product.is_available;
                  const hasToppings = Boolean(product.toppings && product.toppings.length > 0);

                  return (
                    <div
                      key={product.id}
                      className={`group bg-white rounded-2xl p-2.5 sm:p-3 border border-[#ede4d8] shadow-2xs flex flex-col justify-between transition-all ${
                        isOutOfStock ? 'opacity-70 bg-[#faf6f0]/70' : 'hover:shadow-md hover:border-amber-300'
                      }`}
                    >
                      <div>
                        {/* Ảnh vuông phía trên */}
                        <div
                          onClick={() => !isOutOfStock && handleProductAddClick(product)}
                          className={`w-full aspect-square rounded-xl overflow-hidden bg-[#faf6f0] relative border border-[#f0e6da] ${
                            !isOutOfStock ? 'cursor-pointer' : ''
                          }`}
                        >
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                                isOutOfStock ? 'grayscale contrast-75' : ''
                              }`}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-amber-700/50">
                              <Coffee className="w-9 h-9" />
                            </div>
                          )}
                          {isOutOfStock && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <span className="text-[10px] sm:text-xs font-bold text-white bg-rose-600 px-2 py-0.5 rounded shadow">
                                Tạm hết
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Tiêu đề & Badge Topping */}
                        <div className="pt-2">
                          <h3
                            onClick={() => !isOutOfStock && handleProductAddClick(product)}
                            className={`font-bold text-xs sm:text-sm text-stone-900 line-clamp-2 leading-snug ${
                              !isOutOfStock ? 'cursor-pointer hover:text-amber-800' : ''
                            }`}
                            title={product.name}
                          >
                            {product.name}
                          </h3>

                          {hasToppings && (
                            <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 mt-1">
                              ✨ Có {product.toppings!.length} topping tùy chọn
                            </span>
                          )}

                          {product.description && (
                            <p className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Giá & Nút hành động */}
                      <div className="mt-2.5 pt-1.5 border-t border-[#f4ece3] flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          {isOutOfStock ? (
                            <span className="text-xs font-semibold text-rose-600">Đã hết</span>
                          ) : (
                            <span className="text-xs sm:text-sm font-black text-amber-800">
                              {formatCurrency(product.price)}
                            </span>
                          )}
                        </div>

                        <div>
                          {isOutOfStock ? (
                            <button
                              disabled
                              className="w-full py-1.5 bg-stone-100 text-stone-400 text-xs font-semibold rounded-xl cursor-not-allowed border border-stone-200"
                            >
                              Tạm hết
                            </button>
                          ) : hasToppings ? (
                            <button
                              type="button"
                              onClick={() => handleProductAddClick(product)}
                              className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs shadow-amber-600/20 active:scale-95 flex items-center justify-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tùy chọn</span>
                              {qty > 0 && (
                                <span className="ml-0.5 bg-white/25 px-1.5 py-0.2 rounded-full text-[10px]">
                                  ({qty})
                                </span>
                              )}
                            </button>
                          ) : qty > 0 ? (
                            <div className="flex items-center justify-between bg-amber-50/80 border border-amber-200/90 rounded-xl p-0.5">
                              <button
                                type="button"
                                onClick={() => updateQuantity(product.id, qty - 1)}
                                className="w-6 h-6 rounded-lg bg-white text-amber-900 flex items-center justify-center shadow-2xs hover:bg-stone-50 active:scale-95"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold text-amber-900 min-w-[16px] text-center">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(product.id, qty + 1)}
                                className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-2xs hover:bg-amber-700 active:scale-95"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleProductAddClick(product)}
                              className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs shadow-amber-600/20 active:scale-95 flex items-center justify-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Thêm</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Dạng danh sách (List View) - Hàng ngang */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredProducts.map((product) => {
                  const qty = getItemQuantity(product.id);
                  const isOutOfStock = !product.is_available;
                  const hasToppings = Boolean(product.toppings && product.toppings.length > 0);

                  return (
                    <div
                      key={product.id}
                      className={`bg-white rounded-2xl p-3 border border-[#ede4d8] shadow-2xs flex items-center space-x-3 transition-all ${
                        isOutOfStock ? 'opacity-70 bg-[#faf6f0]/70' : 'hover:shadow-md hover:border-amber-300'
                      }`}
                    >
                      <div
                        onClick={() => !isOutOfStock && handleProductAddClick(product)}
                        className={`w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-[#faf6f0] flex-shrink-0 relative border border-[#f0e6da] ${
                          !isOutOfStock ? 'cursor-pointer' : ''
                        }`}
                      >
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
                        <h3
                          onClick={() => !isOutOfStock && handleProductAddClick(product)}
                          className={`font-bold text-sm text-stone-900 truncate ${
                            !isOutOfStock ? 'cursor-pointer hover:text-amber-800' : ''
                          }`}
                        >
                          {product.name}
                        </h3>

                        {hasToppings && (
                          <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 mt-1">
                            ✨ Có {product.toppings!.length} topping tùy chọn
                          </span>
                        )}

                        {product.description && (
                          <p className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">
                            {product.description}
                          </p>
                        )}

                        <div className="mt-2 flex items-center justify-between">
                          {isOutOfStock ? (
                            <p className="text-xs font-semibold text-rose-600">Đã hết</p>
                          ) : (
                            <p className="text-sm font-black text-amber-800">
                              {formatCurrency(product.price)}
                            </p>
                          )}

                          <div className="flex items-center">
                            {isOutOfStock ? (
                              <button
                                disabled
                                className="px-4 py-1.5 bg-stone-100 text-stone-400 text-xs font-semibold rounded-lg cursor-not-allowed border border-stone-200"
                              >
                                Thêm
                              </button>
                            ) : hasToppings ? (
                              <button
                                type="button"
                                onClick={() => handleProductAddClick(product)}
                                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs shadow-amber-600/20 active:scale-95 flex items-center space-x-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Tùy chọn</span>
                                {qty > 0 && (
                                  <span className="ml-1 bg-white/20 px-1.5 py-0.2 rounded-full text-[10px]">
                                    ({qty})
                                  </span>
                                )}
                              </button>
                            ) : qty > 0 ? (
                              <div className="flex items-center space-x-2 bg-amber-50/80 border border-amber-200/90 rounded-lg p-0.5">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(product.id, qty - 1)}
                                  className="w-6 h-6 rounded bg-white text-amber-900 flex items-center justify-center shadow-2xs hover:bg-stone-50 active:scale-95"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-xs font-bold text-amber-900 min-w-[18px] text-center">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(product.id, qty + 1)}
                                  className="w-6 h-6 rounded bg-amber-600 text-white flex items-center justify-center shadow-2xs hover:bg-amber-700 active:scale-95"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleProductAddClick(product)}
                                className="px-4 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 active:scale-95 transition-all shadow-xs shadow-amber-600/20 flex items-center space-x-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Thêm</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <Footer className="pb-24 sm:pb-10" />

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
                    {items.map((item) => {
                      const toppingExtra = (item.selectedToppings || []).reduce(
                        (sum, t) => sum + Number(t.price || 0),
                        0
                      );
                      const itemLineTotal = (Number(item.product.price) + toppingExtra) * item.quantity;

                      return (
                        <div
                          key={item.cart_id || item.product.id}
                          className="flex items-center justify-between pb-3 border-b border-stone-100"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold text-sm text-stone-900 truncate">
                              {item.product.name}
                            </p>
                            {item.selectedToppings && item.selectedToppings.length > 0 && (
                              <p className="text-[11px] text-amber-700 mt-0.5 line-clamp-1">
                                + {item.selectedToppings.map((t) => t.name).join(', ')}
                              </p>
                            )}
                            {item.note && (
                              <p className="text-[11px] text-stone-400 italic mt-0.5">
                                Ghi chú: {item.note}
                              </p>
                            )}
                            <p className="text-xs text-amber-800 font-bold mt-0.5">
                              {formatCurrency(itemLineTotal)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1.5 shrink-0">
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
                      );
                    })}
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

      {/* 5. Topping Selection Modal */}
      {selectedProductForTopping && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedProductForTopping(null)}
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          />

          <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh] z-10 font-sans border border-[#ede4d8]">
            {/* Header */}
            <div className="p-4 border-b border-[#ebdcd0] flex items-start justify-between bg-[#fffdfa]">
              <div className="min-w-0 pr-3">
                <h3 className="text-base font-black text-stone-900 truncate">
                  {selectedProductForTopping.name}
                </h3>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-sm font-extrabold text-amber-800">
                    {formatCurrency(selectedProductForTopping.price)}
                  </span>
                  {selectedProductForTopping.category_name && (
                    <span className="text-[10px] text-amber-900 font-semibold px-2 py-0.5 bg-amber-100/70 rounded-full">
                      {selectedProductForTopping.category_name}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProductForTopping(null)}
                className="p-1.5 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedProductForTopping.description && (
                <p className="text-xs text-stone-600 italic bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/70">
                  {selectedProductForTopping.description}
                </p>
              )}

              {/* Topping List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                    Chọn Topping thêm
                  </span>
                  <span className="text-[11px] text-stone-400 font-medium">
                    (Có thể chọn nhiều)
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedProductForTopping.toppings?.map((top, idx) => {
                    const isChecked = chosenToppings.some((t) => t.name === top.name);
                    return (
                      <label
                        key={idx}
                        className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-amber-50/90 border-amber-500 shadow-xs ring-1 ring-amber-500/20'
                            : 'bg-white border-[#e8ded2] hover:bg-[#faf7f2]'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleTopping(top)}
                            className="w-4 h-4 rounded text-amber-700 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                          />
                          <span
                            className={`text-xs font-bold ${
                              isChecked ? 'text-amber-950' : 'text-stone-700'
                            }`}
                          >
                            {top.name}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-amber-800">
                          +{formatCurrency(top.price)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Ghi chú riêng cho món này */}
              <div className="space-y-1.5 pt-2 border-t border-stone-100">
                <label className="text-xs font-bold text-stone-700 block">
                  Ghi chú riêng cho món này (tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: ít đường, nhiều đá, không topping..."
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  className="w-full bg-[#fcf9f5] border border-[#e8ded2] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              {/* Số lượng */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                <span className="text-xs font-bold text-stone-700">Số lượng phần:</span>
                <div className="flex items-center bg-amber-50/70 border border-amber-200/80 rounded-xl p-1 space-x-2">
                  <button
                    type="button"
                    onClick={() => setItemQuantity((prev) => Math.max(1, prev - 1))}
                    className="w-7 h-7 rounded-lg bg-white text-stone-700 flex items-center justify-center shadow-2xs font-bold active:scale-95 hover:bg-stone-50"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-bold text-amber-950 min-w-[24px] text-center">
                    {itemQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setItemQuantity((prev) => prev + 1)}
                    className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-2xs font-bold active:scale-95 hover:bg-amber-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Button */}
            <div className="p-4 border-t border-[#ebdcd0] bg-[#fffdfa]">
              <button
                type="button"
                onClick={handleConfirmAddTopping}
                className="w-full py-3 bg-amber-700 hover:bg-amber-800 text-white rounded-2xl text-xs font-bold shadow-md shadow-amber-900/20 transition-all flex items-center justify-between px-5 active:scale-98"
              >
                <span>Thêm vào giỏ</span>
                <span className="text-sm font-black">
                  {formatCurrency(
                    (Number(selectedProductForTopping.price) +
                      chosenToppings.reduce((s, t) => s + Number(t.price || 0), 0)) *
                      itemQuantity
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
