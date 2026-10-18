import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUsers,
  FiShoppingBag,
  FiSearch,
  FiRefreshCw,
  FiEye,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiTruck,
  FiX,
  FiExternalLink,
  FiPhone,
  FiMail,
  FiMapPin,
  FiCalendar,
  FiAward,
  FiCreditCard,
  FiPackage,
  FiDollarSign,
} from 'react-icons/fi';
import { fetchAdminUsersAPI, fetchAdminUserOrdersAPI } from '../services/api';

const AdminUsers = () => {
  const navigate = useNavigate();

  // Main list state
  const [users, setUsers] = useState([]);
  const [kpis, setKpis] = useState({ totalUsers: 0, activeBuyers: 0, totalRevenueFromUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'yes' (buyers), 'no' (non-buyers)
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  // User Orders Modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Fetch users from backend
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setFeedback({ type: '', text: '' });
    try {
      const data = await fetchAdminUsersAPI({
        search,
        hasOrders: filterType,
      });
      if (data?.success) {
        setUsers(data.users || []);
        if (data.kpis) {
          setKpis(data.kpis);
        }
      } else {
        setFeedback({ type: 'error', text: data?.message || 'Failed to fetch users.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Error loading users list from server.' });
    } finally {
      setLoading(false);
    }
  }, [search, filterType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  // Open User Orders Modal
  const handleOpenUserOrders = async (user) => {
    setSelectedUser(user);
    setUserOrders([]);
    setModalLoading(true);
    setModalError('');

    try {
      const identifier = user.uid || user._id || user.email || user.phone;
      const res = await fetchAdminUserOrdersAPI(identifier);
      if (res?.success) {
        setUserOrders(res.orders || []);
      } else {
        setModalError(res?.message || 'Could not load orders for this user.');
      }
    } catch (err) {
      setModalError(err.message || 'Failed to retrieve order history.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setUserOrders([]);
    setModalError('');
  };

  // Helper: Status badge color
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Shipped':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Processing':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Helper: Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ---------------- HEADER ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Customer Accounts
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {users.length} Registered
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse all registered customers, monitor their order count, total spending, and view order histories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-50"
            title="Refresh Users List"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ---------------- KPI SUMMARY CARDS ---------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total Customers
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {kpis.totalUsers}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Registered user accounts</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <FiUsers className="w-6 h-6" />
          </div>
        </div>

        {/* Active Buyers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Active Buyers
            </span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">
              {kpis.activeBuyers}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Placed at least 1 order</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <FiShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* Total Revenue From Registered Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Customer Total Spend
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              ৳{kpis.totalRevenueFromUsers.toLocaleString('en-BD')}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Total lifetime orders value</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600">
            <FiDollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Customer Conversion / Purchase Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Buyer Conversion
            </span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">
              {kpis.totalUsers > 0
                ? `${((kpis.activeBuyers / kpis.totalUsers) * 100).toFixed(0)}%`
                : '0%'}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Registered to buyer ratio</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <FiAward className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ---------------- FEEDBACK BANNER ---------------- */}
      {feedback.text && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between ${
            feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? (
              <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <FiCheckCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback({ type: '', text: '' })}
            className="text-slate-400 hover:text-slate-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* ---------------- SEARCH & FILTER BAR ---------------- */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <FiSearch className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, email, phone, or address..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filterType === 'all'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            All Customers ({kpis.totalUsers})
          </button>
          <button
            onClick={() => setFilterType('yes')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filterType === 'yes'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            With Orders ({kpis.activeBuyers})
          </button>
          <button
            onClick={() => setFilterType('no')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filterType === 'no'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            No Orders Yet ({kpis.totalUsers - kpis.activeBuyers})
          </button>
        </div>
      </div>

      {/* ---------------- CUSTOMERS TABLE ---------------- */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading customer accounts and order records...
          </div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            <FiUsers className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600">No customers found</p>
            <p className="text-slate-400 mt-1">
              {search
                ? `No results matching "${search}". Try searching with a different keyword.`
                : 'No registered customer accounts yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="py-3.5 px-4">Customer Details</th>
                  <th className="py-3.5 px-4">Contact & Location</th>
                  <th className="py-3.5 px-4 text-center">Orders Placed</th>
                  <th className="py-3.5 px-4">Total Spent</th>
                  <th className="py-3.5 px-4">Last Activity</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => {
                  const initial = (user.displayName || user.email || 'U')
                    .charAt(0)
                    .toUpperCase();
                  const hasOrders = user.ordersCount > 0;

                  return (
                    <tr
                      key={user._id || user.uid}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Customer Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt={user.displayName}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                              {initial}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs">
                                {user.displayName || 'Sarail Customer'}
                              </span>
                              {user.authProvider && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                                  {user.authProvider}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 block">
                              {user.email || 'No email provided'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              UID: {user.uid?.slice(0, 10)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact & Location */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 max-w-[220px]">
                          {user.phone ? (
                            <a
                              href={`tel:${user.phone}`}
                              className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 hover:underline"
                            >
                              <FiPhone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              <span>{user.phone}</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No phone saved</span>
                          )}
                          {user.address ? (
                            <div className="flex items-start gap-1 text-[11px] text-slate-600 truncate">
                              <FiMapPin className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                              <span className="truncate" title={user.address}>
                                {user.address}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 block">No address saved</span>
                          )}
                        </div>
                      </td>

                      {/* Orders Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            hasOrders
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          <FiShoppingBag className="w-3 h-3" />
                          {user.ordersCount} {user.ordersCount === 1 ? 'Order' : 'Orders'}
                        </span>
                      </td>

                      {/* Total Spent */}
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-black text-slate-900 text-sm block">
                          ৳{user.totalSpent?.toLocaleString('en-BD') || 0}
                        </span>
                        {hasOrders && user.recentStatus && (
                          <span
                            className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold border ${getStatusBadge(
                              user.recentStatus
                            )}`}
                          >
                            Latest: {user.recentStatus}
                          </span>
                        )}
                      </td>

                      {/* Last Activity */}
                      <td className="py-3.5 px-4">
                        <div className="text-[11px] space-y-0.5">
                          <span className="text-slate-600 block">
                            Reg: {formatDate(user.registeredAt || user.createdAt)}
                          </span>
                          {user.lastOrderDate ? (
                            <span className="text-indigo-600 font-medium block">
                              Last Order: {formatDate(user.lastOrderDate)}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px] block">
                              Last login: {formatDate(user.lastLoginAt)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenUserOrders(user)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-sm shadow-indigo-600/20 transition-all"
                        >
                          <FiEye className="w-3.5 h-3.5" />
                          <span>View Orders ({user.ordersCount})</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------- USER ORDERS DETAIL MODAL ---------------- */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  {(selectedUser.displayName || selectedUser.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>{selectedUser.displayName || 'Customer'}</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-700">
                      {userOrders.length} Order(s) Found
                    </span>
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-0.5">
                    {selectedUser.email && (
                      <span className="flex items-center gap-1">
                        <FiMail className="w-3 h-3 text-slate-400" />
                        {selectedUser.email}
                      </span>
                    )}
                    {selectedUser.phone && (
                      <span className="flex items-center gap-1 text-indigo-600 font-semibold">
                        <FiPhone className="w-3 h-3 text-slate-400" />
                        {selectedUser.phone}
                      </span>
                    )}
                    <span className="font-bold text-emerald-600 font-mono">
                      Lifetime Spend: ৳
                      {userOrders
                        .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0)
                        .toLocaleString('en-BD')}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
                title="Close"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {modalLoading ? (
                <div className="p-16 text-center text-slate-400 text-xs">
                  <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  Fetching full order records for {selectedUser.displayName}...
                </div>
              ) : modalError ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              ) : userOrders.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  <FiShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-700 text-sm">No Orders Found</p>
                  <p className="text-slate-400 mt-1 max-w-sm mx-auto">
                    This customer has not completed any orders yet. Once they place an order on the store, it will automatically show up here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userOrders.map((order, idx) => {
                    const isShipped = order.orderStatus === 'Shipped';
                    const isDelivered = order.orderStatus === 'Delivered';
                    const hasSteadfast =
                      order.steadfastConsignmentId || order.steadfastTrackingCode;

                    return (
                      <div
                        key={order._id || order.invoiceNumber || idx}
                        className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow"
                      >
                        {/* Order Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-black text-slate-900 text-sm">
                              #{order.invoiceNumber}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(
                                order.orderStatus
                              )}`}
                            >
                              {order.orderStatus}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                order.paymentStatus === 'Paid'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {order.paymentStatus || 'Pending Payment'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              {order.paymentMethod || 'COD'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <FiClock className="w-3 h-3" />
                              {formatDate(order.createdAt)}
                            </span>
                            <button
                              onClick={() => {
                                handleCloseModal();
                                navigate(`/orders?highlight=${order.invoiceNumber}`);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              <span>Manage Order</span>
                              <FiExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Steadfast Courier Info Box (if shipped) */}
                        {hasSteadfast && (
                          <div className="mt-3 p-3 rounded-lg bg-purple-50/70 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <FiTruck className="w-4 h-4 text-purple-600 flex-shrink-0" />
                              <div>
                                <span className="font-bold text-purple-900 block">
                                  Steadfast Courier Delivery
                                </span>
                                <span className="text-[11px] text-purple-700 font-mono">
                                  CID: {order.steadfastConsignmentId || 'N/A'} • Tracking Code:{' '}
                                  {order.steadfastTrackingCode || 'N/A'}
                                </span>
                              </div>
                            </div>
                            {order.steadfastTrackingCode && (
                              <a
                                href={`https://steadfast.com.bd/t/${order.steadfastTrackingCode}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-600 text-white font-bold text-[11px] hover:bg-purple-700 transition-colors"
                              >
                                <span>Track on Steadfast</span>
                                <FiExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}

                        {/* Customer & Shipping Details for this order */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                              Recipient Name & Phone
                            </span>
                            <span className="font-bold text-slate-800 block">
                              {order.customerDetails?.name || selectedUser.displayName}
                            </span>
                            <span className="text-indigo-600 font-mono text-[11px] block">
                              {order.customerDetails?.phone || selectedUser.phone}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                              Delivery Location
                            </span>
                            <span className="text-slate-800 block">
                              {order.customerDetails?.address || 'No specific address'}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              Zone: {order.customerDetails?.deliveryLocation || 'Inside Dhaka'}
                            </span>
                          </div>
                        </div>

                        {/* Items List */}
                        <div className="mt-3 divide-y divide-slate-100 border-t border-slate-100 pt-2">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Ordered Items ({order.items?.length || 0})
                          </span>
                          {order.items?.map((item, itemIdx) => (
                            <div
                              key={itemIdx}
                              className="py-2 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                {item.thumbnail ? (
                                  <img
                                    src={item.thumbnail}
                                    alt={item.name}
                                    className="w-10 h-10 rounded-lg object-cover border border-slate-200 bg-slate-100 flex-shrink-0"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                                    <FiPackage className="w-4 h-4" />
                                  </div>
                                )}
                                <div>
                                  <span className="font-semibold text-slate-900 block line-clamp-1">
                                    {item.name}
                                  </span>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                    {item.variant?.colorName && (
                                      <span className="inline-flex items-center gap-1">
                                        <span
                                          className="w-2.5 h-2.5 rounded-full border border-slate-300"
                                          style={{
                                            backgroundColor: item.variant.colorCode || '#ccc',
                                          }}
                                        />
                                        {item.variant.colorName}
                                      </span>
                                    )}
                                    <span>
                                      Qty: <b className="text-slate-700">{item.quantity}</b> × ৳
                                      {item.price}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right font-mono">
                                <span className="font-bold text-slate-900 text-xs block">
                                  ৳{(item.price * item.quantity).toLocaleString('en-BD')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Order Summary / Totals */}
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div className="text-slate-500 space-x-2">
                            <span>
                              Subtotal: ৳
                              {(
                                order.subtotal ||
                                order.totalAmount - (order.deliveryCharge || 0)
                              )?.toLocaleString('en-BD')}
                            </span>
                            <span>•</span>
                            <span>Delivery: ৳{order.deliveryCharge || 0}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] text-slate-500 mr-1.5">Grand Total:</span>
                            <span className="font-black text-emerald-600 font-mono text-sm">
                              ৳{order.totalAmount?.toLocaleString('en-BD')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Customer account: <b className="text-slate-700">{selectedUser.displayName}</b> (
                {selectedUser.email || selectedUser.phone || selectedUser.uid})
              </span>
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 active:scale-95 transition-all"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;

