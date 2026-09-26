import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { operationApi, Receipt } from '../../services/operationApi';
import { productApi, Product } from '../../services/productApi';
import { warehouseApi, Warehouse, Location } from '../../services/warehouseApi';
import { supplierApi, Supplier } from '../../services/supplierApi';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Plus,
  Printer,
  XCircle,
  CheckCircle2,
  PlayCircle,
  Trash2,
  Package,
  Calendar,
  User,
  Truck,
  Building2,
  MapPin,
  FileText,
  Save,
  ArrowLeft,
} from 'lucide-react';

export const ReceiptDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state for new receipt
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [responsible, setResponsible] = useState(user?.name || 'Harshit Kumar');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Array<{ productId: string; locationId: string; quantity: number }>>([
    { productId: '', locationId: '', quantity: 1 },
  ]);

  // Master lookup data
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Confirmation Modals
  const [confirmValidateOpen, setConfirmValidateOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  useEffect(() => {
    loadPrerequisites();
    if (!isNew && id) {
      loadReceipt(id);
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
      const [supRes, whRes, prodRes] = await Promise.all([
        supplierApi.getSuppliers(),
        warehouseApi.getWarehouses(),
        productApi.getProducts({ active: 'true', limit: 100 }),
      ]);
      const supList = supRes.data?.suppliers || [];
      const whList = whRes.data?.warehouses || [];
      const prodList = prodRes.data?.products || [];

      setSuppliers(supList);
      setWarehouses(whList);
      setProducts(prodList);

      if (isNew) {
        if (supList.length > 0) setSupplierId(supList[0].id);
        if (whList.length > 0) setWarehouseId(whList[0].id);
        if (user?.name) setResponsible(user.name);
      }
    } catch (err: any) {
      console.error('Failed to load receipt prerequisites:', err);
    }
  };

  const loadLocations = async (whId: string) => {
    try {
      const res = await warehouseApi.getLocations(whId);
      const locList = res.data?.locations || [];
      setLocations(locList);

      // Auto-assign first location to lines missing one
      if (locList.length > 0) {
        setLines((prev) =>
          prev.map((l) => ({
            ...l,
            locationId: l.locationId || locList[0].id,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load locations for warehouse:', err);
    }
  };

  const loadReceipt = async (receiptId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await operationApi.getReceiptById(receiptId);
      const data = res.data?.receipt || null;
      setReceipt(data);
      if (data) {
        setSupplierId(data.supplierId);
        setWarehouseId(data.warehouseId);
        setScheduleDate(data.scheduleDate ? data.scheduleDate.split('T')[0] : '');
        setResponsible(data.responsible || data.creator?.name || user?.name || '');
        setNotes(data.notes || '');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load receipt details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLine = () => {
    const defaultLocation = locations[0]?.id || '';
    const defaultProduct = products[0]?.id || '';
    setLines([...lines, { productId: defaultProduct, locationId: defaultLocation, quantity: 1 }]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx: number, field: string, val: any) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: val };
    setLines(updated);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !warehouseId) {
      showToast('error', 'Missing Information', 'Please select a supplier and destination warehouse.');
      return;
    }

    const validLines = lines.filter((l) => l.productId && l.quantity > 0);
    if (validLines.length === 0) {
      showToast('error', 'Invalid Product Lines', 'Please select at least one product with quantity > 0.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await operationApi.createReceipt({
        supplierId,
        warehouseId,
        scheduleDate,
        responsible: responsible || user?.name || 'Inventory Manager',
        notes,
        lines: validLines.map((l) => ({
          productId: l.productId,
          locationId: l.locationId || locations[0]?.id,
          quantity: Number(l.quantity),
        })),
      });

      showToast('success', 'Receipt Draft Created', `Document: ${res.data?.receipt.referenceNo}`);
      navigate(`/receipts/${res.data?.receipt.id}`);
    } catch (err: any) {
      showToast('error', 'Creation Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkReady = async () => {
    if (!receipt) return;
    setSubmitting(true);
    try {
      await operationApi.readyReceipt(receipt.id);
      showToast('success', 'Status Updated', 'Receipt marked as READY for dock receiving.');
      await loadReceipt(receipt.id);
    } catch (err: any) {
      showToast('error', 'Operation Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidate = async () => {
    if (!receipt) return;
    setSubmitting(true);
    try {
      await operationApi.validateReceipt(receipt.id);
      showToast('success', 'Receipt Validated', 'Stock updated and immutable audit ledger entries written.');
      setConfirmValidateOpen(false);
      await loadReceipt(receipt.id);
    } catch (err: any) {
      showToast('error', 'Validation Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!receipt) return;
    setSubmitting(true);
    try {
      await operationApi.cancelReceipt(receipt.id);
      showToast('info', 'Receipt Canceled', 'Document marked as CANCELED.');
      setConfirmCancelOpen(false);
      await loadReceipt(receipt.id);
    } catch (err: any) {
      showToast('error', 'Cancellation Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <LoadingState text="Loading receipt document..." />;
  if (error && !isNew) return <ErrorState message={error} onRetry={() => id && loadReceipt(id)} />;

  const status = isNew ? 'DRAFT' : receipt?.status || 'DRAFT';
  const isDraft = status === 'DRAFT';
  const isReady = status === 'READY';
  const isDone = status === 'DONE';
  const isCanceled = status === 'CANCELED';

  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Top Back Navigation Bar (Screen Only) */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/receipts')}
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '13px' }}
        >
          <ArrowLeft size={15} /> Back to Receipts
        </button>

        {!isNew && (
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
            Created: {receipt?.createdAt ? new Date(receipt.createdAt).toLocaleString() : '-'}
          </div>
        )}
      </div>

      {/* Main ERP Centered Document Sheet Container */}
      <div
        className="card print-document"
        style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 8px 30px rgba(79, 91, 42, 0.08)',
          padding: '36px 42px',
          position: 'relative',
        }}
      >
        {/* ========================================================= */}
        {/* 1. DOCUMENT TITLE & HEADER BAR                            */}
        {/* ========================================================= */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            paddingBottom: '20px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {/* Left: [ New ] Button + Large Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Link
              to="/receipts/new"
              className="btn btn-primary no-print"
              style={{
                fontSize: '13px',
                padding: '7px 14px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={15} /> New
            </Link>

            <h1
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Receipt
            </h1>
          </div>

          {/* Right: Actual Receipt Document Identifier */}
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              {isNew ? 'New Receipt Draft' : receipt?.referenceNo || 'WH/IN/----'}
            </div>
            {!isNew && receipt?.warehouse && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {receipt.warehouse.name} ({receipt.warehouse.code})
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. ACTION CONTROLS & STATUS PROGRESSION BAR (ODOO-STYLE)  */}
        {/* ========================================================= */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            padding: '16px 0',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: '#FAF8F5',
            margin: '0 -42px',
            paddingLeft: '42px',
            paddingRight: '42px',
          }}
        >
          {/* Action Buttons based on Current State */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {isNew ? (
              <button
                type="button"
                onClick={handleCreateSubmit}
                disabled={submitting}
                className="btn btn-primary"
                style={{ fontSize: '13px', padding: '7px 16px' }}
              >
                <Save size={15} /> {submitting ? 'Creating...' : 'Save Draft'}
              </button>
            ) : (
              <>
                {/* DRAFT / READY ACTIONS */}
                {(isDraft || isReady) && (
                  <button
                    type="button"
                    onClick={() => setConfirmValidateOpen(true)}
                    disabled={submitting}
                    className="btn btn-primary"
                    style={{ fontSize: '13px', padding: '7px 16px' }}
                  >
                    <CheckCircle2 size={15} /> Validate
                  </button>
                )}

                {isDraft && (
                  <button
                    type="button"
                    onClick={handleMarkReady}
                    disabled={submitting}
                    className="btn btn-secondary"
                    style={{ fontSize: '13px', padding: '7px 14px' }}
                  >
                    <PlayCircle size={15} /> Mark as Ready
                  </button>
                )}

                {/* PRINT ACTION */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="btn btn-secondary"
                  style={{ fontSize: '13px', padding: '7px 14px' }}
                  title="Print Receiving Voucher"
                >
                  <Printer size={15} /> Print
                </button>

                {/* CANCEL ACTION */}
                {(isDraft || isReady) && (
                  <button
                    type="button"
                    onClick={() => setConfirmCancelOpen(true)}
                    disabled={submitting}
                    className="btn btn-danger"
                    style={{ fontSize: '13px', padding: '7px 14px' }}
                  >
                    <XCircle size={15} /> Cancel
                  </button>
                )}

                {/* DONE NOTIFICATION */}
                {isDone && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12.5px',
                      color: 'var(--color-primary)',
                      fontWeight: 600,
                      padding: '4px 10px',
                      background: 'var(--color-surface-tint)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <CheckCircle2 size={15} /> Inventory Ledger Updated
                  </span>
                )}
              </>
            )}
          </div>

          {/* Status Progression Workflow Indicator (Draft -> Ready -> Done) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-full)',
              padding: '3px 4px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {/* Step 1: Draft */}
            <div
              style={{
                padding: '4px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                backgroundColor: isDraft ? 'var(--color-primary)' : isDone || isReady ? 'var(--color-surface-tint)' : 'transparent',
                color: isDraft ? '#FFFFFF' : isDone || isReady ? 'var(--color-primary)' : 'var(--text-muted)',
                transition: 'all 0.2s ease',
              }}
            >
              Draft
            </div>

            <span style={{ color: 'var(--border-strong)', padding: '0 4px', fontSize: '12px' }}>→</span>

            {/* Step 2: Ready */}
            <div
              style={{
                padding: '4px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                backgroundColor: isReady ? 'var(--color-accent)' : isDone ? 'var(--color-surface-tint)' : 'transparent',
                color: isReady ? '#FFFFFF' : isDone ? 'var(--color-primary)' : 'var(--text-muted)',
                transition: 'all 0.2s ease',
              }}
            >
              Ready
            </div>

            <span style={{ color: 'var(--border-strong)', padding: '0 4px', fontSize: '12px' }}>→</span>

            {/* Step 3: Done / Canceled */}
            {isCanceled ? (
              <div
                style={{
                  padding: '4px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  backgroundColor: 'var(--status-canceled-bg)',
                  color: 'var(--status-canceled-text)',
                  border: '1px solid var(--status-canceled-border)',
                }}
              >
                Canceled
              </div>
            ) : (
              <div
                style={{
                  padding: '4px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  backgroundColor: isDone ? 'var(--color-primary)' : 'transparent',
                  color: isDone ? '#FFFFFF' : 'var(--text-muted)',
                  transition: 'all 0.2s ease',
                }}
              >
                Done
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. TWO-COLUMN METADATA INFORMATION SECTION                 */}
        {/* ========================================================= */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '32px',
            paddingTop: '28px',
            paddingBottom: '24px',
          }}
        >
          {/* LEFT COLUMN: Receive From & Responsible */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Receive From (Vendor / Supplier) */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label
                className="form-label"
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Truck size={14} color="var(--color-primary)" /> Receive From (Vendor)
              </label>

              {isNew ? (
                <select
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select Vendor / Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    paddingTop: '4px',
                  }}
                >
                  {receipt?.supplier?.name || 'Vendor not assigned'}
                  {(receipt?.supplier as any)?.contactName ? (
                    <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '8px' }}>
                      ({(receipt?.supplier as any).contactName})
                    </span>
                  ) : receipt?.supplier?.email ? (
                    <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '8px' }}>
                      ({receipt.supplier.email})
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            {/* Destination Warehouse Facility */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label
                className="form-label"
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Building2 size={14} color="var(--color-primary)" /> Destination Warehouse
              </label>

              {isNew ? (
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
              ) : (
                <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)', paddingTop: '4px' }}>
                  {receipt?.warehouse?.name} ({receipt?.warehouse?.code})
                </div>
              )}
            </div>

            {/* Responsible User */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label
                className="form-label"
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <User size={14} color="var(--color-primary)" /> Responsible
              </label>

              {isNew ? (
                <input
                  type="text"
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  placeholder="e.g. Harshit Kumar"
                  className="form-input"
                />
              ) : (
                <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)', paddingTop: '4px' }}>
                  {receipt?.responsible || receipt?.creator?.name || user?.name || 'Administrator'}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Schedule Date & Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Schedule Date */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label
                className="form-label"
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Calendar size={14} color="var(--color-primary)" /> Schedule Date
              </label>

              {isNew ? (
                <input
                  type="date"
                  required
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="form-input"
                />
              ) : (
                <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)', paddingTop: '4px' }}>
                  {receipt?.scheduleDate ? new Date(receipt.scheduleDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Immediate Intake'}
                </div>
              )}
            </div>

            {/* Document Status */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label
                className="form-label"
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <FileText size={14} color="var(--color-primary)" /> Status
              </label>
              <div style={{ paddingTop: '4px' }}>
                <StatusBadge status={status} />
              </div>
            </div>

            {/* Internal Intake Notes */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label
                className="form-label"
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--text-secondary)',
                }}
              >
                Intake Notes (Optional)
              </label>
              {isNew ? (
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Delivery truck manifest, PO number..."
                  className="form-input"
                />
              ) : (
                <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', paddingTop: '4px' }}>
                  {receipt?.notes || 'No notes specified.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. PRODUCTS DOCUMENT SECTION                              */}
        {/* ========================================================= */}
        <div style={{ marginTop: '24px' }}>
          {/* Section Tab Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              borderBottom: '2px solid var(--color-primary)',
              paddingBottom: '8px',
              marginBottom: '16px',
            }}
          >
            <span
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: 'var(--color-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Package size={16} /> Products
            </span>
          </div>

          {/* Product Lines Table */}
          {isNew ? (
            /* Editable Lines for New Receipt */
            <div>
              <div className="table-container" style={{ border: '1px solid var(--border-subtle)' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '45%' }}>Product</th>
                      <th style={{ width: '30%' }}>Receiving Location</th>
                      <th style={{ width: '15%' }}>Quantity</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => (
                      <tr key={idx}>
                        <td>
                          <select
                            required
                            value={line.productId}
                            onChange={(e) => handleLineChange(idx, 'productId', e.target.value)}
                            className="form-select"
                            style={{ fontSize: '13.5px' }}
                          >
                            <option value="">Select Item from Catalog</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            required
                            value={line.locationId}
                            onChange={(e) => handleLineChange(idx, 'locationId', e.target.value)}
                            className="form-select"
                            style={{ fontSize: '13.5px' }}
                          >
                            <option value="">Select Location</option>
                            {locations.map((loc) => (
                              <option key={loc.id} value={loc.id}>
                                {loc.name} ({loc.code})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            required
                            value={line.quantity}
                            onChange={(e) => handleLineChange(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className="form-input"
                            style={{ fontSize: '14px', fontWeight: 600, textAlign: 'center' }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            disabled={lines.length <= 1}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: lines.length <= 1 ? 'var(--border-medium)' : 'var(--rose-400)',
                              cursor: lines.length <= 1 ? 'not-allowed' : 'pointer',
                              padding: '6px',
                            }}
                            title="Remove Line"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add New Line Button */}
              <div style={{ marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="btn btn-secondary"
                  style={{ fontSize: '13px', padding: '6px 14px' }}
                >
                  <Plus size={14} /> Add Product Line
                </button>
              </div>
            </div>
          ) : (
            /* View Mode: Document Lines Table */
            <div className="table-container" style={{ border: '1px solid var(--border-subtle)' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Receiving Shelf / Location</th>
                    <th style={{ textAlign: 'right' }}>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt?.lines && receipt.lines.length > 0 ? (
                    receipt.lines.map((line) => (
                      <tr key={line.id || Math.random()}>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-primary)' }}>
                            {line.product?.name || 'Inventory Item'}
                          </div>
                          <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                            {line.product?.sku || '-'}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MapPin size={14} color="var(--color-primary)" />
                            <span style={{ fontWeight: 600 }}>{line.location?.name || 'Main Intake Shelf'}</span>
                            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>({line.location?.code})</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              fontSize: '15px',
                              fontWeight: 800,
                              fontFamily: 'var(--font-mono)',
                              color: 'var(--color-primary)',
                            }}
                          >
                            {line.quantity} {line.product?.uom?.symbol || 'Units'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No product lines attached to this receipt order.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Printable Footer Section (Print Mode Only) */}
        <div
          className="print-only"
          style={{
            display: 'none',
            marginTop: '48px',
            paddingTop: '24px',
            borderTop: '1px dashed var(--border-medium)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
            <div style={{ textAlign: 'center', minWidth: '180px' }}>
              <div style={{ borderTop: '1px solid #000', paddingTop: '6px', fontSize: '12px', fontWeight: 600 }}>
                Receiving Clerk Signature
              </div>
            </div>
            <div style={{ textAlign: 'center', minWidth: '180px' }}>
              <div style={{ borderTop: '1px solid #000', paddingTop: '6px', fontSize: '12px', fontWeight: 600 }}>
                Warehouse Supervisor Signature
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Validate Receipt */}
      <ConfirmModal
        isOpen={confirmValidateOpen}
        onClose={() => setConfirmValidateOpen(false)}
        onConfirm={handleValidate}
        title="Validate Goods Receipt"
        message="Validating this receipt will commit all received product quantities directly to real-time warehouse stock and write immutable audit ledger entries. This action cannot be reversed."
        confirmText="Confirm & Post to Stock"
        cancelText="Cancel"
        type="primary"
        isLoading={submitting}
      />

      {/* Confirmation Modal: Cancel Receipt */}
      <ConfirmModal
        isOpen={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={handleCancel}
        title="Cancel Goods Receipt"
        message="Are you sure you want to cancel this receipt? Once canceled, this intake order cannot be processed or validated."
        confirmText="Yes, Cancel Receipt"
        cancelText="Keep Draft"
        type="danger"
        isLoading={submitting}
      />

      {/* Embedded Print Stylesheet */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print,
          aside,
          header,
          .modal-backdrop,
          button {
            display: none !important;
          }
          .print-document {
            box-shadow: none !important;
            border: 1px solid #cccccc !important;
            padding: 20px !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
          .print-only {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ReceiptDetailPage;
