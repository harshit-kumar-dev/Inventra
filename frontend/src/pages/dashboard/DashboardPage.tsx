import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardApi, DashboardSummary } from '../../services/dashboardApi';
import { stockApi, StockLedgerEntry } from '../../services/stockApi';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import {
  Boxes,
  AlertTriangle,
  XCircle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Scale,
  Plus,
  RefreshCw,
  ChevronRight,
  Clock,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [recentMoves, setRecentMoves] = useState<StockLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, lowRes, ledgerRes] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getLowStock(1, 6),
        stockApi.getLedgerHistory({ limit: 6 }),
      ]);

      if (sumRes.data) {
        setSummary(sumRes.data);
      }
      if (lowRes.data?.products) {
        setLowStockItems(lowRes.data.products);
      }
      if (ledgerRes.data?.entries) {
        setRecentMoves(ledgerRes.data.entries);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard KPIs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState text="Aggregating live inventory metrics & KPI analytics..." />;
  if (error || !summary) return <ErrorState message={error || 'Failed to fetch dashboard data'} onRetry={loadDashboardData} />;

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h1 className="text-2xl font-bold text-white tracking-tight">StockSense Control Hub</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time multi-warehouse inventory health, movement velocity, and fulfillment pipelines
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadDashboardData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
            title="Refresh KPIs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            to="/receipts/new"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Receipt
          </Link>

          <Link
            to="/deliveries/new"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Delivery
          </Link>

          <Link
            to="/transfers/new"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-cyan-600/20 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Transfer
          </Link>

          <Link
            to="/adjustments/new"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-amber-600/20 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Adjustment
          </Link>
        </div>
      </div>

      {/* 6 Real KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Products in Stock */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">In-Stock SKUs</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white font-mono">{summary.inventory.totalProductsInStock}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">of {summary.inventory.totalActiveProducts} active products</div>
          </div>
        </div>

        {/* Low Stock Items */}
        <Link
          to="/products"
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-amber-500/40 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Low Stock</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-400 font-mono group-hover:scale-105 transition transform origin-left">
              {summary.inventory.lowStockCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Below threshold limit</div>
          </div>
        </Link>

        {/* Out of Stock Items */}
        <Link
          to="/products"
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-rose-500/40 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Out of Stock</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-400 font-mono group-hover:scale-105 transition transform origin-left">
              {summary.inventory.outOfStockCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Zero inventory balance</div>
          </div>
        </Link>

        {/* Pending Receipts */}
        <Link
          to="/receipts"
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-emerald-500/40 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Pending Receipts</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-400 font-mono group-hover:scale-105 transition transform origin-left">
              {summary.receipts.pending}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {summary.receipts.late > 0 ? <span className="text-rose-400 font-semibold">{summary.receipts.late} delayed</span> : 'On schedule'}
            </div>
          </div>
        </Link>

        {/* Pending Deliveries */}
        <Link
          to="/deliveries"
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-indigo-500/40 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Pending Deliveries</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-indigo-400 font-mono group-hover:scale-105 transition transform origin-left">
              {summary.deliveries.pending}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {summary.deliveries.waiting > 0 ? `${summary.deliveries.waiting} waiting stock` : 'Ready to dispatch'}
            </div>
          </div>
        </Link>

        {/* Transfers Scheduled */}
        <Link
          to="/transfers"
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-cyan-500/40 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Transfers Active</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-cyan-400 font-mono group-hover:scale-105 transition transform origin-left">
              {summary.transfers.scheduled}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Internal bin movements</div>
          </div>
        </Link>
      </div>

      {/* Main Grid: Low Stock Alert Section + Recent Movements Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">Critical Low Stock Warnings</h2>
              </div>
              <Link to="/products" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                View catalog &rarr;
              </Link>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center">
                <ShieldCheck className="w-10 h-10 text-emerald-400 mb-2" />
                <span>All inventory items are currently above their reorder safety thresholds.</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/products/${item.id}`)}
                    className="p-4 hover:bg-slate-800/40 transition cursor-pointer flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-white text-sm group-hover:text-indigo-400 transition">
                        {item.name}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        SKU: {item.sku} &bull; Category: {item.category?.name}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-rose-400">
                        {item.totalStock} {item.uom?.symbol}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Min threshold: {item.reorderLevel} {item.uom?.symbol}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-950/40 border-t border-slate-800 text-center">
            <Link to="/receipts/new" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
              + Generate Purchase Receipt for Depleted Items
            </Link>
          </div>
        </div>

        {/* Recent Ledger Audit Trail */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">Live Stock Velocity & Moves</h2>
              </div>
              <Link to="/move-history" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                Full ledger &rarr;
              </Link>
            </div>

            {recentMoves.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No recent stock movements recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {recentMoves.map((move) => {
                  const isPositive = move.quantity > 0;
                  return (
                    <div key={move.id} className="p-3.5 hover:bg-slate-800/40 transition flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={move.operationType} />
                        <div>
                          <div className="font-medium text-white">{move.product?.name}</div>
                          <div className="text-slate-500 text-[11px]">
                            {move.location ? `${move.location.warehouse.code} / ${move.location.name}` : '-'} &bull; {new Date(move.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      <div className={`font-mono font-bold text-sm ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? `+${move.quantity}` : move.quantity}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-950/40 border-t border-slate-800 text-center">
            <Link to="/move-history" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
              View Complete Ledger Audit Logs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DashboardPage;
