import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { operationApi, Delivery } from '../../services/operationApi';
import { productApi, Product } from '../../services/productApi';
import { warehouseApi, Warehouse, Location } from '../../services/warehouseApi';
import { stockApi } from '../../services/stockApi';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useToast } from '../../context/ToastContext';
import { ArrowLeft, CheckCircle2, PlayCircle, XCircle, Plus, Trash2, Building2, User, Calendar, Box, AlertTriangle } from 'lucide-react';

export const DeliveryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state for creating delivery
  const [customerName, setCustomerName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [responsible, setResponsible] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Array<{ productId: string; locationId: string; quantity: number; availableStock?: number }>>([
    { productId: '', locationId: '', quantity: 1, availableStock: 0 },
  ]);

  // Master options
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Action Modals
  const [confirmValidateOpen, setConfirmValidateOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  useEffect(() => {
    loadPrerequisites();
    if (!isNew && id) {
      loadDelivery(id);
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
      setWarehouses(whRes.data?.warehouses || []);
      setProducts(prodRes.data?.products || []);

      if (isNew && whRes.data?.warehouses?.length) {
        setWarehouseId(whRes.data.warehouses[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadLocations = async (whId: string) => {
    try {
      const res = await warehouseApi.getLocations(whId);
      setLocations(res.data?.locations || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDelivery = async (deliveryId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await operationApi.getDeliveryById(deliveryId);
      setDelivery(res.data?.delivery || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load delivery order');
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
    setLines([...lines, { productId: '', locationId: locations[0]?.id || '', quantity: 1, availableStock: 0 }]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx: number, field: string, val: any) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: val };
    setLines(updated);

    if (field === 'productId' || field === 'locationId') {
      const prodId = field === 'productId' ? val : updated[idx].productId;
      const locId = field === 'locationId' ? val : updated[idx].locationId;
      fetchAvailableStock(prodId, locId, idx);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !warehouseId) {
      showToast('error', 'Missing Information', 'Customer name and warehouse are required');
      return;
    }

    const validLines = lines.filter((l) => l.productId && l.locationId && l.quantity > 0);
    if (validLines.length === 0) {
      showToast('error', 'Invalid Product Lines', 'Please add at least one valid product line');
      return;
    }

    setSubmitting(true);
    try {
      const res = await operationApi.createDelivery({
        customerName,
        deliveryAddress,
        warehouseId,
        scheduleDate,
        responsible,
        notes,
        lines: validLines.map(({ productId, locationId, quantity }) => ({
          productId,
          locationId,
          quantity,
        })),
      });

      showToast('success', 'Delivery Draft Created', `Reference: ${res.data?.delivery.referenceNo}`);
      navigate(`/deliveries/${res.data?.delivery.id}`);
    } catch (err: any) {
      showToast('error', 'Creation Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkReady = async () => {
    if (!delivery) return;
    setSubmitting(true);
    try {
      await operationApi.readyDelivery(delivery.id);
      showToast('success', 'Delivery Ready', 'Order marked as READY for dispatch.');
      loadDelivery(delivery.id);
    } catch (err: any) {
      showToast('error', 'Operation Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidate = async () => {
    if (!delivery) return;
    setSubmitting(true);
    try {
      await operationApi.validateDelivery(delivery.id);
      showToast('success', 'Delivery Validated', 'Stock deducted and outbound ledger records written.');
      setConfirmValidateOpen(false);
      loadDelivery(delivery.id);
    } catch (err: any) {
      showToast('error', 'Validation Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!delivery) return;
    setSubmitting(true);
    try {
      await operationApi.cancelDelivery(delivery.id);
      showToast('info', 'Delivery Canceled', 'Delivery order marked as CANCELED.');
      setConfirmCancelOpen(false);
      loadDelivery(delivery.id);
    } catch (err: any) {
      showToast('error', 'Cancellation Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState text="Loading delivery details..." />;
  if (error && !isNew) return <ErrorState message={error} onRetry={() => id && loadDelivery(id)} />;

  const isDone = delivery?.status === 'DONE';
  const isCanceled = delivery?.status === 'CANCELED';
  const isLocked = isDone || isCanceled;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/deliveries')}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {isNew ? 'New Outbound Delivery' : delivery?.referenceNo}
              </h1>
              {delivery && <StatusBadge status={delivery.status} />}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isNew ? 'Fulfill outbound shipment order for client' : `Created on ${new Date(delivery!.createdAt).toLocaleString()}`}
            </p>
          </div>
        </div>

        {/* Action Controls for Existing Delivery */}
        {!isNew && delivery && !isLocked && (
          <div className="flex flex-wrap items-center gap-3">
            {(delivery.status === 'DRAFT' || delivery.status === 'WAITING') && (
              <button
                onClick={handleMarkReady}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition shadow-lg shadow-blue-600/20"
              >
                <PlayCircle className="w-4 h-4" /> Check & Mark Ready
              </button>
            )}

            {(delivery.status === 'DRAFT' || delivery.status === 'READY') && (
              <button
                onClick={() => setConfirmValidateOpen(true)}
                disabled={submitting || delivery.hasShortage}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4" /> Validate & Ship
              </button>
            )}

            <button
              onClick={() => setConfirmCancelOpen(true)}
              disabled={submitting}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 border border-slate-700 rounded-xl text-sm transition"
            >
              <XCircle className="w-4 h-4" /> Cancel Order
            </button>
          </div>
        )}
      </div>

      {/* Shortage Alert Banner */}
      {!isNew && delivery?.hasShortage && (
        <div className="p-4 rounded-xl border bg-rose-500/10 border-rose-500/30 text-rose-300 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-sm block">Stock Shortage Detected</span>
            One or more items in this delivery order exceed available location quantities. Rebalance or restock before validating.
          </div>
        </div>
      )}

      {/* Form or Details */}
      {isNew ? (
        <form onSubmit={handleCreateSubmit} className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">Order Header</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Customer / Destination Recipient <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g., Acme Industrial Corp"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Fulfillment Warehouse <span className="text-rose-400">*</span>
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
                  Scheduled Delivery Date <span className="text-rose-400">*</span>
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
                  Delivery Destination Address
                </label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="e.g., Dock 4, 100 Industrial Parkway"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Sales Order / Reference Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., SO-10294 / Priority Client"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Product Lines */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">Outbound Product Lines</h2>
              <button
                type="button"
                onClick={handleAddLine}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Outbound Item
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((line, idx) => {
                const isShort = (line.availableStock || 0) < line.quantity;
                return (
                  <div key={idx} className="flex flex-col sm:flex-row items-end gap-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
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

                    <div className="w-full sm:w-48">
                      <label className="block text-xs text-slate-400 mb-1">Pick Location</label>
                      <select
                        required
                        value={line.locationId}
                        onChange={(e) => handleLineChange(idx, 'locationId', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Location</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} ({loc.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-full sm:w-32">
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
              onClick={() => navigate('/deliveries')}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition shadow-lg shadow-indigo-600/20"
            >
              {submitting ? 'Creating Order...' : 'Save as Draft'}
            </button>
          </div>
        </form>
      ) : delivery ? (
        <div className="space-y-6">
          {/* Overview Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase">Customer</span>
              <div className="mt-1 font-bold text-white flex items-center gap-1.5">
                <User className="w-4 h-4 text-cyan-400" />
                {delivery.customerName}
              </div>
              <span className="text-xs text-slate-400 truncate block">{delivery.deliveryAddress || 'No address specified'}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase">Source Warehouse</span>
              <div className="mt-1 font-bold text-white flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-400" />
                {delivery.warehouse?.name}
              </div>
              <span className="text-xs font-mono text-cyan-400">{delivery.warehouse?.code}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase">Dispatch Target</span>
              <div className="mt-1 font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-400" />
                {new Date(delivery.scheduleDate).toLocaleDateString()}
              </div>
              <span className="text-xs text-slate-400">Responsible: {delivery.responsible || 'Fulfillment Unit'}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-semibold uppercase">Validation Status</span>
              <div className="mt-1 font-bold text-white">
                {delivery.validator?.name ? `Validated by ${delivery.validator.name}` : 'Pending Validation'}
              </div>
              <span className="text-xs text-slate-400">Created by {delivery.creator?.name || 'System'}</span>
            </div>
          </div>

          {/* Lines Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Box className="w-5 h-5 text-indigo-400" /> Items to Dispatch
              </h2>
              <span className="text-xs text-slate-400">{delivery.lines?.length || 0} Products</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Product</th>
                    <th className="px-6 py-3.5">SKU</th>
                    <th className="px-6 py-3.5">Pick Location</th>
                    <th className="px-6 py-3.5 text-right">Available Stock</th>
                    <th className="px-6 py-3.5 text-right">Demand Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {delivery.lines?.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 font-medium text-white">{line.product?.name}</td>
                      <td className="px-6 py-4 font-mono text-cyan-400 text-xs">{line.product?.sku}</td>
                      <td className="px-6 py-4 text-slate-300">
                        {line.location?.name} <span className="text-xs font-mono text-slate-500">({line.location?.code})</span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs">
                        {line.availableStock !== undefined ? (
                          <span className={line.isShortage ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                            {line.availableStock} {line.product?.uom?.symbol || ''}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-rose-400">
                        -{line.quantity} {line.product?.uom?.symbol || 'units'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* Confirmation Dialogs */}
      <ConfirmModal
        isOpen={confirmValidateOpen}
        onClose={() => setConfirmValidateOpen(false)}
        onConfirm={handleValidate}
        title="Validate & Ship Delivery Order"
        message={`Are you sure you want to validate delivery ${delivery?.referenceNo}? This action will permanently decrease physical stock and record an immutable ledger movement.`}
        confirmText="Confirm & Deduct Stock"
        variant="primary"
      />

      <ConfirmModal
        isOpen={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={handleCancel}
        title="Cancel Delivery Order"
        message={`Are you sure you want to cancel delivery order ${delivery?.referenceNo}?`}
        confirmText="Cancel Delivery"
        variant="danger"
      />
    </div>
  );
};
export default DeliveryDetailPage;
