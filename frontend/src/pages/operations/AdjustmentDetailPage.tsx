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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/adjustments')}
            className="btn btn-secondary"
            style={{ padding: '8px' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {isNew ? 'New Stock Adjustment / Count' : adjustment?.referenceNo}
              </h1>
              {adjustment && <StatusBadge status={adjustment.status} />}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {isNew ? 'Reconcile physical on-hand stock with book inventory' : `Created on ${new Date(adjustment!.createdAt).toLocaleString()}`}
            </p>
          </div>
        </div>

        {!isNew && adjustment && !isLocked && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            {adjustment.status === 'DRAFT' && (
              <button
                onClick={handleMarkReady}
                disabled={submitting}
                className="btn btn-accent"
                style={{ fontSize: '13px' }}
              >
                <PlayCircle size={15} /> Mark Ready
              </button>
            )}

            {(adjustment.status === 'DRAFT' || adjustment.status === 'READY') && (
              <button
                onClick={() => setConfirmValidateOpen(true)}
                disabled={submitting}
                className="btn btn-primary"
                style={{ fontSize: '13px' }}
              >
                <CheckCircle2 size={15} /> Validate & Post Variance
              </button>
            )}

            <button
              onClick={() => setConfirmCancelOpen(true)}
              disabled={submitting}
              className="btn btn-danger"
              style={{ fontSize: '13px' }}
            >
              <XCircle size={15} /> Cancel
            </button>
          </div>
        )}
      </div>

      {/* Form or Detail View */}
      {isNew ? (
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Target Location & Justification
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Warehouse Facility <span style={{ color: 'var(--status-canceled-text)' }}>*</span>
                </label>
                <select
                  required
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Specific Rack / Bin Location <span style={{ color: 'var(--status-canceled-text)' }}>*</span>
                </label>
                <select
                  required
                  value={locationId}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select Location</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Adjustment Reason <span style={{ color: 'var(--status-canceled-text)' }}>*</span>
                </label>
                <select
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="form-select"
                >
                  <option value="ANNUAL_COUNT">Annual Physical Inventory Count</option>
                  <option value="CYCLE_COUNT">Routine Cycle Count</option>
                  <option value="DAMAGED_GOODS">Damaged / Expired Goods</option>
                  <option value="DISCREPANCY">Discrepancy Correction</option>
                  <option value="SCRAP">Scrap / Obsolescence</option>
                </select>
              </div>
            </div>

            <div style={{ paddingTop: '8px' }}>
              <label className="form-label">Audit Notes / Investigation Details</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Physical box recount confirmed 3 units damaged by water leak"
                className="form-input"
              />
            </div>
          </div>

          {/* Lines Table with real-time delta */}
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Physical Count Entries
              </h2>
              <button
                type="button"
                onClick={handleAddLine}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                <Plus size={14} /> Add Count Line
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {lines.map((line, idx) => {
                const isGain = line.delta > 0;
                const isLoss = line.delta < 0;
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'flex-end',
                      gap: '12px',
                      padding: '14px',
                      background: '#FAF8F5',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ flex: '1 1 240px' }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Product</label>
                      <select
                        required
                        value={line.productId}
                        onChange={(e) => handleLineChange(idx, 'productId', e.target.value)}
                        className="form-select"
                        style={{ fontSize: '13px' }}
                      >
                        <option value="">Select Item</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ width: '140px' }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Recorded System Qty</label>
                      <input
                        type="text"
                        readOnly
                        value={line.recordedQuantity}
                        className="form-input"
                        style={{ background: '#F5EFE3', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}
                      />
                    </div>

                    <div style={{ width: '140px' }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Physical Counted Qty</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={line.countedQuantity}
                        onChange={(e) => handleLineChange(idx, 'countedQuantity', e.target.value)}
                        className="form-input"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}
                      />
                    </div>

                    <div style={{ width: '140px' }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Calculated Delta</label>
                      <div
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid',
                          fontSize: '13px',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: isGain ? 'var(--status-done-bg)' : isLoss ? 'var(--status-canceled-bg)' : '#F5EFE3',
                          borderColor: isGain ? 'var(--status-done-border)' : isLoss ? 'var(--status-canceled-border)' : 'var(--border-medium)',
                          color: isGain ? 'var(--status-done-text)' : isLoss ? 'var(--status-canceled-text)' : 'var(--text-muted)',
                        }}
                      >
                        <span>{isGain ? `+${line.delta}` : line.delta}</span>
                        {isGain && <ArrowUpRight size={14} />}
                        {isLoss && <ArrowDownRight size={14} />}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      disabled={lines.length <= 1}
                      className="btn btn-secondary"
                      style={{ padding: '8px', color: 'var(--status-canceled-text)' }}
                      title="Remove Line"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => navigate('/adjustments')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
            >
              {submitting ? 'Creating Count Order...' : 'Save Count as Draft'}
            </button>
          </div>
        </form>
      ) : adjustment ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ padding: '16px 18px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Facility & Location</span>
              <div style={{ marginTop: '4px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={15} color="var(--color-primary)" />
                {adjustment.warehouse?.name}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                {adjustment.location?.name} ({adjustment.location?.code})
              </span>
            </div>

            <div className="card" style={{ padding: '16px 18px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Adjustment Reason</span>
              <div style={{ marginTop: '4px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Scale size={15} color="var(--color-accent)" />
                {adjustment.reason}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {adjustment.notes || 'Standard cycle count'}
              </span>
            </div>

            <div className="card" style={{ padding: '16px 18px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Validation Status</span>
              <div style={{ marginTop: '4px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {adjustment.validator?.name ? `Validated by ${adjustment.validator.name}` : 'Pending Validation'}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                Created by {adjustment.creator?.name || 'Staff'}
              </span>
            </div>

            <div className="card" style={{ padding: '16px 18px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Timestamp</span>
              <div style={{ marginTop: '4px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {new Date(adjustment.createdAt).toLocaleDateString()}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                {new Date(adjustment.createdAt).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Lines Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#FAF8F5',
              }}
            >
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Box size={18} color="var(--color-primary)" /> Reconciled Items
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{adjustment.lines?.length || 0} Items</span>
            </div>

            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th style={{ textAlign: 'right' }}>System Recorded</th>
                    <th style={{ textAlign: 'right' }}>Physical Counted</th>
                    <th style={{ textAlign: 'right' }}>Adjustment Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustment.lines?.map((line, idx) => {
                    const isGain = line.delta > 0;
                    const isLoss = line.delta < 0;
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{line.product?.name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-primary)' }}>{line.product?.sku}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {line.previousQuantity} {line.product?.uom?.symbol || ''}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {line.countedQuantity} {line.product?.uom?.symbol || ''}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            color: isGain ? 'var(--color-primary)' : isLoss ? 'var(--status-canceled-text)' : 'var(--text-muted)',
                          }}
                        >
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
