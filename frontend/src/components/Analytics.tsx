import React, { useState, useEffect, useCallback } from 'react';
import { analyticsApi } from '../api';
import { Card } from './ui/Shared';
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle,
  ChevronLeft, ChevronRight, ShoppingCart, BarChart2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  Cell, PieChart, Pie, Sector,
} from 'recharts';

// ─── Types ──────────────────────────────────────────────────────
interface DayData   { date: string; day: number; income: number; cost: number; profit: number; }
interface CatData   { name: string; revenue: number; qty: number; }
interface ProdData  { name: string; qty: number; revenue: number; }
interface LowStock  { id: number; name: string; category: string; quantity: number; purchase_price: number; }
interface Summary   { total_income: number; total_cost: number; total_profit: number; }

interface AnalyticsData {
  year: number; month: number;
  daily_chart: DayData[];
  top_categories: CatData[];
  top_products: ProdData[];
  low_stock: LowStock[];
  summary: Summary;
}

// ─── Constants ──────────────────────────────────────────────────
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const PALETTE = ['#2563eb','#7c3aed','#db2777','#ea580c','#16a34a'];

const fmt = (n: number) =>
  n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + 'M ₸'
    : n >= 1_000
    ? (n / 1_000).toFixed(0) + 'K ₸'
    : n.toFixed(0) + ' ₸';

const fmtFull = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ₸';

// ─── Custom Tooltip for Area chart ──────────────────────────────
const AreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-sm min-w-[160px]">
      <p className="font-semibold text-gray-700 mb-2">Day {label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }} className="font-medium">{p.name}</span>
          <span className="font-semibold text-gray-800">{fmtFull(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Custom Tooltip for Bar charts ──────────────────────────────
const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-sm min-w-[180px]">
      <p className="font-semibold text-gray-700 mb-2 truncate max-w-[200px]">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }} className="font-medium">{p.name}</span>
          <span className="font-semibold text-gray-800">
            {p.dataKey === 'qty' ? p.value + ' pcs.' : fmtFull(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Active Pie Shape ────────────────────────────────────────────
const renderActiveShape = (props: any) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value,
  } = props;
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#1e1e2e" className="text-sm font-bold" fontSize={13}>
        {payload.name.length > 14 ? payload.name.slice(0, 12) + '…' : payload.name}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#2563eb" fontSize={12} fontWeight={700}>
        {fmtFull(value)}
      </text>
      <text x={cx} y={cy + 26} textAnchor="middle" fill="#6b7280" fontSize={10}>
        {(percent * 100).toFixed(1)}%
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 10} outerRadius={outerRadius + 14}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
};

