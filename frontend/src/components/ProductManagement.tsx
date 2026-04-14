import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp, Product } from '../context/AppContext';
import { Card, Button, Input } from './ui/Shared';
import { Search, Plus, Trash2, Edit2, AlertCircle, RefreshCw, Camera, X, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { barcodeApi, categoriesApi } from '../api';

// ─── Barcode polling hook ────────────────────────────────────────
function useOneShotPoller(onNewScan: (code: string) => void, active: boolean, onStop: () => void) {
  const lastCountRef = useRef(0);
  useEffect(() => {
    if (!active) return;
    barcodeApi.getScans().then(d => { lastCountRef.current = d.total; }).catch(() => {});
    const id = setInterval(() => {
      barcodeApi.getScans()
        .then(data => {
          if (data.total > lastCountRef.current) {
            const last = data.scans[data.scans.length - 1];
            lastCountRef.current = data.total;
            onNewScan(last.content);
            onStop();
          }
        })
        .catch(() => {});
    }, 1500);
    const timeout = setTimeout(onStop, 60000);
    return () => { clearInterval(id); clearTimeout(timeout); };
  }, [active, onNewScan, onStop]);
}

// ─── Category Select component ───────────────────────────────────
interface Category { id: number; name: string; }

const CategorySelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  categories: Category[];
  loading: boolean;
}> = ({ value, onChange, categories, loading }) => (
  <div>
    <label className="text-sm font-medium text-gray-700 block mb-1">Category</label>
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        disabled={loading}
        className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm appearance-none bg-white disabled:bg-gray-50 disabled:text-gray-400"
      >
        <option value="">
          {loading ? 'Loading categories...' : 'Select a category'}
        </option>
        {categories.map(cat => (
          <option key={cat.id} value={cat.name}>{cat.name}</option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
    </div>
  </div>
);

// ─── Add/Edit Product Form ───────────────────────────────────────
export const AddProductForm: React.FC<{
  editProduct?: Product | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  inlineMode?: boolean;
}> = ({ editProduct, onSuccess, onCancel, inlineMode }) => {
  const { addProduct, updateProduct, navigateTo } = useApp();

  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: '', category: '', buyPrice: 0, sellPrice: 0, stock: 0, barcode: '', description: '',
  });
  const [submitError, setSubmitError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [catsLoading, setCatsLoading] = useState(true);
  const [scanPolling, setScanPolling] = useState(false);
  const [scanWaiting, setScanWaiting] = useState(false);
  const [barcodeToast, setBarcodeToast] = useState('');

  useEffect(() => {
    setCatsLoading(true);
    categoriesApi.list()
      .then((data: any) => {
        const cats: Category[] = data.categories ?? data ?? [];
        setCategories(cats);
      })
      .catch(() => setCategories([]))
      .finally(() => setCatsLoading(false));
  }, []);

  useEffect(() => {
    if (editProduct) {
      setFormData({
        name: editProduct.name,
        category: editProduct.category,
        buyPrice: editProduct.buyPrice,
        sellPrice: editProduct.sellPrice,
        stock: editProduct.stock,
        barcode: editProduct.barcode || '',
        description: editProduct.description || '',
      });
    }
  }, [editProduct]);

  const handleBarcodeScanned = useCallback((code: string) => {
    setFormData(prev => ({ ...prev, barcode: code }));
    setBarcodeToast(`✓ Barcode received: ${code}`);
    setTimeout(() => setBarcodeToast(''), 4000);
  }, []);

  const stopPolling = useCallback(() => { setScanPolling(false); setScanWaiting(false); }, []);
  useOneShotPoller(handleBarcodeScanned, scanPolling, stopPolling);

  const startScan = () => { setScanPolling(true); setScanWaiting(true); setBarcodeToast(''); };

  const resetForm = () => {
    setFormData({ name: '', category: '', buyPrice: 0, sellPrice: 0, stock: 0, barcode: '', description: '' });
    setSubmitError('');
    stopPolling();
    if (onCancel) onCancel();
    else if (!inlineMode) navigateTo('products');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    try {
      if (editProduct) { await updateProduct(editProduct.id, formData); }
      else { await addProduct(formData); }
      if (!editProduct) {
        setFormData({ name: '', category: '', buyPrice: 0, sellPrice: 0, stock: 0, barcode: '', description: '' });
      }
      if (onSuccess) onSuccess();
      else if (!inlineMode) navigateTo('products');
    } catch (err: any) { setSubmitError(err.message || 'Save error'); }
  };

  const isEditing = !!editProduct;

  return (
    <Card className="p-6 border-l-4 border-l-blue-600">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {isEditing ? 'Edit Product' : 'New Product'}
          </h3>
          {!inlineMode && (
            <p className="text-sm text-gray-500 mt-0.5">Fill in the details and save</p>
          )}
        </div>
        {(onCancel || inlineMode) && (
          <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
            <X size={22} />
          </button>
        )}
      </div>

      {submitError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Product Name"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <CategorySelect
          value={formData.category}
          onChange={val => setFormData({ ...formData, category: val })}
          categories={categories}
          loading={catsLoading}
        />

        <Input
          label="Purchase Price (₸)"
          type="number" step="0.01" min="0"
          value={formData.buyPrice}
          onChange={e => setFormData({ ...formData, buyPrice: parseFloat(e.target.value) })}
          required
        />
        <Input
          label="Selling Price (₸)"
          type="number" step="0.01" min="0"
          value={formData.sellPrice}
          onChange={e => setFormData({ ...formData, sellPrice: parseFloat(e.target.value) })}
          required
        />
        <Input
          label="Stock Quantity"
          type="number" min="0"
          value={formData.stock}
          onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) })}
          required
        />

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Barcode</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.barcode || ''}
              onChange={e => setFormData({ ...formData, barcode: e.target.value })}
              placeholder="Scan or enter manually"
              autoComplete="off"
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            />
            <button
              type="button"
              onClick={startScan}
              title="Activate QrBot scanner"
              className={`px-3 py-2 rounded-lg border-2 transition-all flex items-center ${
                scanPolling
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-green-400 hover:bg-green-50'
              }`}
            >
              <Camera size={18} />
            </button>
          </div>
          {scanWaiting && (
            <div className="mt-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              ⏳ Waiting for scan... Scan barcode in QrBot
            </div>
          )}
          {barcodeToast && (
            <div className="mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              {barcodeToast}
            </div>
          )}
        </div>

        <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg flex justify-between items-center mt-2">
          <div>
            <span className="text-sm text-gray-600 font-medium">Profit per unit</span>
            <div className="text-2xl font-bold text-blue-600">
              {(formData.sellPrice - formData.buyPrice).toFixed(0)} ₸
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
            <Button type="submit">{isEditing ? 'Save' : 'Add'}</Button>
          </div>
        </div>
      </form>
    </Card>
  );
};

