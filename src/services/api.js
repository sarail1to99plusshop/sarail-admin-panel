// In development mode on localhost, use empty base URL so requests go to the same origin (http://localhost:5174/api/...)
// and are proxied by Vite dev server directly to the backend. This eliminates CORS preflight issues entirely.
const isDev = import.meta.env.DEV;
export const API_BASE_URL = isDev
  ? ''
  : (import.meta.env.VITE_API_URL || 'https://store-backend-taupe-six.vercel.app');

const buildUrl = (path, params) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const base = API_BASE_URL
    ? API_BASE_URL.replace(/\/+$/, '')
    : (typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost:5174');
  const url = new URL(`${base}${cleanPath}`);

  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
};

const request = async (method, path, { params, data } = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  try {
    const token = localStorage.getItem('admin_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore
  }

  const response = await fetch(buildUrl(path, params), {
    method,
    headers,
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      try {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      } catch {
        // ignore
      }
    }
    const error = new Error(
      responseData?.message || `Request failed with status ${response.status}`
    );
    error.response = {
      status: response.status,
      data: responseData,
    };
    throw error;
  }

  return { data: responseData, status: response.status };
};

const api = {
  get: (path, config = {}) => request('GET', path, config),
  post: (path, data, config = {}) => request('POST', path, { ...config, data }),
  put: (path, data, config = {}) => request('PUT', path, { ...config, data }),
  patch: (path, data, config = {}) =>
    request('PATCH', path, { ...config, data }),
  delete: (path, config = {}) => request('DELETE', path, config),
};

// ---------------------------------------------------------------------------
// ADMIN AUTHENTICATION
// ---------------------------------------------------------------------------
export const adminLoginAPI = async ({ email, password }) => {
  const res = await api.post('/api/admin/login', { email, password });
  if (res.data?.token) {
    try {
      localStorage.setItem('admin_token', res.data.token);
      localStorage.setItem('admin_user', JSON.stringify(res.data.admin));
    } catch {
      // ignore
    }
  }
  return res.data;
};

// ---------------------------------------------------------------------------
// SYSTEM STATUS (Active / Disconnected MongoDB status)
// ---------------------------------------------------------------------------
export const fetchSystemStatusAPI = async () => {
  const res = await api.get('/api/admin/system-status');
  return res.data;
};

// ---------------------------------------------------------------------------
// PRODUCTS & REAL-TIME STOCK CONTROL
// ---------------------------------------------------------------------------
export const fetchAdminProductsAPI = async ({
  search = '',
  category = 'all',
  stockFilter = 'all',
} = {}) => {
  const res = await api.get('/api/admin/products', {
    params: { search, category, stockFilter },
  });
  return res.data.products || [];
};

export const createAdminProductAPI = async (productData) => {
  const res = await api.post('/api/admin/products', productData);
  return res.data.product;
};

export const updateAdminProductAPI = async (id, productData) => {
  const res = await api.put(`/api/admin/products/${id}`, productData);
  return res.data.product;
};

export const updateAdminProductStockAPI = async (id, { stock, delta }) => {
  const res = await api.patch(`/api/admin/products/${id}/stock`, {
    stock,
    delta,
  });
  return res.data.product;
};

export const deleteAdminProductAPI = async (id) => {
  const res = await api.delete(`/api/admin/products/${id}`);
  return res.data;
};

// ---------------------------------------------------------------------------
// ORDERS & STEADFAST COURIER DISPATCH
// ---------------------------------------------------------------------------
export const fetchAdminOrdersAPI = async ({
  status = 'all',
  paymentStatus = 'all',
  search = '',
  page = 1,
  limit = 50,
} = {}) => {
  const res = await api.get('/api/admin/orders', {
    params: { status, paymentStatus, search, page, limit },
  });
  return res.data;
};

export const shipOrderSteadfastAPI = async (
  invoiceNumber,
  { consignmentId, trackingCode, note } = {}
) => {
  const res = await api.post(
    `/api/admin/orders/${encodeURIComponent(invoiceNumber)}/ship-steadfast`,
    { consignmentId, trackingCode, note }
  );
  return res.data;
};

export const updateOrderStatusAPI = async (invoiceNumber, orderStatus) => {
  const res = await api.patch(
    `/api/admin/orders/${encodeURIComponent(invoiceNumber)}/status`,
    { orderStatus }
  );
  return res.data;
};

export const updateOrderPaymentStatusAPI = async (
  invoiceNumber,
  { paymentStatus, verificationNote }
) => {
  const res = await api.patch(
    `/api/admin/orders/${encodeURIComponent(invoiceNumber)}/payment-status`,
    { paymentStatus, verificationNote }
  );
  return res.data;
};

export const markOrderViewedAPI = async (invoiceNumber) => {
  const res = await api.patch(
    `/api/admin/orders/${encodeURIComponent(invoiceNumber)}/view`
  );
  return res.data;
};

export const markAllOrdersViewedAPI = async () => {
  const res = await api.patch('/api/admin/orders/mark-all-viewed');
  return res.data;
};

// ---------------------------------------------------------------------------
// MONTHLY DELIVERED REPORT
// ---------------------------------------------------------------------------
export const fetchMonthlyDeliveredReportAPI = async ({
  year = '',
  month = '',
} = {}) => {
  const res = await api.get('/api/admin/reports/monthly', {
    params: { year, month },
  });
  return res.data;
};

// ---------------------------------------------------------------------------
// REAL-TIME ORDER POLLING
// ---------------------------------------------------------------------------
export const pollRecentOrdersAPI = async (sinceTimestamp) => {
  const res = await api.get('/api/admin/orders/poll', {
    params: { since: sinceTimestamp },
  });
  return res.data;
};

// ---------------------------------------------------------------------------
// USER MANAGEMENT & USER ORDERS
// ---------------------------------------------------------------------------
export const fetchAdminUsersAPI = async ({ search = '', hasOrders = 'all' } = {}) => {
  const res = await api.get('/api/admin/users', {
    params: { search, hasOrders },
  });
  return res.data;
};

export const fetchAdminUserOrdersAPI = async (identifier) => {
  const res = await api.get(`/api/admin/users/${encodeURIComponent(identifier)}/orders`);
  return res.data;
};

export default api;

