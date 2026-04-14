import React, { useState, useEffect } from 'react';
import { receiptsApi } from '../api';
import { useApp } from '../context/AppContext';
import { Card } from './ui/Shared';
import {
  Receipt, ChevronRight, ArrowLeft, Download,
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';

// ─── Types ──────────────────────────────────────────────────────
interface ReceiptSummary {
  id: number;
  date: string;
  total_income: number;
  total_profit: number;
  total_cost: number;
  items_count: number;
}

interface ReceiptItem {
  id: number;
  product_name: string;
  category: string;
  quantity: number;
  sale_price: number;
  purchase_price: number;
  total_income: number;
  total_cost: number;
  profit: number;
}

interface ReceiptDetail {
  id: number;
  date: string;
  total_income: number;
  total_profit: number;
  total_cost: number;
  items: ReceiptItem[];
}

// ─── Helpers ────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' KZT';
const fmtFull = fmt; // alias used inside PDF generator

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const formatDateShort = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ─── Load only jsPDF (no plugins needed) ────────────────────────
let jspdfPromise: Promise<void> | null = null;

function loadJsPDF(): Promise<void> {
  if (jspdfPromise) return jspdfPromise;
  jspdfPromise = new Promise((resolve, reject) => {
    if ((window as any).jspdf?.jsPDF) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = () => {
      if ((window as any).jspdf?.jsPDF) resolve();
      else { jspdfPromise = null; reject(new Error('jsPDF failed to load')); }
    };
    s.onerror = () => { jspdfPromise = null; reject(new Error('Error loading jsPDF')); };
    document.head.appendChild(s);
  });
  return jspdfPromise;
}

function useJsPDF() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    loadJsPDF().then(() => setReady(true)).catch(console.error);
  }, []);
  return ready;
}

// ─── PDF Table Engine (no autoTable dependency) ──────────────────
interface ColDef { header: string; width: number; align?: 'left' | 'right' | 'center'; }

