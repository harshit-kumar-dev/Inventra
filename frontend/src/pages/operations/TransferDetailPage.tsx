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
import { ArrowLeft, CheckCircle2, PlayCircle, XCircle, Plus, Trash2, Building2, Calendar, Box, MoveRight } from 'lucide-react';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/transfers')}
            className="btn btn-secondary"
            style={{ padding: '8px' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {isNew ? 'New Internal Stock Transfer' : transfer?.referenceNo}
              </h1>
              {transfer && <StatusBadge status={transfer.status} />}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {isNew ? 'Shift quantities between storage zones' : `Created on ${new Date(transfer!.createdAt).toLocaleString()}`}
            </p>
          </div>
        </div>

        {!isNew && transfer && !isLocked && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            {transfer.status === 'DRAFT' && (
              <button
                onClick={handleMarkReady}
                disabled={submitting}
                className="btn btn-accent"
                style={{ fontSize: '13px' }}
              >
                <PlayCircle size={15} /> Mark Ready
              </button>
            )}

            {(transfer.status === 'DRAFT' || transfer.status === 'READY') && (
              <button
                onClick={() => setConfirmValidateOpen(true)}
                disabled={submitting}
                className="btn btn-primary"
                style={{ fontSize: '13px' }}
              >
                <CheckCircle2 size={15} /> Validate & Move Stock
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

      {/* Form or Read View */}
      {isNew ? (
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Transfer Header
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Origin Warehouse <span style={{ color: 'var(--status-canceled-text)' }}>*</span>
                </label>
                <select
                  required
                  value={sourceWarehouseId}
                  onChange={(e) => setSourceWarehouseId(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select Origin</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Destination Warehouse <span style={{ color: 'var(--status-canceled-text)' }}>*</span>
                </label>
                <select
                  required
                  value={destinationWarehouseId}
                  onChange={(e) => setDestinationWarehouseId(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select Destination</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Transfer Date <span style={{ color: 'var(--status-canceled-text)' }}>*</span>
                </label>
                <input
                  type="date"
                  required
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Responsible Staff</label>
                <input
                  type="text"
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  placeholder="e.g., Transfer Coordinator"
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Transfer Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Rebalance inventory for seasonal demand"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Transfer Lines */}
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Transfer Lines
              </h2>
              <button
                type="button"
                onClick={handleAddLine}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                <Plus size={14} /> Add Transfer Item
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {lines.map((line, idx) => {
                const isIdentical = line.sourceLocationId && line.destinationLocationId && line.sourceLocationId === line.destinationLocationId;
                const isShort = (line.availableStock || 0) < line.quantity;
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
                    <div style={{ flex: '1 1 200px' }}>
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

                    <div style={{ flex: '1 1 180px' }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Source Bin</label>
                      <select
                        required
                        value={line.sourceLocationId}
                        onChange={(e) => handleLineChange(idx, 'sourceLocationId', e.target.value)}
                        className="form-select"
                        style={{ fontSize: '13px' }}
                      >
                        <option value="">Select Origin Bin</option>
                        {sourceLocations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} ({loc.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ flex: '1 1 180px' }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Destination Bin</label>
                      <select
                        required
                        value={line.destinationLocationId}
                        onChange={(e) => handleLineChange(idx, 'destinationLocationId', e.target.value)}
                        className="form-select"
                        style={{
                          fontSize: '13px',
                          borderColor: isIdentical ? 'var(--status-canceled-border)' : undefined,
                        }}
                      >
                        <option value="">Select Target Bin</option>
                        {destLocations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} ({loc.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ width: '120px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        <span>Quantity</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: isShort ? 'var(--status-canceled-text)' : 'var(--color-primary)' }}>
                          Avail: {line.availableStock ?? '-'}
                        </span>
                      </div>
                      <input
                        type="number"
                        required
                        min={1}
                        value={line.quantity}
                        onChange={(e) => handleLineChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className="form-input"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '13px',
                          borderColor: isShort ? 'var(--status-canceled-border)' : undefined,
                        }}
                      />
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
              onClick={() => navigate('/transfers')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
            >
              {submitting ? 'Creating Transfer...' : 'Save Transfer Draft'}
            </button>
          </div>
        </form>
      ) : transfer ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ padding: '16px 18px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Origin Facility</span>
              <div style={{ marginTop: '4px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={15} color="var(--color-primary)" />
                {transfer.sourceWarehouse?.name}
              </div>
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', marginTop: '2px', display: 'block' }}>
                {transfer.sourceWarehouse?.code}
              </span>
            </div>

            <div className="card" style={{ padding: '16px 18px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Destination Facility</span>
              <div style={{ marginTop: '4px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={15} color="var(--color-primary)" />
                {transfer.destinationWarehouse?.name}
              </div>
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', marginTop: '2px', display: 'block' }}>
                {transfer.destinationWarehouse?.code}
              </span>
            </div>

            <div className="card" style={{ padding: '16px 18px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Scheduled Date</span>
              <div style={{ marginTop: '4px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={15} color="var(--color-accent)" />
                {new Date(transfer.scheduleDate).toLocaleDateString()}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                Responsible: {transfer.responsible || 'Internal Logistics'}
              </span>
            </div>

            <div className="card" style={{ padding: '16px 18px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Validation Status</span>
              <div style={{ marginTop: '4px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {transfer.validator?.name ? `Validated by ${transfer.validator.name}` : 'Pending Move'}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                Created by {transfer.creator?.name || 'Staff'}
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
                <Box size={18} color="var(--color-primary)" /> Relocating Products
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{transfer.lines?.length || 0} Items</span>
            </div>

            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>From Location</th>
                    <th></th>
                    <th>To Location</th>
                    <th style={{ textAlign: 'right' }}>Transfer Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {transfer.lines?.map((line, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{line.product?.name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-primary)' }}>{line.product?.sku}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {line.sourceLocation?.name} <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>({line.sourceLocation?.code})</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <MoveRight size={16} color="var(--color-accent)" style={{ display: 'inline' }} />
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {line.destinationLocation?.name} <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>({line.destinationLocation?.code})</span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-primary)' }}>
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
