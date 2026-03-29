import React, { createContext, useContext, useState, ReactNode } from 'react';

// Types
export type Role = 'Manager' | 'Seller';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  total: number;
  date: string;
}

interface AppContextType {
  user: User | null;
  login: (email: string, role: Role) => void;
  logout: () => void;
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  sales: Sale[];
  addSale: (sale: Omit<Sale, 'id' | 'date'>) => void;
  currentPage: string;
  navigateTo: (page: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Mock Data
const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Wireless Mouse', category: 'Electronics', buyPrice: 15, sellPrice: 29.99, stock: 45 },
  { id: '2', name: 'Mechanical Keyboard', category: 'Electronics', buyPrice: 45, sellPrice: 89.99, stock: 12 },
  { id: '3', name: 'USB-C Cable', category: 'Accessories', buyPrice: 3, sellPrice: 9.99, stock: 150 },
  { id: '4', name: 'Monitor Stand', category: 'Furniture', buyPrice: 25, sellPrice: 49.99, stock: 8 },
  { id: '5', name: 'Webcam HD', category: 'Electronics', buyPrice: 30, sellPrice: 59.99, stock: 0 },
];

const INITIAL_SALES: Sale[] = [
  { id: '1', productId: '1', productName: 'Wireless Mouse', quantity: 2, total: 59.98, date: new Date().toISOString() },
  { id: '2', productId: '3', productName: 'USB-C Cable', quantity: 5, total: 49.95, date: new Date(Date.now() - 86400000).toISOString() },
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [sales, setSales] = useState<Sale[]>(INITIAL_SALES);
  const [currentPage, setCurrentPage] = useState('login');

  const login = (email: string, role: Role) => {
    setUser({ id: '1', name: email.split('@')[0], email, role });
    setCurrentPage('dashboard');
  };

  const logout = () => {
    setUser(null);
    setCurrentPage('login');
  };

  const addProduct = (product: Omit<Product, 'id'>) => {
    const newProduct = { ...product, id: Math.random().toString(36).substr(2, 9) };
    setProducts([...products, newProduct]);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(products.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const addSale = (saleData: Omit<Sale, 'id' | 'date'>) => {
    const newSale = {
      ...saleData,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString()
    };
    setSales([newSale, ...sales]);
    
    // Decrease stock
    const product = products.find(p => p.id === saleData.productId);
    if (product) {
      updateProduct(product.id, { stock: product.stock - saleData.quantity });
    }
  };

  const navigateTo = (page: string) => {
    setCurrentPage(page);
  };

  return (
    <AppContext.Provider value={{ 
      user, login, logout, 
      products, addProduct, updateProduct, deleteProduct,
      sales, addSale,
      currentPage, navigateTo 
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
