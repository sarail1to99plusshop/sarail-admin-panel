import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiExternalLink,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiPhone,
  FiMapPin,
  FiUser,
  FiEye,
  FiX,
  FiCheck,
} from 'react-icons/fi';
import { TbTruckDelivery } from 'react-icons/tb';
import {
  fetchAdminOrdersAPI,
  shipOrderSteadfastAPI,
  updateOrderStatusAPI,
  updateOrderPaymentStatusAPI,
  markOrderViewedAPI,
} from '../services/api';

const STATUS_TABS = [
  { id: 'all', label: 'All Orders' },
  { id: 'Pending', label: 'Pending' },
  { id: 'Processing', label: 'Processing' },
  { id: 'Shipped', label: 'Shipped (Steadfast)' },
  { id: 'Delivered', label: 'Delivered' },
  { id: 'Cancelled', label: 'Cancelled' },
];

const AdminOrders = () => {
  const [searchParams] = useSearchParams();
  const highlightInvoice = searchParams.get('highlight') || '';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState(highlightInvoice);
  const [shippingInvoice, setShippingInvoice] = useState('');
  const [statusUpdatingInvoice, setStatusUpdatingInvoice] = useState('');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [bkashModalOrder, setBkashModalOrder] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const loadOrders = useCallback(async () => {
    try {
      const data = await fetchAdminOrdersAPI({
        status: statusFilter,
        search,
        limit: 100,
      });
      setOrders(data?.orders || []);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to fetch orders.' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    loadOrders();
    if (highlightInvoice) {
      markOrderViewedAPI(highlightInvoice).catch(() => {});
    }
  }, [loadOrders, highlightInvoice]);

  const handleViewOrder = (order) => {
    setSelectedOrderDetails(order);
    if (!order.adminViewed) {
      markOrderViewedAPI(order.invoiceNumber).catch(() => {});
      setOrders((prev) =>
        prev.map((o) =>
          o.invoiceNumber === order.invoiceNumber ? { ...o, adminViewed: true } : o
        )
      );
    }
  };

  // Handle Send to Steadfast Courier
  const handleSendToSteadfast = async (invoiceNumber) => {
    setShippingInvoice(invoiceNumber);
    setFeedback({ type: '', text: '' });
    try {
      const res = await shipOrderSteadfastAPI(invoiceNumber);
      if (res?.success) {
        setFeedback({
          type: 'success',
          text: `Order #${invoiceNumber} handed over to Steadfast Courier! Status is now Shipped.`,
        });

        // Update local order state
        setOrders((prev) =>
          prev.map((o) => (o.invoiceNumber === invoiceNumber ? res.order : o))
        );
        if (selectedOrderDetails?.invoiceNumber === invoiceNumber) {
          setSelectedOrderDetails(res.order);
        }
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to dispatch order to Steadfast Courier.',
      });
    } finally {
      setShippingInvoice('');
    }
  };

  // Handle Manual Order Status Change
  const handleStatusChange = async (invoiceNumber, newStatus) => {
    setStatusUpdatingInvoice(invoiceNumber);
    setFeedback({ type: '', text: '' });
    try {
      const res = await updateOrderStatusAPI(invoiceNumber, newStatus);
      if (res?.success) {
        setFeedback({
          type: 'success',
          text: `Order #${invoiceNumber} status updated to "${newStatus}".`,
        });
        setOrders((prev) =>
          prev.map((o) => (o.invoiceNumber === invoiceNumber ? res.order : o))
        );
        if (selectedOrderDetails?.invoiceNumber === invoiceNumber) {
          setSelectedOrderDetails(res.order);
        }
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to update order status.',
      });
    } finally {
      setStatusUpdatingInvoice('');
    }
  };

  // Handle bKash Verification
  const handleVerifyBkash = async (invoiceNumber, paymentStatus, note = '') => {
    try {
      const res = await updateOrderPaymentStatusAPI(invoiceNumber, {
        paymentStatus,
        verificationNote: note,
      });
      if (res?.success) {
        setFeedback({
          type: 'success',
          text: `bKash payment for order #${invoiceNumber} marked as "${paymentStatus}".`,
        });
        setOrders((prev) =>
          prev.map((o) => (o.invoiceNumber === invoiceNumber ? res.order : o))
        );
        setBkashModalOrder(null);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to update bKash status.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ---------------- PAGE HEADER ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Order Fulfillment & Steadfast Courier Dispatch
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real customer orders from MongoDB • One-click Steadfast integration • Automatic status updates
          </p>
        </div>

        <button
          onClick={loadOrders}
          className="self-start sm:self-auto flex items-center gap-2 bg-white dark:bg-[#1e293b] hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm"
        >
          <FiRefreshCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* ---------------- FEEDBACK BANNER ---------------- */}
      {feedback.text && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 border shadow-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback({ type: '', text: '' })}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* ---------------- TABS & SEARCH BAR ---------------- */}
      <div className="space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-white dark:bg-[#1e293b] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <FiSearch className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Invoice # (SAR-...), Customer Phone, Customer Name, or Steadfast Tracking Code..."
            className="w-full bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* ---------------- ORDERS LIST / TABLE ---------------- */}
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-lg transition-colors">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading real orders from MongoDB Atlas...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No orders found under &quot;{statusFilter}&quot; status filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="py-3.5 px-4">Invoice & Date</th>
                  <th className="py-3.5 px-4">Customer & Location</th>
                  <th className="py-3.5 px-4">Items & Total</th>
                  <th className="py-3.5 px-4">Payment Info</th>
                  <th className="py-3.5 px-4">Status & Dispatch to Steadfast</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {orders.map((order) => {
                  const isShipped = order.orderStatus === 'Shipped';
                  const isDelivered = order.orderStatus === 'Delivered';
                  const isCancelled = order.orderStatus === 'Cancelled';
                  const isPending = order.orderStatus === 'Pending' || order.orderStatus === 'Processing';
                  const isShippingThis = shippingInvoice === order.invoiceNumber;
                  const isBkash = order.paymentMethod === 'bKash';

                  return (
                    <tr
                      key={order.invoiceNumber}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        order.invoiceNumber === highlightInvoice ? 'bg-indigo-50 dark:bg-indigo-950/30' : ''
                      }`}
                    >
                      {/* Invoice & Date */}
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-bold text-slate-900 dark:text-white text-xs block">
                          {order.invoiceNumber}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">
                          {new Date(order.createdAt || Date.now()).toLocaleString('en-GB', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </td>

                      {/* Customer Details */}
                      <td className="py-3.5 px-4">
                        <div className="max-w-[200px]">
                          <span className="font-bold text-slate-900 dark:text-white block truncate">
                            {order.customerDetails?.name || 'Customer'}
                          </span>
                          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 block font-mono">
                            {order.customerDetails?.phone}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                            {order.customerDetails?.address}
                          </span>
                        </div>
                      </td>

                      {/* Items & Amount */}
                      <td className="py-3.5 px-4">
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm block">
                          ৳{order.totalAmount}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          {order.totalQuantity || order.items?.length || 1} unit(s) •{' '}
                          {order.customerDetails?.deliveryLocation || 'Inside Dhaka'}
                        </span>
                      </td>

                      {/* Payment Info */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              isBkash
                                ? 'bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-400 border border-pink-200 dark:border-pink-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-transparent'
                            }`}
                          >
                            {order.paymentMethod}
                          </span>

                          {isBkash && (
                            <div className="text-[10px]">
                              <span className="text-slate-500 dark:text-slate-400">TrxID: </span>
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                {order.paymentDetails?.trxId || 'N/A'}
                              </span>
                              <button
                                onClick={() => setBkashModalOrder(order)}
                                className="block text-indigo-600 dark:text-indigo-400 hover:underline font-semibold mt-0.5"
                              >
                                {order.paymentStatus || 'Verify'}
                              </button>
                            </div>
                          )}

                          {!isBkash && (
                            <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                              Status: {order.paymentStatus || 'Pending'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status & Steadfast Action */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-2">
                          {/* Status Selector */}
                          <div className="flex items-center gap-2">
                            <select
                              value={order.orderStatus}
                              disabled={statusUpdatingInvoice === order.invoiceNumber}
                              onChange={(e) =>
                                handleStatusChange(order.invoiceNumber, e.target.value)
                              }
                              className={`rounded-lg px-2.5 py-1 text-xs font-bold border focus:outline-none ${
                                isDelivered
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                                  : isShipped
                                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-500/40 text-indigo-800 dark:text-indigo-300'
                                  : isCancelled
                                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300'
                                  : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300'
                              }`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Processing">Processing</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </div>

                          {/* Steadfast Dispatch Button */}
                          {isPending && (
                            <button
                              onClick={() => handleSendToSteadfast(order.invoiceNumber)}
                              disabled={isShippingThis}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
                            >
                              <TbTruckDelivery className="w-3.5 h-3.5" />
                              <span>
                                {isShippingThis ? 'Dispatching...' : 'Send to Steadfast Courier'}
                              </span>
                            </button>
                          )}

                          {/* Shipped with Steadfast tracking */}
                          {isShipped && (
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-slate-500 dark:text-slate-400">Steadfast:</span>
                              <a
                                href={
                                  order.courierData?.trackingUrl ||
                                  `https://steadfast.com.bd/t/${order.courierData?.trackingCode}`
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                              >
                                <span>{order.courierData?.trackingCode || 'Track'}</span>
                                <FiExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Quick Details View Button */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700/60 transition-colors"
                          title="View Complete Order Details"
                        >
                          <FiEye className="w-4 h-4" />
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

      {/* ---------------- ORDER DETAILS MODAL ---------------- */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl transition-colors">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Order #{selectedOrderDetails.invoiceNumber}
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Placed on{' '}
                  {new Date(selectedOrderDetails.createdAt || Date.now()).toLocaleString('en-GB')}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Customer Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                  Customer & Shipping Info
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Name:</span>
                    <span className="text-slate-900 dark:text-white font-bold">
                      {selectedOrderDetails.customerDetails?.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Phone:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">
                      {selectedOrderDetails.customerDetails?.phone}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 dark:text-slate-400 block">Address:</span>
                    <span className="text-slate-700 dark:text-slate-200">
                      {selectedOrderDetails.customerDetails?.address}
                    </span>
                  </div>
                  {selectedOrderDetails.customerDetails?.note && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 dark:text-slate-400 block">Customer Note:</span>
                      <span className="text-amber-600 dark:text-amber-300 italic">
                        &quot;{selectedOrderDetails.customerDetails?.note}&quot;
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Courier Status Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                    Steadfast Courier Delivery Data
                  </h4>
                  {selectedOrderDetails.orderStatus !== 'Shipped' &&
                    selectedOrderDetails.orderStatus !== 'Delivered' && (
                      <button
                        onClick={() => handleSendToSteadfast(selectedOrderDetails.invoiceNumber)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 px-3 rounded-lg text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                      >
                        <TbTruckDelivery className="w-3.5 h-3.5" />
                        <span>Send to Steadfast Courier</span>
                      </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Partner:</span>
                    <span className="text-slate-900 dark:text-white font-bold">
                      {selectedOrderDetails.courierData?.provider || 'Steadfast'} Courier
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Consignment ID:</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      #{selectedOrderDetails.courierData?.consignmentId || 'Pending'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Tracking Code:</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {selectedOrderDetails.courierData?.trackingCode || 'Pending'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Tracking URL:</span>
                    {selectedOrderDetails.courierData?.trackingCode ? (
                      <a
                        href={
                          selectedOrderDetails.courierData?.trackingUrl ||
                          `https://steadfast.com.bd/t/${selectedOrderDetails.courierData?.trackingCode}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>Open Steadfast Portal</span>
                        <FiExternalLink />
                      </a>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">Not dispatched yet</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Items Table */}
              <div>
                <h4 className="font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-2">
                  Purchased Items ({selectedOrderDetails.items?.length || 0})
                </h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {selectedOrderDetails.items?.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-10 h-10 rounded-lg object-cover bg-slate-200 dark:bg-slate-800 shrink-0"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <div>
                          <h5 className="font-bold text-slate-900 dark:text-white text-xs">{item.title}</h5>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            Color: {item.color || 'Standard'} • Qty: {item.quantity}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          ৳{(Number(item.price) || 0) * (Number(item.quantity) || 1)}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          ৳{item.price} each
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Subtotal:</span>
                  <span>৳{selectedOrderDetails.itemsSubtotal}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Delivery Charge:</span>
                  <span>৳{selectedOrderDetails.deliveryFee || 60}</span>
                </div>
                <div className="flex justify-between text-slate-900 dark:text-white font-extrabold text-sm pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span>Total Payable:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">৳{selectedOrderDetails.totalAmount}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- bKash VERIFICATION MODAL ---------------- */}
      {bkashModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0f172a] border border-pink-300 dark:border-pink-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl transition-colors">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-2">
              bKash Payment Verification
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Invoice #{bkashModalOrder.invoiceNumber} • Expected ৳{bkashModalOrder.totalAmount}
            </p>

            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs mb-6">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Transaction ID (TrxID):</span>
                <span className="font-mono font-black text-pink-600 dark:text-pink-400 text-sm">
                  {bkashModalOrder.paymentDetails?.trxId || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Sender Phone:</span>
                <span className="text-slate-900 dark:text-white font-mono">
                  {bkashModalOrder.paymentDetails?.senderPhone ||
                    bkashModalOrder.customerDetails?.phone}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">bKash Merchant/Personal No:</span>
                <span className="text-slate-900 dark:text-white font-mono font-semibold">01998789157</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleVerifyBkash(bkashModalOrder.invoiceNumber, 'Verified', 'Payment verified by Admin')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-colors"
              >
                <FiCheck className="w-4 h-4" />
                <span>Mark Verified</span>
              </button>
              <button
                onClick={() => handleVerifyBkash(bkashModalOrder.invoiceNumber, 'Rejected', 'Invalid TrxID or amount mismatch')}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/30 transition-colors"
              >
                <FiX className="w-4 h-4" />
                <span>Reject TrxID</span>
              </button>
            </div>

            <button
              onClick={() => setBkashModalOrder(null)}
              className="w-full mt-3 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white text-xs font-semibold py-1.5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;

