import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Plus,
  Minus,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Utensils,
  Bell,
  Clock,
  Receipt,
  Trash2,
  ArrowRight,
  LayoutGrid,
  List,
} from 'lucide-react';
import { tableApi } from '@/api/table.api';
import { orderApi } from '@/api/order.api';
import { TableLanding } from '@/types/table';
import { Product, ProductTopping } from '@/types/product';
import { Order } from '@/types/order';
import { Footer } from '@/components/Footer';
import { useCart } from '@/contexts/CartContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency, formatDateTime, formatTimeAgo } from '@/utils/format';

export const TableLandingPage: React.FC = () => {
  const params = useParams<{ qrToken?: string; token?: string }>();
  const activeToken = params.qrToken || params.token;
  const navigate = useNavigate();

  const [landing, setLanding] = useState<TableLanding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isOrdersHistoryOpen, setIsOrdersHistoryOpen] = useState(false);

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

  // Guest order inputs
  const [customerName, setCustomerName] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);

  // Call staff states
  const [isCallingStaff, setIsCallingStaff] = useState(false);
  const [callStaffSuccess, setCallStaffSuccess] = useState(false);

  // Table active orders history
  const [tableOrders, setTableOrders] = useState<Order[]>([]);
  const [loadingTableOrders, setLoadingTableOrders] = useState(false);

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

  const { items, addItem, updateQuantity, removeItem, clearCart, totalCount, totalPrice, toOrderItems } =
    useCart();
  const { subscribe, sendMessage, playOrderNotificationSound } = useWebSocket();
  const { showToast, showAlertModal } = useToast();

  const categoryRefs = useRef<Record<number, HTMLElement | null>>({});
  const headerRef = useRef<HTMLElement | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);
  const [headerH, setHeaderH] = useState(108);

  // Measure dynamic sticky header height
  useEffect(() => {
    const measure = () => {
      if (headerRef.current) {
        setHeaderH(headerRef.current.offsetHeight);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [landing]);

  // 1. Fetch table landing data
  useEffect(() => {
    if (!activeToken) return;

    // Lưu lại URL bàn hiện tại để khi xem tiến độ đơn / đơn hàng quay về đúng bàn này
    localStorage.setItem('hoangan_last_table_path', window.location.pathname);

    setLoading(true);
    tableApi
      .getTableLanding(activeToken)
      .then((res) => {
        setLanding(res.data);
        if (res.data.categories?.length > 0) {
          setSelectedCategoryId(res.data.categories[0].id);
        }
      })
      .catch((err) => {
        const msg = err.response?.data?.message || 'Không tìm thấy bàn hoặc mã QR không hợp lệ!';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [activeToken]);

  // 2. Real-time Product Availability & Order status listener
  useEffect(() => {
    const unsubscribe = subscribe((payload) => {
      if (payload.action === 'PRODUCT_AVAILABILITY_CHANGED') {
        const ev = payload as unknown as {
          productId?: number;
          isAvailable?: boolean;
          productName?: string;
          data?: { productId?: number; isAvailable?: boolean; productName?: string };
        };
        const prodId = ev.data?.productId ?? ev.productId;
        const isAvail = ev.data?.isAvailable ?? ev.isAvailable;
        const prodName = ev.data?.productName ?? ev.productName;

        if (prodId !== undefined && isAvail !== undefined) {
          setLanding((prev) => {
            if (!prev) return prev;
            const updatedProducts = prev.products.map((p) =>
              p.id === prodId ? { ...p, is_available: isAvail } : p
            );
            return { ...prev, products: updatedProducts };
          });

          // Nếu món vừa chuyển sang hết hàng và đang nằm trong giỏ của khách:
          if (!isAvail) {
            const inCart = items.find((i) => i.product.id === prodId);
            if (inCart) {
              removeItem(prodId, inCart.cart_id);
              showToast(
                `Món "${prodName || inCart.product.name}" hiện đã hết hàng và đã được tự động bỏ khỏi giỏ món.`,
                'warning',
                'Món tạm hết'
              );
            }
          }
        }
      } else if (payload.action === 'ORDER_STATUS_CHANGED' || payload.action === 'NEW_ORDER') {
        // Refresh table orders if drawer is open
        if (landing?.table?.id) {
          loadTableOrders(landing.table.id);
        }
      }
    });

    return unsubscribe;
  }, [subscribe, landing, items, removeItem]);

  // Load orders that have been placed for this table (chỉ tải các đơn thuộc phiên/lượt ngồi hiện tại)
  const loadTableOrders = async (tableId: number) => {
    try {
      setLoadingTableOrders(true);
      // Retrieve stored order codes for this table from localStorage
      const storageKey = `hoangan_orders_table_${tableId}`;
      const savedCodes: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');

      if (savedCodes.length === 0) {
        setTableOrders([]);
        return;
      }

      // Fetch details for each order code
      const orderPromises = savedCodes.map((code) =>
        orderApi.trackOrder(code).then((r) => r.data).catch(() => null)
      );
      const results = await Promise.all(orderPromises);
      const validOrders = results.filter((o): o is Order => o !== null);

      // Lọc các đơn thuộc lượt ngồi hiện tại:
      // 1. Đơn đang xử lý: PENDING hoặc PREPARING
      // 2. Đơn đã hoàn thành hoặc đã hủy nhưng đặt trong vòng 3 tiếng hôm nay
      const now = Date.now();
      const todayStr = new Date().toDateString();

      const activeOrders = validOrders.filter((ord) => {
        if (ord.status === 'PENDING' || ord.status === 'PREPARING') {
          return true;
        }
        if (ord.created_at) {
          const orderDate = new Date(ord.created_at);
          const isToday = orderDate.toDateString() === todayStr;
          const diffHours = (now - orderDate.getTime()) / (1000 * 60 * 60);
          return isToday && diffHours < 3;
        }
        return false;
      });

      // Tự động dọn dẹp các mã đơn cũ từ các ngày trước khỏi localStorage
      const cleanCodes = activeOrders.map((o) => o.order_code);
      localStorage.setItem(storageKey, JSON.stringify(cleanCodes));

      setTableOrders(activeOrders);
    } catch {
      // ignore
    } finally {
      setLoadingTableOrders(false);
    }
  };

  // Scroll to category smoothly with exact offset so section title and products are never hidden
  const scrollToCategory = (catId: number) => {
    setSelectedCategoryId(catId);
    const targetElement = categoryRefs.current[catId];
    if (!targetElement) return;

    const headerHeight = headerRef.current ? headerRef.current.offsetHeight : headerH;
    const asideHeight = asideRef.current ? asideRef.current.offsetHeight : 0;
    const isMobile = window.innerWidth < 768;
    // On mobile, both header and category pills are sticky at top
    // On desktop, category navigation is a sidebar on the left, so only header is sticky
    const totalOffset = isMobile ? (headerHeight + asideHeight + 12) : (headerHeight + 20);

    const elementTop = targetElement.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: Math.max(0, elementTop - totalOffset),
      behavior: 'smooth',
    });
  };

  // Group products by category
  const groupedProducts = useMemo(() => {
    if (!landing) return [];

    const filtered = (landing.products || []).filter((p) => {
      if (!searchKeyword.trim()) return true;
      return (
        p.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    });

    const grouped = (landing.categories || [])
      .map((cat) => ({
        category: cat,
        products: filtered.filter((p) => p.category_id === cat.id),
      }))
      .filter((group) => group.products.length > 0);

    // Fallback: Nếu món ăn chưa phân loại hoặc quán chưa tạo danh mục thì vẫn hiển thị đầy đủ
    const categorizedProductIds = new Set(grouped.flatMap((g) => g.products.map((p) => p.id)));
    const uncategorizedProducts = filtered.filter((p) => !categorizedProductIds.has(p.id));

    if (uncategorizedProducts.length > 0) {
      grouped.unshift({
        category: { id: 0, name: 'Tất cả món ăn', display_order: 0, is_active: true, created_at: '' },
        products: uncategorizedProducts,
      });
    }

    return grouped;
  }, [landing, searchKeyword]);

  // Sync active category pill when scrolling
  useEffect(() => {
    if (groupedProducts.length === 0) return;

    const handleScroll = () => {
      const headerHeight = headerRef.current ? headerRef.current.offsetHeight : 108;
      const asideHeight = asideRef.current ? asideRef.current.offsetHeight : 0;
      const isMobile = window.innerWidth < 768;
      const topOffset = isMobile ? (headerHeight + asideHeight + 40) : (headerHeight + 50);

      for (const group of groupedProducts) {
        const el = categoryRefs.current[group.category.id];
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= topOffset && rect.bottom > topOffset) {
            setSelectedCategoryId(group.category.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [groupedProducts]);

  // Handle Order Submit
  const handleConfirmOrder = async () => {
    if (!landing?.table?.id || items.length === 0) return;

    try {
      setIsSubmitting(true);
      const res = await orderApi.createOrder({
        order_type: 'AT_TABLE',
        table_id: landing.table.id,
        qr_token: activeToken,
        customer_name: customerName.trim() || undefined,
        note: orderNote.trim() || undefined,
        items: toOrderItems(),
      });

      // Save order code to localStorage for guest tracking
      const storageKey = `hoangan_orders_table_${landing.table.id}`;
      const savedCodes: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!savedCodes.includes(res.data.order_code)) {
        savedCodes.unshift(res.data.order_code);
        localStorage.setItem(storageKey, JSON.stringify(savedCodes.slice(0, 20)));
      }

      setLastCreatedOrder(res.data);
      playOrderNotificationSound();
      clearCart();
      setIsDrawerOpen(false);
      setCustomerName('');
      setOrderNote('');
    } catch (err: unknown) {
      const errorObj = err as {
        response?: {
          data?: {
            message?: string;
            data?: { code?: string; message?: string };
          };
        };
      };
      const code = errorObj.response?.data?.data?.code;
      const detailedMsg =
        errorObj.response?.data?.data?.message ||
        errorObj.response?.data?.message ||
        'Có lỗi xảy ra khi gửi yêu cầu gọi món. Vui lòng thử lại!';

      // Kiểm tra nếu lỗi do món hết hàng hoặc không khả dụng
      const isUnavailable =
        code === 'org.oplearn.project.exception.ProductUnavailableException' ||
        detailedMsg.includes('tạm hết') ||
        detailedMsg.includes('hết hàng') ||
        detailedMsg.includes('ngưng phục vụ') ||
        detailedMsg.toLowerCase().includes('out of stock') ||
        detailedMsg.toLowerCase().includes('unavailable');

      if (isUnavailable) {
        // Cập nhật lại landing để lấy danh sách món mới nhất
        if (activeToken) {
          try {
            const freshLanding = await tableApi.getTableLanding(activeToken);
            if (freshLanding.data) {
              setLanding(freshLanding.data);
              const unavailableItems = items.filter((cartItem) => {
                const freshProduct = freshLanding.data.products.find((p) => p.id === cartItem.product.id);
                return freshProduct && !freshProduct.is_available;
              });

              if (unavailableItems.length > 0) {
                unavailableItems.forEach((unItem) => {
                  removeItem(unItem.product.id, unItem.cart_id);
                });
                showAlertModal({
                  title: 'Món đã tạm hết',
                  message: `${detailedMsg}. Hệ thống đã tự động bỏ món đã hết ra khỏi yêu cầu gọi món giúp bạn.`,
                  type: 'warning',
                  confirmText: 'Đã hiểu',
                });
                return;
              }
            }
          } catch {
            // ignore
          }
        }

        // Fallback: lọc theo tên món
        items.forEach((item) => {
          if (detailedMsg.includes(item.product.name)) {
            removeItem(item.product.id, item.cart_id);
          }
        });
        showAlertModal({
          title: 'Món đã tạm hết',
          message: `${detailedMsg}. Hệ thống đã tự động bỏ món đã hết ra khỏi yêu cầu gọi món giúp bạn.`,
          type: 'warning',
          confirmText: 'Đã hiểu',
        });
      } else {
        showAlertModal({
          title: 'Thông báo đơn hàng',
          message: detailedMsg,
          type: 'error',
          confirmText: 'Đóng',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const tableDisplayName = landing?.table
    ? (landing.table.zone?.trim()
        ? `${landing.table.location_name} - ${landing.table.zone.trim()}`
        : landing.table.location_name)
    : '';

  // Handle "Gọi nhân viên" (Call Staff)
  const handleCallStaff = () => {
    if (!landing?.table) return;
    setIsCallingStaff(true);
    sendMessage({
      action: 'CALL_STAFF',
      tableName: landing.table.location_name,
      zone: landing.table.zone,
      tableId: landing.table.id,
      message: `${tableDisplayName} đang gọi nhân viên!`,
    });
    setCallStaffSuccess(true);
    setTimeout(() => {
      setIsCallingStaff(false);
      setCallStaffSuccess(false);
    }, 4000);
  };

  // Get item quantity in cart
  const getItemQuantity = (productId: number): number => {
    const item = items.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
        <p className="text-slate-600 text-sm font-semibold">Đang mở menu Hoàng An Coffee...</p>
      </div>
    );
  }

  if (error || !landing) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Không thể tải thực đơn</h2>
        <p className="text-slate-500 text-sm max-w-sm mb-6">{error || 'Bàn không tồn tại hoặc đã ngừng phục vụ.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 pb-28 md:pb-24 font-sans">
      {/* 1. Header (Sticky Top Bar - Phù hợp cả Mobile và Desktop) */}
      <header ref={headerRef} className="sticky top-0 z-20 border-b border-[#ebdcd0] bg-[#fffdfa]/95 backdrop-blur px-4 py-3 md:px-6 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Brand & Subtitle */}
          <div className="min-w-0">
            <h1 className="truncate text-base md:text-xl font-black text-stone-950 tracking-tight">
              Hoàng An Coffee & Billiard
            </h1>
            <p className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-amber-800">
              Menu gọi món
            </p>
          </div>

          {/* Quick Actions & Table Badge */}
          <div className="flex items-center space-x-2">
            {/* Nút Gọi nhân viên */}
            <button
              onClick={handleCallStaff}
              disabled={isCallingStaff}
              title="Nhấn để gọi nhân viên hỗ trợ tại bàn"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                callStaffSuccess
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-amber-50 text-amber-800 border-amber-200/90 hover:bg-amber-100 active:scale-95'
              }`}
            >
              <Bell className={`w-3.5 h-3.5 ${isCallingStaff ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {callStaffSuccess ? 'Đã gọi nhân viên' : 'Gọi nhân viên'}
              </span>
            </button>

            {/* Nút Xem đơn bàn này */}
            <button
              onClick={() => {
                if (landing.table?.id) loadTableOrders(landing.table.id);
                setIsOrdersHistoryOpen(true);
              }}
              title="Xem các món đã gọi tại bàn này"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#f5ede4] text-stone-700 hover:bg-[#ede1d3] border border-[#e8ded2] transition-all"
            >
              <Receipt className="w-3.5 h-3.5 text-amber-800" />
              <span className="hidden sm:inline">Đơn bàn này</span>
            </button>

            {/* Table Badge */}
            <div className="shrink-0 pl-1 text-right">
              <span className="inline-block px-3 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/90 font-black text-sm md:text-base">
                {tableDisplayName}
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar & View Mode Toggle */}
        <div className="max-w-7xl mx-auto mt-2.5 flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm món ăn, thức uống..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full bg-[#fcf9f5] text-xs md:text-sm rounded-xl pl-9 pr-9 py-2 text-stone-900 placeholder-stone-400 border border-[#e8ded2] focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="Kiểu hiển thị thực đơn"
            className="inline-flex shrink-0 gap-1 rounded-xl border border-[#e8ded2] bg-[#fcf9f5] p-1 shadow-2xs"
          >
            <button
              type="button"
              onClick={() => handleViewChange('grid')}
              className={`flex h-8.5 items-center gap-1.5 rounded-lg px-2.5 sm:px-3 text-xs font-bold transition-all active:scale-95 ${
                menuView === 'grid'
                  ? 'bg-amber-700 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-[#f5ede4]'
              }`}
              title="Dạng lưới"
              aria-pressed={menuView === 'grid'}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dạng lưới</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewChange('list')}
              className={`flex h-8.5 items-center gap-1.5 rounded-lg px-2.5 sm:px-3 text-xs font-bold transition-all active:scale-95 ${
                menuView === 'list'
                  ? 'bg-amber-700 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-[#f5ede4]'
              }`}
              title="Dạng danh sách"
              aria-pressed={menuView === 'list'}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dạng danh sách</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Responsive Content Layout (Pill Navigation + Product Grid) */}
      <div className="px-3 pb-3 md:mx-auto md:grid md:max-w-7xl md:grid-cols-[200px_minmax(0,1fr)] md:gap-6 md:px-6 md:pt-5">
        {/* Category Navigation (Tự động xuống dòng trên mobile để khách thấy toàn bộ danh mục không phải lướt, Vertical sidebar trên desktop) */}
        <aside
          ref={asideRef}
          style={{ top: headerH ? `${headerH}px` : undefined }}
          className="sticky z-10 -mx-3 mb-4 border-b border-[#ede4d8] bg-[#fffdfa]/95 px-3 py-2.5 backdrop-blur md:!top-24 md:mx-0 md:mb-0 md:self-start md:rounded-2xl md:border md:border-[#ede4d8] md:p-3 md:shadow-2xs"
        >
          <div className="flex flex-wrap gap-2 md:flex-col md:overflow-visible">
            {landing.categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => scrollToCategory(cat.id)}
                  className={`rounded-full px-3.5 py-1.5 md:py-2 text-xs md:text-sm font-bold transition-all md:w-full md:rounded-xl md:text-left ${
                    isSelected
                      ? 'bg-amber-700 text-white shadow-xs'
                      : 'border border-[#e8ded2] bg-[#f5ede4] text-stone-700 hover:bg-[#ede1d3]'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Product Sections Grid */}
        <div className="min-w-0 space-y-6">
          {groupedProducts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm">
              <Utensils className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-700" />
              <p className="font-semibold text-stone-600">Không tìm thấy món ăn nào phù hợp</p>
              <p className="text-xs text-stone-400 mt-1">Vui lòng thử tìm với từ khóa khác</p>
            </div>
          ) : (
            groupedProducts.map(({ category, products }) => (
              <section
                key={category.id}
                data-cat-id={category.id}
                ref={(el) => {
                  categoryRefs.current[category.id] = el;
                }}
                className="scroll-mt-64 md:scroll-mt-28"
              >
                {/* Section Header */}
                <div className="mb-3 flex items-end justify-between border-b border-[#ede4d8] pb-2">
                  <h2 className="text-base md:text-lg font-bold text-stone-900">
                    {category.name}
                  </h2>
                  <span className="text-xs font-semibold text-stone-500">
                    {products.length} món
                  </span>
                </div>

                {/* Products Display (Grid or List) */}
                {menuView === 'grid' ? (
                  <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                    {products.map((product) => {
                      const qty = getItemQuantity(product.id);
                      const isOutOfStock = !product.is_available;
                      const hasToppings = Boolean(product.toppings && product.toppings.length > 0);

                      return (
                        <div
                          key={product.id}
                          className={`flex gap-3 rounded-2xl border border-[#ede4d8] bg-white p-3 shadow-2xs transition-all hover:shadow-md hover:border-amber-300 ${
                            isOutOfStock ? 'opacity-60 bg-stone-50' : ''
                          }`}
                        >
                          {/* Thumbnail */}
                          <div
                            onClick={() => !isOutOfStock && handleProductAddClick(product)}
                            className={`h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#faf6f0] relative border border-[#f0e6da] ${
                              !isOutOfStock ? 'cursor-pointer' : ''
                            }`}
                          >
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.parentElement?.querySelector('.img-fallback');
                                  if (fallback) fallback.classList.remove('hidden');
                                }}
                                className={`h-full w-full object-cover ${
                                  isOutOfStock ? 'grayscale contrast-75' : ''
                                }`}
                              />
                            ) : null}
                            <div
                              className={`img-fallback flex h-full items-center justify-center text-amber-700/50 ${
                                product.image_url ? 'hidden' : ''
                              }`}
                            >
                              <Utensils className="w-8 h-8" />
                            </div>
                            {isOutOfStock && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white bg-rose-600 px-2 py-0.5 rounded shadow">
                                  Đã hết
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex min-w-0 flex-1 flex-col justify-between">
                            <div
                              onClick={() => !isOutOfStock && handleProductAddClick(product)}
                              className={!isOutOfStock ? 'cursor-pointer' : ''}
                            >
                              <div className="line-clamp-2 text-[15px] font-bold leading-snug text-stone-900">
                                {product.name}
                              </div>
                              {hasToppings && (
                                <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 mt-1">
                                  ✨ Có {product.toppings!.length} topping tùy chọn
                                </span>
                              )}
                              {product.description && (
                                <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">
                                  {product.description}
                                </p>
                              )}
                              {isOutOfStock ? (
                                <div className="mt-1 text-xs font-bold text-rose-600">Đã hết</div>
                              ) : (
                                <div className="mt-1 text-sm font-extrabold text-amber-800">
                                  {formatCurrency(product.price)}
                                </div>
                              )}
                            </div>

                            {/* Action Button / Stepper */}
                            <div className="mt-2.5">
                              {isOutOfStock ? (
                                <button
                                  disabled
                                  className="w-full py-1.5 bg-stone-100 text-stone-400 text-xs font-semibold rounded-xl cursor-not-allowed text-center border border-stone-200"
                                >
                                  Tạm hết
                                </button>
                              ) : hasToppings ? (
                                <button
                                  type="button"
                                  onClick={() => handleProductAddClick(product)}
                                  className="w-full py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition active:scale-95 text-center flex items-center justify-center space-x-1"
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
                                <div className="flex items-center justify-between rounded-xl border border-amber-200/90 bg-amber-50/80 px-2 py-1">
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(product.id, qty - 1)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-amber-900 shadow-2xs hover:bg-stone-50 active:scale-95 transition"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="text-xs font-bold text-amber-900 px-2">{qty}</span>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(product.id, qty + 1)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600 text-white shadow-2xs hover:bg-amber-700 active:scale-95 transition"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleProductAddClick(product)}
                                  className="w-full py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition active:scale-95 text-center flex items-center justify-center space-x-1"
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
                  <div className="grid gap-2.5 grid-cols-1 md:grid-cols-2">
                    {products.map((product) => {
                      const qty = getItemQuantity(product.id);
                      const isOutOfStock = !product.is_available;
                      const hasToppings = Boolean(product.toppings && product.toppings.length > 0);

                      return (
                        <div
                          key={product.id}
                          className={`flex gap-3 rounded-2xl border border-[#ede4d8] bg-white p-3 shadow-2xs transition-all hover:shadow-md hover:border-amber-300 items-center ${
                            isOutOfStock ? 'opacity-60 bg-stone-50' : ''
                          }`}
                        >
                          {/* Thumbnail */}
                          <div
                            onClick={() => !isOutOfStock && handleProductAddClick(product)}
                            className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#faf6f0] relative border border-[#f0e6da] ${
                              !isOutOfStock ? 'cursor-pointer' : ''
                            }`}
                          >
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.parentElement?.querySelector('.img-fallback');
                                  if (fallback) fallback.classList.remove('hidden');
                                }}
                                className={`h-full w-full object-cover ${
                                  isOutOfStock ? 'grayscale contrast-75' : ''
                                }`}
                              />
                            ) : null}
                            <div
                              className={`img-fallback flex h-full items-center justify-center text-amber-700/50 ${
                                product.image_url ? 'hidden' : ''
                              }`}
                            >
                              <Utensils className="w-7 h-7" />
                            </div>
                            {isOutOfStock && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white bg-rose-600 px-1.5 py-0.5 rounded shadow">
                                  Hết
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex min-w-0 flex-1 flex-col justify-between">
                            <div
                              onClick={() => !isOutOfStock && handleProductAddClick(product)}
                              className={!isOutOfStock ? 'cursor-pointer' : ''}
                            >
                              <div className="line-clamp-1 text-sm font-bold text-stone-900">
                                {product.name}
                              </div>
                              {hasToppings && (
                                <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 mt-0.5">
                                  ✨ Có {product.toppings!.length} topping tùy chọn
                                </span>
                              )}
                              {product.description && (
                                <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">
                                  {product.description}
                                </p>
                              )}
                            </div>

                            <div className="mt-2 flex items-center justify-between">
                              {isOutOfStock ? (
                                <span className="text-xs font-bold text-rose-600">Đã hết</span>
                              ) : (
                                <span className="text-sm font-extrabold text-amber-800">
                                  {formatCurrency(product.price)}
                                </span>
                              )}

                              <div>
                                {isOutOfStock ? (
                                  <button
                                    disabled
                                    className="px-3 py-1 bg-stone-100 text-stone-400 text-xs font-semibold rounded-xl cursor-not-allowed border border-stone-200"
                                  >
                                    Hết
                                  </button>
                                ) : hasToppings ? (
                                  <button
                                    type="button"
                                    onClick={() => handleProductAddClick(product)}
                                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition active:scale-95 flex items-center space-x-1"
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
                                  <div className="flex items-center space-x-1.5 rounded-xl border border-amber-200/90 bg-amber-50/80 p-0.5">
                                    <button
                                      type="button"
                                      onClick={() => updateQuantity(product.id, qty - 1)}
                                      className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-amber-900 shadow-2xs hover:bg-stone-50 active:scale-95 transition"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="text-xs font-bold text-amber-900 px-1.5">{qty}</span>
                                    <button
                                      type="button"
                                      onClick={() => updateQuantity(product.id, qty + 1)}
                                      className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-600 text-white shadow-2xs hover:bg-amber-700 active:scale-95 transition"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleProductAddClick(product)}
                                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition active:scale-95 flex items-center space-x-1"
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
              </section>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <Footer className="pb-28" />

      {/* 3. Sticky Bottom Bar (Thanh giỏ hàng ghim đáy) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#ebdcd0] bg-[#fffdfa]/95 backdrop-blur p-3 shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-2 sm:px-4">
          <div>
            <div className="text-xs text-stone-500 font-medium">
              {totalCount} món đã chọn
            </div>
            <div className="truncate text-base md:text-lg font-black text-stone-950">
              Tổng: <span className="text-amber-800">{formatCurrency(totalPrice)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            disabled={totalCount === 0}
            className="flex items-center space-x-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white px-6 py-2.5 font-bold text-sm shadow-md shadow-amber-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Xem order ({totalCount})</span>
          </button>
        </div>
      </div>

      {/* 4. Modal Xem Order & Xác Nhận Đặt Món */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity"
          />

          <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl max-w-xl mx-auto w-full z-10 animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="p-4 border-b border-[#ebdcd0] flex items-center justify-between bg-[#fffdfa]">
              <div>
                <h3 className="font-black text-base text-stone-900">Yêu cầu gọi món</h3>
                <p className="text-xs text-amber-800 font-bold mt-0.5">
                  {tableDisplayName}
                </p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Inputs */}
              <div className="space-y-2.5">
                <input
                  type="text"
                  placeholder="Tên khách (không bắt buộc)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-[#fcf9f5] border border-[#e8ded2] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <textarea
                  rows={2}
                  placeholder="Ghi chú cho quầy & bếp (ví dụ: ít ngọt, nhiều đá, không hành...)"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  className="w-full resize-none text-xs sm:text-sm px-3.5 py-2.5 bg-[#fcf9f5] border border-[#e8ded2] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {/* Items List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Danh sách món ({items.length})
                  </span>
                  <button
                    onClick={clearCart}
                    className="text-xs text-rose-600 hover:underline font-semibold"
                  >
                    Xóa tất cả
                  </button>
                </div>

                {items.map((item, idx) => {
                  const toppingTotal = (item.selectedToppings || []).reduce(
                    (s, t) => s + Number(t.price || 0),
                    0
                  );
                  const itemLineTotal = (Number(item.product.price) + toppingTotal) * item.quantity;

                  return (
                    <div
                      key={item.cart_id || `${item.product.id}_${idx}`}
                      className="flex items-start justify-between py-2.5 border-b border-slate-100 last:border-b-0 gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-slate-900 truncate">
                          {item.product.name}
                        </div>
                        {item.selectedToppings && item.selectedToppings.length > 0 && (
                          <div className="text-[11px] text-amber-700 font-medium mt-0.5 space-y-0.5">
                            {item.selectedToppings.map((t, tIdx) => (
                              <div key={tIdx} className="flex items-center space-x-1">
                                <span className="text-amber-500">•</span>
                                <span>{t.name}</span>
                                <span className="text-slate-400 text-[10px]">
                                  (+{formatCurrency(t.price)})
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {item.note && (
                          <div className="text-[11px] text-slate-400 italic mt-0.5">
                            Ghi chú: {item.note}
                          </div>
                        )}
                        {item.product.toppings && item.product.toppings.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductForTopping(item.product);
                              setChosenToppings(item.selectedToppings || []);
                              setItemQuantity(item.quantity);
                              setItemNote(item.note || '');
                              removeItem(item.product.id, item.cart_id);
                            }}
                            className="text-[11px] text-blue-600 hover:underline font-bold inline-flex items-center space-x-1 mt-0.5"
                          >
                            <span>✏️ Tùy chọn / Đổi topping</span>
                          </button>
                        )}
                        <div className="text-xs font-bold text-amber-800 mt-1">
                          {formatCurrency(itemLineTotal)}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-0.5">
                        <div className="flex items-center bg-amber-50/80 border border-amber-200/90 rounded-lg p-0.5">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.cart_id)}
                            className="w-6 h-6 rounded bg-white text-amber-900 flex items-center justify-center shadow-2xs hover:bg-stone-50"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-amber-900 min-w-[20px] text-center">
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
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hủy món này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#ebdcd0] bg-[#fffdfa] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-600">Tổng thanh toán:</span>
                <span className="text-lg font-black text-amber-800">
                  {formatCurrency(totalPrice)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={isSubmitting || items.length === 0}
                className="w-full py-3 bg-amber-700 hover:bg-amber-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-900/20 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang gửi yêu cầu...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Gửi yêu cầu gọi món</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal Thông Báo Gửi Đơn Thành Công */}
      {lastCreatedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">Đã gửi yêu cầu gọi món!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Yêu cầu của bạn đã được chuyển tới quầy pha chế & bếp.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 text-left space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã đơn:</span>
                <span className="font-bold text-slate-800">#{lastCreatedOrder.order_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bàn:</span>
                <span className="font-bold text-amber-800">{tableDisplayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tổng tiền:</span>
                <span className="font-bold text-slate-900">{formatCurrency(lastCreatedOrder.total_amount)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="text-slate-500">Trạng thái:</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold text-[11px]">
                  Chờ nhân viên xác nhận
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  navigate(`/track/${lastCreatedOrder.order_code}`, {
                    state: { fromTableUrl: window.location.pathname, tableDisplayName },
                  });
                }}
                className="w-full py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-800/20 transition"
              >
                Xem tiến độ đơn này
              </button>
              <button
                type="button"
                onClick={() => setLastCreatedOrder(null)}
                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition"
              >
                Tiếp tục gọi món
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Drawer Xem Lịch Sử Đơn Đã Đặt Tại Bàn */}
      {isOrdersHistoryOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            onClick={() => setIsOrdersHistoryOpen(false)}
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
          />

          <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl max-w-xl mx-auto w-full z-10 animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-slate-900">Đơn đã gọi tại bàn</h3>
                <p className="text-xs text-amber-800 font-bold mt-0.5">
                  {tableDisplayName} • Lượt ngồi hiện tại
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {tableOrders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (landing?.table?.id) {
                        localStorage.removeItem(`hoangan_orders_table_${landing.table.id}`);
                        setTableOrders([]);
                      }
                    }}
                    className="text-[11px] font-semibold text-stone-400 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-stone-100 transition cursor-pointer"
                    title="Xóa danh sách đơn trên máy này để bắt đầu lượt mới"
                  >
                    Dọn đơn cũ
                  </button>
                )}
                <button
                  onClick={() => setIsOrdersHistoryOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {tableOrders.length > 0 && (
              <div className="px-4 py-2.5 bg-amber-50/70 border-b border-amber-100/80 flex items-center justify-between text-xs">
                <span className="text-stone-600 font-medium">
                  Tổng {tableOrders.length} đơn lượt này:
                </span>
                <span className="font-black text-amber-800 text-sm">
                  {formatCurrency(
                    tableOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
                  )}
                </span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingTableOrders ? (
                <div className="py-12 text-center text-slate-400">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2 text-blue-600" />
                  <p className="text-xs">Đang kiểm tra các đơn tại bàn...</p>
                </div>
              ) : tableOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Receipt className="w-12 h-12 mx-auto mb-2 opacity-30 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-600">Chưa có đơn nào được đặt từ thiết bị này</p>
                  <p className="text-xs text-slate-400 mt-1">Khi bạn gửi order, tiến độ món sẽ hiện tại đây.</p>
                </div>
              ) : (
                tableOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="rounded-2xl border border-stone-200 bg-[#fffdfa] p-3.5 space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-sm text-stone-900">
                          Đơn #{ord.order_code}
                        </div>
                        {ord.created_at && (
                          <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mt-1 font-medium">
                            <Clock className="w-3 h-3 text-stone-400 shrink-0" />
                            <span>{formatDateTime(ord.created_at)}</span>
                            <span className="text-stone-300">•</span>
                            <span className="text-amber-700 font-semibold">{formatTimeAgo(ord.created_at)}</span>
                          </div>
                        )}
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${
                          ord.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : ord.status === 'PREPARING'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : ord.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {ord.status === 'PENDING'
                          ? 'Chờ tiếp nhận'
                          : ord.status === 'PREPARING'
                          ? 'Đang chế biến'
                          : ord.status === 'COMPLETED'
                          ? 'Hoàn thành'
                          : ord.status === 'CANCELLED'
                          ? 'Đã hủy'
                          : ord.status}
                      </span>
                    </div>

                    <div className="divide-y divide-stone-100 text-xs">
                      {(ord.items || []).map((item) => (
                        <div key={item.id} className="py-1.5 flex justify-between">
                          <span className="text-stone-800">
                            {item.product_name} <strong className="text-amber-700">x{item.quantity}</strong>
                          </span>
                          <span className="font-semibold text-stone-700">
                            {formatCurrency(item.subtotal || Number(item.unit_price) * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-stone-500 font-medium">Tổng tiền: </span>
                        <span className="text-sm font-black text-amber-800">
                          {formatCurrency(ord.total_amount)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOrdersHistoryOpen(false);
                          navigate(`/track/${ord.order_code}`, {
                            state: { fromTableUrl: window.location.pathname, tableDisplayName },
                          });
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition"
                      >
                        Xem tiến độ
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-stone-200 bg-[#fffdfa]">
              <button
                type="button"
                onClick={() => setIsOrdersHistoryOpen(false)}
                className="w-full py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Topping Customization Popup Modal */}
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
                  placeholder="Ví dụ: ít ngọt, nhiều đá, đá riêng..."
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
                <span>Thêm vào đơn</span>
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
