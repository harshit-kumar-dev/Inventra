import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productApi, Product } from '../../services/productApi';
import { stockApi, StockItem, StockLedgerEntry } from '../../services/stockApi';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { useToast } from '../../context/ToastContext';
import { ArrowLeft, Edit3, MapPin, History, AlertTriangle, Box } from 'lucide-react';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [stockLocations, setStockLocations] = useState<StockItem[]>([]);
  const [ledgerHistory, setLedgerHistory] = useState<StockLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadProductData(id);
  }, [id]);

  const loadProductData = async (productId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, stockRes, ledgerRes] = await Promise.all([
        productApi.getProductById(productId),
        stockApi.getStockByProduct(productId),
        stockApi.getLedgerHistory({ productId, limit: 10 }),
      ]);

      if (prodRes.data?.product) {
        setProduct(prodRes.data.product);
      }
      if (stockRes.data?.stock) {
        setStockLocations(stockRes.data.stock);
      }
      if (ledgerRes.data?.entries) {
        setLedgerHistory(ledgerRes.data.entries);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load product details');
      showToast('error', 'Error loading product', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState text="Loading product profile & inventory distribution..." />;
  if (error || !product) return <ErrorState message={error || 'Product not found'} onRetry={() => id && loadProductData(id)} />;

  const isLowStock = product.stockStatus === 'LOW_STOCK';
  const isOutOfStock = product.stockStatus === 'OUT_OF_STOCK';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/products')}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">{product.name}</h1>
              <StatusBadge status={product.stockStatus} />
              {!product.active && <StatusBadge status="INACTIVE" />}
            </div>
            <p className="text-sm text-slate-400 mt-0.5">SKU: <span className="font-mono text-cyan-400 font-semibold">{product.sku}</span></p>
          </div>
        </div>

        <Link
          to={`/products?edit=${product.id}`}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg transition text-sm font-medium"
        >
          <Edit3 className="w-4 h-4" /> Edit Details
        </Link>
      </div>

      {/* Stock Alerts if low / out of stock */}
      {(isLowStock || isOutOfStock) && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${
          isOutOfStock 
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <div className="font-semibold text-sm">
              {isOutOfStock ? 'Stock Alert: Out of Stock' : 'Stock Alert: Low Inventory Level'}
            </div>
            <div className="text-xs opacity-90">
              Current total stock is {product.totalStock} {product.uom.symbol}. The defined reorder threshold is {product.reorderLevel} {product.uom.symbol}.
            </div>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total On-Hand</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{product.totalStock}</span>
            <span className="text-sm text-slate-400 font-medium">{product.uom.symbol}</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Live aggregated balance</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reorder Level</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-200">{product.reorderLevel}</span>
            <span className="text-sm text-slate-400 font-medium">{product.uom.symbol}</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Min inventory warning trigger</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unit Cost</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-400">${product.perUnitCost.toFixed(2)}</span>
            <span className="text-xs text-slate-400">/ {product.uom.symbol}</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Standard inventory valuation</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-cyan-400 truncate">{product.category.name}</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">UoM: {product.uom.name} ({product.uom.symbol})</span>
        </div>
      </div>

      {/* Location Stock Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Stock Distribution by Location</h2>
          </div>
          <span className="text-xs text-slate-400">{stockLocations.length} locations holding stock</span>
        </div>

        {stockLocations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <Box className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            No physical stock found at any active warehouse location.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Warehouse</th>
                  <th className="px-6 py-3">Location Name</th>
                  <th className="px-6 py-3">Location Code</th>
                  <th className="px-6 py-3 text-right">Available Qty</th>
                  <th className="px-6 py-3 text-right">Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {stockLocations.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-3.5 font-medium text-white">
                      {item.warehouseName} <span className="text-xs text-slate-500">({item.warehouseCode})</span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-300">{item.locationName}</td>
                    <td className="px-6 py-3.5 font-mono text-cyan-400 text-xs">{item.locationCode}</td>
                    <td className="px-6 py-3.5 text-right font-bold text-white">
                      {item.quantity} <span className="text-xs text-slate-400 font-normal">{product.uom.symbol}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono text-emerald-400 text-xs font-semibold">
                      ${(item.quantity * product.perUnitCost).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Ledger Audit Trail */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Recent Stock Movements (Audit Ledger)</h2>
          </div>
          <Link to={`/move-history?productId=${product.id}`} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
            View full ledger &rarr;
          </Link>
        </div>

        {ledgerHistory.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No stock movements recorded for this product yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Operation</th>
                  <th className="px-6 py-3">Location</th>
                  <th className="px-6 py-3 text-right">Movement</th>
                  <th className="px-6 py-3">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {ledgerHistory.map((entry) => {
                  const isPositive = entry.quantity > 0;
                  return (
                    <tr key={entry.id} className="hover:bg-slate-800/40 transition text-xs">
                      <td className="px-6 py-3 text-slate-400 font-mono">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge status={entry.operationType} />
                      </td>
                      <td className="px-6 py-3 text-slate-300">
                        {entry.location ? `${entry.location.warehouse.name} - ${entry.location.name}` : '-'}
                      </td>
                      <td className={`px-6 py-3 text-right font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? `+${entry.quantity}` : entry.quantity} {product.uom.symbol}
                      </td>
                      <td className="px-6 py-3 text-slate-400 font-mono">
                        {entry.referenceNumber || entry.referenceId || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default ProductDetailPage;
