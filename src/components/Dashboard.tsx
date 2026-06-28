import React, { useState, useEffect } from 'react';
import { User, Order, Notification, DashboardStats, Product } from '../types';
import { jsPDF } from 'jspdf';
import { 
  Download, RefreshCw, ShoppingCart, ShieldAlert, CheckCircle, 
  Truck, HelpCircle, Eye, EyeOff, Terminal, Mail, TrendingUp, Sparkles, Activity, Edit, Trash
} from 'lucide-react';

interface DashboardProps {
  user: User;
  stats: DashboardStats;
  eventsLog: Array<{ message: string; timestamp: string }>;
  notifications: Notification[];
  onMarkNotificationRead: (id: string) => void;
  onRefreshProducts?: () => void;
  products?: Product[];
}

interface AuditLog {
  id: string;
  userId: string;
  event: string;
  ip: string;
  timestamp: string;
}

interface SimulatedEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
}

export default function Dashboard({
  user,
  stats,
  eventsLog,
  notifications,
  onMarkNotificationRead,
  onRefreshProducts,
  products = [],
}: DashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [revealedAddresses, setRevealedAddresses] = useState<Record<string, boolean>>({});
  
  // Admin only state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [simulatedEmails, setSimulatedEmails] = useState<SimulatedEmail[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  // Logistics tracking and Algiers update state
  const [shippingUpdates, setShippingUpdates] = useState<Record<string, { carrier: string; estimatedTime: string; shippingAddress: string }>>({});

  // Product edit states
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Add product form states
  const [prodName, setProdName] = useState('');
  const [prodCollection, setProdCollection] = useState('Curated');
  const [prodDescription, setProdDescription] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodColor, setProdColor] = useState('');
  const [prodColorHex, setProdColorHex] = useState('#6366f1');
  const [prodSizes, setProdSizes] = useState<string[]>(['S', 'M', 'L']);
  const [prodIsLimited, setProdIsLimited] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [prodError, setProdError] = useState<string | null>(null);
  const [prodSuccess, setProdSuccess] = useState<string | null>(null);

  const getShippingValue = (orderId: string, field: 'carrier' | 'estimatedTime' | 'shippingAddress', defaultValue: string) => {
    if (shippingUpdates[orderId] && shippingUpdates[orderId][field] !== undefined) {
      return shippingUpdates[orderId][field];
    }
    return defaultValue || '';
  };

  const handleUpdateShippingField = (orderId: string, field: 'carrier' | 'estimatedTime' | 'shippingAddress', value: string) => {
    setShippingUpdates(prev => {
      const current = prev[orderId] || { carrier: '', estimatedTime: '', shippingAddress: '' };
      const order = orders.find(o => o.id === orderId);
      const fallbackCarrier = order?.carrier || '';
      const fallbackETA = order?.estimatedTime || '';
      const fallbackAddress = order?.shippingAddress || '';

      return {
        ...prev,
        [orderId]: {
          carrier: field === 'carrier' ? value : (current.carrier || fallbackCarrier),
          estimatedTime: field === 'estimatedTime' ? value : (current.estimatedTime || fallbackETA),
          shippingAddress: field === 'shippingAddress' ? value : (current.shippingAddress || fallbackAddress)
        }
      };
    });
  };

  const handleSaveLogistics = async (orderId: string) => {
    setStatusUpdating(orderId);
    const updates = shippingUpdates[orderId] || {};
    const order = orders.find(o => o.id === orderId);
    
    const carrier = updates.carrier !== undefined ? updates.carrier : (order?.carrier || '');
    const estimatedTime = updates.estimatedTime !== undefined ? updates.estimatedTime : (order?.estimatedTime || '');
    const shippingAddress = updates.shippingAddress !== undefined ? updates.shippingAddress : (order?.shippingAddress || '');

    try {
      const token = localStorage.getItem('ethos_session_token');
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          carrier,
          estimatedTime,
          shippingAddress
        })
      });

      if (res.ok) {
        // Refresh orders
        const updatedOrdersRes = await fetch('/api/orders', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (updatedOrdersRes.ok) {
          const data = await updatedOrdersRes.json();
          setOrders(data);
        }
        setProdSuccess(`Logistics info for Order #${orderId} has been successfully updated.`);
        setTimeout(() => setProdSuccess(null), 4000);
      } else {
        const errData = await res.json();
        setProdError(errData.error || 'Failed to update logistics.');
        setTimeout(() => setProdError(null), 4000);
      }
    } catch (err) {
      console.error(err);
      setProdError('Network error updating logistics.');
      setTimeout(() => setProdError(null), 4000);
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleStartEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setProdName(product.name);
    setProdCollection(product.collection);
    setProdDescription(product.description);
    setProdPrice(product.price.toString());
    setProdImageUrl(product.imageUrl);
    setProdColor(product.color);
    setProdColorHex(product.colorHex);
    setProdSizes(product.sizes);
    setProdIsLimited(product.isLimited);
    
    const element = document.getElementById('introduce-product-form');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEditProduct = () => {
    setEditingProductId(null);
    setProdName('');
    setProdCollection('Curated');
    setProdDescription('');
    setProdPrice('');
    setProdImageUrl('');
    setProdColor('');
    setProdColorHex('#6366f1');
    setProdSizes(['S', 'M', 'L']);
    setProdIsLimited(false);
    setProdError(null);
    setProdSuccess(null);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this piece from the catalog?')) {
      return;
    }
    try {
      const token = localStorage.getItem('ethos_session_token');
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setProdSuccess('Product deleted successfully.');
        setTimeout(() => setProdSuccess(null), 4000);
        if (onRefreshProducts) onRefreshProducts();
      } else {
        const data = await res.json();
        setProdError(data.error || 'Failed to delete product.');
        setTimeout(() => setProdError(null), 4000);
      }
    } catch (err) {
      console.error(err);
      setProdError('Failed to delete product.');
      setTimeout(() => setProdError(null), 4000);
    }
  };

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodCollection || !prodDescription || !prodPrice || !prodColor || !prodColorHex) {
      setProdError('Please complete all required fields.');
      return;
    }
    
    setAddingProduct(true);
    setProdError(null);
    setProdSuccess(null);

    try {
      const token = localStorage.getItem('ethos_session_token');
      const url = editingProductId ? `/api/products/${editingProductId}` : '/api/products';
      const method = editingProductId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: prodName,
          collection: prodCollection,
          description: prodDescription,
          price: prodPrice,
          imageUrl: prodImageUrl,
          color: prodColor,
          colorHex: prodColorHex,
          sizes: prodSizes,
          isLimited: prodIsLimited
        })
      });

      if (res.ok) {
        if (editingProductId) {
          setProdSuccess(`Product "${prodName}" updated successfully in the catalog.`);
          setEditingProductId(null);
        } else {
          setProdSuccess(`Product "${prodName}" added successfully to the catalog.`);
        }
        // Reset form
        setProdName('');
        setProdDescription('');
        setProdPrice('');
        setProdImageUrl('');
        setProdColor('');
        setProdColorHex('#6366f1');
        setProdSizes(['S', 'M', 'L']);
        setProdIsLimited(false);
        // Refresh products catalog in parent
        if (onRefreshProducts) {
          onRefreshProducts();
        }
      } else {
        const errData = await res.json();
        setProdError(errData.error || 'Failed to process product in catalog.');
      }
    } catch (err) {
      console.error(err);
      setProdError('A network error occurred. Please try again.');
    } finally {
      setAddingProduct(false);
    }
  };

  const fetchOrdersAndLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('ethos_session_token');
      
      // Fetch user specific/all orders
      const orderRes = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (orderRes.ok) {
        const orderData = await orderRes.json();
        setOrders(orderData.sort((a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }

      // If Admin, fetch system logs & simulated emails
      if (user.role === 'admin') {
        const adminRes = await fetch('/api/admin/system-logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (adminRes.ok) {
          const adminData = await adminRes.json();
          setAuditLogs(adminData.logs.reverse());
          setSimulatedEmails(adminData.emails.reverse());
          setAllUsers(adminData.users);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersAndLogs();
  }, [user]);

  // Handle live WebSocket trigger events
  useEffect(() => {
    const handleWSMessage = () => {
      // Refresh order list if orders are updated on server
      fetchOrdersAndLogs();
    };
    window.addEventListener('ORDER_STATUS_UPDATED_EVENT', handleWSMessage);
    window.addEventListener('ORDER_PLACED_EVENT', handleWSMessage);
    return () => {
      window.removeEventListener('ORDER_STATUS_UPDATED_EVENT', handleWSMessage);
      window.removeEventListener('ORDER_PLACED_EVENT', handleWSMessage);
    };
  }, []);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    setStatusUpdating(orderId);
    try {
      const token = localStorage.getItem('ethos_session_token');
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        await fetchOrdersAndLogs();
      }
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm(`Are you sure you want to refuse and delete Order #${orderId}? This will remove the transaction and dispatch a rejection alert to the user's email logs.`)) {
      return;
    }
    setStatusUpdating(orderId);
    try {
      const token = localStorage.getItem('ethos_session_token');
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setProdSuccess(`Order #${orderId} has been successfully refused and deleted.`);
        setTimeout(() => setProdSuccess(null), 4000);
        await fetchOrdersAndLogs();
      } else {
        const errData = await res.json();
        setProdError(errData.error || 'Failed to refuse and delete order.');
        setTimeout(() => setProdError(null), 4000);
      }
    } catch (err) {
      console.error('Failed to delete order', err);
      setProdError('Network error deleting order.');
      setTimeout(() => setProdError(null), 4000);
    } finally {
      setStatusUpdating(null);
    }
  };

  const toggleAddressReveal = (orderId: string) => {
    setRevealedAddresses(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const generatePDFReport = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Custom Editorial Report Layout
    doc.setFillColor(251, 249, 248); // Background off-white
    doc.rect(0, 0, 210, 297, 'F');

    doc.setTextColor(27, 28, 28); // Charcoal
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('ETHOS EDITORIAL', 20, 25);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(116, 120, 120); // Slate gray
    doc.text('BESPOKE DIGITALLY VERIFIED STATS REPORT', 20, 31);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 36);

    doc.setDrawColor(200, 200, 200);
    doc.line(20, 42, 190, 42);

    // Profile Box
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(27, 28, 28);
    doc.text('Account Details', 20, 52);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Client Name: ${user.name}`, 20, 59);
    doc.text(`Registered Email: ${user.email}`, 20, 65);
    doc.text(`Authorization Tier: ${user.role.toUpperCase()}`, 20, 71);

    // Stats Section
    doc.setFont('Helvetica', 'bold');
    doc.text('Store Telemetry (Live)', 110, 52);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Active Online Sessions: ${stats.activeShoppers}`, 110, 59);
    doc.text(`Today's Sales Volume: $${stats.totalSalesToday.toFixed(2)}`, 110, 65);
    doc.text(`Orders Processed: ${stats.ordersProcessed}`, 110, 71);

    doc.line(20, 80, 190, 80);

    // Orders List
    doc.setFont('Helvetica', 'bold');
    doc.text('Your Pieces and Order History', 20, 90);

    let startY = 100;
    if (orders.length === 0) {
      doc.setFont('Helvetica', 'oblique');
      doc.setFontSize(10);
      doc.text('No transaction history logged for this account.', 20, startY);
    } else {
      orders.forEach((order, index) => {
        if (startY > 260) {
          doc.addPage();
          doc.setFillColor(251, 249, 248);
          doc.rect(0, 0, 210, 297, 'F');
          startY = 20;
        }

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(27, 28, 28);
        doc.text(`Order #${order.id} - ${order.status.toUpperCase()}`, 20, startY);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(116, 120, 120);
        doc.text(`Tracking: ${order.trackingNumber}`, 20, startY + 5);
        doc.text(`Placed: ${new Date(order.createdAt).toLocaleDateString()}`, 20, startY + 10);
        doc.setTextColor(173, 50, 28); // Terracotta for price
        doc.text(`Settled Amount: $${order.total.toFixed(2)}`, 110, startY);

        doc.setTextColor(116, 120, 120);
        const orderItemsStr = order.items.map(i => `${i.product.name} (${i.selectedSize}) x${i.quantity}`).join(', ');
        doc.text(`Items: ${orderItemsStr.substring(0, 60)}${orderItemsStr.length > 60 ? '...' : ''}`, 20, startY + 15);

        doc.setDrawColor(240, 240, 240);
        doc.line(20, startY + 19, 190, startY + 19);
        startY += 24;
      });
    }

    // Security Footer
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(27, 28, 28);
    doc.text('SECURE SYSTEM PERSISTENCE VERIFICATION', 20, 280);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(116, 120, 120);
    doc.text('All private addresses are sealed via secure AES-256-CBC cipher blocks.', 20, 284);

    doc.save(`Ethos_Editorial_Report_${user.name.replace(/\s+/g, '_')}.pdf`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Activity size={16} className="text-amber-500 animate-pulse" />;
      case 'processing': return <RefreshCw size={16} className="text-blue-500 animate-spin" />;
      case 'shipped': return <Truck size={16} className="text-purple-500" />;
      case 'delivered': return <CheckCircle size={16} className="text-emerald-500" />;
      default: return <ShieldAlert size={16} className="text-rose-500" />;
    }
  };

  return (
    <div className="space-y-10 animate-fadeIn">
      {/* Dashboard Top Hero */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 dark:border-slate-800 pb-6 gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-extrabold">Bespoke Client Suite</span>
          <h1 className="font-display text-3xl font-extrabold mt-1 text-slate-900 dark:text-slate-100 uppercase tracking-tight">
            Welcome back, <span className="text-indigo-600 dark:text-indigo-400">{user.name}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchOrdersAndLogs}
            className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:text-indigo-500 dark:hover:border-indigo-400 dark:hover:text-indigo-400 rounded-xl text-xs uppercase tracking-wider font-bold flex items-center gap-2 transition-all duration-200"
            title="Refresh Terminal"
          >
            <RefreshCw size={14} className="animate-spin-slow" />
            <span>Sync</span>
          </button>
          <button
            onClick={generatePDFReport}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/15 px-5 py-3 rounded-xl text-xs uppercase tracking-widest font-bold flex items-center gap-2 transition-all duration-200"
          >
            <Download size={14} />
            <span>Export Report</span>
          </button>
        </div>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* 1. Active Order / Status Card (Spans 8 columns, 3 rows) */}
        <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[340px] shadow-sm">
          <div className="absolute top-0 right-0 p-6">
            <span className="text-[10px] uppercase text-indigo-600 dark:text-indigo-400 font-bold tracking-widest">Real-Time Track</span>
          </div>
          
          {orders.length > 0 ? (
            <>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold">Active Curation</span>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mt-1">Order #{orders[0].id}</h2>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end my-4">
                <div className="flex-1 w-full">
                  <div className="flex justify-between text-[11px] font-bold uppercase mb-2 text-slate-500 dark:text-slate-400">
                    <span className={orders[0].status === 'pending' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>Pending</span>
                    <span className={orders[0].status === 'processing' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>Processing</span>
                    <span className={orders[0].status === 'shipped' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>In Transit</span>
                    <span className={orders[0].status === 'delivered' ? 'text-emerald-500 font-bold' : ''}>Delivered</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all duration-500"
                      style={{
                        width: orders[0].status === 'pending' ? '25%' : 
                               orders[0].status === 'processing' ? '50%' : 
                               orders[0].status === 'shipped' ? '75%' : '100%'
                      }}
                    ></div>
                  </div>
                </div>
                <div className="text-left sm:text-right flex-shrink-0">
                  <p className="text-3xl font-black text-slate-900 dark:text-slate-100 italic uppercase">
                    {orders[0].status === 'delivered' ? 'ARRIVED' : (orders[0].estimatedTime || 'PENDING')}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Estimated arrival time</p>
                </div>
              </div>
              
              {/* Milestone Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-150 dark:border-slate-800/50">
                  <p className="text-[10px] uppercase text-slate-400 font-bold mb-0.5">Location</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{orders[0].shippingAddress || 'Under Curation'}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-150 dark:border-slate-800/50">
                  <p className="text-[10px] uppercase text-slate-400 font-bold mb-0.5">Carrier</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 underline decoration-indigo-400">{orders[0].carrier || 'Standard Curation care'}</p>
                </div>
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                  <p className="text-[10px] uppercase text-indigo-600 dark:text-indigo-400 font-bold mb-0.5">Current Status</p>
                  <p className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
                    {orders[0].status.toUpperCase()}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <ShoppingCart size={36} className="text-slate-300 dark:text-slate-700 mb-3 animate-pulse" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No active orders tracked.</h4>
              <p className="text-xs text-slate-400 max-w-sm mt-1">Acquire beautiful pieces in the shop and they will register here with live telemetry updates.</p>
            </div>
          )}
        </div>

        {/* 2. Security Layer Card (Spans 4 columns, 2 rows) */}
        {user.role === 'admin' && (
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-sm animate-fadeIn">
            <div>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Security Layer</h3>
                <ShieldAlert className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">JWT Session</span>
                  <span className="text-emerald-500 font-mono font-bold tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> ACTIVE
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Authentication Tier</span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[140px] uppercase font-mono">{user.role}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Encryption Cipher</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">AES-256-CBC</span>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-4">
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-slate-400 dark:bg-slate-500 w-1/3"></div>
              </div>
              <p className="text-[9px] text-slate-400 mt-1.5 uppercase font-mono tracking-widest">Token Rotation: 1h 22m remaining</p>
            </div>
          </div>
        )}

        {/* 3. Real-Time Telemetry & Rate Limiter Card (Spans 4 columns) */}
        {user.role === 'admin' && (
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex items-center gap-5 shadow-sm animate-fadeIn">
            <div className="w-14 h-14 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-indigo-500 dark:border-t-indigo-400 flex items-center justify-center animate-spin-slow flex-shrink-0">
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">82%</span>
            </div>
            <div>
              <p className="text-[9px] uppercase text-indigo-600 dark:text-indigo-400 font-extrabold tracking-widest mb-0.5">Gateway Load</p>
              <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">API Rate: {stats.activeShoppers * 29}/500 req/s</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Redis cluster replication active</p>
            </div>
          </div>
        )}

        {/* 4. Telemetry Multi-Grid Cards (Spans 4 columns) */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 grid grid-cols-2 gap-4 shadow-inner">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Online</span>
            <div>
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{stats.activeShoppers}</span>
              <span className="text-[9px] text-emerald-500 font-mono block">LIVE CLIENTS</span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Processed</span>
            <div>
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{stats.ordersProcessed}</span>
              <span className="text-[9px] text-indigo-500 dark:text-indigo-400 font-mono block">DB RECORDS</span>
            </div>
          </div>
        </div>

        {/* 5. Quick Actions & Preferences Card (Spans 4 columns, 3 rows) */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Dashboard Actions</h3>
            <div className="space-y-2.5">
              <button 
                onClick={generatePDFReport}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all duration-200 shadow-md shadow-indigo-500/10 flex items-center justify-center gap-1.5"
              >
                <Download size={13} />
                GENERATE PDF REPORT
              </button>
              <button 
                onClick={fetchOrdersAndLogs}
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-colors duration-200 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={13} />
                SYNC SECURE PORTAL
              </button>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <h4 className="text-[9px] uppercase text-slate-400 font-extrabold mb-3 tracking-widest">Interactive Preferences</h4>
            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-150 dark:border-slate-800/50">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Live Socket Sync</span>
              <div className="w-8 h-4 bg-emerald-500 rounded-full flex items-center justify-end px-0.5 cursor-not-allowed">
                <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Order History List Card (Spans 8 columns, 3 rows) */}
        <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-sm overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold">Transaction Vault</span>
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mt-0.5">Persistent Order History</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono uppercase bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">Showing last {orders.length} transactions</span>
          </div>
          
          {orders.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950/10 h-full flex flex-col justify-center">
              <p className="text-xs text-slate-400 font-medium">No records logged in your transaction vault.</p>
            </div>
          ) : (
            <div className="flex-grow space-y-2 overflow-y-auto max-h-72 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
              <div className="grid grid-cols-12 p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <span className="col-span-3">ID / DATE</span>
                <span className="col-span-5">PURCHASED PIECES</span>
                <span className="col-span-2">AMOUNT</span>
                <span className="col-span-2 text-right">STATUS</span>
              </div>
              {orders.map((o) => (
                <div key={o.id} className="grid grid-cols-12 items-center p-3 text-xs bg-slate-50/50 dark:bg-slate-950/20 rounded-xl border border-slate-150/50 dark:border-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                  <div className="col-span-3 flex flex-col">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">#{o.id}</span>
                    <span className="text-[9px] text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="col-span-5 font-bold text-slate-700 dark:text-slate-300 truncate pr-2">
                    {o.items.map(i => `${i.product.name} (${i.selectedSize})`).join(', ')}
                  </div>
                  <span className="col-span-2 font-mono font-bold text-slate-900 dark:text-slate-100">${o.total.toFixed(2)}</span>
                  <div className="col-span-2 text-right">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase italic ${
                      o.status === 'delivered' ? 'text-emerald-500' :
                      o.status === 'shipped' ? 'text-purple-400' : 'text-amber-500'
                    }`}>
                      {getStatusIcon(o.status)}
                      {o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 7. Decrypt / AES module card (Spans 4 columns) */}
        {user.role === 'admin' && (
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-sm animate-fadeIn">
            <div className="space-y-3.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-widest text-emerald-500 font-extrabold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Dynamic Decrypter
                </span>
                <span className="text-[10px] font-mono text-slate-400 uppercase">AES-256-CBC</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Select an order in your dashboard to dynamically translate cryptographically sealed destinations into plain text.
              </p>
              
              {orders.length > 0 ? (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-150 dark:border-slate-800/50 relative overflow-hidden">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[9px] text-slate-400 font-mono">ORDER #{orders[0].id} HEX</span>
                    <button
                      onClick={() => toggleAddressReveal(orders[0].id)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                    >
                      {revealedAddresses[orders[0].id] ? <EyeOff size={11} /> : <Eye size={11} />}
                      {revealedAddresses[orders[0].id] ? 'Mask Cipher' : 'Decrypt'}
                    </button>
                  </div>
                  {revealedAddresses[orders[0].id] ? (
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 animate-fadeIn">{orders[0].shippingAddress}</p>
                  ) : (
                    <p className="text-[10px] font-mono text-slate-400 truncate select-all">{orders[0].encryptedAddress || 'aes-256-cbc:cf12b3a98...'}</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-5 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                  Awaiting order placement
                </div>
              )}
            </div>
          </div>
        )}

        {/* 8. WebSockets Terminal Feed & Alerts Card (Spans 8 columns) */}
        <div className="col-span-12 lg:col-span-8 bg-black text-emerald-400 rounded-3xl p-6 flex flex-col justify-between shadow-2xl relative border border-slate-900 min-h-[300px]">
          <div className="flex justify-between items-center border-b border-emerald-950/60 pb-3 mb-4">
            <span className="uppercase tracking-widest text-emerald-500 text-xs font-bold flex items-center gap-2">
              <Terminal size={15} className="animate-pulse" /> Live Telemetry Pipeline
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-emerald-600 uppercase font-mono tracking-widest">Secure Socket connected</span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
          </div>

          <div className="flex-1 space-y-3 max-h-52 overflow-y-auto hide-scrollbar font-mono text-[11px]">
            {eventsLog.length === 0 ? (
              <p className="text-emerald-600/80 italic animate-pulse">Initializing telemetry stream... Waiting for shopping events.</p>
            ) : (
              eventsLog.slice(0, 8).map((event, index) => (
                <div key={index} className="space-y-0.5 animate-fadeIn border-l border-emerald-900 pl-2.5 ml-1">
                  <span className="text-emerald-600 text-[9px] block">[{event.timestamp}]</span>
                  <p className="text-emerald-300 leading-relaxed">{event.message}</p>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 pt-2 border-t border-emerald-950/30 text-[9px] text-emerald-600 uppercase tracking-widest flex justify-between font-mono">
            <span>Channel: secure_editorial_relay</span>
            <span>Replication: active</span>
          </div>
        </div>

        {/* 9. Realtime Push Messages Card (Spans 4 columns) */}
        {user.role === 'admin' && (
          <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-sm animate-fadeIn">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Realtime Push Messages</h3>
              
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center italic">No security alerts or tracking flags active.</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {notifications.map((n) => (
                    <div key={n.id} className={`p-3 border text-xs rounded-2xl relative ${n.read ? 'border-slate-200 opacity-60' : 'border-indigo-500/30 bg-indigo-500/5'}`}>
                      <div className="flex justify-between items-start gap-1">
                        <p className="font-extrabold text-slate-900 dark:text-slate-100">{n.title}</p>
                        {!n.read && (
                          <button 
                            onClick={() => onMarkNotificationRead(n.id)}
                            className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline flex-shrink-0"
                          >
                            Acknowledge
                          </button>
                        )}
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mt-1">{n.message}</p>
                      <span className="text-[9px] text-slate-400 block mt-1.5 font-mono">{new Date(n.createdAt).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Admin Panel Console */}
      {user.role === 'admin' && (
        <section className="border-t border-slate-200 dark:border-slate-800 pt-10 space-y-8 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-extrabold">Curator Oversight Panel</span>
              <h2 className="font-display text-2xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Global Shop Administration</h2>
            </div>
            <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider">
              Authorized Curator Privileges Active
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

            {/* 1. Introduce New Product Piece (Spans 12 columns for premium look) */}
            <div id="introduce-product-form" className="xl:col-span-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-6 gap-2">
                  <div>
                    <h3 className="font-display text-xl font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                      {editingProductId ? `Edit Curated Piece: ${prodName}` : 'Introduce New Curated Piece'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {editingProductId ? 'Modify existing catalog parameters, pricing matrix, or limited collection scarcity.' : 'Populate the catalog matrix with custom high-end curated apparel or accessory pieces.'}
                    </p>
                  </div>
                  {!editingProductId ? (
                    <button
                      type="button"
                      onClick={() => {
                        const sampleImages = [
                          'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600&auto=format&fit=crop',
                          'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?q=80&w=600&auto=format&fit=crop',
                          'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=600&auto=format&fit=crop',
                          'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=600&auto=format&fit=crop',
                          'https://images.unsplash.com/photo-1509319117193-57bab727e09d?q=80&w=600&auto=format&fit=crop'
                        ];
                        const chosenImg = sampleImages[Math.floor(Math.random() * sampleImages.length)];
                        setProdName('Sartorial Linen Trenchcoat');
                        setProdCollection('Curated');
                        setProdDescription('An exquisitely tailored linen trench coat featuring relaxed double-breasted closure, structured notch lapels, and an elegant waist tie.');
                        setProdPrice('450.00');
                        setProdImageUrl(chosenImg);
                        setProdColor('Desert Sand');
                        setProdColorHex('#C2B280');
                        setProdSizes(['S', 'M', 'L', 'XL']);
                        setProdIsLimited(true);
                        setProdSuccess('Autofilled form with sample fashion piece!');
                        setTimeout(() => setProdSuccess(null), 3000);
                      }}
                      className="text-xs bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl transition-all font-bold flex items-center gap-1.5"
                    >
                      <Sparkles size={14} className="text-indigo-500" /> Autofill Sample Piece
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCancelEditProduct}
                      className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 px-4 py-2 border border-red-500/20 rounded-xl transition-all font-bold flex items-center gap-1.5"
                    >
                      Cancel Editing
                    </button>
                  )}
                </div>

                {prodSuccess && (
                  <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-2xl flex items-center gap-2.5">
                    <CheckCircle size={16} />
                    <span className="font-medium">{prodSuccess}</span>
                  </div>
                )}

                {prodError && (
                  <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-2xl flex items-center gap-2.5">
                    <ShieldAlert size={16} />
                    <span className="font-medium">{prodError}</span>
                  </div>
                )}

                <form onSubmit={handleAddProductSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Piece Title */}
                    <div className="space-y-2 lg:col-span-2">
                      <label className="block text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                        Piece Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Raw Silk Trenchcoat"
                        value={prodName}
                        onChange={(e) => setProdName(e.target.value)}
                        className="w-full border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-slate-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 rounded-xl transition-colors"
                      />
                    </div>

                    {/* Retail Valuation Price */}
                    <div className="space-y-2">
                      <label className="block text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                        Retail Price (USD) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-3 text-slate-400 text-sm font-medium">$</span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="290.00"
                          value={prodPrice}
                          onChange={(e) => setProdPrice(e.target.value)}
                          className="w-full border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-slate-100 pl-8 pr-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 rounded-xl transition-colors"
                        />
                      </div>
                    </div>

                    {/* Curated Color Label */}
                    <div className="space-y-2">
                      <label className="block text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                        Color Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Alabaster / Desert Rose"
                        value={prodColor}
                        onChange={(e) => setProdColor(e.target.value)}
                        className="w-full border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-slate-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 rounded-xl transition-colors"
                      />
                    </div>

                    {/* Curated Color Hex */}
                    <div className="space-y-2">
                      <label className="block text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                        Color Hex Picker <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex gap-2.5">
                        <input
                          type="color"
                          value={prodColorHex}
                          onChange={(e) => setProdColorHex(e.target.value)}
                          className="w-12 h-[46px] border border-slate-200 dark:border-slate-800 bg-transparent p-1.5 rounded-xl cursor-pointer"
                        />
                        <input
                          type="text"
                          required
                          placeholder="#E6E6FA"
                          value={prodColorHex}
                          onChange={(e) => setProdColorHex(e.target.value)}
                          className="w-full border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-slate-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 rounded-xl transition-colors font-mono"
                        />
                      </div>
                    </div>

                    {/* Image URL of the Piece */}
                    <div className="space-y-2">
                      <label className="block text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                        Piece Image URL
                      </label>
                      <input
                        type="url"
                        placeholder="Leave blank to use elegant editorial sketch"
                        value={prodImageUrl}
                        onChange={(e) => setProdImageUrl(e.target.value)}
                        className="w-full border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-slate-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 rounded-xl transition-colors"
                      />
                    </div>
                  </div>

                  {/* Description / Story text */}
                  <div className="space-y-2">
                    <label className="block text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                      Editorial Story / Description <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Narrate the architectural fit, fiber composition, design lineage, or luxury tactile feeling..."
                      value={prodDescription}
                      onChange={(e) => setProdDescription(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-slate-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 rounded-xl transition-colors resize-none"
                    />
                  </div>

                  {/* Sizing & Limited toggle */}
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pt-2">
                    {/* Sizes Selection Pills */}
                    <div className="space-y-2.5 w-full lg:w-auto">
                      <label className="block text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                        Available Sizes
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {['XS', 'S', 'M', 'L', 'XL', 'One Size', '38', '39', '40', '41', '42'].map((sz) => {
                          const isActive = prodSizes.includes(sz);
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => {
                                if (isActive) {
                                  setProdSizes(prev => prev.filter(s => s !== sz));
                                } else {
                                  setProdSizes(prev => [...prev, sz]);
                                }
                              }}
                              className={`px-3 py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${
                                isActive
                                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500'
                                  : 'bg-transparent text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                              }`}
                            >
                              {sz}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Limited Edition and Submit */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full lg:w-auto">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={prodIsLimited}
                          onChange={(e) => setProdIsLimited(e.target.checked)}
                          className="w-4.5 h-4.5 border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0 rounded-md bg-transparent"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-950 dark:text-slate-50 uppercase tracking-tight">Limited Edition Matrix</p>
                          <p className="text-[10px] text-slate-400">Mark as restricted scarcity run.</p>
                        </div>
                      </label>

                      <button
                        type="submit"
                        disabled={addingProduct}
                        className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 text-xs uppercase tracking-widest transition-all font-black rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10"
                      >
                        {addingProduct ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            {editingProductId ? 'Saving Changes...' : 'Introducing...'}
                          </>
                        ) : (
                          editingProductId ? 'Save Changes' : 'Introduce Piece'
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* Active Catalog Management Section (Spans 12) */}
            <div className="xl:col-span-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <h3 className="font-display text-lg font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-tight mb-4 flex items-center gap-2">
                Active Catalog Pieces <span className="text-xs bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold px-2.5 py-1 rounded-full uppercase font-sans tracking-normal">{products.length} Items</span>
              </h3>
              
              {products.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center italic">No curated products available in the catalog.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[420px] overflow-y-auto pr-1">
                  {products.map((p) => (
                    <div key={p.id} className="border border-slate-100 dark:border-slate-800/80 p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 flex gap-3.5 items-center justify-between relative group">
                      <div className="flex gap-3.5 items-center min-w-0 flex-1">
                        <img 
                          src={p.imageUrl} 
                          alt={p.name} 
                          className="w-14 h-14 rounded-xl object-cover border border-slate-200/60 dark:border-slate-800 flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-950 dark:text-slate-50 text-xs truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight mt-0.5">{p.collection}</p>
                          <p className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1">${p.price.toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleStartEditProduct(p)}
                          className="p-2 hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-lg transition-all"
                          title="Edit Product"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded-lg transition-all"
                          title="Delete Product"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Global Orders Admin & Status update panel (Spans 6) */}
            <div className="xl:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
              <div>
                <h3 className="font-display text-lg font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-tight mb-4">Manage Global Orders</h3>
                
                {orders.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">No transactions registered across the platform.</p>
                ) : (
                  <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
                    {orders.map((o) => (
                      <div key={o.id} className="border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 space-y-3.5 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              Order #{o.id}
                              {o.status === 'refused' && (
                                <span className="text-[9px] bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 font-extrabold px-1.5 py-0.5 rounded uppercase">Refused</span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">{o.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-900 dark:text-slate-100 font-bold">${o.total.toFixed(2)}</span>
                            <button
                              onClick={() => handleDeleteOrder(o.id)}
                              disabled={statusUpdating === o.id}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl transition-all"
                              title="Refuse & Delete Order"
                            >
                              <Trash size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Dropdown status update controller */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/60">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Update Status:</span>
                          <div className="flex flex-wrap gap-1">
                            {['pending', 'processing', 'shipped', 'delivered'].map((s) => (
                              <button
                                key={s}
                                onClick={() => handleUpdateOrderStatus(o.id, s)}
                                disabled={statusUpdating === o.id || o.status === s}
                                className={`px-2 py-1 rounded-md text-[9px] uppercase font-bold tracking-wider transition-all ${
                                  o.status === s
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-slate-500'
                                }`}
                              >
                                {statusUpdating === o.id && o.status !== s ? '...' : s}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* logistics carrier & ETA input section */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 space-y-2.5">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Carrier</label>
                              <input
                                type="text"
                                placeholder="e.g. DHL, FedEx"
                                value={getShippingValue(o.id, 'carrier', o.carrier || '')}
                                onChange={(e) => handleUpdateShippingField(o.id, 'carrier', e.target.value)}
                                className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-xl focus:ring-0 focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Estimated Time</label>
                              <input
                                type="text"
                                placeholder="e.g. 2-3 business days"
                                value={getShippingValue(o.id, 'estimatedTime', o.estimatedTime || '')}
                                onChange={(e) => handleUpdateShippingField(o.id, 'estimatedTime', e.target.value)}
                                className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-xl focus:ring-0 focus:border-indigo-500"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] text-slate-400 uppercase font-bold">Delivery Location</label>
                              <button
                                type="button"
                                onClick={() => handleUpdateShippingField(o.id, 'shippingAddress', 'Algiers, Algeria')}
                                className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline"
                              >
                                Change Location to Algeris
                              </button>
                            </div>
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                placeholder="Enter location..."
                                value={getShippingValue(o.id, 'shippingAddress', o.shippingAddress || '')}
                                onChange={(e) => handleUpdateShippingField(o.id, 'shippingAddress', e.target.value)}
                                className="flex-1 text-xs px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-xl focus:ring-0 focus:border-indigo-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveLogistics(o.id)}
                                disabled={statusUpdating === o.id}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl font-bold transition-all text-[11px]"
                              >
                                {statusUpdating === o.id ? '...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Simulated Email Server Logs (Spans 6) */}
            <div className="xl:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col shadow-sm">
              <h3 className="font-display text-lg font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-tight mb-2">Simulated Mail Servers</h3>
              <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">This panel captures automatic alert and security emails dispatched to user profiles, satisfying absolute compliance checkouts.</p>

              <div className="flex-1 space-y-3.5 max-h-[340px] overflow-y-auto pr-1 font-mono text-[10px]">
                {simulatedEmails.length === 0 ? (
                  <p className="text-slate-400 py-8 text-center italic">Mail delivery queues are currently empty.</p>
                ) : (
                  simulatedEmails.map((email) => (
                    <div key={email.id} className="border border-amber-500/20 bg-amber-500/5 p-4 rounded-2xl text-slate-700 dark:text-amber-200">
                      <div className="flex justify-between items-start text-[9px] text-slate-400 mb-1">
                        <span>MAIL ID: {email.id}</span>
                        <span>{new Date(email.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p><strong>To:</strong> {email.to}</p>
                      <p><strong>Subject:</strong> {email.subject}</p>
                      <div className="mt-2.5 p-2.5 rounded-xl bg-slate-100/50 dark:bg-slate-950/60 leading-relaxed text-[10px] whitespace-pre-wrap">
                        {email.body}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* System Security Audit Trails (Spans 12) */}
            <div className="xl:col-span-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="font-display text-lg font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Cryptographic Security Logs</h3>
              
              <div className="border border-slate-900 bg-black text-gray-300 p-4 font-mono text-[10px] rounded-2xl shadow-xl">
                <div className="grid grid-cols-4 gap-2 border-b border-gray-800 pb-2.5 text-[9px] uppercase tracking-wider text-gray-500 font-bold">
                  <span>Timestamp</span>
                  <span>User Reference</span>
                  <span className="col-span-2">Cryptographic Event / Action Log</span>
                </div>
                <div className="space-y-2 mt-2.5 max-h-56 overflow-y-auto pr-1">
                  {auditLogs.length === 0 ? (
                    <p className="text-gray-600 italic py-4">No audit trails currently logged.</p>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="grid grid-cols-4 gap-2 border-b border-gray-900/60 pb-1.5 last:border-0 hover:bg-white/5 transition-colors">
                        <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className="text-amber-400 font-bold truncate">{log.userId}</span>
                        <span className="col-span-2 text-emerald-400 select-all">{log.event}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        </section>
      )}
    </div>
  );
}
