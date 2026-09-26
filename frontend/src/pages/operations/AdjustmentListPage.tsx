import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { operationApi, StockAdjustment } from '../../services/operationApi';
import { warehouseApi, Warehouse } from '../../services/warehouseApi';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Scale, Plus, Search, Filter, Building2, MapPin, ChevronRight } from 'lucide-react';

export const AdjustmentListPage: React.FC = () => {
  const navigate = useNavigate();
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [warehouseId, setWarehouseId] = useState('');

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadAdjustments();
  }, [status, warehouseId]);

  const loadFilterOptions = async () => {
    try {
      const whRes = await warehouseApi.getWarehouses();
      setWarehouses(whRes.data?.warehouses || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAdjustments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operationApi.getAdjustments({
        search: search.trim() || undefined,
        status: status || undefined,
        warehouseId: warehouseId || undefined,
      });
      setAdjustments(res.data?.adjustments || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inventory adjustments');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadAdjustments();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Scale className="w-7 h-7 text-amber-400" /> Physical Stock Adjustments
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Reconcile physical inventory counts against recorded system balances with audit trails
          </p>
        </div>
        <Link
          to="/adjustments/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 font-medium text-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4" /> New Count / Adjustment
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reason, ref number..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="READY">READY</option>
            <option value="DONE">DONE</option>
            <option value="CANCELED">CANCELED</option>
          </select>

          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
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
      </div>

      {/* Main Table */}
      {loading ? (
        <LoadingState text="Loading adjustment reconciliations..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadAdjustments} />
      ) : adjustments.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No Stock Adjustments Found"
          description={search || status ? "No adjustments match your current criteria." : "Start a physical cycle count to reconcile stock variances."}
          actionText="Create Stock Count"
          onAction={() => navigate('/adjustments/new')}
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Reference</th>
                  <th className="px-6 py-3.5">Facility & Bin</th>
                  <th className="px-6 py-3.5">Reason / Justification</th>
                  <th className="px-6 py-3.5">Lines Count</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {adjustments.map((adj) => (
                  <tr
                    key={adj.id}
                    onClick={() => navigate(`/adjustments/${adj.id}`)}
                    className="hover:bg-slate-800/40 transition cursor-pointer group"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-white text-sm group-hover:text-indigo-400 transition flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      {adj.referenceNo}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      <div className="font-medium text-white flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {adj.warehouse?.name}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-cyan-400" />
                        {adj.location?.name} ({adj.location?.code})
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300 text-xs">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        {adj.reason}
                      </span>
                      {adj.notes && <p className="text-[11px] text-slate-500 mt-1 truncate max-w-xs">{adj.notes}</p>}
                    </td>
                    <td className="px-6 py-4 text-slate-300 text-xs font-mono">
                      <span className="font-semibold text-white">{adj.lines?.length || 0}</span> items reconciled
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={adj.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdjustmentListPage;
