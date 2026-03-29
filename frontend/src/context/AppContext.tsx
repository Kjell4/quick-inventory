import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, productsApi, salesApi, dashboardApi, TokenStorage } from '../api';

export type Role = 'manager' | 'seller' | 'Manager' | 'Seller';

export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: Role;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  category_id?: number;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  barcode?: string;
  description?: string;
}

export interface Sale {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  total: number;
  date: string;
}

export interface DashboardStats {
  total_income: number;
  total_expenses: number;
  total_profit: number;
  low_stock_count: number;
  total_products: number;
}

interface AppContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  setError: (e: string | null) => void;
  login: (username: string, password: string) => Promise<void>;
  signup: (payload: {
    username: string; password: string; email?: string;
    first_name?: string; last_name?: string; role?: string;
  }) => Promise<void>;
  logout: () => void;
  products: Product[];
  productsLoading: boolean;
  fetchProducts: (search?: string) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: number, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  sales: Sale[];
  salesLoading: boolean;
  fetchSales: () => Promise<void>;
  addSale: (sale: { productId: number; quantity: number }) => Promise<void>;
  deleteSale: (id: number) => Promise<void>;
  closeDay: () => Promise<void>;
  dashboardStats: DashboardStats | null;
  fetchDashboard: () => Promise<void>;
  currentPage: string;
  navigateTo: (page: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function mapProduct(p: any): Product {
  return {
    id: p.id, name: p.name, category: p.category || '',
    category_id: p.category_id, buyPrice: p.purchase_price,
    sellPrice: p.sale_price, stock: p.quantity,
    barcode: p.barcode || '', description: p.description || '',
  };
}

function mapSale(s: any): Sale {
  return {
    id: s.id, productId: s.product_id, productName: s.product_name,
    quantity: s.quantity, total: s.total_price,
    date: s.sale_date + 'T00:00:00',
  };
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    const token = TokenStorage.getAccess();
    if (token) {
      authApi.me()
        .then((data: any) => {
          setUser({ id: data.id, username: data.username,
            name: data.first_name ? `${data.first_name} ${data.last_name}`.trim() : data.username,
            email: data.email, role: data.role });
        })
        .catch(() => TokenStorage.clear())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setError(null);
    const data = await authApi.login(username, password);
    TokenStorage.setTokens(data.access, data.refresh);
    setUser({ id: data.user.id, username: data.user.username,
      name: data.user.first_name ? `${data.user.first_name} ${data.user.last_name}`.trim() : data.user.username,
      email: data.user.email, role: data.user.role });
    setCurrentPage('dashboard');
  }, []);

  const signup = useCallback(async (payload: any) => {
    setError(null);
    const data = await authApi.signup(payload);
    TokenStorage.setTokens(data.access, data.refresh);
    setUser({ id: data.user.id, username: data.user.username,
      name: data.user.first_name ? `${data.user.first_name} ${data.user.last_name}`.trim() : data.user.username,
      email: data.user.email, role: data.user.role });
    setCurrentPage('dashboard');
  }, []);

  const logout = useCallback(() => {
    TokenStorage.clear(); setUser(null); setProducts([]); setSales([]); setDashboardStats(null);
  }, []);

  const fetchProducts = useCallback(async (search = '') => {
    setProductsLoading(true);
    try {
      const data = await productsApi.list(search);
      setProducts(data.products.map(mapProduct));
    } catch (e: any) { setError(e.message); }
    finally { setProductsLoading(false); }
  }, []);

  const addProduct = useCallback(async (product: Omit<Product, 'id'>) => {
    const data = await productsApi.create({
      name: product.name, category: product.category, quantity: product.stock,
      purchase_price: product.buyPrice, sale_price: product.sellPrice,
      description: product.description || '', barcode: product.barcode || '',
    });
    setProducts(prev => [...prev, mapProduct(data)]);
  }, []);

  const updateProduct = useCallback(async (id: number, updates: Partial<Product>) => {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.stock !== undefined) payload.quantity = updates.stock;
    if (updates.buyPrice !== undefined) payload.purchase_price = updates.buyPrice;
    if (updates.sellPrice !== undefined) payload.sale_price = updates.sellPrice;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.barcode !== undefined) payload.barcode = updates.barcode;
    const data = await productsApi.update(id, payload);
    setProducts(prev => prev.map(p => p.id === id ? mapProduct(data) : p));
  }, []);

  const deleteProduct = useCallback(async (id: number) => {
    await productsApi.delete(id);
    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  const fetchSales = useCallback(async () => {
    setSalesLoading(true);
    try {
      const data = await salesApi.today();
      setSales(data.sales.map(mapSale));
    } catch (e: any) { setError(e.message); }
    finally { setSalesLoading(false); }
  }, []);

  const addSale = useCallback(async ({ productId, quantity }: { productId: number; quantity: number }) => {
    const data = await salesApi.record(productId, quantity);
    setSales(prev => [mapSale(data), ...prev]);
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: p.stock - quantity } : p));
  }, []);

  const deleteSale = useCallback(async (id: number) => {
    await salesApi.delete(id);
    setSales(prev => prev.filter(s => s.id !== id));
    fetchProducts();
  }, [fetchProducts]);

  const closeDay = useCallback(async () => {
    await salesApi.closeDay();
    setSales([]);
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await dashboardApi.stats();
      setDashboardStats({ total_income: data.total_income, total_expenses: data.total_expenses,
        total_profit: data.total_profit, low_stock_count: data.low_stock_count,
        total_products: data.total_products });
      if (data.recent_sales) setSales(data.recent_sales.map(mapSale));
    } catch (e: any) { setError(e.message); }
  }, []);

  const navigateTo = useCallback((page: string) => {
    setCurrentPage(page); setError(null);
  }, []);

  return (
    <AppContext.Provider value={{
      user, loading, error, setError,
      login, signup, logout,
      products, productsLoading, fetchProducts, addProduct, updateProduct, deleteProduct,
      sales, salesLoading, fetchSales, addSale, deleteSale, closeDay,
      dashboardStats, fetchDashboard,
      currentPage, navigateTo,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
