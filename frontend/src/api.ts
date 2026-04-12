/**
 * api.ts — HTTP-клиент для Quick Inventory Django бэкенда
 * Базовый URL задаётся через REACT_APP_API_URL (по умолчанию http://localhost:8000)
 */

const BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000') + '/api/v2';

// ─── Token storage ─────────────────────────────────────────────────
export const TokenStorage = {
  getAccess: () => localStorage.getItem('qi_access') || '',
  getRefresh: () => localStorage.getItem('qi_refresh') || '',
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem('qi_access', access);
    localStorage.setItem('qi_refresh', refresh);
  },
  clear: () => {
    localStorage.removeItem('qi_access');
    localStorage.removeItem('qi_refresh');
  },
};

// ─── Core fetch wrapper ────────────────────────────────────────────
async function apiFetch(
  path: string,
  options: RequestInit = {},
  authenticated = true
): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authenticated) {
    const token = TokenStorage.getAccess();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Попробовать обновить токен если 401
  if (res.status === 401 && authenticated) {
    const refresh = TokenStorage.getRefresh();
    if (refresh) {
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (refreshRes.ok) {
        const { access } = await refreshRes.json();
        TokenStorage.setTokens(access, refresh);
        // Повторить запрос с новым токеном
        headers['Authorization'] = `Bearer ${access}`;
        const retryRes = await fetch(`${BASE_URL}${path}`, { ...options, headers });
        return retryRes.json();
      }
    }
    // refresh не сработал — сбросить сессию
    TokenStorage.clear();
    window.location.reload();
    throw new Error('Session expired');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data;
}

// ─── Auth ──────────────────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    apiFetch('/auth/login/', { method: 'POST', body: JSON.stringify({ username, password }) }, false),

  signup: (payload: {
    username: string;
    password: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  }) =>
    apiFetch('/auth/signup/', { method: 'POST', body: JSON.stringify(payload) }, false),

  me: () => apiFetch('/auth/me/'),
};

// ─── Products ──────────────────────────────────────────────────────
export const productsApi = {
  list: (search = '', category = '') =>
    apiFetch(`/products/?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`),

  get: (id: number) => apiFetch(`/products/${id}/`),

  create: (payload: {
    name: string;
    category: string;
    quantity: number;
    purchase_price: number;
    sale_price: number;
    description?: string;
    barcode?: string;
  }) =>
    apiFetch('/products/', { method: 'POST', body: JSON.stringify(payload) }),

  update: (id: number, payload: Partial<{
    name: string;
    category: string;
    quantity: number;
    purchase_price: number;
    sale_price: number;
    description: string;
    barcode: string;
  }>) =>
    apiFetch(`/products/${id}/`, { method: 'PUT', body: JSON.stringify(payload) }),

  delete: (id: number) =>
    apiFetch(`/products/${id}/`, { method: 'DELETE' }),
};

// ─── Sales ─────────────────────────────────────────────────────────
export const salesApi = {
  today: () => apiFetch('/sales/today/'),

  byDate: (date: string) => apiFetch(`/sales/?date=${date}`),

  record: (product_id: number, quantity: number) =>
    apiFetch('/sales/', { method: 'POST', body: JSON.stringify({ product_id, quantity }) }),

  delete: (saleId: number) =>
    apiFetch(`/sales/${saleId}/delete/`, { method: 'DELETE' }),

  closeDay: () =>
    apiFetch('/sales/close-day/', { method: 'POST' }),
};

// ─── Dashboard ─────────────────────────────────────────────────────
export const dashboardApi = {
  stats: () => apiFetch('/dashboard/'),
};

// ─── Categories ────────────────────────────────────────────────────
export const categoriesApi = {
  list: () => apiFetch('/categories/'),
};

// ─── Barcode / QrBot API ──────────────────────────────────────────
const DJANGO_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const barcodeApi = {
  /** GET /api/scans/ — список всех сканов (QrBot накапливает в памяти) */
  getScans: (): Promise<{ scans: { content: string; format: string }[]; total: number }> =>
    fetch(`${DJANGO_BASE}/api/scans/`).then(r => r.json()),

  /** GET /api/barcode/lookup/?code=XXX — найти товар по баркоду */
  lookup: (code: string): Promise<{
    found: boolean;
    product?: {
      id: number; name: string; barcode: string;
      quantity: number; sale_price: number;
      purchase_price: number; category: string;
    };
  }> =>
    fetch(`${DJANGO_BASE}/api/barcode/lookup/?code=${encodeURIComponent(code)}`).then(r => r.json()),

  /** POST /api/scans/sell/ — продать товар по баркоду (QrBot-совместимый эндпоинт) */
  sell: (barcode: string, quantity: number): Promise<{
    success: boolean; product?: string; remaining?: number; total_price?: number; error?: string;
  }> =>
    fetch(`${DJANGO_BASE}/api/scans/sell/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `content=${encodeURIComponent(barcode)}&quantity=${quantity}`,
    }).then(r => r.json()),
};
