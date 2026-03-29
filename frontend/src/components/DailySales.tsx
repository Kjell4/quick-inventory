import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button, Input } from './ui/Shared';
import { ShoppingCart, CheckCircle, Trash2, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

export const DailySales: React.FC = () => {
  const { products, sales, fetchSales, fetchProducts, addSale, deleteSale, closeDay, salesLoading, user } = useApp();
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [successMsg, setSuccessMsg] = useState('');
  const [saleError, setSaleError] = useState('');
  const [closingDay, setClosingDay] = useState(false);

  const isManager = user?.role === 'manager' || user?.role === 'Manager';

  useEffect(() => {
    fetchSales();
    fetchProducts();
  }, [fetchSales, fetchProducts]);

  const dailyTotal = sales.reduce((sum, s) => sum + s.total, 0);
  const selectedProduct = products.find(p => String(p.id) === selectedProductId);

  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSaleError('');
    try {
      await addSale({ productId: selectedProduct.id, quantity });
      setSuccessMsg(`Продано: ${quantity} × ${selectedProduct.name}`);
      setTimeout(() => setSuccessMsg(''), 3000);
      setSelectedProductId('');
      setQuantity(1);
    } catch (err: any) {
      setSaleError(err.message || 'Ошибка при продаже');
    }
  };

  const handleDeleteSale = async (id: number) => {
    if (window.confirm('Отменить эту продажу?')) {
      try { await deleteSale(id); }
      catch (err: any) { alert(err.message); }
    }
  };

  const handleCloseDay = async () => {
    if (!window.confirm('Закрыть день? Все продажи будут зафиксированы.')) return;
    setClosingDay(true);
    try {
      await closeDay();
      setSuccessMsg('День закрыт! Продажи сброшены.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setSaleError(err.message || 'Ошибка закрытия дня');
    } finally {
      setClosingDay(false);
    }
  };

  const sortedProducts = useMemo(() => [...products].sort((a, b) => a.name.localeCompare(b.name)), [products]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ежедневные продажи</h1>
          <p className="text-gray-500">Фиксируйте продажи и отслеживайте выручку</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => { fetchSales(); fetchProducts(); }}><RefreshCw size={16} /></Button>
          <div className="bg-green-100 px-4 py-2 rounded-lg border border-green-200">
            <span className="text-xs text-green-800 font-bold uppercase tracking-wider">Выручка сегодня</span>
            <div className="text-xl font-bold text-green-700">{dailyTotal.toFixed(0)} ₸</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 border-t-4 border-t-blue-600">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <ShoppingCart size={20} className="text-blue-600" /> Новая продажа
            </h3>

            {saleError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{saleError}</div>
            )}

            <form onSubmit={handleAddSale} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Выберите товар</label>
                <select
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
                  value={selectedProductId}
                  onChange={(e) => { setSelectedProductId(e.target.value); setSaleError(''); }}
                  required
                >
                  <option value="">-- Выберите товар --</option>
                  {sortedProducts.map(p => (
                    <option key={p.id} value={String(p.id)} disabled={p.stock === 0}>
                      {p.name} ({p.sellPrice.toFixed(0)} ₸){p.stock === 0 ? ' — нет на складе' : ` [${p.stock} шт.]`}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Цена:</span>
                    <span className="font-medium">{selectedProduct.sellPrice.toFixed(0)} ₸</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Остаток:</span>
                    <span className={`font-medium ${selectedProduct.stock < 10 ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedProduct.stock} шт.
                    </span>
                  </div>
                </motion.div>
              )}

              <Input
                label="Количество" type="number" min="1"
                max={selectedProduct?.stock || 100}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                disabled={!selectedProductId}
              />

              <div className="pt-2">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-900 font-bold">Итого</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {(quantity * (selectedProduct?.sellPrice || 0)).toFixed(0)} ₸
                  </span>
                </div>
                <Button type="submit" className="w-full" size="lg"
                  disabled={!selectedProductId || (selectedProduct?.stock || 0) < quantity}>
                  Подтвердить продажу
                </Button>
              </div>
            </form>

            {successMsg && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="mt-4 bg-green-50 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm font-medium">
                <CheckCircle size={16} /> {successMsg}
              </motion.div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">Продажи сегодня</h3>
            </div>

            <div className="flex-1 overflow-auto">
              {salesLoading ? (
                <div className="py-12 text-center text-gray-400">Загрузка...</div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-sm text-gray-500 sticky top-0 bg-white">
                      <th className="pb-3 font-medium">Товар</th>
                      <th className="pb-3 font-medium text-center">Кол-во</th>
                      <th className="pb-3 font-medium text-right">Сумма</th>
                      {isManager && <th className="pb-3 font-medium text-right">Действия</th>}
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {sales.map((sale) => (
                      <tr key={sale.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="py-3 text-gray-900 font-medium">{sale.productName}</td>
                        <td className="py-3 text-gray-600 text-center">{sale.quantity}</td>
                        <td className="py-3 text-gray-900 font-bold text-right">{sale.total.toFixed(0)} ₸</td>
                        {isManager && (
                          <td className="py-3 text-right">
                            <button onClick={() => handleDeleteSale(sale.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                              <Trash2 size={15} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {sales.length === 0 && (
                      <tr>
                        <td colSpan={isManager ? 4 : 3} className="py-12 text-center text-gray-400">
                          <ShoppingCart size={48} className="opacity-20 mx-auto mb-2" />
                          <p>Продаж сегодня ещё нет.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {isManager && sales.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100 flex justify-end">
                <Button variant="danger" onClick={handleCloseDay} isLoading={closingDay}>
                  Закрыть день
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
