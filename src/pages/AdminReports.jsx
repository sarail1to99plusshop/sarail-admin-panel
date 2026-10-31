import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiCalendar,
  FiBox,
  FiPrinter,
  FiRefreshCw,
  FiCheckCircle,
  FiArrowUpRight,
  FiAlertTriangle,
} from 'react-icons/fi';
import { TbCurrencyTaka, TbFileSpreadsheet } from 'react-icons/tb';
import * as XLSX from 'xlsx';
import { fetchMonthlyDeliveredReportAPI } from '../services/api';
import { generateDeliveryReportPDF } from '../utils/deliveryReportPDF';

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

// Sanitize string cells to prevent spreadsheet formula injection (=, +, -, @)
const sanitizeCell = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/^[=+\-@]/.test(str)) {
    return `'${str}`;
  }
  return str;
};

const AdminReports = () => {
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportingExcel, setExportingExcel] = useState(false);

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

  // Dynamically populate available years from backend response or compute safe fallback
  const availableYears = useMemo(() => {
    if (
      reportData?.availableYears &&
      Array.isArray(reportData.availableYears) &&
      reportData.availableYears.length > 0
    ) {
      return reportData.availableYears;
    }
    const currentY = new Date().getFullYear();
    const years = [];
    for (let y = currentY; y >= 2024; y--) {
      years.push(String(y));
    }
    return years;
  }, [reportData?.availableYears]);

  // Export Delivered Report to Excel (.xlsx) with 3 sheets: Summary, Delivered Orders, Product Breakdown (R15)
  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      // Fetch full un-sliced delivered orders dataset for this period
      const fullData = await fetchMonthlyDeliveredReportAPI({
        year,
        month,
        export: true,
      });

      const exportOrders = fullData?.orders || [];
      const exportSummary = fullData?.summary || reportData?.summary || {};
      const exportProducts =
        fullData?.topDeliveredProducts || reportData?.topDeliveredProducts || [];

      if (exportOrders.length === 0) {
        alert('No delivered orders found to export for this period.');
        return;
      }

      const wb = XLSX.utils.book_new();

      // 1. Sheet: Summary
      const periodLabel = `${
        month ? MONTH_NAMES.find((m) => m.value === month)?.label : 'All Months'
      } ${year || 'All Years'}`;

      const summaryRows = [
        ['Sarail 1 to 99 Plus Shop - Delivered Sales Report'],
        ['Timezone', 'Asia/Dhaka (BST)'],
        ['Filtered Period', periodLabel],
        [
          'Report Generated At',
          new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' }),
        ],
        [''],
        ['Metric', 'Value'],
        ['Total Delivered Revenue (BDT)', exportSummary.totalDeliveredRevenue || 0],
        ['Total Completed Orders', exportSummary.totalDeliveredOrders || 0],
        ['Total Units Delivered', exportSummary.totalDeliveredUnits || 0],
        ['Average Order Value (BDT)', exportSummary.averageOrderValue || 0],
        [
          'Missing Delivered Date Orders (Reconciliation)',
          exportSummary.missingDeliveredDateCount || 0,
        ],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
      summarySheet['!cols'] = [{ wch: 34 }, { wch: 34 }];
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

      // 2. Sheet: Delivered Orders
      const ordersData = exportOrders.map((o) => {
        const deliveredDateStr = o.deliveredAt
          ? new Date(o.deliveredAt).toLocaleString('en-GB', {
              timeZone: 'Asia/Dhaka',
            })
          : o.createdAt
          ? new Date(o.createdAt).toLocaleString('en-GB', {
              timeZone: 'Asia/Dhaka',
            })
          : 'N/A';

        return {
          'Invoice Number': sanitizeCell(o.invoiceNumber),
          'Date Delivered (Dhaka)': deliveredDateStr,
          'Customer Name': sanitizeCell(o.customerDetails?.name || 'Customer'),
          'Customer Phone': `'${o.customerDetails?.phone || ''}`,
          District: sanitizeCell(o.customerDetails?.district || ''),
          'Delivery Address': sanitizeCell(o.customerDetails?.address || ''),
          'Delivery Zone': sanitizeCell(o.customerDetails?.deliveryLocation || ''),
          'Payment Method': sanitizeCell(o.paymentMethod || 'COD'),
          'Delivery Fee (BDT)': Number(o.deliveryCharge || 0),
          'Total Amount (BDT)': Number(o.totalAmount || 0),
          'Courier Provider': sanitizeCell(o.courierData?.provider || 'Steadfast'),
          'Steadfast Tracking Code': sanitizeCell(
            o.courierData?.trackingCode || o.steadfastTrackingCode || 'N/A'
          ),
        };
      });

      const ordersSheet = XLSX.utils.json_to_sheet(ordersData);
      ordersSheet['!cols'] = [
        { wch: 16 }, // Invoice
        { wch: 22 }, // Date Delivered
        { wch: 22 }, // Customer Name
        { wch: 16 }, // Phone
        { wch: 16 }, // District
        { wch: 35 }, // Address
        { wch: 20 }, // Zone
        { wch: 16 }, // Payment Method
        { wch: 18 }, // Delivery Fee
        { wch: 18 }, // Total Amount
        { wch: 16 }, // Courier
        { wch: 24 }, // Tracking Code
      ];
      XLSX.utils.book_append_sheet(wb, ordersSheet, 'Delivered Orders');

      // 3. Sheet: Product Breakdown
      const productRows = exportProducts.map((p) => ({
        'Product Name': sanitizeCell(p.title || p.name),
        Category: sanitizeCell(p.category || 'General'),
        'Average Unit Price (BDT)': Number(p.unitPrice || 0),
        'Delivered Quantity': Number(p.totalQuantitySold || p.totalSold || 0),
        'Delivered Revenue (BDT)': Number(p.totalRevenue || p.revenue || 0),
      }));

      const productsSheet = XLSX.utils.json_to_sheet(productRows);
      productsSheet['!cols'] = [
        { wch: 36 }, // Product Name
        { wch: 20 }, // Category
        { wch: 24 }, // Unit Price
        { wch: 20 }, // Quantity
        { wch: 24 }, // Revenue
      ];
      XLSX.utils.book_append_sheet(wb, productsSheet, 'Product Breakdown');

      const fileName = `sarail_delivered_report_${year || 'all'}_${month || 'all'}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Failed to export Excel report:', err);
      alert('Failed to export Excel report. Please try again.');
    } finally {
      setExportingExcel(false);
    }
  };

  // Download Delivered Report as PDF
  const handleDownloadPDF = () => {
    if (!reportData?.orders || reportData.orders.length === 0) {
      alert('No delivered orders to generate a PDF report for this period.');
      return;
    }
    generateDeliveryReportPDF(reportData, { year, month });
  };

  const summary = reportData?.summary || {};
  const monthlySummary = reportData?.monthlySummary || [];
  const topProducts = reportData?.topDeliveredProducts || [];
  const orders = reportData?.orders || [];
  const missingDates = reportData?.missingDeliveredDateCount || 0;

  return (
    <div className="space-y-6">
      {/* ---------------- PAGE HEADER ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Delivered Products & Monthly Sales Report
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified delivered product performance • Monthly trends • Official Excel (.xlsx) & PDF Export
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={orders.length === 0}
            className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Download Official Delivery Report PDF"
          >
            <FiPrinter className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={handleExportExcel}
            disabled={orders.length === 0 || exportingExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Export full Excel spreadsheet with Summary, Delivered Orders & Product Breakdown (.xlsx)"
          >
            <TbFileSpreadsheet className="w-4 h-4" />
            <span>{exportingExcel ? 'Exporting...' : 'Export to Excel'}</span>
          </button>
          <button
            onClick={loadReport}
            className="p-2 rounded-xl bg-white text-slate-700 hover:text-slate-900 border border-slate-200 shadow-sm transition-colors cursor-pointer"
            title="Refresh Report"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ---------------- MISSING DELIVERED DATE RECONCILIATION BANNER ---------------- */}
      {missingDates > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-center gap-3 text-amber-900 text-xs shadow-xs">
          <FiAlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <strong>Reconciliation Notice:</strong> {missingDates} delivered order(s) in the database are missing a confirmed delivery timestamp (`deliveredAt`) and are excluded from month-specific reports to ensure reporting integrity.
          </div>
        </div>
      )}

      {/* ---------------- PERIOD SELECTOR ---------------- */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3 transition-colors">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <FiCalendar className="w-4 h-4 text-[#2563EB]" />
          <span>Report Period:</span>
        </span>

        {/* Year Select (Dynamic from database) */}
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#2563EB] font-semibold"
        >
          <option value="">All Years</option>
          {availableYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        {/* Month Select */}
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#2563EB] font-semibold"
        >
          {MONTH_NAMES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <span className="ml-auto text-xs text-[#2563EB] font-medium">
          Showing orders with status: <strong className="text-emerald-700">Delivered</strong>
        </span>
      </div>

      {/* ---------------- KPI SUMMARY CARDS ---------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Delivered Revenue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Delivered Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TbCurrencyTaka className="w-5 h-5 text-emerald-700" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900">৳{summary.totalDeliveredRevenue || 0}</h3>
            <p className="text-[11px] text-slate-500 mt-1">Realized revenue from delivery</p>
          </div>
        </div>

        {/* Delivered Orders */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Completed Orders
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <FiCheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900">{summary.totalDeliveredOrders || 0}</h3>
            <p className="text-[11px] text-slate-500 mt-1">Successful customer handoffs</p>
          </div>
        </div>

        {/* Units Sold */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Units Delivered
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <FiBox className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900">{summary.totalDeliveredUnits || 0}</h3>
            <p className="text-[11px] text-slate-500 mt-1">Products received by buyers</p>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Average Order Value
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <FiArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900">৳{summary.averageOrderValue || 0}</h3>
            <p className="text-[11px] text-slate-500 mt-1">Per delivered package</p>
          </div>
        </div>
      </div>

      {/* ---------------- MONTHLY HISTORICAL SUMMARY ---------------- */}
      {monthlySummary.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-colors">
          <h3 className="text-base font-extrabold text-slate-900 mb-3">
            Month-by-Month Delivery Performance
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="py-3 px-3">Period</th>
                  <th className="py-3 px-3">Delivered Orders</th>
                  <th className="py-3 px-3">Units Sold</th>
                  <th className="py-3 px-3">COD Revenue</th>
                  <th className="py-3 px-3">bKash Revenue</th>
                  <th className="py-3 px-3">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlySummary.map((item) => (
                  <tr key={item.monthKey} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900 font-mono">{item.monthKey}</td>
                    <td className="py-3 px-3 text-slate-700">{item.orderCount} orders</td>
                    <td className="py-3 px-3 text-slate-700">{item.itemsCount} units</td>
                    <td className="py-3 px-3 text-slate-500">৳{item.codRevenue}</td>
                    <td className="py-3 px-3 text-pink-600 font-semibold">৳{item.bkashRevenue}</td>
                    <td className="py-3 px-3 font-black text-emerald-600 text-sm">
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
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-colors">
        <h3 className="text-base font-extrabold text-slate-900 mb-3">
          Delivered Products Breakdown ({topProducts.length})
        </h3>

        {topProducts.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No product delivery breakdown recorded for the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="py-3 px-3">Product</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Unit Price</th>
                  <th className="py-3 px-3">Delivered Units</th>
                  <th className="py-3 px-3">Total Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topProducts.map((prod, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={prod.image}
                          alt={prod.title}
                          className="w-8 h-8 rounded-lg object-cover bg-slate-100 shrink-0"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <span className="font-bold text-slate-900 max-w-xs truncate">{prod.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{prod.category}</td>
                    <td className="py-3 px-3 text-slate-600">৳{prod.unitPrice}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{prod.totalQuantitySold} units</td>
                    <td className="py-3 px-3 font-extrabold text-emerald-600">
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
