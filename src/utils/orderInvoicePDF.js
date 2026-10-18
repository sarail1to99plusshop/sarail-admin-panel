/**
 * Single Order Delivery Invoice PDF Generator
 * Formats an order into an A4 Delivery Invoice & Packing Slip
 * and triggers Save-as-PDF / Print dialog.
 */

export const generateOrderInvoicePDF = (order) => {
  if (!order) {
    alert('No order data available.');
    return;
  }

  const invoiceNumber = order.invoiceNumber || 'INV-SAR';
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-GB', {
    dateStyle: 'medium',
  });
  const logoUrl = `${window.location.origin}/logo.png`;
  const items = order.items || [];
  const customer = order.customerDetails || {};

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice_${invoiceNumber}.pdf</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      font-size: 11px;
    }
    .no-print {
      background: #1e293b;
      color: #fff;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .btn {
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      border: none;
    }
    .btn-primary { background: #4f46e5; color: #fff; }
    .btn-secondary { background: #334155; color: #fff; }
    .page-container {
      max-width: 210mm;
      margin: 20px auto;
      background: #fff;
      padding: 18mm 16mm;
      border-radius: 4px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    }
    @page { size: A4 portrait; margin: 12mm 10mm; }
    @media print {
      body { background: #fff !important; }
      .no-print { display: none !important; }
      .page-container { max-width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; }
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .brand-logo { width: 44px; height: 44px; object-fit: contain; }
    .title { font-size: 18px; font-weight: 900; color: #1e1b4b; }
    .invoice-badge {
      font-size: 16px;
      font-weight: 900;
      color: #4f46e5;
      font-family: 'Courier New', monospace;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 18px;
    }
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
    }
    .card-title {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 4px;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    th {
      background: #f1f5f9;
      color: #475569;
      font-size: 9px;
      text-transform: uppercase;
      padding: 6px 8px;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #cbd5e1;
      text-align: left;
    }
    td { padding: 8px 8px; border-bottom: 1px solid #f1f5f9; font-size: 10px; }
    .total-box {
      width: 260px;
      margin-left: auto;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 20px;
    }
    .total-row { display: flex; justify-content: space-between; margin-bottom: 4px; color: #64748b; }
    .total-row.grand {
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
      margin-top: 6px;
      color: #0f172a;
      font-weight: 900;
      font-size: 13px;
    }
    .footer {
      border-top: 1px dashed #cbd5e1;
      padding-top: 14px;
      display: flex;
      justify-content: space-between;
      color: #94a3b8;
      font-size: 9px;
    }
  </style>
</head>
<body>
  <div class="no-print">
    <div style="font-weight: 700;">Delivery Invoice #${invoiceNumber}</div>
    <div>
      <button onclick="window.print()" class="btn btn-primary">🖨️ Save as PDF / Print</button>
      <button onclick="window.close()" class="btn btn-secondary" style="margin-left: 8px;">✕ Close</button>
    </div>
  </div>

  <div class="page-container">
    <div class="header">
      <div style="display: flex; gap: 10px; align-items: center;">
        <img src="${logoUrl}" alt="Logo" class="brand-logo" onerror="this.style.display='none'">
        <div>
          <div class="title">Sarail 1 to 99 Plus Shop</div>
          <div style="color: #64748b; font-size: 10px;">Sarail, Brahmanbaria • Hotline: 01998789157</div>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 9.5px; color: #64748b; text-transform: uppercase; font-weight: 700;">Delivery Invoice</div>
        <div class="invoice-badge">#${invoiceNumber}</div>
        <div style="font-size: 9.5px; color: #64748b;">Date: ${orderDate}</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="info-card">
        <div class="card-title">Recipient & Delivery Address</div>
        <div style="font-weight: 700; font-size: 12px;">${customer.name || 'Customer'}</div>
        <div style="color: #4f46e5; font-weight: 700; margin: 2px 0;">${customer.phone || 'N/A'}</div>
        <div style="color: #334155;">${customer.address || 'N/A'}</div>
        <div style="color: #64748b; font-size: 9.5px; margin-top: 2px;">Zone: ${customer.deliveryLocation || 'Inside Dhaka'}</div>
      </div>
      <div class="info-card">
        <div class="card-title">Courier & Payment Details</div>
        <div><strong>Status:</strong> <span style="color: #047857; font-weight: 700;">${order.orderStatus}</span></div>
        <div><strong>Payment Method:</strong> ${order.paymentMethod || 'COD'} (${order.paymentStatus || 'Pending'})</div>
        <div><strong>Steadfast Tracking:</strong> <span style="font-family: monospace; color: #6b21a8;">${order.steadfastTrackingCode || order.courierData?.trackingCode || 'Pending Pickup'}</span></div>
        ${order.paymentDetails?.trxId ? `<div><strong>bKash TrxID:</strong> <span style="font-family: monospace;">${order.paymentDetails.trxId}</span></div>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 50%;">Item Description</th>
          <th style="width: 15%; text-align: center;">Qty</th>
          <th style="width: 15%; text-align: right;">Unit Price</th>
          <th style="width: 20%; text-align: right;">Total (BDT)</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
          <tr>
            <td>
              <div style="font-weight: 700;">${item.name || item.title || 'Product'}</div>
              ${item.variant?.colorName ? `<div style="color: #64748b; font-size: 9px;">Color: ${item.variant.colorName}</div>` : ''}
            </td>
            <td style="text-align: center; font-weight: 700;">${item.quantity || 1}</td>
            <td style="text-align: right; font-family: monospace;">৳${item.price || 0}</td>
            <td style="text-align: right; font-family: monospace; font-weight: 700;">৳${((item.price || 0) * (item.quantity || 1)).toLocaleString('en-BD')}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <div class="total-box">
      <div class="total-row">
        <span>Items Subtotal:</span>
        <span style="font-family: monospace;">৳${(order.itemsSubtotal || order.totalAmount - (order.deliveryCharge || order.deliveryFee || 60)).toLocaleString('en-BD')}</span>
      </div>
      <div class="total-row">
        <span>Delivery Fee:</span>
        <span style="font-family: monospace;">৳${order.deliveryCharge || order.deliveryFee || 60}</span>
      </div>
      <div class="total-row grand">
        <span>Total Payable:</span>
        <span style="color: #047857; font-family: monospace;">৳${(order.totalAmount || 0).toLocaleString('en-BD')}</span>
      </div>
    </div>

    <div class="footer">
      <div>Thank you for choosing Sarail 1 to 99 Plus Shop! For inquiries, call +880 1998-789157.</div>
      <div style="text-align: right; border-top: 1px solid #94a3b8; width: 140px; text-align: center; padding-top: 2px;">Customer Signature</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 350);
    };
  </script>
</body>
</html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
};
