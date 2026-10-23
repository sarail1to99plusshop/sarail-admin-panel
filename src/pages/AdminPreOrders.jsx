import { useState, useEffect, useCallback } from 'react';
import {
  FiInbox,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiPhone,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiAlertCircle,
  FiMessageSquare,
  FiCalendar,
  FiUser,
  FiBox,
} from 'react-icons/fi';
import { TbBrandWhatsapp } from 'react-icons/tb';
import { fetchAdminPreOrdersAPI, updateAdminPreOrderStatusAPI } from '../services/api';

const STATUS_CONFIG = {
  Pending: {
    label: 'Pending',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-500/30',
    dot: 'bg-amber-500',
    icon: FiClock,
  },
  Contacted: {
    label: 'Contacted',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-500/30',
    dot: 'bg-blue-500',
    icon: FiPhone,
  },
  Fulfilled: {
    label: 'Fulfilled',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-500/30',
    dot: 'bg-emerald-500',
    icon: FiCheckCircle,
  },
  Cancelled: {
    label: 'Cancelled',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-500/30',
    dot: 'bg-rose-500',
    icon: FiXCircle,
  },
};

const AdminPreOrders = () => {
  const [preOrders, setPreOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const loadPreOrders = useCallback(async () => {
    try {
      const res = await fetchAdminPreOrdersAPI();
      if (res?.preOrders && Array.isArray(res.preOrders)) {
        setPreOrders(res.preOrders);
      }
    } catch (err) {
      console.error('Failed to load pre-orders:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to fetch pre-orders from database.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPreOrders();
  }, [loadPreOrders]);

  const handleRefresh = () => {
    setRefreshing(true);
    setFeedback({ type: '', message: '' });
    loadPreOrders();
  };

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id);
    setFeedback({ type: '', message: '' });
    try {
      const res = await updateAdminPreOrderStatusAPI(id, newStatus);
      if (res?.success) {
        setPreOrders((prev) =>
          prev.map((item) =>
            (item._id === id || item.id === id) ? { ...item, status: newStatus } : item
          )
        );
        setFeedback({
          type: 'success',
          message: `Pre-order updated to "${newStatus}".`,
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Could not update pre-order status.',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredPreOrders = preOrders.filter((po) => {
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      po.productName?.toLowerCase().includes(query) ||
      po.customerName?.toLowerCase().includes(query) ||
      po.phone?.includes(query) ||
      po.notes?.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const countByStatus = {
    all: preOrders.length,
    Pending: preOrders.filter((p) => p.status === 'Pending').length,
    Contacted: preOrders.filter((p) => p.status === 'Contacted').length,
    Fulfilled: preOrders.filter((p) => p.status === 'Fulfilled').length,
    Cancelled: preOrders.filter((p) => p.status === 'Cancelled').length,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ---------------- HEADER ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center">
              <FiInbox className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Customer Pre-Orders & Custom Requests
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Special dinner sets, wholesale kitchenware, and custom sourcing requests
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          <FiRefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* ---------------- FEEDBACK BANNER ---------------- */}
      {feedback.message && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in duration-150 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-500/30 dark:text-emerald-300'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/60 dark:border-rose-500/30 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <FiCheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <FiAlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback({ type: '', message: '' })}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* ---------------- STATS COUNTERS ---------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { key: 'Pending', label: 'Pending Response', color: 'amber', icon: FiClock },
          { key: 'Contacted', label: 'Contacted / Sourcing', color: 'blue', icon: FiPhone },
          { key: 'Fulfilled', label: 'Fulfilled / Delivered', color: 'emerald', icon: FiCheckCircle },
          { key: 'Cancelled', label: 'Cancelled', color: 'rose', icon: FiXCircle },
        ].map((item) => {
          const Icon = item.icon;
          const count = countByStatus[item.key] || 0;
          return (
            <div
              key={item.key}
              onClick={() => setStatusFilter(item.key)}
              className={`p-4 rounded-2xl border bg-white dark:bg-[#1e293b] cursor-pointer transition-all ${
                statusFilter === item.key
                  ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-bold">{item.label}</span>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                {count}
              </p>
            </div>
          );
        })}
      </div>

      {/* ---------------- SEARCH & FILTER TABS ---------------- */}
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product, customer, phone number, or notes..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-bold">
            <span className="text-slate-400 mr-1 flex items-center gap-1 text-[11px]">
              <FiFilter className="w-3.5 h-3.5" /> Filter:
            </span>
            {['all', 'Pending', 'Contacted', 'Fulfilled', 'Cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl capitalize transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {st} ({countByStatus[st] ?? preOrders.length})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---------------- PRE-ORDERS TABLE ---------------- */}
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-semibold">Loading pre-orders from MongoDB...</p>
          </div>
        ) : filteredPreOrders.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <FiInbox className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No Pre-Orders Found
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {search || statusFilter !== 'all'
                ? 'No pre-orders matched your current search or filter criteria.'
                : 'Customer pre-orders placed from the website will appear here in real-time.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Requested Product</th>
                  <th className="py-3.5 px-4 font-bold">Customer Details</th>
                  <th className="py-3.5 px-4 font-bold">Contact & Action</th>
                  <th className="py-3.5 px-4 font-bold">Customer Notes</th>
                  <th className="py-3.5 px-4 font-bold">Date Submitted</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredPreOrders.map((po) => {
                  const id = po._id || po.id;
                  const cfg = STATUS_CONFIG[po.status] || STATUS_CONFIG.Pending;
                  const StatusIcon = cfg.icon;
                  const isUpdating = updatingId === id;
                  const cleanPhone = (po.phone || '').replace(/\D/g, '');
                  const whatsappPhone = cleanPhone.startsWith('880')
                    ? cleanPhone
                    : cleanPhone.startsWith('0')
                    ? `88${cleanPhone}`
                    : `880${cleanPhone}`;

                  return (
                    <tr
                      key={id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Product Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <FiBox className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 dark:text-white text-sm block">
                              {po.productName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              ID: {String(id).slice(-8)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block flex items-center gap-1">
                            <FiUser className="w-3 h-3 text-slate-400" />
                            {po.customerName}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 text-[11px] font-mono block">
                            {po.phone}
                          </span>
                          {po.email && (
                            <span className="text-slate-400 text-[10px] block">
                              {po.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Contact Shortcuts */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {po.phone && (
                            <>
                              <a
                                href={`tel:${po.phone}`}
                                title={`Call ${po.customerName}`}
                                className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                              >
                                <FiPhone className="w-3.5 h-3.5" />
                                <span>Call</span>
                              </a>
                              <a
                                href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
                                  `আসসালামু আলাইকুম ${po.customerName}, Sarail 1 to 99 Plus Shop থেকে আপনার প্রি-অর্ডার "${po.productName}" সংক্রান্ত বিষয়ে যোগাযোগ করছি।`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Chat on WhatsApp"
                                className="p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 dark:bg-green-950/40 dark:border-green-500/30 dark:text-green-400 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                              >
                                <TbBrandWhatsapp className="w-4 h-4 text-green-600" />
                                <span>WhatsApp</span>
                              </a>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Notes */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {po.notes ? (
                          <div className="flex items-start gap-1 text-slate-600 dark:text-slate-300">
                            <FiMessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                            <p className="truncate text-xs font-normal" title={po.notes}>
                              {po.notes}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No notes</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1 text-[11px]">
                          <FiCalendar className="w-3 h-3 text-slate-400" />
                          <span>
                            {new Date(po.createdAt || Date.now()).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.badge}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            <StatusIcon className="w-3 h-3" />
                            <span>{po.status}</span>
                          </span>

                          <select
                            disabled={isUpdating}
                            value={po.status}
                            onChange={(e) => handleStatusChange(id, e.target.value)}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
                          >
                            <option value="Pending">Mark Pending</option>
                            <option value="Contacted">Mark Contacted</option>
                            <option value="Fulfilled">Mark Fulfilled</option>
                            <option value="Cancelled">Mark Cancelled</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPreOrders;

