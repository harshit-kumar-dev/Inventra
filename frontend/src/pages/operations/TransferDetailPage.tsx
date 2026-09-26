import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { operationApi, InternalTransfer } from '../../services/operationApi';
import { productApi, Product } from '../../services/productApi';
import { warehouseApi, Warehouse, Location } from '../../services/warehouseApi';
import { stockApi } from '../../services/stockApi';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useToast } from '../../context/ToastContext';
import { ArrowLeft, ArrowLeftRight, CheckCircle2, PlayCircle, XCircle, Plus, Trash2, Building2, Calendar, Box, MoveRight } from 'lucide-react';

export const TransferDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [transfer, setTransfer] = useState<InternalTransfer | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [responsible, setResponsible] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Array<{
    productId: string;
    sourceLocationId: string;
    destinationLocationId: string;
    quantity: number;
    availableStock?: number;
  }>>([{ productId: '', sourceLocationId: '', destinationLocationId: '', quantity: 1, availableStock: 0 }]);

  // Options
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sourceLocations, setSourceLocations] = useState<Location[]>([]);
  const [destLocations, setDestLocations] = useState<Location[]>([]);

  // Action Modals
  const [confirmValidateOpen, setConfirmValidateOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  useEffect(() => {
    loadPrerequisites();
    if (!isNew && id) {
      loadTransfer(id);
    }
  }, [id, isNew]);

  useEffect(() => {
    if (sourceWarehouseId) {
      loadSourceLocations(sourceWarehouseId);
    } else {
      setSourceLocations([]);
    }
  }, [sourceWarehouseId]);

  useEffect(() => {
    if (destinationWarehouseId) {
      loadDestLocations(destinationWarehouseId);
    } else {
      setDestLocations([]);
    }
  }, [destinationWarehouseId]);

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
        setSourceWarehouseId(whs[0].id);
        setDestinationWarehouseId(whs[1]?.id || whs[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadSourceLocations = async (whId: string) => {
    try {
      const res = await warehouseApi.getLocations(whId);
      setSourceLocations(res.data?.locations || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDestLocations = async (whId: string) => {
    try {
      const res = await warehouseApi.getLocations(whId);
      setDestLocations(res.data?.locations || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTransfer = async (transferId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await operationApi.getTransferById(transferId);
      setTransfer(res.data?.transfer || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load transfer details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableStock = async (productId: string, locationId: string, idx: number) => {
    if (!productId || !locationId) return;
    try {
      const res = await stockApi.getStockByLocation(locationId);
      const match = res.data?.stock?.find((s) => s.productId === productId);
      const avail = match?.quantity || 0;
      const updated = [...lines];
      updated[idx].availableStock = avail;
      setLines(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        productId: '',
        sourceLocationId: sourceLocations[0]?.id || '',
        destinationLocationId: destLocations[0]?.id || '',
        quantity: 1,
        availableStock: 0,
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx: number, field: string, val: any) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: val };
    setLines(updated);

    if (field === 'productId' || field === 'sourceLocationId') {
      const prodId = field === 'productId' ? val : updated[idx].productId;
      const locId = field === 'sourceLocationId' ? val : updated[idx].sourceLocationId;
      fetchAvailableStock(prodId, locId, idx);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceWarehouseId || !destinationWarehouseId) {
      showToast('error', 'Missing Facilities', 'Please select source and destination warehouses');
      return;
    }

    // Validate that source != destination on line level
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.sourceLocationId === line.destinationLocationId) {
        showToast('error', 'Identical Locations', `Line #${i + 1} has identical source and destination locations.`);
        return;
      }
    }

    const validLines = lines.filter(
      (l) => l.productId && l.sourceLocationId && l.destinationLocationId && l.quantity > 0
    );

    if (validLines.length === 0) {
      showToast('error', 'Invalid Lines', 'Please configure at least one transfer line item');
      return;
    }

    setSubmitting(true);
    try {
      const res = await operationApi.createTransfer({
        sourceWarehouseId,
        destinationWarehouseId,
        scheduleDate,
        responsible,
        notes,
        lines: validLines.map(({ productId, sourceLocationId, destinationLocationId, quantity }) => ({
          productId,
          sourceLocationId,
          destinationLocationId,
          quantity,
        })),
      });

      showToast('success', 'Transfer Created', `Reference: ${res.data?.transfer.referenceNo}`);
      navigate(`/transfers/${res.data?.transfer.id}`);
    } catch (err: any) {
      showToast('error', 'Transfer Creation Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkReady = async () => {
    if (!transfer) return;
    setSubmitting(true);
    try {
      await operationApi.readyTransfer(transfer.id);
      showToast('success', 'Transfer Ready', 'Marked as READY for execution.');
      loadTransfer(transfer.id);
    } catch (err: any) {
      showToast('error', 'Operation Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidate = async () => {
    if (!transfer) return;
    setSubmitting(true);
    try {
      await operationApi.validateTransfer(transfer.id);
      showToast('success', 'Transfer Validated', 'Stock moved atomically with dual ledger records.');
      setConfirmValidateOpen(false);
      loadTransfer(transfer.id);
    } catch (err: any) {
      showToast('error', 'Validation Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!transfer) return;
    setSubmitting(true);
    try {
      await operationApi.cancelTransfer(transfer.id);
      showToast('info', 'Transfer Canceled', 'Operation canceled.');
      setConfirmCancelOpen(false);
      loadTransfer(transfer.id);
    } catch (err: any) {
      showToast('error', 'Cancellation Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState text="Loading transfer order details..." />;
  if (error && !isNew) return <ErrorState message={error} onRetry={() => id && loadTransfer(id)} />;

  const isDone = transfer?.status === 'DONE';
  const isCanceled = transfer?.status === 'CANCELED';
  const isLocked = isDone || isCanceled;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/transfers')}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {isNew ? 'New Internal Stock Transfer' : transfer?.referenceNo}
              </h1>
              {transfer && <StatusBadge status={transfer.status} />}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isNew ? 'Shift quantities between storage zones' : `Created on ${new Date(transfer!.createdAt).toLocaleString()}`}
            </p>
          </div>
        </div>

        {!isNew && transfer && !isLocked && (
          <div className="flex flex-wrap items-center gap-3">
            {transfer.status === 'DRAFT' && (
              <button
                onClick={handleMarkReady}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition shadow-lg shadow-blue-600/20"
              >
                <PlayCircle className="w-4 h-4" /> Mark Ready
              </button>
            )}

            {(transfer.status === 'DRAFT' || transfer.status === 'READY') && (
              <button
                onClick={() => setConfirmValidateOpen(true)}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4" /> Validate & Move Stock
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

      {/* Form or Read View */}
      {isNew ? (
        <form onSubmit={handleCreateSubmit} className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">Transfer Header</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Origin Warehouse <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={sourceWarehouseId}
                  onChange={(e) => setSourceWarehouseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                >
                  <option value="">Select Origin</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Destination Warehouse <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={destinationWarehouseId}
                  onChange={(e) => setDestinationWarehouseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                >
                  <option value="">Select Destination</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Transfer Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Responsible Staff
                </label>
                <input
                  type="text"
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  placeholder="e.g., Transfer Coordinator"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Transfer Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Rebalance inventory for seasonal demand"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Transfer Lines */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">Transfer Lines</h2>
              <button
                type="button"
                onClick={handleAddLine}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Transfer Item
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((line, idx) => {
                const isIdentical = line.sourceLocationId && line.destinationLocationId && line.sourceLocationId === line.destinationLocationId;
                const isShort = (line.availableStock || 0) < line.quantity;
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

                    <div className="w-full lg:w-44">
                      <label className="block text-xs text-slate-400 mb-1">Source Bin</label>
                      <select
                        required
                        value={line.sourceLocationId}
                        onChange={(e) => handleLineChange(idx, 'sourceLocationId', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Origin Bin</option>
                        {sourceLocations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} ({loc.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-full lg:w-44">
                      <label className="block text-xs text-slate-400 mb-1">Destination Bin</label>
                      <select
                        required
                        value={line.destinationLocationId}
                        onChange={(e) => handleLineChange(idx, 'destinationLocationId', e.target.value)}
                        className={`w-full bg-slate-900 border text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${
                          isIdentical ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-700 focus:ring-indigo-500'
                        }`}
                      >
                        <option value="">Select Target Bin</option>
                        {destLocations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} ({loc.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-full lg:w-28">
                      <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                        <span>Quantity</span>
                        <span className={`text-[10px] font-mono ${isShort ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
                          Avail: {line.availableStock ?? '-'}
                        </span>
                      </div>
                      <input
                        type="number"
                        required
                        min={1}
                        value={line.quantity}
                        onChange={(e) => handleLineChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className={`w-full bg-slate-900 border text-white text-xs rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 ${
                          isShort ? 'border-rose-500 focus:ring-rose-500 text-rose-300' : 'border-slate-700 focus:ring-indigo-500'
                        }`}
                      />
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
              onClick={() => navigate('/transfers')}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition shadow-lg shadow-indigo-600/20"
            >
              {submitting ? 'Creating Transfer...' : 'Save Transfer Draft'}
            </button>
          </div>
        </form>
      ) : transfer ? (
        <div className="space-y-6">
          {/* Header Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase">Origin Facility</span>
              <div className="mt-1 font-bold text-white flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-cyan-400" />
                {transfer.sourceWarehouse?.name}
              </div>
              <span className="text-xs font-mono text-cyan-400">{transfer.sourceWarehouse?.code}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase">Destination Facility</span>
              <div className="mt-1 font-bold text-white flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-400" />
                {transfer.destinationWarehouse?.name}
              </div>
              <span className="text-xs font-mono text-cyan-400">{transfer.destinationWarehouse?.code}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase">Scheduled Date</span>
              <div className="mt-1 font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-400" />
                {new Date(transfer.scheduleDate).toLocaleDateString()}
              </div>
              <span className="text-xs text-slate-400">Responsible: {transfer.responsible || 'Internal Logistics'}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase">Validation Status</span>
              <div className="mt-1 font-bold text-white">
                {transfer.validator?.name ? `Validated by ${transfer.validator.name}` : 'Pending Move'}
              </div>
              <span className="text-xs text-slate-400">Created by {transfer.creator?.name || 'Staff'}</span>
            </div>
          </div>

          {/* Lines Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Box className="w-5 h-5 text-indigo-400" /> Relocating Products
              </h2>
              <span className="text-xs text-slate-400">{transfer.lines?.length || 0} Items</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Product</th>
                    <th className="px-6 py-3.5">SKU</th>
                    <th className="px-6 py-3.5">From Location</th>
                    <th className="px-6 py-3.5"></th>
                    <th className="px-6 py-3.5">To Location</th>
                    <th className="px-6 py-3.5 text-right">Transfer Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {transfer.lines?.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 font-medium text-white">{line.product?.name}</td>
                      <td className="px-6 py-4 font-mono text-cyan-400 text-xs">{line.product?.sku}</td>
                      <td className="px-6 py-4 text-slate-300">
                        {line.sourceLocation?.name} <span className="text-xs font-mono text-slate-500">({line.sourceLocation?.code})</span>
                      </td>
                      <td className="px-2 py-4 text-center">
                        <MoveRight className="w-4 h-4 text-slate-500 inline" />
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {line.destinationLocation?.name} <span className="text-xs font-mono text-slate-500">({line.destinationLocation?.code})</span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-cyan-400">
                        {line.quantity} {line.product?.uom?.symbol || 'units'}
                      </td>
                    </tr>
                  ))}
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
        title="Execute Internal Stock Transfer"
        message={`Are you sure you want to validate transfer ${transfer?.referenceNo}? This will move inventory between source and destination bins and record dual ledger audit entries.`}
        confirmText="Execute Transfer"
        variant="primary"
      />

      <ConfirmModal
        isOpen={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={handleCancel}
        title="Cancel Transfer Order"
        message={`Are you sure you want to cancel internal transfer ${transfer?.referenceNo}?`}
        confirmText="Cancel Transfer"
        variant="danger"
      />
    </div>
  );
};
export default TransferDetailPage;
