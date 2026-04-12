import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button } from './ui/Shared';
import { ShoppingCart, CheckCircle, Trash2, RefreshCw, Camera, X } from 'lucide-react';
import { motion } from 'motion/react';
import { barcodeApi } from '../api';

interface CartItem {
  id: number;
  name: string;
  price: number;
  barcode: string;
  quantity: number;
}

type ScanStatus =
  | { type: 'idle' }
  | { type: 'waiting' }
  | { type: 'found'; name: string }
  | { type: 'error'; message: string };

function useBarcodePoller(onNewScan: (code: string) => void, active: boolean) {
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
          }
        })
        .catch(() => {});
    }, 1500);
    return () => clearInterval(id);
  }, [active, onNewScan]);
}

export const DailySales: React.FC = () => {
  const { sales, fetchSales, fetchProducts, deleteSale, closeDay, salesLoading, user } = useApp();
  const isManager = user?.role === 'manager' || user?.role === 'Manager';

  const [scanInput, setScanInput]     = useState('');
  const [scanStatus, setScanStatus]   = useState<ScanStatus>({ type: 'idle' });
  const [pollActive, setPollActive]   = useState(false);
  const scanInputRef                  = useRef<HTMLInputElement>(null);
  const [cart, setCart]               = useState<Record<string, CartItem>>({});
  const [confirming, setConfirming]   = useState(false);
  const [confirmMsg, setConfirmMsg]   = useState('');
  const [closingDay, setClosingDay]   = useState(false);
  const inputTimerRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { fetchSales(); fetchProducts(); }, [fetchSales, fetchProducts]);

  const processScan = useCallback(async (code: string) => {
    if (!code.trim()) return;
    setScanStatus({ type: 'waiting' });
    try {
      const data = await barcodeApi.lookup(code.trim());
      if (data.found && data.product) {
        const key = data.product.barcode || String(data.product.id);
        setCart(prev => ({
          ...prev,
          [key]: prev[key]
            ? { ...prev[key], quantity: prev[key].quantity + 1 }
            : { id: data.product!.id, name: data.product!.name, price: data.product!.sale_price, barcode: data.product!.barcode, quantity: 1 },
        }));
        setScanStatus({ type: 'found', name: data.product.name });
        setTimeout(() => setScanStatus({ type: 'idle' }), 2000);
        setScanInput('');
        scanInputRef.current?.focus();
      } else {
        setScanStatus({ type: 'error', message: `Товар «${code}» не найден в базе` });
      }
    } catch {
      setScanStatus({ type: 'error', message: 'Ошибка подключения к серверу' });
    }
  }, []);

  useBarcodePoller(processScan, pollActive);

  const handleManualInput = (val: string) => {
    setScanInput(val);
    if (inputTimerRef.current) clearTimeout(inputTimerRef.current);
    if (val.trim().length >= 4) {
      inputTimerRef.current = setTimeout(() => processScan(val), 700);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputTimerRef.current) clearTimeout(inputTimerRef.current);
      processScan(scanInput);
    }
  };

  const cartKeys  = Object.keys(cart);
  const cartTotal = cartKeys.reduce((sum, k) => sum + cart[k].price * cart[k].quantity, 0);
  const updateQty = (key: string, qty: number) => { if (qty >= 1) setCart(prev => ({ ...prev, [key]: { ...prev[key], quantity: qty } })); };
  const removeFromCart = (key: string) => setCart(prev => { const n = { ...prev }; delete n[key]; return n; });

  const confirmSales = async () => {
    if (cartKeys.length === 0) return;
    setConfirming(true);
    const errors: string[] = [];
    for (const key of cartKeys) {
      const item = cart[key];
      try {
        const res = await barcodeApi.sell(item.barcode, item.quantity);
        if (!res.success) errors.push(`${item.name}: ${res.error || 'ошибка'}`);
      } catch { errors.push(`${item.name}: ошибка сети`); }
    }
    if (errors.length > 0) {
      setScanStatus({ type: 'error', message: errors.join(' | ') });
    } else {
      setCart({});
      setConfirmMsg('Продажа сохранена!');
      fetchSales(); fetchProducts();
      setTimeout(() => setConfirmMsg(''), 3000);
    }
    setConfirming(false);
  };

  const handleCloseDay = async () => {
    if (!window.confirm('Закрыть день? Все продажи будут зафиксированы.')) return;
    setClosingDay(true);
    try { await closeDay(); setConfirmMsg('День закрыт!'); setTimeout(() => setConfirmMsg(''), 3000); }
    catch (err: any) { setScanStatus({ type: 'error', message: err.message }); }
    finally { setClosingDay(false); }
  };

  const dailyTotal = sales.reduce((sum, s) => sum + s.total, 0);

  const statusBg =
    scanStatus.type === 'waiting' ? 'bg-blue-50 text-blue-700 border-blue-200' :
    scanStatus.type === 'found'   ? 'bg-green-50 text-green-700 border-green-200' :
    scanStatus.type === 'error'   ? 'bg-red-50 text-red-700 border-red-200' : '';

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ежедневные продажи</h1>
          <p className="text-gray-500">Сканируй баркод или выбирай товар вручную</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => { fetchSales(); fetchProducts(); }}><RefreshCw size={16} /></Button>
          <div className="bg-green-100 px-4 py-2 rounded-lg border border-green-200">
            <span className="text-xs text-green-800 font-bold uppercase tracking-wider">Выручка сегодня</span>
            <div className="text-xl font-bold text-green-700">{dailyTotal.toFixed(0)} ₸</div>
          </div>
        </div>
      </div>

      {/* Сканер + корзина */}
      <Card className="p-6 border-t-4 border-t-blue-600">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Camera size={20} className="text-blue-600" /> Сканер баркода
        </h3>

        {/* Поле ввода */}
        <div className="flex gap-2 mb-3">
          <input
            ref={scanInputRef}
            type="text"
            value={scanInput}
            onChange={e => handleManualInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Отсканируй баркод или введи вручную..."
            autoComplete="off"
            className="flex-1 px-4 py-3 border-2 border-blue-400 rounded-lg text-base focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="button"
            onClick={() => { setPollActive(v => !v); scanInputRef.current?.focus(); }}
            title={pollActive ? 'Остановить QrBot' : 'Ждать скан из QrBot'}
            className={`px-4 py-3 rounded-lg text-xl border-2 transition-all ${
              pollActive ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-green-400'
            }`}
          >
            📷
          </button>
        </div>

        {/* Подсказка QrBot */}
        {pollActive && (
          <div className="mb-3 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            ⏳ Жду сканирование из QrBot… Нажми 📷 ещё раз чтобы остановить
          </div>
        )}

        {/* Статус */}
        {scanStatus.type !== 'idle' && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 border ${statusBg}`}>
            {scanStatus.type === 'waiting' && <><span>⏳</span> Ищу товар...</>}
            {scanStatus.type === 'found'   && <><CheckCircle size={16} /> Добавлено: <strong>{scanStatus.name}</strong></>}
            {scanStatus.type === 'error'   && <><X size={16} /> {scanStatus.message}</>}
          </div>
        )}

        {/* Корзина */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="px-3 py-2 text-left rounded-tl-lg">Товар</th>
                <th className="px-3 py-2 text-left">Баркод</th>
                <th className="px-3 py-2 text-right">Цена</th>
                <th className="px-3 py-2 text-center" style={{ width: 100 }}>Кол-во</th>
                <th className="px-3 py-2 text-right">Сумма</th>
                <th className="px-3 py-2 rounded-tr-lg"></th>
              </tr>
            </thead>
            <tbody>
              {cartKeys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    <ShoppingCart size={36} className="opacity-20 mx-auto mb-2" />
                    Отсканируй товар — он появится здесь
                  </td>
                </tr>
              ) : cartKeys.map(key => {
                const item = cart[key];
                return (
                  <tr key={key} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">{item.name}</td>
                    <td className="px-3 py-2 text-gray-400 font-mono text-xs">{item.barcode || '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{item.price.toFixed(0)} ₸</td>
                    <td className="px-3 py-2 text-center">
                      <input type="number" min={1} value={item.quantity}
                        onChange={e => updateQty(key, parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:border-blue-400" />
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900">{(item.price * item.quantity).toFixed(0)} ₸</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => removeFromCart(key)} className="text-red-400 hover:text-red-600 p-1"><X size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Итого */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-4 flex justify-between items-center">
          <span className="text-gray-700 font-medium">Итого к оплате:</span>
          <span className="text-2xl font-bold text-blue-600">{cartTotal.toFixed(0)} ₸</span>
        </div>

        <button
          onClick={confirmSales}
          disabled={cartKeys.length === 0 || confirming}
          className={`w-full py-3 rounded-lg text-white font-bold text-base transition-all ${
            cartKeys.length === 0 || confirming ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 active:scale-95'
          }`}
        >
          {confirming ? '⏳ Сохраняем...' : '✓ Подтвердить продажу'}
        </button>

        {confirmMsg && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium flex items-center gap-2">
            <CheckCircle size={16} /> {confirmMsg}
          </motion.div>
        )}
      </Card>

      {/* Список продаж за день */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900">Продажи за сегодня</h3>
        </div>
        {salesLoading ? (
          <div className="py-12 text-center text-gray-400">Загрузка...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="pb-3 font-medium">Товар</th>
                  <th className="pb-3 font-medium text-center">Кол-во</th>
                  <th className="pb-3 font-medium text-right">Сумма</th>
                  {isManager && <th className="pb-3 font-medium text-right">Действия</th>}
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">{sale.productName}</td>
                    <td className="py-3 text-gray-600 text-center">{sale.quantity}</td>
                    <td className="py-3 font-bold text-gray-900 text-right">{sale.total.toFixed(0)} ₸</td>
                    {isManager && (
                      <td className="py-3 text-right">
                        <button onClick={() => { if (window.confirm('Отменить эту продажу?')) deleteSale(sale.id); }}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr><td colSpan={isManager ? 4 : 3} className="py-10 text-center text-gray-400">Продаж сегодня ещё нет.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {isManager && sales.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100 flex justify-end">
            <Button variant="danger" onClick={handleCloseDay} isLoading={closingDay}>Закрыть день</Button>
          </div>
        )}
      </Card>
    </div>
  );
};
