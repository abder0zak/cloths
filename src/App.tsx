import React, { useState, useEffect } from 'react';
import { Product, CartItem, User, Notification, DashboardStats } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import AuthModal from './components/AuthModal';
import Dashboard from './components/Dashboard';
import ContactForm from './components/ContactForm';
import PrivacyPolicy from './components/PrivacyPolicy';
import BrandStory from './components/BrandStory';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, ArrowUpDown, Filter, X, ShoppingBag, Eye, Star,
  ShieldCheck, HelpCircle, RefreshCw, Sparkles, MessageCircle, ArrowRight
} from 'lucide-react';

export default function App() {
  // Navigation & Views
  const [activeView, setActiveView] = useState<string>('shop');
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Authentication Session
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

  // Shop & Product Catalog
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Filters State
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('Newest Arrivals');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState<boolean>(false);

  // Real-time WebSockets & Telemetry State
  const [stats, setStats] = useState<DashboardStats>({
    activeShoppers: 14,
    totalSalesToday: 3120,
    ordersProcessed: 8,
    stockAlerts: 1
  });
  const [eventsLog, setEventsLog] = useState<Array<{ message: string; timestamp: string }>>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toastMessage, setToastMessage] = useState<{ title: string; body: string } | null>(null);

  // Fetch Products catalog
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Error loading catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Initial Session, Products, and Theme
  useEffect(() => {
    // Sync Dark Mode state
    const savedTheme = localStorage.getItem('ethos_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    fetchProducts();

    // Verify Session Token
    const verifySession = async () => {
      const token = localStorage.getItem('ethos_session_token');
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
          } else {
            // Expired/Invalid token
            localStorage.removeItem('ethos_session_token');
          }
        } catch (err) {
          console.error('Failed to verify session:', err);
        }
      }
    };
    verifySession();
  }, []);

  // Set up WebSocket communication channel
  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}`;
    let socket: WebSocket;

    const connectWebSocket = () => {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('[WebSocket] Connection established on port 3000');
        setEventsLog(prev => [
          { message: 'Live WebSocket pipeline connected. Secured channel authenticated.', timestamp: new Date().toLocaleTimeString() },
          ...prev
        ]);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { type, payload } = data;

          switch (type) {
            case 'STATS_UPDATE':
              setStats(payload);
              break;
            case 'EVENT_FEED':
              setEventsLog(prev => [
                { message: payload.message, timestamp: payload.timestamp },
                ...prev
              ]);
              break;
            case 'ORDER_PLACED':
              // Alert trigger for purchase notifications
              setEventsLog(prev => [
                { message: `SECURE SALE: Client placed order ${payload.orderId} for an aggregate total of $${payload.total.toFixed(2)}.`, timestamp: new Date().toLocaleTimeString() },
                ...prev
              ]);
              // Trigger temporary screen toast alert
              setToastMessage({
                title: 'Boutique Acquisition',
                body: `An order for $${payload.total.toFixed(2)} was just secured through our payment gateway.`
              });
              // Auto remove toast
              setTimeout(() => setToastMessage(null), 5000);
              // Dispatch events to dashboard listener
              window.dispatchEvent(new Event('ORDER_PLACED_EVENT'));
              break;
            case 'ORDER_STATUS_CHANGED':
              // Trigger toast if order status updated
              if (user && payload.email.toLowerCase() === user.email.toLowerCase()) {
                setToastMessage({
                  title: 'Order Dispatched',
                  body: `Order #${payload.orderId} status updated to: ${payload.status.toUpperCase()}.`
                });
                setTimeout(() => setToastMessage(null), 6000);
                
                // Add live notification
                setNotifications(prev => [payload.notification, ...prev]);
              }
              window.dispatchEvent(new Event('ORDER_STATUS_UPDATED_EVENT'));
              break;
            case 'NOTIFICATION_ADD':
              setNotifications(prev => [payload, ...prev]);
              break;
            default:
              break;
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse message', err);
        }
      };

      socket.onclose = () => {
        console.log('[WebSocket] Disconnected. Reattempting in 5 seconds...');
        setTimeout(connectWebSocket, 5000);
      };
    };

    connectWebSocket();
    return () => {
      if (socket) socket.close();
    };
  }, [user]);

  // Handle dark mode toggle
  const handleToggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ethos_theme', 'light');
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ethos_theme', 'dark');
      setDarkMode(true);
    }
  };

  // Handle Authentication success
  const handleAuthSuccess = (token: string, userData: User) => {
    localStorage.setItem('ethos_session_token', token);
    setUser(userData);
    setAuthModalOpen(false);
    setNotifications(prev => [
      {
        id: 'notif-' + Math.random().toString(36).substr(2, 9),
        title: 'Secure Access Granted',
        message: `Welcome to your bespoke curation terminal, ${userData.name}. Session authenticated via custom JWT.`,
        type: 'security',
        createdAt: new Date().toISOString(),
        read: false
      },
      ...prev
    ]);
  };

  const handleLogout = () => {
    localStorage.removeItem('ethos_session_token');
    setUser(null);
    setNotifications([]);
  };

  const handleAddNotification = (message: string) => {
    setNotifications(prev => [
      {
        id: 'notif-' + Math.random().toString(36).substr(2, 9),
        title: 'System Dispatch',
        message,
        type: 'system',
        createdAt: new Date().toISOString(),
        read: false
      },
      ...prev
    ]);
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // Filter Catalog logic
  const clearAllFilters = () => {
    setSelectedColor(null);
    setSelectedSize(null);
    setSortBy('Newest Arrivals');
    setCurrentPage(1);
  };

  // Catalog Filters matching image palette exactly
  const colorsList = [
    { name: 'Obsidian', hex: '#000000' },
    { name: 'Ecru', hex: '#F5F5DC' },
    { name: 'Tobacco', hex: '#8B4513' },
    { name: 'Terracotta', hex: '#ad321c' },
    { name: 'Slate', hex: '#708090' },
    { name: 'Alabaster', hex: '#FFFFFF' }
  ];

  const sizesList = ['XS', 'S', 'M', 'L', 'XL'];

  // Apply filters & Sorting
  const filteredProducts = products.filter(product => {
    if (selectedColor && product.color !== selectedColor) {
      return false;
    }
    if (selectedSize && !product.sizes.includes(selectedSize)) {
      return false;
    }
    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'Price: Low to High') return a.price - b.price;
    if (sortBy === 'Price: High to Low') return b.price - a.price;
    // Default Curie matching order
    return a.id.localeCompare(b.id);
  });

  // Pagination bounds
  const ITEMS_PER_PAGE = 6;
  const totalPages = Math.ceil(sortedProducts.length / ITEMS_PER_PAGE) || 1;
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Cart operations
  const handleAddToCart = (product: Product, size: string, color: string) => {
    const existingIndex = cartItems.findIndex(
      item => item.product.id === product.id && item.selectedSize === size && item.selectedColor === color
    );

    if (existingIndex > -1) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += 1;
      setCartItems(updated);
    } else {
      setCartItems(prev => [...prev, { product, quantity: 1, selectedSize: size, selectedColor: color }]);
    }
    setCartOpen(true);
    setSelectedProduct(null); // Close quick drawer modal if open
  };

  const handleUpdateCartQuantity = (index: number, delta: number) => {
    const updated = [...cartItems];
    updated[index].quantity = Math.max(1, updated[index].quantity + delta);
    setCartItems(updated);
  };

  const handleRemoveCartItem = (index: number) => {
    setCartItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleOrderSuccess = () => {
    setCartItems([]);
    setCartOpen(false);
    setActiveView('dashboard');
    setToastMessage({
      title: 'Acquisition Confirmed',
      body: 'Your secure order has been routed and is currently being prepared.'
    });
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] dark:bg-[#090d1a] text-[#1b1c1c] dark:text-white font-sans flex flex-col transition-colors duration-300">
      
      {/* Top Level Nav bar */}
      <Header
        user={user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
        onOpenCart={() => setCartOpen(true)}
        activeView={activeView}
        onChangeView={setActiveView}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      {/* Main Dynamic View Layout */}
      <main className="flex-grow w-full max-w-[1440px] mx-auto px-5 md:px-16 py-12">
        <AnimatePresence mode="wait">
          
          {/* Shop/Catalog View */}
          {activeView === 'shop' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="space-y-16"
            >
              {/* Shop Banner Header */}
              <header className="mb-12 border-b border-[#eae8e7] dark:border-[#222222] pb-8">
                <div className="flex items-center text-[10px] uppercase tracking-widest text-[#747878] mb-4 gap-2">
                  <span>Home</span>
                  <ChevronRight size={10} />
                  <span className="text-black dark:text-white font-bold">Shop All</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-3">
                    <h1 className="font-display-lg text-4xl md:text-5xl lg:text-6xl text-black dark:text-white font-medium">The Current Edit</h1>
                    <p className="max-w-xl text-sm md:text-base text-[#444748] dark:text-[#a0a0a0] leading-relaxed">
                      A curated selection of timeless silhouettes and artisanal textures, designed for the modern effortless wardrobe.
                    </p>
                  </div>
                  {/* Sorting Filter Selector */}
                  <div className="flex items-center gap-3 border-b border-[#c4c7c7] dark:border-[#333] pb-2 min-w-[200px]">
                    <span className="text-[10px] uppercase tracking-widest text-[#747878]">Sort By</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs tracking-widest uppercase cursor-pointer w-full text-black dark:text-white font-medium focus:ring-0 focus:outline-none"
                    >
                      <option className="bg-[#f0f4f8] dark:bg-[#0f172a]" value="Newest Arrivals">Newest Arrivals</option>
                      <option className="bg-[#f0f4f8] dark:bg-[#0f172a]" value="Price: Low to High">Price: Low to High</option>
                      <option className="bg-[#f0f4f8] dark:bg-[#0f172a]" value="Price: High to Low">Price: High to Low</option>
                    </select>
                  </div>
                </div>
              </header>

              {/* Main Content Split: Sidebar + Products Catalog */}
              <div className="flex flex-col lg:flex-row gap-12">
                
                {/* Sidebar Filters */}
                <aside className="w-full lg:w-60 flex-shrink-0 space-y-10">
                  


                  {/* Color Swatch Palette */}
                  <div className="space-y-4">
                    <h3 className="text-[11px] uppercase tracking-widest text-black dark:text-white font-bold">Color Palette</h3>
                    <div className="grid grid-cols-6 gap-2.5">
                      {colorsList.map((c) => (
                        <button
                          key={c.name}
                          onClick={() => setSelectedColor(selectedColor === c.name ? null : c.name)}
                          title={c.name}
                          style={{ backgroundColor: c.hex }}
                          className={`w-full aspect-square border transition-all ${
                            selectedColor === c.name
                              ? 'border-black dark:border-white ring-1 ring-offset-2 ring-black dark:ring-white scale-110'
                              : 'border-[#eae8e7] dark:border-[#333] hover:scale-105'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Sizes filters */}
                  <div className="space-y-4">
                    <h3 className="text-[11px] uppercase tracking-widest text-black dark:text-white font-bold">Size</h3>
                    <div className="grid grid-cols-5 gap-1.5">
                      {sizesList.map((s) => (
                        <button
                          key={s}
                          onClick={() => setSelectedSize(selectedSize === s ? null : s)}
                          className={`py-2.5 text-[10px] font-bold border transition-all ${
                            selectedSize === s
                              ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                              : 'border-[#eae8e7] dark:border-[#333] hover:border-black dark:hover:border-white'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clear button */}
                  <button
                    onClick={clearAllFilters}
                    className="w-full border border-black dark:border-[#444] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black py-3.5 text-[10px] uppercase tracking-widest font-bold transition-all"
                  >
                    Clear All Filters
                  </button>
                </aside>

                {/* Products Grid catalog */}
                <div className="flex-grow space-y-12">
                  {loading ? (
                    <div className="text-center py-24">
                      <div className="w-10 h-10 border-2 border-t-black border-gray-200 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-xs text-[#747878] uppercase tracking-widest">Unveiling current selections...</p>
                    </div>
                  ) : paginatedProducts.length === 0 ? (
                    <div className="text-center py-24 border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 rounded-3xl">
                      <p className="text-sm">No items match your specific filters.</p>
                      <button onClick={clearAllFilters} className="text-xs uppercase font-bold text-indigo-600 dark:text-indigo-400 underline mt-2 block mx-auto hover:opacity-80">
                        Reset Filters
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-12">
                      {paginatedProducts.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedProduct(p)}
                          className="group cursor-pointer space-y-4"
                        >
                          <div className="relative aspect-[3/4] overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl shadow-sm">
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                            />
                            {p.isLimited && (
                              <div className="absolute top-4 left-4 bg-indigo-600 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg shadow-indigo-500/20">
                                Limited
                              </div>
                            )}
                            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="bg-indigo-600 text-white p-3 rounded-full shadow-lg inline-block hover:bg-indigo-500 transition-colors">
                                <Eye size={18} />
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {p.name}
                            </h3>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[#747878] uppercase tracking-wider text-[11px] font-medium">Retail Valuation</span>
                              <span className="font-bold text-black dark:text-white">${p.price.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Editorial Pagination bar */}
                  {totalPages > 1 && (
                    <div className="pt-12 border-t border-[#eae8e7] dark:border-[#222222] flex justify-center items-center gap-6">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="text-xs uppercase tracking-widest text-[#747878] disabled:opacity-30 hover:text-black"
                      >
                        Previous
                      </button>
                      <div className="flex items-center gap-4 text-xs font-bold">
                        {Array.from({ length: totalPages }, (_, idx) => (
                          <button
                            key={idx + 1}
                            onClick={() => setCurrentPage(idx + 1)}
                            className={`pb-1 ${
                              currentPage === idx + 1
                                ? 'border-b border-black text-black dark:text-white font-extrabold'
                                : 'text-[#747878] hover:text-black'
                            }`}
                          >
                            0{idx + 1}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="text-xs uppercase tracking-widest text-[#747878] disabled:opacity-30 hover:text-black"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}

          {/* User Dashboard View */}
          {activeView === 'dashboard' && user && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <Dashboard
                user={user}
                stats={stats}
                eventsLog={eventsLog}
                notifications={notifications}
                onMarkNotificationRead={handleMarkNotificationRead}
                onRefreshProducts={fetchProducts}
              />
            </motion.div>
          )}

          {/* Brand Story View */}
          {activeView === 'story' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <BrandStory onChangeView={setActiveView} />
            </motion.div>
          )}

          {/* Contact support View */}
          {activeView === 'contact' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <ContactForm />
            </motion.div>
          )}

          {/* Privacy Policy View */}
          {activeView === 'privacy' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <PrivacyPolicy />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Dynamic Slide-In overlays and Details Dialog drawers */}
      <AnimatePresence>
        {/* Product Quick-Add Details Modal */}
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          >
            <div className="bg-[#f0f4f8] dark:bg-[#0f172a] text-[#1b1c1c] dark:text-white border border-[#eae8e7] dark:border-[#222222] max-w-2xl w-full p-6 md:p-8 relative shadow-2xl flex flex-col md:flex-row gap-6">
              
              {/* Close Button */}
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 text-[#747878] hover:text-black dark:hover:text-white transition-colors"
                id="close-product-modal"
              >
                <X size={20} />
              </button>

              {/* Product Visual */}
              <div className="w-full md:w-1/2 aspect-[3/4] bg-[#f5f3f3] dark:bg-[#111] overflow-hidden">
                <img
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Product details */}
              <div className="w-full md:w-1/2 flex flex-col justify-between py-2 space-y-4">
                <div className="space-y-3">
                  <span className="text-[10px] uppercase tracking-widest text-indigo-500 font-extrabold">Curated Piece</span>
                  <h2 className="font-display text-2xl font-black tracking-tight leading-tight uppercase text-slate-900 dark:text-slate-100">{selectedProduct.name}</h2>
                  <p className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">${selectedProduct.price.toFixed(2)}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-4">
                    {selectedProduct.description}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Color representation */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Available Color Swatch</span>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4.5 h-4.5 border border-slate-200 dark:border-slate-800 rounded-md"
                        style={{ backgroundColor: selectedProduct.colorHex }}
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{selectedProduct.color}</span>
                    </div>
                  </div>

                  {/* Size Choices */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Select Size</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.sizes.map((sz) => (
                        <button
                          key={sz}
                          onClick={() => handleAddToCart(selectedProduct, sz, selectedProduct.color)}
                          className="border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 px-3.5 py-2 text-[10px] uppercase tracking-wider font-bold rounded-xl transition-all"
                        >
                          Add Size {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart side Drawer */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        user={user}
        onOpenAuth={() => {
          setCartOpen(false);
          setAuthModalOpen(true);
        }}
        onOrderSuccess={handleOrderSuccess}
      />

      {/* Secure Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Persistent Bottom Right Live Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-indigo-500/30 rounded-2xl p-4 shadow-xl shadow-indigo-500/10 flex items-start gap-3 w-80 animate-slideUp">
          <Sparkles className="text-indigo-500 flex-shrink-0 mt-0.5 animate-pulse" size={18} />
          <div className="space-y-1">
            <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-900 dark:text-slate-100">{toastMessage.title}</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">{toastMessage.body}</p>
          </div>
        </div>
      )}

      {/* Aesthetic Page-level Footer */}
      <Footer 
        onChangeView={setActiveView} 
        onSubscribeNotification={handleAddNotification}
      />
    </div>
  );
}