// ─── Product List ────────────────────────────────────────────────
export const ProductList: React.FC = () => {
  const { products, deleteProduct, fetchProducts, productsLoading, user, updateProduct } = useApp();
  const isManager = user?.role === 'manager' || user?.role === 'Manager';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Derive unique categories from the loaded products
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort();

  if (!isManager) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <div className="bg-red-100 p-4 rounded-full mb-4">
          <AlertCircle className="text-red-600" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-gray-500 mt-2 max-w-md">Only managers can manage products.</p>
      </div>
    );
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this product?')) {
      try { await deleteProduct(id); } catch (err: any) { alert(err.message); }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product List</h1>
          <p className="text-gray-500">All products in stock</p>
        </div>
        <Button variant="secondary" onClick={() => fetchProducts()}>
          <RefreshCw size={16} />
        </Button>
      </div>

      {editingProduct && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <AddProductForm
            editProduct={editingProduct}
            inlineMode
            onSuccess={() => { setEditingProduct(null); fetchProducts(); }}
            onCancel={() => setEditingProduct(null)}
          />
        </motion.div>
      )}

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or category..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm bg-white text-gray-700 min-w-[180px]"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory('')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all whitespace-nowrap"
            >
              <X size={14} /> Clear filter
            </button>
          )}
        </div>

        {productsLoading ? (
          <div className="py-12 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 text-sm text-gray-500 bg-gray-50/50">
                  <th className="p-3 font-medium rounded-l-lg">Name</th>
                  <th className="p-3 font-medium">Category</th>
                  <th className="p-3 font-medium">Barcode</th>
                  <th className="p-3 font-medium text-right">Stock</th>
                  <th className="p-3 font-medium text-right">Purchase</th>
                  <th className="p-3 font-medium text-right">Selling</th>
                  <th className="p-3 font-medium text-right rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredProducts.map(product => (
                  <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                    <td className="p-3 text-gray-900 font-medium">{product.name}</td>
                    <td className="p-3 text-gray-600">
                      <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">{product.category}</span>
                    </td>
                    <td className="p-3 text-gray-400 text-xs font-mono">{product.barcode || '—'}</td>
                    <td className="p-3 text-right">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${product.stock < 10 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600 text-right">{product.buyPrice.toFixed(0)} ₸</td>
                    <td className="p-3 text-gray-900 font-medium text-right">{product.sellPrice.toFixed(0)} ₸</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">No products found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

// ─── Add Product Page ────────────────────────────────────────────
export const AddProductPage: React.FC = () => {
  const { user, navigateTo, fetchProducts } = useApp();
  const isManager = user?.role === 'manager' || user?.role === 'Manager';

  if (!isManager) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <div className="bg-red-100 p-4 rounded-full mb-4">
          <AlertCircle className="text-red-600" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-gray-500 mt-2 max-w-md">Only managers can add products.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Product</h1>
        <p className="text-gray-500">Fill in the form to add a new product</p>
      </div>
      <AddProductForm
        onSuccess={() => {
          fetchProducts();
          navigateTo('products');
        }}
        onCancel={() => navigateTo('products')}
      />
    </div>
  );
};

// ─── Legacy export (kept for backward compat) ────────────────────
export const ProductManagement = ProductList;