// ─── Summary Cards ───────────────────────────────────────────────
const SummaryCards: React.FC<{ summary: Summary }> = ({ summary }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {[
      { label: 'Monthly Revenue', value: summary.total_income,  icon: DollarSign,  bg: 'bg-blue-50',  iconBg: 'bg-blue-100',  iconColor: 'text-blue-600',  textColor: 'text-blue-700' },
      { label: 'Monthly Expenses', value: summary.total_cost,    icon: TrendingDown, bg: 'bg-red-50',   iconBg: 'bg-red-100',   iconColor: 'text-red-500',   textColor: 'text-red-600'  },
      { label: 'Monthly Profit', value: summary.total_profit,  icon: TrendingUp,  bg: 'bg-green-50', iconBg: 'bg-green-100', iconColor: 'text-green-600', textColor: 'text-green-700'},
    ].map(c => (
      <Card key={c.label} className={`p-5 ${c.bg} border-0`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${c.iconBg}`}>
            <c.icon className={c.iconColor} size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{c.label}</p>
            <p className={`text-xl font-bold ${c.textColor}`}>{fmtFull(c.value)}</p>
          </div>
        </div>
      </Card>
    ))}
  </div>
);

// ─── Area Chart: Daily income/cost ──────────────────────────────
const DailyChart: React.FC<{ data: DayData[] }> = ({ data }) => {
  // filter to days with any activity for cleaner look, keep all for x-axis
  const hasData = data.some(d => d.income > 0);
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="text-blue-600" size={18} />
        <h3 className="font-bold text-gray-900">Daily Income and Expenses</h3>
      </div>
      <p className="text-xs text-gray-400 mb-5">Revenue, cost and profit for each day of the month</p>

      {!hasData ? (
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data for this month</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false} axisLine={false}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickFormatter={d => d % 5 === 0 || d === 1 ? String(d) : ''}
            />
            <YAxis
              tickLine={false} axisLine={false}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickFormatter={fmt}
              width={60}
            />
            <Tooltip content={<AreaTooltip />} />
            <Legend
              iconType="circle" iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
            />
            <Area type="monotone" dataKey="income"  name="Revenue"     stroke="#2563eb" strokeWidth={2} fill="url(#gradIncome)"  dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
            <Area type="monotone" dataKey="cost"    name="Cost" stroke="#ef4444" strokeWidth={2} fill="url(#gradCost)"    dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
            <Area type="monotone" dataKey="profit"  name="Profit"     stroke="#16a34a" strokeWidth={2} fill="url(#gradProfit)"  dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

// ─── Pie Chart: Top categories ───────────────────────────────────
const TopCategoriesChart: React.FC<{ data: CatData[] }> = ({ data }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!data.length) return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <BarChart2 className="text-purple-600" size={18} />
        <h3 className="font-bold text-gray-900">Top 5 Categories</h3>
      </div>
      <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data</div>
    </Card>
  );

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <BarChart2 className="text-purple-600" size={18} />
        <h3 className="font-bold text-gray-900">Top 5 Categories</h3>
      </div>
      <p className="text-xs text-gray-400 mb-4">By monthly revenue · hover over a sector</p>

      <div className="flex flex-col lg:flex-row items-center gap-4">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={95}
              dataKey="revenue"
              onMouseEnter={(_, idx) => setActiveIndex(idx)}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="none" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex flex-row lg:flex-col flex-wrap gap-2 lg:gap-3 min-w-[160px]">
          {data.map((cat, i) => (
            <button
              key={cat.name}
              onMouseEnter={() => setActiveIndex(i)}
              className="flex items-center gap-2 text-left group"
            >
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
              <div>
                <p className="text-xs font-semibold text-gray-700 group-hover:text-gray-900 leading-tight">
                  {cat.name}
                </p>
                <p className="text-xs text-gray-400">{cat.qty} pcs.</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
};

// ─── Bar Chart: Top products ─────────────────────────────────────
const TopProductsChart: React.FC<{ data: ProdData[] }> = ({ data }) => {
  if (!data.length) return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <ShoppingCart className="text-orange-500" size={18} />
        <h3 className="font-bold text-gray-900">Top 5 Products</h3>
      </div>
      <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data</div>
    </Card>
  );

  const truncated = data.map(d => ({
    ...d,
    shortName: d.name.length > 16 ? d.name.slice(0, 14) + '…' : d.name,
  }));

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <ShoppingCart className="text-orange-500" size={18} />
        <h3 className="font-bold text-gray-900">Top 5 Products</h3>
      </div>
      <p className="text-xs text-gray-400 mb-5">By number of sales this month</p>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={truncated} margin={{ top: 5, right: 10, left: 10, bottom: 5 }} barSize={32}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" vertical={false} />
          <XAxis
            dataKey="shortName"
            tickLine={false} axisLine={false}
            tick={{ fontSize: 11, fill: '#6b7280' }}
          />
          <YAxis
            tickLine={false} axisLine={false}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            allowDecimals={false}
          />
          <Tooltip content={<BarTooltip />} cursor={{ fill: '#f5f5ff' }} />
          <Bar dataKey="qty" name="Sold" radius={[6, 6, 0, 0]}>
            {truncated.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Table below chart */}
      <div className="mt-4 space-y-2">
        {data.map((p, i) => (
          <div key={p.name} className="flex items-center gap-3">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: PALETTE[i % PALETTE.length] }}
            >
              {i + 1}
            </span>
            <span className="flex-1 text-sm text-gray-700 truncate">{p.name}</span>
            <span className="text-sm font-semibold text-gray-900">{p.qty} pcs.</span>
            <span className="text-sm text-blue-600 font-medium w-24 text-right">{fmtFull(p.revenue)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ─── Low Stock Table ─────────────────────────────────────────────
const LowStockTable: React.FC<{ data: LowStock[] }> = ({ data }) => (
  <Card className="p-6">
    <div className="flex items-center gap-2 mb-1">
      <AlertTriangle className="text-amber-500" size={18} />
      <h3 className="font-bold text-gray-900">Items to Restock</h3>
      {data.length > 0 && (
        <span className="ml-auto bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
          {data.length} items
        </span>
      )}
    </div>
    <p className="text-xs text-gray-400 mb-5">Less than 10 units remaining — needs restocking</p>

    {data.length === 0 ? (
      <div className="py-12 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <TrendingUp className="text-green-600" size={22} />
        </div>
        <p className="text-gray-500 font-medium">All good</p>
        <p className="text-gray-400 text-sm mt-1">No low-stock products</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="pb-3 text-left font-medium">Product</th>
              <th className="pb-3 text-left font-medium">Category</th>
              <th className="pb-3 text-center font-medium">Stock</th>
              <th className="pb-3 text-right font-medium">Purchase Price</th>
              <th className="pb-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 font-medium text-gray-900">{p.name}</td>
                <td className="py-3">
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-md">{p.category}</span>
                </td>
                <td className="py-3 text-center">
                  <span className={`inline-flex items-center justify-center w-9 h-7 rounded-lg text-xs font-bold ${
                    p.quantity === 0 ? 'bg-red-100 text-red-700' :
                    p.quantity <= 3  ? 'bg-orange-100 text-orange-700' :
                                       'bg-amber-100 text-amber-700'
                  }`}>
                    {p.quantity}
                  </span>
                </td>
                <td className="py-3 text-right text-gray-700">{fmtFull(p.purchase_price)}</td>
                <td className="py-3 text-right">
                  {p.quantity === 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      Out of stock
                    </span>
                  ) : p.quantity <= 3 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                      Restock urgently
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                      Restock
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </Card>
);

// ─── Month Picker ────────────────────────────────────────────────
const MonthPicker: React.FC<{
  year: number; month: number;
  onChange: (y: number, m: number) => void;
}> = ({ year, month, onChange }) => {
  const prev = () => {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  };
  const next = () => {
    const now = new Date();
    if (year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)) return;
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  };
  const isCurrentMonth = (() => {
    const now = new Date();
    return year === now.getFullYear() && month === now.getMonth() + 1;
  })();

  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-2 py-1.5 shadow-sm">
      <button onClick={prev} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
        <ChevronLeft size={16} className="text-gray-500" />
      </button>
      <span className="text-sm font-semibold text-gray-800 min-w-[130px] text-center">
        {MONTH_NAMES[month - 1]} {year}
      </span>
      <button
        onClick={next}
        disabled={isCurrentMonth}
        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight size={16} className="text-gray-500" />
      </button>
    </div>
  );
};

// ─── Main Analytics Page ─────────────────────────────────────────
export const Analytics: React.FC = () => {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data,  setData]  = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback((y: number, m: number) => {
    setLoading(true);
    setError('');
    analyticsApi.get(y, m)
      .then((d: any) => setData(d))
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(year, month); }, [year, month, load]);

  const handleMonthChange = (y: number, m: number) => {
    setYear(y); setMonth(m);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 text-sm">Sales and inventory analytics</p>
        </div>
        <MonthPicker year={year} month={month} onChange={handleMonthChange} />
      </div>

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center text-gray-400 gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading analytics...</span>
        </div>
      ) : error ? (
        <Card className="p-12 text-center text-red-500">{error}</Card>
      ) : data ? (
        <div className="space-y-5">
          {/* Summary */}
          <SummaryCards summary={data.summary} />

          {/* Daily chart — full width */}
          <DailyChart data={data.daily_chart} />

          {/* Pie + Bar side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <TopCategoriesChart data={data.top_categories} />
            <TopProductsChart   data={data.top_products} />
          </div>

          {/* Low stock table — full width */}
          <LowStockTable data={data.low_stock} />
        </div>
      ) : null}
    </div>
  );
};
