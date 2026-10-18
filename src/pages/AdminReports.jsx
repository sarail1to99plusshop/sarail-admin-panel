import { useState, useEffect, useCallback } from 'react';
import {
  FiCalendar,
  FiDollarSign,
  FiShoppingBag,
  FiBox,
  FiDownload,
  FiRefreshCw,
  FiCheckCircle,
  FiArrowUpRight,
} from 'react-icons/fi';
import { fetchMonthlyDeliveredReportAPI } from '../services/api';

const MONTH_NAMES = [
  { value: '', label: 'All Months' },
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const AdminReports = () => {
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMonthlyDeliveredReportAPI({ year, month });
      setReportData(data);
    } catch (err) {
      console.error('Failed to load delivered report:', err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Export Delivered Report to CSV
  const handleExportCSV = () => {
    if (!reportData?.orders || reportData.orders.length === 0) {
      alert('No delivered orders to export for this period.');
      return;
    }

    const headers = [
      'Invoice Number',
      'Date Delivered',
      'Customer Name',
      'Customer Phone',
      'Delivery Address',
      'Location',
      'Payment Method',
      'Total Amount (BDT)',
      'Steadfast Tracking Code',
    ];

    const rows = reportData.orders.map((o) => [
      `"${o.invoiceNumber}"`,
      `"${new Date(o.createdAt || Date.now()).toLocaleDateString('en-GB')}"`,
      `"${(o.customerDetails?.name || '').replace(/"/g, '""')}"`,
      `"${o.customerDetails?.phone || ''}"`,
      `"${(o.customerDetails?.address || '').replace(/"/g, '""')}"`,
      `"${o.customerDetails?.deliveryLocation || 'Inside Dhaka'}"`,
      `"${o.paymentMethod || 'COD'}"`,
      o.totalAmount || 0,
      `"${o.courierData?.trackingCode || 'N/A'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `sarail_delivered_report_${year || 'all'}_${month || 'all'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = reportData?.summary || {};
  const monthlySummary = reportData?.monthlySummary || [];
  const topProducts = reportData?.topDeliveredProducts || [];
  const orders = reportData?.orders || [];

  return (
    <div className="space-y-6">
      {/* ---------------- PAGE HEADER ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Delivered Products & Monthly Sales Report
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Verified delivered product performance • Monthly trends • CSV Export
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={orders.length === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
          >
            <FiDownload className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={loadReport}
            className="p-2 rounded-xl bg-white dark:bg-[#1e293b] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/60 shadow-sm"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ---------------- PERIOD SELECTOR ---------------- */}
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm dark:shadow-lg flex flex-wrap items-center gap-3 transition-colors">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <FiCalendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Report Period:</span>
        </span>

        {/* Year Select */}
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
        >
          <option value="">All Years</option>
          <option value="2026">2026</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
        </select>

        {/* Month Select */}
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
        >
          {MONTH_NAMES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <span className="ml-auto text-xs text-indigo-600 dark:text-indigo-400 font-medium">
          Showing orders with status: <strong className="text-emerald-600 dark:text-emerald-400">Delivered</strong>
        </span>
      </div>

      {/* ---------------- KPI SUMMARY CARDS ---------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Delivered Revenue */}
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Delivered Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FiDollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">৳{summary.totalDeliveredRevenue || 0}</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Realized revenue from delivery</p>
          </div>
        </div>

        {/* Delivered Orders */}
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Completed Orders
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FiCheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{summary.totalDeliveredOrders || 0}</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Successful customer handoffs</p>
          </div>
        </div>

        {/* Units Sold */}
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Units Delivered
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <FiBox className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{summary.totalDeliveredUnits || 0}</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Products received by buyers</p>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Average Order Value
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FiArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">৳{summary.averageOrderValue || 0}</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Per delivered package</p>
          </div>
        </div>
      </div>

      {/* ---------------- MONTHLY HISTORICAL SUMMARY ---------------- */}
      {monthlySummary.length > 0 && (
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg transition-colors">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-3">
            Month-by-Month Delivery Performance
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="py-3 px-3">Period</th>
                  <th className="py-3 px-3">Delivered Orders</th>
                  <th className="py-3 px-3">Units Sold</th>
                  <th className="py-3 px-3">COD Revenue</th>
                  <th className="py-3 px-3">bKash Revenue</th>
                  <th className="py-3 px-3">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {monthlySummary.map((item) => (
                  <tr key={item.monthKey} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white font-mono">{item.monthKey}</td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-200">{item.orderCount} orders</td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-200">{item.itemsCount} units</td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400">৳{item.codRevenue}</td>
                    <td className="py-3 px-3 text-pink-600 dark:text-pink-400 font-semibold">৳{item.bkashRevenue}</td>
                    <td className="py-3 px-3 font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      ৳{item.revenue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- TOP DELIVERED PRODUCTS ---------------- */}
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg transition-colors">
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-3">
          Delivered Products Breakdown ({topProducts.length})
        </h3>

        {topProducts.length === 0 ? (
          <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
            No product delivery breakdown recorded for the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="py-3 px-3">Product</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Unit Price</th>
                  <th className="py-3 px-3">Delivered Units</th>
                  <th className="py-3 px-3">Total Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {topProducts.map((prod, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={prod.image}
                          alt={prod.title}
                          className="w-8 h-8 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 shrink-0"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <span className="font-bold text-slate-900 dark:text-white max-w-xs truncate">{prod.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{prod.category}</td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">৳{prod.unitPrice}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{prod.totalQuantitySold} units</td>
                    <td className="py-3 px-3 font-extrabold text-emerald-600 dark:text-emerald-400">
                      ৳{prod.totalRevenue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReports;

