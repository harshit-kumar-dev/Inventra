import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { operationApi, StockAdjustment } from '../../services/operationApi';
import { productApi, Product } from '../../services/productApi';
import { warehouseApi, Warehouse, Location } from '../../services/warehouseApi';
import { stockApi } from '../../services/stockApi';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useToast } from '../../context/ToastContext';
import { ArrowLeft, Scale, CheckCircle2, PlayCircle, XCircle, Plus, Trash2, Building2, MapPin, Box, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const AdjustmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [adjustment, setAdjustment] = useState<StockAdjustment | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [warehouseId, setWarehouseId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [reason, setReason] = useState('ANNUAL_COUNT');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Array<{
    productId: string;
    countedQuantity: number;
    recordedQuantity: number;
    delta: number;
  }>>([{ productId: '', countedQuantity: 0, recordedQuantity: 0, delta: 0 }]);

  // Options
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Action Modals
  const [confirmValidateOpen, setConfirmValidateOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  useEffect(() => {
    loadPrerequisites();
    if (!isNew && id) {
      loadAdjustment(id);
    }
  }, [id, isNew]);

  useEffect(() => {
    if (warehouseId) {
      loadLocations(warehouseId);
    } else {
      setLocations([]);
    }
  }, [warehouseId]);

  const loadPrerequisites = async () => {
    try {
      const [whRes, prodRes] = await Promise.all([
        warehouseApi.getWarehouses(),
        productApi.getProducts({ active: 'true', limit: 100 }),
      ]);
      const whs = whRes.data?.warehouses || [];
      setWarehouses(whs);
      setProducts(prodRes.data?.products || []);

      if (isNew && whs.length >= 1) {
        setWarehouseId(whs[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadLocations = async (whId: string) => {
    try {
      const res = await warehouseApi.getLocations(whId);
      const locs = res.data?.locations || [];
      setLocations(locs);
      if (isNew && locs.length >= 1) {
        setLocationId(locs[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAdjustment = async (adjId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await operationApi.getAdjustmentById(adjId);
      setAdjustment(res.data?.adjustment || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load adjustment details');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecordedQuantity = async (prodId: string, locId: string, idx: number) => {
    if (!prodId || !locId) return;
    try {
      const res = await stockApi.getStockByLocation(locId);
      const match = res.data?.stock?.find((s) => s.productId === prodId);
      const recorded = match?.quantity || 0;

      const updated = [...lines];
      updated[idx].recordedQuantity = recorded;
      updated[idx].delta = updated[idx].countedQuantity - recorded;
      setLines(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddLine = () => {
    setLines([...lines, { productId: '', countedQuantity: 0, recordedQuantity: 0, delta: 0 }]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx: number, field: string, val: any) => {
    const updated = [...lines];
    if (field === 'countedQuantity') {
      const counted = Math.max(0, parseInt(val) || 0);
      updated[idx].countedQuantity = counted;
      updated[idx].delta = counted - updated[idx].recordedQuantity;
    } else if (field === 'productId') {
      updated[idx].productId = val;
      if (locationId) {
        fetchRecordedQuantity(val, locationId, idx);
      }
    }
    setLines(updated);
  };

  const handleLocationChange = (locId: string) => {
    setLocationId(locId);
    lines.forEach((line, idx) => {
      if (line.productId) {
        fetchRecordedQuantity(line.productId, locId, idx);
      }
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId || !locationId) {
      showToast('error', 'Missing Information', 'Please select facility and location');
      return;
    }

    const validLines = lines.filter((l) => l.productId);
    if (validLines.length === 0) {
      showToast('error', 'No Items', 'Add at least one product for stock count');
      return;
    }

    setSubmitting(true);
    try {
      const res = await operationApi.createAdjustment({
        warehouseId,
        locationId,
        reason,
        notes,
        lines: validLines.map(({ productId, countedQuantity }) => ({
          productId,
          countedQuantity,
        })),
      });

      showToast('success', 'Adjustment Draft Created', `Reference: ${res.data?.adjustment.referenceNo}`);
      navigate(`/adjustments/${res.data?.adjustment.id}`);
    } catch (err: any) {
      showToast('error', 'Adjustment Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkReady = async () => {
    if (!adjustment) return;
    setSubmitting(true);
    try {
      await operationApi.readyAdjustment(adjustment.id);
      showToast('success', 'Status Updated', 'Adjustment marked as READY.');
      loadAdjustment(adjustment.id);
    } catch (err: any) {
      showToast('error', 'Operation Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidate = async () => {
    if (!adjustment) return;
    setSubmitting(true);
    try {
      await operationApi.validateAdjustment(adjustment.id);
      showToast('success', 'Adjustment Validated', 'Stock balances reconciled and ledger audit entries committed.');
      setConfirmValidateOpen(false);
      loadAdjustment(adjustment.id);
    } catch (err: any) {
      showToast('error', 'Validation Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!adjustment) return;
    setSubmitting(true);
    try {
      await operationApi.cancelAdjustment(adjustment.id);
      showToast('info', 'Adjustment Canceled', 'Operation canceled.');
      setConfirmCancelOpen(false);
      loadAdjustment(adjustment.id);
    } catch (err: any) {
      showToast('error', 'Cancellation Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState text="Loading adjustment details..." />;
  if (error && !isNew) return <ErrorState message={error} onRetry={() => id && loadAdjustment(id)} />;

  const isDone = adjustment?.status === 'DONE';
  const isCanceled = adjustment?.status === 'CANCELED';
  const isLocked = isDone || isCanceled;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/adjustments')}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {isNew ? 'New Stock Adjustment / Count' : adjustment?.referenceNo}
              </h1>
              {adjustment && <StatusBadge status={adjustment.status} />}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isNew ? 'Reconcile physical on-hand stock with book inventory' : `Created on ${new Date(adjustment!.createdAt).toLocaleString()}`}
            </p>
          </div>
        </div>

        {!isNew && adjustment && !isLocked && (
          <div className="flex flex-wrap items-center gap-3">
            {adjustment.status === 'DRAFT' && (
              <button
                onClick={handleMarkReady}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition shadow-lg shadow-blue-600/20"
              >
                <PlayCircle className="w-4 h-4" /> Mark Ready
              </button>
            )}

            {(adjustment.status === 'DRAFT' || adjustment.status === 'READY') && (
              <button
                onClick={() => setConfirmValidateOpen(true)}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4" /> Validate & Post Variance
              </button>
            )}

            <button
              onClick={() => setConfirmCancelOpen(true)}
              disabled={submitting}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 border border-slate-700 rounded-xl text-sm transition"
            >
              <XCircle className="w-4 h-4" /> Cancel
            </button>
          </div>
        )}
      </div>

      {/* Form or Detail View */}
      {isNew ? (
        <form onSubmit={handleCreateSubmit} className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">Target Location & Justification</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Warehouse Facility <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Specific Rack / Bin Location <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={locationId}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                >
                  <option value="">Select Location</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Adjustment Reason <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                >
                  <option value="ANNUAL_COUNT">Annual Physical Inventory Count</option>
                  <option value="CYCLE_COUNT">Routine Cycle Count</option>
                  <option value="DAMAGED_GOODS">Damaged / Expired Goods</option>
                  <option value="DISCREPANCY">Discrepancy Correction</option>
                  <option value="SCRAP">Scrap / Obsolescence</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Audit Notes / Investigation Details
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Physical box recount confirmed 3 units damaged by water leak"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          {/* Lines Table with real-time delta */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">Physical Count Entries</h2>
              <button
                type="button"
                onClick={handleAddLine}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Count Line
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((line, idx) => {
                const isGain = line.delta > 0;
                const isLoss = line.delta < 0;
                return (
                  <div key={idx} className="flex flex-col lg:flex-row items-end gap-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <div className="flex-1 w-full">
                      <label className="block text-xs text-slate-400 mb-1">Product</label>
                      <select
                        required
                        value={line.productId}
                        onChange={(e) => handleLineChange(idx, 'productId', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Item</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-full lg:w-36">
                      <label className="block text-xs text-slate-400 mb-1">Recorded System Qty</label>
                      <input
                        type="text"
                        readOnly
                        value={line.recordedQuantity}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-400 text-xs rounded-lg px-3 py-2 font-mono"
                      />
                    </div>

                    <div className="w-full lg:w-36">
                      <label className="block text-xs text-slate-400 mb-1">Physical Counted Qty</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={line.countedQuantity}
                        onChange={(e) => handleLineChange(idx, 'countedQuantity', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="w-full lg:w-32">
                      <label className="block text-xs text-slate-400 mb-1">Calculated Delta</label>
                      <div className={`px-3 py-2 rounded-lg border text-xs font-mono font-bold flex items-center justify-between ${
                        isGain ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                        isLoss ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                        'bg-slate-800 border-slate-700 text-slate-400'
                      }`}>
                        <span>{isGain ? `+${line.delta}` : line.delta}</span>
                        {isGain && <ArrowUpRight className="w-3.5 h-3.5" />}
                        {isLoss && <ArrowDownRight className="w-3.5 h-3.5" />}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      disabled={lines.length <= 1}
                      className="p-2 text-slate-500 hover:text-rose-400 disabled:opacity-30 transition rounded-lg"
                      title="Remove Line"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/adjustments')}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition shadow-lg shadow-indigo-600/20"
            >
              {submitting ? 'Creating Count Order...' : 'Save Count as Draft'}
            </button>
          </div>
        </form>
      ) : adjustment ? (
        <div className="space-y-6">
          {/* Header Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase">Facility & Location</span>
              <div className="mt-1 font-bold text-white flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-cyan-400" />
                {adjustment.warehouse?.name}
              </div>
              <span className="text-xs font-mono text-slate-400">{adjustment.location?.name} ({adjustment.location?.code})</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase">Adjustment Reason</span>
              <div className="mt-1 font-bold text-white flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-amber-400" />
                {adjustment.reason}
              </div>
              <span className="text-xs text-slate-400 truncate block">{adjustment.notes || 'Standard cycle count'}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase">Validation Status</span>
              <div className="mt-1 font-bold text-white">
                {adjustment.validator?.name ? `Validated by ${adjustment.validator.name}` : 'Pending Validation'}
              </div>
              <span className="text-xs text-slate-400">Created by {adjustment.creator?.name || 'Staff'}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase">Timestamp</span>
              <div className="mt-1 font-bold text-white">
                {new Date(adjustment.createdAt).toLocaleDateString()}
              </div>
              <span className="text-xs text-slate-400">{new Date(adjustment.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Lines Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Box className="w-5 h-5 text-indigo-400" /> Reconciled Items
              </h2>
              <span className="text-xs text-slate-400">{adjustment.lines?.length || 0} Items</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Product</th>
                    <th className="px-6 py-3.5">SKU</th>
                    <th className="px-6 py-3.5 text-right">System Recorded</th>
                    <th className="px-6 py-3.5 text-right">Physical Counted</th>
                    <th className="px-6 py-3.5 text-right">Adjustment Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {adjustment.lines?.map((line, idx) => {
                    const isGain = line.delta > 0;
                    const isLoss = line.delta < 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        <td className="px-6 py-4 font-medium text-white">{line.product?.name}</td>
                        <td className="px-6 py-4 font-mono text-cyan-400 text-xs">{line.product?.sku}</td>
                        <td className="px-6 py-4 text-right font-mono text-slate-400">
                          {line.previousQuantity} {line.product?.uom?.symbol || ''}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-white">
                          {line.countedQuantity} {line.product?.uom?.symbol || ''}
                        </td>
                        <td className={`px-6 py-4 text-right font-mono font-bold ${
                          isGain ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-400'
                        }`}>
                          {isGain ? `+${line.delta}` : line.delta} {line.product?.uom?.symbol || ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        isOpen={confirmValidateOpen}
        onClose={() => setConfirmValidateOpen(false)}
        onConfirm={handleValidate}
        title="Commit Inventory Reconciliation"
        message={`Are you sure you want to validate adjustment ${adjustment?.referenceNo}? This will overwrite system balances with physical counts and record stock variance entries in the ledger.`}
        confirmText="Commit Adjustment"
        variant="primary"
      />

      <ConfirmModal
        isOpen={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={handleCancel}
        title="Cancel Adjustment"
        message={`Are you sure you want to cancel adjustment ${adjustment?.referenceNo}?`}
        confirmText="Cancel Adjustment"
        variant="danger"
      />
    </div>
  );
};
export default AdjustmentDetailPage;
