import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button } from './ui/Shared';
import { TrendingUp, TrendingDown, DollarSign, Package, Calendar, ArrowRight, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

export const Dashboard: React.FC = () => {
  const { sales, products, navigateTo, dashboardStats, fetchDashboard, fetchProducts, fetchSales } = useApp();

  useEffect(() => {
    fetchDashboard();
    fetchProducts();
  }, [fetchDashboard, fetchProducts]);

  const totalIncome = dashboardStats?.total_income ?? 0;
  const totalExpenses = dashboardStats?.total_expenses ?? 0;
  const totalProfit = dashboardStats?.total_profit ?? 0;
  const lowStockProducts = dashboardStats?.low_stock_count ?? products.filter(p => p.stock < 10).length;

  const stats = [
    { label: 'Доход (месяц)', value: `${totalIncome.toFixed(0)} ₸`, icon: DollarSign, color: 'bg-green-100 text-green-600', trend: '' },
    { label: 'Расходы (месяц)', value: `${totalExpenses.toFixed(0)} ₸`, icon: TrendingDown, color: 'bg-red-100 text-red-600', trend: '' },
    { label: 'Прибыль (месяц)', value: `${totalProfit.toFixed(0)} ₸`, icon: TrendingUp, color: 'bg-blue-100 text-blue-600', trend: '' },
    { label: 'Мало на складе', value: lowStockProducts, icon: Package, color: 'bg-orange-100 text-orange-600', trend: 'Нужно пополнить' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Дашборд</h1>
          <p className="text-gray-500">Обзор показателей бизнеса</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={fetchDashboard}><RefreshCw size={16} /> Обновить</Button>
          <Button variant="secondary" onClick={() => navigateTo('products')}>Товары</Button>
          <Button onClick={() => navigateTo('sales')}>Новая продажа</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
            <Card className="p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg ${stat.color}`}><stat.icon size={20} /></div>
                {stat.trend && (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-orange-50 text-orange-700">{stat.trend}</span>
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Последние продажи</h3>
            <Button variant="ghost" size="sm" onClick={() => navigateTo('sales')}>Все продажи</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 text-sm text-gray-500">
                  <th className="pb-3 font-medium">Товар</th>
                  <th className="pb-3 font-medium">Кол-во</th>
                  <th className="pb-3 font-medium">Дата</th>
                  <th className="pb-3 font-medium text-right">Сумма</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {sales.slice(0, 5).map((sale) => (
                  <tr key={sale.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="py-3 text-gray-900 font-medium">{sale.productName}</td>
                    <td className="py-3 text-gray-600">{sale.quantity}</td>
                    <td className="py-3 text-gray-500">{new Date(sale.date).toLocaleDateString('ru-RU')}</td>
                    <td className="py-3 text-gray-900 font-medium text-right">{sale.total.toFixed(0)} ₸</td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-gray-500">Продаж ещё нет.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Быстрые действия</h3>
          <div className="space-y-3">
            {[
              { label: 'Записать продажу', icon: DollarSign, color: 'bg-blue-100 text-blue-600', page: 'sales' },
              { label: 'Добавить товар', icon: Package, color: 'bg-purple-100 text-purple-600', page: 'products' },
              { label: 'Закрыть день', icon: Calendar, color: 'bg-green-100 text-green-600', page: 'sales' },
            ].map(action => (
              <button key={action.label} onClick={() => navigateTo(action.page)}
                className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all group">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`${action.color} p-2 rounded-md`}><action.icon size={18} /></div>
                    <span className="font-medium text-gray-900">{action.label}</span>
                  </div>
                  <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-500" />
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