function drawTable(
  doc: any,
  cols: ColDef[],
  rows: string[][],
  startY: number,
  marginLeft: number,
  rowH = 8,
  headerH = 9,
): number {
  const totalW = cols.reduce((s, c) => s + c.width, 0);
  const pad = 2.5;
  let y = startY;
  const PAGE_H = 285;

  const newPage = () => {
    doc.addPage();
    y = 15;
    drawHeader(true);
  };

  const drawHeader = (repeat = false) => {
    doc.setFillColor(37, 99, 235);
    doc.rect(marginLeft, y, totalW, headerH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    let x = marginLeft;
    cols.forEach(col => {
      const tx = col.align === 'right' ? x + col.width - pad : col.align === 'center' ? x + col.width / 2 : x + pad;
      doc.text(col.header, tx, y + headerH - 3, { align: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left' });
      x += col.width;
    });
    y += headerH;
  };

  drawHeader();

  rows.forEach((row, ri) => {
    if (y + rowH > PAGE_H) newPage();

    // alternating row background
    if (ri % 2 === 1) {
      doc.setFillColor(248, 249, 255);
      doc.rect(marginLeft, y, totalW, rowH, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 30, 50);

    let x = marginLeft;
    cols.forEach((col, ci) => {
      let text = row[ci] ?? '';
      // truncate if too wide (rough estimate: ~1.8mm per char at 7.5pt)
      const maxChars = Math.floor((col.width - pad * 2) / 1.65);
      if (text.length > maxChars) text = text.slice(0, maxChars - 1) + '…';

      const tx = col.align === 'right' ? x + col.width - pad : col.align === 'center' ? x + col.width / 2 : x + pad;
      doc.text(text, tx, y + rowH - 2.5, { align: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left' });
      x += col.width;
    });

    // bottom border
    doc.setDrawColor(235, 235, 245);
    doc.line(marginLeft, y + rowH, marginLeft + totalW, y + rowH);
    y += rowH;
  });

  return y; // final y after table
}

// ─── PDF Generator ───────────────────────────────────────────────
function generatePDF(receipt: ReceiptDetail) {
  const { jsPDF } = (window as any).jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210;
  const M = 14;

  // ── Blue header ─────────────────────────────────────────────────
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, W, 34, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('QuickInventory', M, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 210, 255);
  doc.text('DAILY REPORT', M, 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(formatDate(receipt.date), W - M, 13, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 210, 255);
  doc.text('Receipt #' + receipt.id, W - M, 21, { align: 'right' });

  // ── Summary boxes ───────────────────────────────────────────────
  const boxY = 40;
  const boxH = 19;
  const boxW = (W - M * 2 - 8) / 3;

  const boxes: Array<{ label: string; value: string; bg: [number,number,number]; fg: [number,number,number] }> = [
    { label: 'REVENUE', value: fmtFull(receipt.total_income),  bg: [235,242,255], fg: [37,99,235]  },
    { label: 'EXPENSES', value: fmtFull(receipt.total_cost),    bg: [255,241,241], fg: [220,38,38]  },
    { label: 'PROFIT', value: fmtFull(receipt.total_profit),  bg: [236,253,245], fg: [22,163,74]  },
  ];

  boxes.forEach((b, i) => {
    const x = M + i * (boxW + 4);
    doc.setFillColor(b.bg[0], b.bg[1], b.bg[2]);
    doc.roundedRect(x, boxY, boxW, boxH, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(110, 110, 130);
    doc.text(b.label, x + 4, boxY + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(b.fg[0], b.fg[1], b.fg[2]);
    doc.text(b.value, x + 4, boxY + 14);
  });

  // ── Section title ───────────────────────────────────────────────
  let y = boxY + boxH + 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 50);
  doc.text('Sold Products — ' + receipt.items.length + ' items', M, y);
  y += 4;

  // ── Table ───────────────────────────────────────────────────────
  const cols: ColDef[] = [
    { header: 'Product',      width: 50, align: 'left'   },
    { header: 'Category',  width: 28, align: 'left'   },
    { header: 'Qty',       width: 12, align: 'center' },
    { header: 'Price',       width: 23, align: 'right'  },
    { header: 'Revenue',    width: 23, align: 'right'  },
    { header: 'Cost',     width: 22, align: 'right'  },
    { header: 'Profit',    width: 24, align: 'right'  },
  ];

  const tableRows = receipt.items.map(item => [
    item.product_name,
    item.category,
    String(item.quantity),
    fmtFull(item.sale_price),
    fmtFull(item.total_income),
    fmtFull(item.total_cost),
    fmtFull(item.profit),
  ]);

  const finalY = drawTable(doc, cols, tableRows, y, M);

  // ── Totals row ──────────────────────────────────────────────────
  const totalW = cols.reduce((s, c) => s + c.width, 0);
  doc.setFillColor(240, 242, 255);
  doc.rect(M, finalY, totalW, 9, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);

  doc.setTextColor(50, 50, 70);
  doc.text('Total: ' + receipt.items.length + ' items', M + 2.5, finalY + 6);

  const colX = (idx: number) => M + cols.slice(0, idx).reduce((s, c) => s + c.width, 0);

  doc.setTextColor(37, 99, 235);
  doc.text(fmtFull(receipt.total_income), colX(5) + cols[4].width - 2.5, finalY + 6, { align: 'right' });
  doc.setTextColor(220, 38, 38);
  doc.text(fmtFull(receipt.total_cost),   colX(6) + cols[5].width - 2.5, finalY + 6, { align: 'right' });
  doc.setTextColor(22, 163, 74);
  doc.text(fmtFull(receipt.total_profit), colX(7) + cols[6].width - 2.5, finalY + 6, { align: 'right' });

  // ── Profit summary box ──────────────────────────────────────────
  const summaryY = finalY + 14;
  if (summaryY < 270) {
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(M, summaryY, W - M * 2, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(22, 163, 74);
    doc.text('Net Profit: ' + fmtFull(receipt.total_profit), M + 5, summaryY + 9);
    const pct = receipt.total_income > 0
      ? ((receipt.total_profit / receipt.total_income) * 100).toFixed(1) + '%'
      : '—';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 130, 100);
    doc.text('Margin: ' + pct, W - M - 5, summaryY + 9, { align: 'right' });
  }

  // ── Page numbers ────────────────────────────────────────────────
  const pages: number = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(180, 180, 190);
    doc.text(
      'Generated: ' + new Date().toLocaleString('en-US') + '   |   Page ' + i + ' of ' + pages,
      W / 2, 292, { align: 'center' }
    );
  }

  doc.save('receipt-' + receipt.date + '.pdf');
}

// ─── Receipt Detail View ─────────────────────────────────────────
const ReceiptDetailView: React.FC<{ id: number; onBack: () => void }> = ({ id, onBack }) => {
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const pdfReady = useJsPDF();

  useEffect(() => {
    setLoading(true);
    receiptsApi.detail(id)
      .then((data: any) => setReceipt(data))
      .catch(() => setReceipt(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownloadPDF = async () => {
    if (!receipt) return;
    setPdfLoading(true);
    try {
      await loadJsPDF();
      generatePDF(receipt);
    } catch (err) {
      console.error('PDF error:', err);
      alert('Failed to load PDF library. Check your internet connection.');
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-400">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading receipt...
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="py-20 text-center text-gray-400">
        <AlertCircle className="mx-auto mb-2" size={32} />
        Receipt not found
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Receipt #{receipt.id}</h1>
            <p className="text-gray-500 text-sm capitalize">{formatDate(receipt.date)}</p>
          </div>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={pdfLoading || !pdfReady}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
        >
          <Download size={16} />
          {pdfLoading ? 'Generating...' : 'Download PDF'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-xl"><DollarSign className="text-blue-600" size={22} /></div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Revenue</p>
            <p className="text-xl font-bold text-gray-900">{fmt(receipt.total_income)}</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-red-100 rounded-xl"><TrendingDown className="text-red-500" size={22} /></div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Expenses</p>
            <p className="text-xl font-bold text-gray-900">{fmt(receipt.total_cost)}</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-xl"><TrendingUp className="text-green-600" size={22} /></div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Profit</p>
            <p className="text-xl font-bold text-green-600">{fmt(receipt.total_profit)}</p>
            {receipt.total_income > 0 && (
              <p className="text-xs text-gray-400">
                margin {((receipt.total_profit / receipt.total_income) * 100).toFixed(1)}%
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Items table */}
      <Card className="p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">
          Sold Products <span className="text-gray-400 font-normal">({receipt.items.length} items)</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 bg-gray-50 uppercase tracking-wide">
                <th className="px-3 py-3 font-medium rounded-l-lg">Product</th>
                <th className="px-3 py-3 font-medium">Category</th>
                <th className="px-3 py-3 font-medium text-center">Qty</th>
                <th className="px-3 py-3 font-medium text-right">Price</th>
                <th className="px-3 py-3 font-medium text-right">Revenue</th>
                <th className="px-3 py-3 font-medium text-right">Cost</th>
                <th className="px-3 py-3 font-medium text-right rounded-r-lg">Profit</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item, idx) => (
                <tr key={item.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                  <td className="px-3 py-3 font-medium text-gray-900">{item.product_name}</td>
                  <td className="px-3 py-3">
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{item.category}</span>
                  </td>
                  <td className="px-3 py-3 text-center font-medium">{item.quantity}</td>
                  <td className="px-3 py-3 text-right text-gray-600">{fmt(item.sale_price)}</td>
                  <td className="px-3 py-3 text-right font-medium text-blue-600">{fmt(item.total_income)}</td>
                  <td className="px-3 py-3 text-right text-red-500">{fmt(item.total_cost)}</td>
                  <td className={`px-3 py-3 text-right font-bold ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmt(item.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td className="px-3 py-3 font-bold text-gray-900" colSpan={4}>
                  Total ({receipt.items.length} items)
                </td>
                <td className="px-3 py-3 text-right font-bold text-blue-600">{fmt(receipt.total_income)}</td>
                <td className="px-3 py-3 text-right font-bold text-red-500">{fmt(receipt.total_cost)}</td>
                <td className="px-3 py-3 text-right font-bold text-green-600">{fmt(receipt.total_profit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </motion.div>
  );
};

// ─── Receipts List View ──────────────────────────────────────────
const ReceiptsListView: React.FC<{ onSelect: (id: number) => void }> = ({ onSelect }) => {
  const [receipts, setReceipts] = useState<ReceiptSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    receiptsApi.list()
      .then((data: any) => setReceipts(data.receipts ?? []))
      .catch(() => setReceipts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
        <p className="text-gray-500">History of closed days and revenue</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading...
        </div>
      ) : receipts.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="bg-gray-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Receipt className="text-gray-400" size={28} />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No closed days</h3>
          <p className="text-gray-400 text-sm">Closed days will appear here after pressing "Close Day" in the sales section</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {receipts.map(r => (
            <motion.button
              key={r.id}
              onClick={() => onSelect(r.id)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full text-left"
            >
              <Card className="p-5 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                      <Receipt className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 capitalize">{formatDateShort(r.date)}</p>
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <ShoppingBag size={11} />
                        {r.items_count} items sold
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 sm:gap-10">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-400">Revenue</p>
                      <p className="font-semibold text-blue-600">{fmt(r.total_income)}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-400">Expenses</p>
                      <p className="font-semibold text-red-500">{fmt(r.total_cost)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Profit</p>
                      <p className={`font-bold ${r.total_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmt(r.total_profit)}
                      </p>
                    </div>
                    <ChevronRight className="text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0" size={20} />
                  </div>
                </div>
              </Card>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Export ─────────────────────────────────────────────────
export const Receipts: React.FC = () => {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (selectedId !== null) {
    return <ReceiptDetailView id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return <ReceiptsListView onSelect={setSelectedId} />;
};
