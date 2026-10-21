import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  FiGrid,
  FiBox,
  FiShoppingBag,
  FiBarChart2,
  FiLogOut,
  FiMenu,
  FiX,
  FiBell,
  FiVolume2,
  FiVolumeX,
  FiRefreshCw,
  FiExternalLink,
  FiShield,
  FiUsers,
} from 'react-icons/fi';
import { TbTruckDelivery } from 'react-icons/tb';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  fetchSystemStatusAPI,
  pollRecentOrdersAPI,
  markOrderViewedAPI,
  markAllOrdersViewedAPI,
} from '../services/api';
import { playNewOrderChime, showDesktopNotification } from '../utils/audioAlert';

const AdminLayout = () => {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState({
    databaseStatus: 'checking',
    databaseConnected: false,
    latencyMs: 0,
    host: '',
    loading: true,
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Persistent tracking of invoices that have already triggered an alert
  const alertedOrdersRef = useRef(null);
  if (alertedOrdersRef.current === null) {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('sarail_alerted_orders') : null;
      alertedOrdersRef.current = raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      alertedOrdersRef.current = new Set();
    }
  }

  // Helper to persist alerted orders
  const markInvoiceAsAlerted = useCallback((invoiceNumber) => {
    if (!invoiceNumber) return;
    try {
      if (!alertedOrdersRef.current) {
        alertedOrdersRef.current = new Set();
      }
      alertedOrdersRef.current.add(invoiceNumber);
      const recent = Array.from(alertedOrdersRef.current).slice(-200);
      localStorage.setItem('sarail_alerted_orders', JSON.stringify(recent));
    } catch {
      // ignore
    }
  }, []);

  const lastCheckedRef = useRef(null);

  // Sound toggle handler with audio test preview
  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (next) {
        playNewOrderChime();
      }
      return next;
    });
  }, []);

  // 1. Fetch system database status
  const checkDatabaseStatus = useCallback(async () => {
    setDbStatus((prev) => ({ ...prev, loading: true }));
    try {
      const data = await fetchSystemStatusAPI();
      setDbStatus({
        databaseStatus: data.databaseStatus || (data.databaseConnected ? 'active' : 'disconnected'),
        databaseConnected: Boolean(data.databaseConnected),
        latencyMs: data.latencyMs || 0,
        host: data.host || 'MongoDB Atlas',
        loading: false,
      });
    } catch {
      setDbStatus({
        databaseStatus: 'disconnected',
        databaseConnected: false,
        latencyMs: -1,
        host: 'Unavailable',
        loading: false,
      });
    }
  }, []);

  useEffect(() => {
    checkDatabaseStatus();
    const statusInterval = setInterval(checkDatabaseStatus, 30000);
    return () => clearInterval(statusInterval);
  }, [checkDatabaseStatus]);

  // Request browser desktop notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // 2. Real-time order poller (runs immediately on mount and every 4.5 seconds)
  useEffect(() => {
    let isCancelled = false;

    const poll = async () => {
      try {
        const since = lastCheckedRef.current;
        const res = await pollRecentOrdersAPI(since);

        if (isCancelled) return;

        if (res?.unviewedCount !== undefined) {
          setUnreadCount(res.unviewedCount);
        }

        if (res?.orders && Array.isArray(res.orders) && res.orders.length > 0) {
          const alertedSet = alertedOrdersRef.current || new Set();

          // Filter ONLY orders that have NOT been alerted before AND have not been marked as viewed
          const genuinelyNew = res.orders.filter(
            (o) => !o.adminViewed && !alertedSet.has(o.invoiceNumber)
          );

          if (genuinelyNew.length > 0) {
            genuinelyNew.forEach((o) => {
              markInvoiceAsAlerted(o.invoiceNumber);
            });

            const newestOrder = genuinelyNew[0];
            setNewOrderAlert(newestOrder);

            // Audio Alert chime
            if (soundEnabled) {
              playNewOrderChime();
            }

            // Desktop notification
            showDesktopNotification({
              title: `New Order #${newestOrder.invoiceNumber}!`,
              body: `Total: ৳${newestOrder.totalAmount} by ${newestOrder.customerDetails?.name || 'Customer'}. Click to view details.`,
              tag: newestOrder.invoiceNumber,
              invoiceNumber: newestOrder.invoiceNumber,
              totalAmount: newestOrder.totalAmount,
              customerDetails: newestOrder.customerDetails,
            });
          }
        }
        lastCheckedRef.current = res?.serverTime || new Date().toISOString();
      } catch (err) {
        console.error('Order polling error:', err);
      }
    };

    poll();
    const pollInterval = setInterval(poll, 4500);

    return () => {
      isCancelled = true;
      clearInterval(pollInterval);
    };
  }, [soundEnabled, markInvoiceAsAlerted]);

  // Dismiss notification banner and alert when admin navigates to /orders
  useEffect(() => {
    if (location.pathname === '/orders') {
      setUnreadCount(0);
      setNewOrderAlert(null);
      markAllOrdersViewedAPI().catch(() => {});
    }
  }, [location.pathname]);

  const navItems = [
    { label: 'Dashboard Overview', path: '/', icon: FiGrid },
    { label: 'Manage Products & Stock', path: '/products', icon: FiBox },
    { label: 'Customer Orders', path: '/orders', icon: FiShoppingBag },
    { label: 'Delivery & Locations', path: '/delivery', icon: TbTruckDelivery },
    { label: 'Customer Accounts', path: '/users', icon: FiUsers },
    { label: 'Delivered Reports', path: '/reports', icon: FiBarChart2 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row font-sans selection:bg-indigo-500 selection:text-white">
      {/* ---------------- MOBILE TOP BAR ---------------- */}
      <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-slate-700 hover:text-slate-900 bg-slate-100 rounded-lg focus:outline-none"
            aria-label="Open Navigation Menu"
          >
            <FiMenu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Sarail 1 to 99 Plus Logo"
              className="h-8 w-auto object-contain"
            />
            <span className="font-extrabold text-sm tracking-tight text-slate-900">
              Admin
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* DB Status Badge Mobile */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              dbStatus.databaseConnected
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-rose-50 border-rose-300 text-rose-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                dbStatus.databaseConnected
                  ? 'bg-emerald-500 animate-status-pulse'
                  : 'bg-rose-500'
              }`}
            />
            <span>{dbStatus.databaseConnected ? 'Active' : 'Disconnect'}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors"
            title={soundEnabled ? 'Chime sound is ON (click to mute)' : 'Chime sound is OFF (click to enable & test)'}
          >
            {soundEnabled ? (
              <FiVolume2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <FiVolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>
      </header>

      {/* ---------------- MOBILE DRAWER BACKDROP ---------------- */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ---------------- SIDEBAR (Desktop fixed, Mobile Drawer) ---------------- */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-50 transition-transform duration-300 ease-in-out shadow-lg md:shadow-none ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header with Logo */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo.png"
              alt="Sarail 1 to 99 Plus Logo"
              className="h-10 w-auto object-contain shrink-0 rounded-lg drop-shadow-sm"
            />
            <div className="min-w-0">
              <h1 className="font-black text-sm text-slate-900 tracking-tight truncate">
                Sarail 1 to 99+
              </h1>
              <p className="text-[11px] text-indigo-600 font-bold uppercase tracking-wider">
                Admin Panel
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-slate-500 hover:text-slate-900 p-1"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Database Status Card in Sidebar */}
        <div className="p-3.5 mx-3 my-3 rounded-xl bg-slate-50 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Database Status
            </span>
            <button
              onClick={checkDatabaseStatus}
              disabled={dbStatus.loading}
              title="Ping & Refresh Database Status"
              className="text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${dbStatus.loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                dbStatus.databaseConnected
                  ? 'bg-emerald-500 animate-status-pulse shadow-sm shadow-emerald-400/50'
                  : 'bg-rose-500 shadow-sm shadow-rose-500/50'
              }`}
            />
            <span
              className={`text-xs font-bold ${
                dbStatus.databaseConnected
                  ? 'text-emerald-700'
                  : 'text-rose-700'
              }`}
            >
              {dbStatus.databaseConnected ? 'Active (Connected)' : 'Disconnect'}
            </span>
          </div>

          <p className="text-[10px] text-slate-500 mt-1 truncate">
            {dbStatus.databaseConnected
              ? `${dbStatus.host} (${dbStatus.latencyMs}ms)`
              : 'MongoDB Offline / Reconnecting'}
          </p>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
                {item.path === '/orders' && unreadCount > 0 && (
                  <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* External Store Link & Admin Info */}
        <div className="p-4 border-t border-slate-200 space-y-3">
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold border border-slate-200 transition-colors"
          >
            <span className="flex items-center gap-2">
              <FiExternalLink className="w-3.5 h-3.5 text-indigo-600" />
              <span>Visit Customer Store</span>
            </span>
          </a>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-600">
                {admin?.name?.charAt(0) || 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {admin?.name || 'Admin'}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {admin?.email}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Logout from Admin"
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <FiLogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ---------------- MAIN CONTENT WRAPPER ---------------- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 transition-colors">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
              <FiShield className="w-3.5 h-3.5" />
              <span>Sarail 1 to 99 Plus • Admin Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Database Status Pill */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                dbStatus.databaseConnected
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-rose-50 border-rose-300 text-rose-700'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  dbStatus.databaseConnected
                    ? 'bg-emerald-500 animate-status-pulse'
                    : 'bg-rose-500'
                }`}
              />
              <span>
                Database: {dbStatus.databaseConnected ? 'Active (Connected)' : 'Disconnect'}
              </span>
              <button
                onClick={checkDatabaseStatus}
                disabled={dbStatus.loading}
                title="Ping Database"
                className="ml-1 text-slate-400 hover:text-slate-700"
              >
                <FiRefreshCw className={`w-3 h-3 ${dbStatus.loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={handleToggleSound}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 transition-colors"
              title={soundEnabled ? 'Chime sound is ON (click to mute)' : 'Chime sound is OFF (click to enable & test)'}
            >
              {soundEnabled ? (
                <>
                  <FiVolume2 className="w-4 h-4 text-emerald-600" />
                  <span>Sound ON</span>
                </>
              ) : (
                <>
                  <FiVolumeX className="w-4 h-4 text-slate-400" />
                  <span>Sound OFF</span>
                </>
              )}
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => {
                setUnreadCount(0);
                setNewOrderAlert(null);
                markAllOrdersViewedAPI().catch(() => {});
                navigate('/orders');
              }}
              className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors"
              title="Recent Orders"
            >
              <FiBell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* ---------------- REAL-TIME FLOATING ORDER ALERT TOAST ---------------- */}
      {newOrderAlert && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-white border-2 border-emerald-500 rounded-2xl p-4 shadow-2xl shadow-emerald-950/20 animate-in slide-in-from-bottom-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <h4 className="font-extrabold text-sm text-emerald-600 tracking-wide uppercase">
                New Order Received!
              </h4>
            </div>
            <button
              onClick={() => {
                if (newOrderAlert?.invoiceNumber) {
                  markInvoiceAsAlerted(newOrderAlert.invoiceNumber);
                  markOrderViewedAPI(newOrderAlert.invoiceNumber).catch(() => {});
                }
                setNewOrderAlert(null);
              }}
              className="text-slate-400 hover:text-slate-700 p-1"
              title="Dismiss Alert"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Invoice:</span>
              <span className="font-mono font-bold text-slate-900">
                {newOrderAlert.invoiceNumber}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Customer:</span>
              <span className="font-semibold text-slate-900 truncate max-w-[180px]">
                {newOrderAlert.customerDetails?.name || 'Customer'}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Amount:</span>
              <span className="font-black text-emerald-600 text-sm">
                ৳{newOrderAlert.totalAmount}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Payment:</span>
              <span className="font-bold text-amber-600">
                {newOrderAlert.paymentMethod}
              </span>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                const inv = newOrderAlert?.invoiceNumber;
                if (inv) {
                  markInvoiceAsAlerted(inv);
                  markOrderViewedAPI(inv).catch(() => {});
                }
                setNewOrderAlert(null);
                setUnreadCount(0);
                navigate(`/orders?highlight=${encodeURIComponent(inv || '')}`);
              }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/30"
            >
              <TbTruckDelivery className="w-4 h-4" />
              <span>View & Dispatch to Steadfast</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
