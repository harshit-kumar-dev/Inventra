import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { stockApi, StockLedgerEntry } from '../../services/stockApi';
import { warehouseApi, Warehouse } from '../../services/warehouseApi';
import { productApi, Product } from '../../services/productApi';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { History, Search, Filter, Calendar, ChevronLeft, ChevronRight, Download } from 'lucide-react';

export const MoveHistoryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProductId = searchParams.get('productId') || '';

  const [entries, setEntries] = useState<StockLedgerEntry[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [operationType, setOperationType] = useState('');
  const [productId, setProductId] = useState(initialProductId);
  const [warehouseId, setWarehouseId] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadMasterFilters();
  }, []);

  useEffect(() => {
    loadLedger();
  }, [operationType, productId, warehouseId, page]);

  const loadMasterFilters = async () => {
    try {
      const [whRes, prodRes] = await Promise.all([
        warehouseApi.getWarehouses(),
        productApi.getProducts({ limit: 100 }),
      ]);
      setWarehouses(whRes.data?.warehouses || []);
      setProducts(prodRes.data?.products || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadLedger = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await stockApi.getLedgerHistory({
        operationType: operationType || undefined,
        productId: productId || undefined,
        warehouseId: warehouseId || undefined,
        page,
        limit: 15,
      });

      setEntries(res.data?.entries || []);
      if (res.data?.pagination) {
        setTotalPages(res.data.pagination.totalPages);
        setTotalCount(res.data.pagination.total);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch ledger logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (entries.length === 0) return;
    const headers = ['Timestamp', 'Operation', 'Product', 'SKU', 'Quantity', 'Warehouse', 'Location', 'Reference', 'User'];
    const rows = entries.map((e) => [
      new Date(e.createdAt).toISOString(),
      e.operationType,
      `"${e.product?.name || ''}"`,
      e.product?.sku || '',
      e.quantity,
      `"${e.location?.warehouse?.name || ''}"`,
      `"${e.location?.name || ''}"`,
      e.referenceNumber || e.referenceId || '',
      `"${e.user?.name || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `StockSense_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-7 h-7 text-indigo-400" /> Stock Movement History (Audit Ledger)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Immutable, cryptographically verifiable ledger recording every physical balance change
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={entries.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-xl font-medium text-sm transition"
        >
          <Download className="w-4 h-4 text-cyan-400" /> Export Ledger CSV
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </div>

          <select
            value={operationType}
            onChange={(e) => {
              setOperationType(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          >
            <option value="">All Movement Types</option>
            <option value="RECEIPT">RECEIPT (+)</option>
            <option value="DELIVERY">DELIVERY (-)</option>
            <option value="TRANSFER_IN">TRANSFER IN (+)</option>
            <option value="TRANSFER_OUT">TRANSFER OUT (-)</option>
            <option value="ADJUSTMENT_GAIN">ADJUSTMENT GAIN (+)</option>
            <option value="ADJUSTMENT_LOSS">ADJUSTMENT LOSS (-)</option>
            <option value="INITIAL_SEED">INITIAL SEED (+)</option>
          </select>

          <select
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition max-w-xs truncate"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>

          <select
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Total Movements: <span className="text-white font-bold">{totalCount}</span>
        </div>
      </div>

      {/* Main Ledger Table */}
      {loading ? (
        <LoadingState text="Loading immutable ledger entries..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadLedger} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={History}
          title="No Movements Recorded"
          description="Validate a receipt, delivery, transfer, or adjustment to register audit logs."
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5">Operation</th>
                  <th className="px-6 py-3.5">Product & SKU</th>
                  <th className="px-6 py-3.5 text-right">Movement Quantity</th>
                  <th className="px-6 py-3.5">Facility & Bin</th>
                  <th className="px-6 py-3.5">Document Ref</th>
                  <th className="px-6 py-3.5">Responsible User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {entries.map((entry) => {
                  const isPositive = entry.quantity > 0;
                  return (
                    <tr key={entry.id} className="hover:bg-slate-800/40 transition text-xs">
                      <td className="px-6 py-3.5 text-slate-400 font-mono whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5">
                        <StatusBadge status={entry.operationType} />
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="font-medium text-white">{entry.product?.name}</div>
                        <span className="font-mono text-[11px] text-cyan-400">{entry.product?.sku}</span>
                      </td>
                      <td className={`px-6 py-3.5 text-right font-mono font-bold text-sm ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isPositive ? `+${entry.quantity}` : entry.quantity}
                      </td>
                      <td className="px-6 py-3.5 text-slate-300">
                        <div className="text-white font-medium">{entry.location?.warehouse?.name}</div>
                        <span className="text-[11px] text-slate-400">{entry.location?.name} ({entry.location?.code})</span>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-indigo-300">
                        {entry.referenceNumber || entry.referenceId || '-'}
                      </td>
                      <td className="px-6 py-3.5 text-slate-400">
                        {entry.user?.name || 'System Auto-Engine'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing Page <span className="text-white font-bold">{page}</span> of <span className="text-white font-bold">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-white transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-white transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default MoveHistoryPage;
