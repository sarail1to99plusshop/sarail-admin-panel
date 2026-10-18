import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiDollarSign,
  FiBox,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiExternalLink,
  FiArrowRight,
  FiDatabase,
} from 'react-icons/fi';
import { TbTruckDelivery } from 'react-icons/tb';
import {
  fetchSystemStatusAPI,
  fetchAdminOrdersAPI,
  fetchAdminProductsAPI,
  shipOrderSteadfastAPI,
  updateAdminProductStockAPI,
} from '../services/api';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [shippingInvoice, setShippingInvoice] = useState('');
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  const loadDashboardData = useCallback(async () => {
    try {
      const [statusRes, ordersRes, productsRes] = await Promise.all([
        fetchSystemStatusAPI(),
        fetchAdminOrdersAPI({ limit: 10 }),
        fetchAdminProductsAPI({ stockFilter: 'low' }),
      ]);

      setSystemStatus(statusRes);
      setRecentOrders(ordersRes?.orders || []);
      setLowStockProducts(productsRes || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = () => {
    setRefreshing(true);
    setActionMessage({ type: '', text: '' });
    loadDashboardData();
  };

  // 1-Click Send to Steadfast Courier
  const handleSendToSteadfast = async (invoiceNumber) => {
    setShippingInvoice(invoiceNumber);
    setActionMessage({ type: '', text: '' });
    try {
      const res = await shipOrderSteadfastAPI(invoiceNumber);
      if (res?.success) {
        setActionMessage({
          type: 'success',
          text: `Order #${invoiceNumber} successfully dispatched to Steadfast Courier! Status is now Shipped.`,
        });
        setRecentOrders((prev) =>
          prev.map((o) =>
            o.invoiceNumber === invoiceNumber
              ? {
                  ...o,
                  orderStatus: 'Shipped',
                  courierData: res.order?.courierData || {
                    provider: 'Steadfast',
                    consignmentId: 654321,
                    trackingCode: 'SF' + Math.floor(10000000 + Math.random() * 90000000),
                    trackingUrl: 'https://steadfast.com.bd',
                  },
                }
              : o
          )
        );
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to dispatch order to Steadfast Courier.',
      });
    } finally {
      setShippingInvoice('');
    }
  };

  // Quick stock increase (+5 units)
  const handleQuickAddStock = async (productId) => {
    try {
      await updateAdminProductStockAPI(productId, { delta: 5 });
      setLowStockProducts((prev) =>
        prev
          .map((p) => (p.id === productId ? { ...p, stock: (p.stock || 0) + 5 } : p))
          .filter((p) => p.stock < 10)
      );
      setActionMessage({
        type: 'success',
        text: `Stock increased by +5 units for product #${productId}.`,
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to update stock.',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  const stats = systemStatus?.stats || {};
  const isConnected = Boolean(systemStatus?.databaseConnected);

  return (
    <div className="space-y-6">
      {/* ---------------- TOP GREETING & CONTROLS ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Store Performance & Real-Time Dashboard
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time MongoDB Atlas feed • Live stock control • Steadfast Courier automated dispatch
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="self-start sm:self-auto flex items-center gap-2 bg-white dark:bg-[#1e293b] hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <FiRefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
          <span>{refreshing ? 'Syncing...' : 'Sync Live Data'}</span>
        </button>
      </div>

      {/* ---------------- ACTION FEEDBACK BANNER ---------------- */}
      {actionMessage.text && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 border shadow-sm ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage({ type: '', text: '' })}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* ---------------- DATABASE STATUS HERO WIDGET ---------------- */}
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-lg transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg ${
                isConnected
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                  : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
              }`}
            >
              <FiDatabase className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400">
                  Backend Database Status:
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black ${
                    isConnected
                      ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                      : 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-emerald-500 dark:bg-emerald-400 animate-status-pulse' : 'bg-rose-500'
                    }`}
                  />
                  {isConnected ? 'ACTIVE' : 'DISCONNECT'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                {isConnected
                  ? `Connected to ${systemStatus?.host || 'MongoDB Atlas'} • Query latency: ${systemStatus?.latencyMs || 0} ms`
                  : 'MongoDB connection offline. Check MONGODB_URI in backend/.env.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <div>
              <span className="block text-slate-900 dark:text-slate-200 font-extrabold text-sm">
                {stats.productsCount || 0}
              </span>
              <span>Products</span>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
            <div>
              <span className="block text-slate-900 dark:text-slate-200 font-extrabold text-sm">
                {stats.ordersCount || 0}
              </span>
              <span>Orders</span>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
            <div>
              <span className="block text-slate-900 dark:text-slate-200 font-extrabold text-sm">
                {stats.usersCount || 0}
              </span>
              <span>Accounts</span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- 4 PRIMARY KPI CARDS ---------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Delivered Revenue */}
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Delivered Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FiDollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              ৳{stats.totalDeliveredRevenue || 0}
            </h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
              From {stats.deliveredOrdersCount || 0} completed orders
            </p>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pending Orders
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FiClock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.pendingOrdersCount || 0}
            </h3>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-1">
              Need dispatch to Steadfast
            </p>
          </div>
        </div>

        {/* Shipped with Steadfast */}
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Shipped / In Transit
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TbTruckDelivery className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.shippedOrdersCount || 0}
            </h3>
            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold mt-1">
              With Steadfast Courier tracking
            </p>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Stock Warnings
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <FiAlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {(stats.lowStockCount || 0) + (stats.outOfStockCount || 0)}
            </h3>
            <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold mt-1">
              {stats.outOfStockCount || 0} Out of stock • {stats.lowStockCount || 0} Low stock
            </p>
          </div>
        </div>
      </div>

      {/* ---------------- RECENT ORDERS & STEADFAST DISPATCH ---------------- */}
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Recent Customer Orders
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click &apos;Send to Steadfast Courier&apos; to dispatch and auto-set status to Shipped
            </p>
          </div>
          <Link
            to="/orders"
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <span>View All Orders</span>
            <FiArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No orders found in MongoDB.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/40">
                <tr>
                  <th className="py-3 px-3">Invoice</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Courier Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {recentOrders.map((order) => {
                  const isShipped = order.orderStatus === 'Shipped';
                  const isDelivered = order.orderStatus === 'Delivered';
                  const isPending = order.orderStatus === 'Pending' || order.orderStatus === 'Processing';
                  const isShippingThis = shippingInvoice === order.invoiceNumber;

                  return (
                    <tr key={order.invoiceNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {order.invoiceNumber}
                        <span className="block text-[10px] font-sans font-normal text-slate-500 dark:text-slate-400">
                          {new Date(order.createdAt || Date.now()).toLocaleDateString('en-GB')}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">
                          {order.customerDetails?.name || 'Customer'}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                          {order.customerDetails?.phone}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          ৳{order.totalAmount}
                        </span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                          {order.totalQuantity || order.items?.length || 1} item(s)
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            order.paymentMethod === 'bKash'
                              ? 'bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-400 border border-pink-200 dark:border-pink-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {order.paymentMethod}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isDelivered
                              ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                              : isShipped
                              ? 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-500/30'
                              : order.orderStatus === 'Cancelled'
                              ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30'
                              : 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'
                          }`}
                        >
                          {order.orderStatus}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {isPending && (
                          <button
                            onClick={() => handleSendToSteadfast(order.invoiceNumber)}
                            disabled={isShippingThis}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
                          >
                            <TbTruckDelivery className="w-3.5 h-3.5" />
                            <span>
                              {isShippingThis ? 'Dispatching...' : 'Send to Steadfast Courier'}
                            </span>
                          </button>
                        )}

                        {isShipped && (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                              {order.courierData?.trackingCode || 'Steadfast'}
                            </span>
                            <a
                              href={order.courierData?.trackingUrl || `https://steadfast.com.bd/t/${order.courierData?.trackingCode}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-slate-800 dark:hover:text-white p-1"
                              title="Live Tracking Link"
                            >
                              <FiExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}

                        {isDelivered && (
                          <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                            <FiCheckCircle className="w-3.5 h-3.5" />
                            <span>Delivery Completed</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------- LOW STOCK ACTION WIDGET ---------------- */}
      {lowStockProducts.length > 0 && (
        <div className="bg-white dark:bg-[#1e293b] border border-amber-300 dark:border-amber-500/30 rounded-2xl p-5 shadow-sm dark:shadow-lg transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold text-sm">
              <FiAlertTriangle className="w-4 h-4" />
              <span>Products Requiring Stock Restock</span>
            </div>
            <Link
              to="/products"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
            >
              Manage All Products
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockProducts.slice(0, 6).map((product) => (
              <div
                key={product.id}
                className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={product.thumbnail}
                    alt={product.name}
                    className="w-10 h-10 rounded-lg object-cover bg-slate-200 dark:bg-slate-800 shrink-0"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="min-w-0">
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {product.name}
                    </h5>
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">
                      Stock: {product.stock} units left
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleQuickAddStock(product.id)}
                  className="bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white dark:bg-indigo-600/20 dark:hover:bg-indigo-600 dark:text-indigo-300 dark:hover:text-white border border-indigo-200 dark:border-indigo-500/30 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0"
                  title="Quick add 5 units"
                >
                  +5 Stock
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
