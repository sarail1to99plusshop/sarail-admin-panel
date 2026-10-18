/**
 * Delivery Report PDF Generator
 * Generates an executive, print-optimized A4 Delivery & Sales Report
 * and triggers the browser's native Save-as-PDF / Print dialog.
 */

export const generateDeliveryReportPDF = (reportData, { year = '', month = '' } = {}) => {
  if (!reportData) {
    alert('No report data available to download.');
    return;
  }

  const summary = reportData.summary || {};
  const orders = reportData.orders || [];
  const topProducts = reportData.topDeliveredProducts || [];
  const monthlySummary = reportData.monthlySummary || [];

  const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthLabel = month ? MONTH_NAMES[parseInt(month, 10)] || month : 'All Months';
  const periodLabel = `${monthLabel} ${year || 'All Years'}`.trim();
  const generatedAt = new Date().toLocaleString('en-GB', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const logoUrl = `${window.location.origin}/logo.png`;

  // HTML content
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Delivery_Report_${year || 'all'}_${month || 'all'}.pdf</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      padding: 0;
      margin: 0;
      font-size: 11px;
      line-height: 1.4;
    }
    .no-print {
      background: #1e293b;
      color: #fff;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    .no-print h1 {
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .no-print .hint {
      font-size: 11px;
      color: #94a3b8;
    }
    .no-print .btn-group {
      display: flex;
      gap: 10px;
    }
    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #4f46e5;
      color: #fff;
    }
    .btn-primary:hover {
      background: #4338ca;
    }
    .btn-secondary {
      background: #334155;
      color: #f1f5f9;
    }
    .btn-secondary:hover {
      background: #475569;
    }
    .page-container {
      max-width: 210mm;
      margin: 20px auto;
      background: #ffffff;
      padding: 20mm 18mm;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
      border-radius: 4px;
    }
    @page {
      size: A4 portrait;
      margin: 12mm 10mm;
    }
    @media print {
      body {
        background: #fff !important;
      }
      .no-print {
        display: none !important;
      }
      .page-container {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
      }
      thead {
        display: table-header-group;
      }
      tr {
        page-break-inside: avoid;
      }
    }

    /* HEADER */
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 18px;
    }
    .brand-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo {
      width: 48px;
      height: 48px;
      object-fit: contain;
      border-radius: 8px;
      background: #f8fafc;
      padding: 4px;
      border: 1px solid #e2e8f0;
    }
    .brand-title {
      font-size: 18px;
      font-weight: 900;
      color: #1e1b4b;
      letter-spacing: -0.5px;
    }
    .brand-subtitle {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .report-title-section {
      text-align: right;
    }
    .report-badge {
      display: inline-block;
      padding: 3px 8px;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .report-heading {
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
    }
    .report-meta {
      font-size: 10px;
      color: #64748b;
      margin-top: 3px;
    }

    /* KPI CARDS */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 12px;
    }
    .kpi-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .kpi-value {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
      margin-top: 4px;
      font-family: 'Courier New', Courier, monospace;
    }
    .kpi-value.green {
      color: #059669;
    }
    .kpi-value.indigo {
      color: #4f46e5;
    }
    .kpi-desc {
      font-size: 9px;
      color: #94a3b8;
      margin-top: 2px;
    }

    /* SECTION TITLES */
    .section-title {
      font-size: 12px;
      font-weight: 800;
      color: #1e293b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 18px 0 8px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .section-badge {
      font-size: 10px;
      color: #64748b;
      font-weight: normal;
    }

    /* TABLES */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 10px;
    }
    th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 8.5px;
      letter-spacing: 0.5px;
      padding: 6px 8px;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #cbd5e1;
      text-align: left;
    }
    td {
      padding: 6px 8px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    tr:nth-child(even) td {
      background: #fbfcfd;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .font-mono {
      font-family: 'Courier New', Courier, monospace;
    }
    .font-bold {
      font-weight: 700;
    }
    .status-pill {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
    }
    .status-delivered {
      background: #dcfce7;
      color: #15803d;
    }
    .status-cod {
      background: #f1f5f9;
      color: #475569;
    }
    .status-bkash {
      background: #fce7f3;
      color: #be185d;
    }

    /* FOOTER */
    .report-footer {
      margin-top: 30px;
      padding-top: 14px;
      border-top: 2px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 9.5px;
      color: #64748b;
    }
    .signature-box {
      text-align: center;
      width: 160px;
      border-top: 1px solid #94a3b8;
      padding-top: 4px;
      font-size: 9.5px;
      font-weight: 600;
      color: #334155;
    }
  </style>
</head>
<body>

  <!-- Screen-only action toolbar -->
  <div class="no-print">
    <div>
      <h1>📄 Sarail 1 to 99 Plus Shop — Delivery Report</h1>
      <span class="hint">Period: ${periodLabel} • Orders: ${orders.length}</span>
    </div>
    <div class="btn-group">
      <button onclick="window.print()" class="btn btn-primary">🖨️ Save as PDF / Print</button>
      <button onclick="window.close()" class="btn btn-secondary">✕ Close</button>
    </div>
  </div>

  <div class="page-container">
    <!-- Header -->
    <div class="report-header">
      <div class="brand-section">
        <img src="${logoUrl}" alt="Logo" class="brand-logo" onerror="this.style.display='none'">
        <div>
          <div class="brand-title">Sarail 1 to 99 Plus Shop</div>
          <div class="brand-subtitle">সরাইল ১ টু ৯৯ প্লাস শপ • Authentic Quality Everyday</div>
          <div class="brand-subtitle">Hotline: +880 1998-789157 • Sarail, Brahmanbaria</div>
        </div>
      </div>
      <div class="report-title-section">
        <span class="report-badge">Official Document</span>
        <div class="report-heading">Delivered Orders Report</div>
        <div class="report-meta">Period: <strong>${periodLabel}</strong></div>
        <div class="report-meta">Generated: ${generatedAt}</div>
      </div>
    </div>

    <!-- KPI Summary Grid -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Delivered Revenue</div>
        <div class="kpi-value green">৳${(summary.totalDeliveredRevenue || 0).toLocaleString('en-BD')}</div>
        <div class="kpi-desc">Realized from customer delivery</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Completed Orders</div>
        <div class="kpi-value indigo">${summary.totalDeliveredOrders || 0}</div>
        <div class="kpi-desc">Successful parcels delivered</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Delivered Units</div>
        <div class="kpi-value">${summary.totalDeliveredUnits || 0}</div>
        <div class="kpi-desc">Total products handed over</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Avg. Order Value</div>
        <div class="kpi-value">৳${(summary.averageOrderValue || 0).toLocaleString('en-BD')}</div>
        <div class="kpi-desc">Per delivered customer order</div>
      </div>
    </div>

    <!-- Products Breakdown (if available) -->
    ${
      topProducts.length > 0
        ? `
      <div class="section-title">
        <span>Delivered Products Breakdown</span>
        <span class="section-badge">${topProducts.length} unique products</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 50%;">Product Title</th>
            <th style="width: 15%;">Category</th>
            <th style="width: 10%;" class="text-right">Unit Price</th>
            <th style="width: 10%;" class="text-center">Units Sold</th>
            <th style="width: 15%;" class="text-right">Total Revenue</th>
          </tr>
        </thead>
        <tbody>
          ${topProducts
            .slice(0, 15)
            .map(
              (p) => `
            <tr>
              <td class="font-bold">${p.title || 'Product'}</td>
              <td>${p.category || 'General'}</td>
              <td class="text-right font-mono">৳${p.unitPrice || 0}</td>
              <td class="text-center font-bold font-mono">${p.totalQuantitySold}</td>
              <td class="text-right font-bold font-mono" style="color: #047857;">৳${(
                p.totalRevenue || 0
              ).toLocaleString('en-BD')}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
        : ''
    }

    <!-- Delivered Orders Table -->
    <div class="section-title">
      <span>Delivered Orders Master Log</span>
      <span class="section-badge">Total ${orders.length} Records</span>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 15%;">Invoice #</th>
          <th style="width: 12%;">Date</th>
          <th style="width: 25%;">Customer & Phone</th>
          <th style="width: 20%;">Delivery Location</th>
          <th style="width: 10%;">Payment</th>
          <th style="width: 10%;">Steadfast Code</th>
          <th style="width: 8%;" class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${
          orders.length === 0
            ? `<tr><td colspan="7" class="text-center" style="padding: 20px; color: #94a3b8;">No delivered orders recorded for ${periodLabel}.</td></tr>`
            : orders
                .map(
                  (o) => `
            <tr>
              <td class="font-mono font-bold">${o.invoiceNumber}</td>
              <td class="font-mono">${new Date(
                o.createdAt || Date.now()
              ).toLocaleDateString('en-GB')}</td>
              <td>
                <div class="font-bold">${o.customerDetails?.name || 'Customer'}</div>
                <div class="font-mono" style="color: #4f46e5; font-size: 9px;">${
                  o.customerDetails?.phone || ''
                }</div>
              </td>
              <td>
                <div style="font-size: 9px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${o.customerDetails?.address || 'N/A'}
                </div>
                <div style="color: #64748b; font-size: 8.5px;">${
                  o.customerDetails?.deliveryLocation || 'Inside Dhaka'
                }</div>
              </td>
              <td>
                <span class="status-pill ${
                  o.paymentMethod === 'bKash' ? 'status-bkash' : 'status-cod'
                }">
                  ${o.paymentMethod || 'COD'}
                </span>
              </td>
              <td class="font-mono" style="font-size: 9px; color: #6b21a8;">
                ${o.courierData?.trackingCode || o.steadfastTrackingCode || 'N/A'}
              </td>
              <td class="text-right font-mono font-bold" style="color: #047857;">
                ৳${(o.totalAmount || 0).toLocaleString('en-BD')}
              </td>
            </tr>
          `
                )
                .join('')
        }
      </tbody>
      <tfoot>
        <tr style="background: #f1f5f9; font-weight: bold; border-top: 2px solid #cbd5e1;">
          <td colspan="6" class="text-right" style="padding: 8px;">TOTAL DELIVERED SUM:</td>
          <td class="text-right font-mono" style="padding: 8px; font-size: 12px; color: #047857;">
            ৳${(summary.totalDeliveredRevenue || 0).toLocaleString('en-BD')}
          </td>
        </tr>
      </tfoot>
    </table>

    <!-- Footer -->
    <div class="report-footer">
      <div>
        <div><strong>Sarail 1 to 99 Plus Shop</strong> • Official Delivery Log</div>
        <div style="margin-top: 2px;">This is an automated system generated report. All figures are verified.</div>
        <div style="margin-top: 2px; color: #94a3b8;">Printed from Admin Portal • Verification ID: SAR-DEL-${Date.now()}</div>
      </div>
      <div class="signature-box">
        Authorized Signature / Seal
      </div>
    </div>
  </div>

  <script>
    // Automatically trigger print dialog on page load
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>
  `;

  // Open printable window or fallback to iframe
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } else {
    // Fallback: If popup is blocked, create hidden iframe to print
    const existingFrame = document.getElementById('delivery-report-print-frame');
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'delivery-report-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow || iframe.contentDocument;
    const doc = frameDoc.document || frameDoc;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 500);
  }
};
