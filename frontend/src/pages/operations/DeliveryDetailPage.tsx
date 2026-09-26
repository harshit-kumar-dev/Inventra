import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { operationApi, Delivery, DeliveryLine } from '../../services/operationApi';
import { productApi, Product } from '../../services/productApi';
import { warehouseApi, Warehouse, Location } from '../../services/warehouseApi';
import { stockApi } from '../../services/stockApi';
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
  Building2,
  MapPin,
  FileText,
  Save,
  ArrowLeft,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Truck,
  Check,
  Ban,
  Boxes,
} from 'lucide-react';

export const DeliveryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [responsible, setResponsible] = useState(user?.name || 'Inventory Manager');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<
    Array<{ productId: string; locationId: string; quantity: number; availableStock?: number; isShortage?: boolean }>
  >([{ productId: '', locationId: '', quantity: 1, availableStock: 0, isShortage: false }]);

  // Master lookup data
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Confirmation Modals
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
      const whList = whRes.data?.warehouses || [];
      const prodList = prodRes.data?.products || [];

      setWarehouses(whList);
      setProducts(prodList);

      if (isNew) {
        if (whList.length > 0) setWarehouseId(whList[0].id);
        if (user?.name) setResponsible(user.name);
      }
    } catch (err: any) {
      console.error('Failed to load delivery prerequisites:', err);
    }
  };

  const loadLocations = async (whId: string) => {
    try {
      const res = await warehouseApi.getLocations(whId);
      const locList = res.data?.locations || [];
      setLocations(locList);

      // Auto-assign first location to lines missing one and check stock
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

  const loadDelivery = async (deliveryId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await operationApi.getDeliveryById(deliveryId);
      const data = res.data?.delivery || null;
      setDelivery(data);
      if (data) {
        setCustomerName(data.customerName || '');
        setDeliveryAddress(data.deliveryAddress || '');
        setWarehouseId(data.warehouseId);
        setScheduleDate(data.scheduleDate ? data.scheduleDate.split('T')[0] : '');
        setResponsible(data.responsible || data.creator?.name || user?.name || '');
        setNotes(data.notes || '');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load delivery order details');
    } finally {
      setLoading(false);
    }
  };

  // Check available stock at location
  const checkStockAvailability = async (productId: string, locationId: string, idx: number) => {
    if (!productId || !locationId) return;
    try {
      const res = await stockApi.getStockByLocation(locationId);
      const stockList = res.data?.stock || [];
      const match = stockList.find((s) => s.productId === productId);
      const available = match?.quantity || 0;

      setLines((prev) => {
        const updated = [...prev];
        if (updated[idx]) {
          updated[idx].availableStock = available;
          updated[idx].isShortage = available < updated[idx].quantity;
        }
        return updated;
      });
    } catch (e) {
      console.error('Error checking stock:', e);
    }
  };

  const handleAddLine = () => {
    const defaultLocation = locations[0]?.id || '';
    const defaultProduct = products[0]?.id || '';
    const newIdx = lines.length;
    setLines([...lines, { productId: defaultProduct, locationId: defaultLocation, quantity: 1, availableStock: 0, isShortage: false }]);
    if (defaultProduct && defaultLocation) {
      checkStockAvailability(defaultProduct, defaultLocation, newIdx);
    }
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx: number, field: string, val: any) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: val };

    if (field === 'quantity') {
      const q = Number(val) || 0;
      const avail = updated[idx].availableStock || 0;
      updated[idx].isShortage = avail < q;
    }

    setLines(updated);

    if (field === 'productId' || field === 'locationId') {
      const pId = field === 'productId' ? val : updated[idx].productId;
      const lId = field === 'locationId' ? val : updated[idx].locationId;
      checkStockAvailability(pId, lId, idx);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !warehouseId) {
      showToast('error', 'Missing Information', 'Please enter customer name and source warehouse.');
      return;
    }

    const validLines = lines.filter((l) => l.productId && l.quantity > 0);
    if (validLines.length === 0) {
      showToast('error', 'Invalid Product Lines', 'Please select at least one product with quantity > 0.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await operationApi.createDelivery({
        customerName: customerName.trim(),
        deliveryAddress: deliveryAddress.trim() || undefined,
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

      showToast('success', 'Delivery Order Created', `Document: ${res.data?.delivery.referenceNo}`);
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
      showToast('success', 'Status Updated', `Delivery ${delivery.referenceNo} is ready for dispatch.`);
      await loadDelivery(delivery.id);
    } catch (err: any) {
      showToast('error', 'Stock Check Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidateConfirm = async () => {
    if (!delivery) return;
    setSubmitting(true);
    try {
      await operationApi.validateDelivery(delivery.id);
      showToast('success', 'Delivery Order Completed', `Stock for ${delivery.referenceNo} successfully dispatched and logged to ledger.`);
      setConfirmValidateOpen(false);
      await loadDelivery(delivery.id);
    } catch (err: any) {
      showToast('error', 'Validation Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!delivery) return;
    setSubmitting(true);
    try {
      await operationApi.cancelDelivery(delivery.id);
      showToast('warning', 'Delivery Canceled', `Order ${delivery.referenceNo} marked as canceled.`);
      setConfirmCancelOpen(false);
      await loadDelivery(delivery.id);
    } catch (err: any) {
      showToast('error', 'Cancellation Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <LoadingState text="Loading delivery order document..." />;
  }

  if (error) {
    return (
      <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '24px' }}>
        <ErrorState message={error} onRetry={() => (id ? loadDelivery(id) : loadPrerequisites())} />
      </div>
    );
  }

  const currentStatus = isNew ? 'DRAFT' : delivery?.status || 'DRAFT';
  const hasShortage = !isNew && delivery?.hasShortage;

  // Determine stage active states
  const stages = [
    { key: 'DRAFT', label: 'Draft' },
    { key: 'WAITING', label: 'Waiting Availability' },
    { key: 'READY', label: 'Ready for Dispatch' },
    { key: 'DONE', label: 'Done' },
  ];

  const getStageIndex = (st: string) => {
    switch (st) {
      case 'DRAFT':
        return 0;
      case 'WAITING':
        return 1;
      case 'READY':
        return 2;
      case 'DONE':
        return 3;
      default:
        return 0;
    }
  };

  const currentStageIdx = getStageIndex(currentStatus);

  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Top Breadcrumb / Back Link */}
      <div className="no-print" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link
          to="/deliveries"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} />
          Back to Deliveries
        </Link>
      </div>

      {/* Main Centered ERP Document Container */}
      <div
        className="card print-document"
        style={{
          padding: '36px 40px',
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* ============================================================ */}
        {/* DOCUMENT HEADER: [ + New ] + Title + Document Reference */}
        {/* ============================================================ */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingBottom: '20px',
            borderBottom: '1px solid var(--border-light)',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {/* Left: New Button + Large Document Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              type="button"
              onClick={() => navigate('/deliveries/new')}
              className="btn btn-primary no-print"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 2px 8px rgba(79, 91, 42, 0.25)',
              }}
            >
              <Plus size={16} />
              New
            </button>

            <div>
              <h1
                style={{
                  fontSize: '26px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                  margin: 0,
                  lineHeight: 1.1,
                }}
              >
                Delivery Order
              </h1>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Stock Outbound & Customer Dispatch Order
              </div>
            </div>
          </div>

          {/* Right: Actual Delivery Reference Number */}
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                fontFamily: 'monospace',
                color: 'var(--color-primary)',
                letterSpacing: '0.02em',
              }}
            >
              {isNew ? 'New Delivery Draft' : delivery?.referenceNo}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {isNew ? 'Will be auto-generated on save' : `Created ${new Date(delivery?.createdAt || '').toLocaleDateString()}`}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* ACTION BAR: State-Aware Buttons (Validate, Print, Cancel, etc.) */}
        {/* ============================================================ */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 0',
            borderBottom: '1px solid var(--border-light)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Action Button Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {isNew ? (
              <button
                type="button"
                onClick={handleCreateSubmit}
                disabled={submitting}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  backgroundColor: 'var(--color-primary)',
                }}
              >
                <Save size={16} />
                {submitting ? 'Creating Draft...' : 'Save Delivery Draft'}
              </button>
            ) : (
              <>
                {/* Validate Button */}
                {(currentStatus === 'READY' || currentStatus === 'DRAFT' || currentStatus === 'WAITING') && (
                  <button
                    type="button"
                    onClick={() => setConfirmValidateOpen(true)}
                    disabled={submitting}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 18px',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      backgroundColor: 'var(--color-primary)',
                      color: '#FFFFFF',
                    }}
                  >
                    <CheckCircle2 size={16} />
                    {submitting ? 'Validating...' : 'Validate (Dispatch Stock)'}
                  </button>
                )}

                {/* Mark Ready Button */}
                {(currentStatus === 'DRAFT' || currentStatus === 'WAITING') && (
                  <button
                    type="button"
                    onClick={handleMarkReady}
                    disabled={submitting}
                    className="btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      backgroundColor: '#EDE3CF',
                      color: 'var(--color-primary)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                    }}
                  >
                    <PlayCircle size={16} />
                    Mark as Ready
                  </button>
                )}

                {/* Print Button */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="btn btn-outline"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderColor: 'var(--border-medium)',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <Printer size={16} />
                  Print Packing Slip
                </button>

                {/* Cancel Button */}
                {currentStatus !== 'DONE' && currentStatus !== 'CANCELED' && (
                  <button
                    type="button"
                    onClick={() => setConfirmCancelOpen(true)}
                    disabled={submitting}
                    className="btn btn-outline"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 14px',
                      fontSize: '13px',
                      color: '#A33B2E',
                      borderColor: '#E0B5B0',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <XCircle size={16} />
                    Cancel Order
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* STATUS PROGRESSION INDICATOR: Draft -> Waiting -> Ready -> Done */}
        {/* ============================================================ */}
        <div style={{ margin: '24px 0 28px 0' }}>
          {currentStatus === 'CANCELED' ? (
            <div
              style={{
                backgroundColor: 'rgba(163, 59, 46, 0.08)',
                border: '1px solid rgba(163, 59, 46, 0.3)',
                padding: '12px 20px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#A33B2E',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              <Ban size={18} />
              <span>This delivery order has been CANCELED. Stock was not dispatched.</span>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#F5EFE3',
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #D8C9A8',
                overflowX: 'auto',
              }}
            >
              {stages.map((stage, idx) => {
                const isCompleted = currentStageIdx > idx;
                const isCurrent = currentStageIdx === idx;
                const isFuture = currentStageIdx < idx;

                let stageBg = 'transparent';
                let stageColor = 'var(--text-muted)';
                let stageWeight = 500;

                if (isCompleted) {
                  stageColor = '#4F5B2A';
                  stageWeight = 700;
                } else if (isCurrent) {
                  stageBg = '#4F5B2A';
                  stageColor = '#FFFFFF';
                  stageWeight = 800;
                }

                return (
                  <React.Fragment key={stage.key}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: isCurrent ? '6px 14px' : '6px 10px',
                        borderRadius: '20px',
                        backgroundColor: stageBg,
                        color: stageColor,
                        fontWeight: stageWeight,
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        boxShadow: isCurrent ? '0 2px 8px rgba(79, 91, 42, 0.25)' : 'none',
                      }}
                    >
                      {isCompleted && <Check size={14} color="#4F5B2A" />}
                      {isCurrent && <Clock size={14} color="#FFFFFF" />}
                      <span>{stage.label}</span>
                    </div>

                    {idx < stages.length - 1 && (
                      <div
                        style={{
                          flex: 1,
                          height: '2px',
                          backgroundColor: isCompleted ? '#4F5B2A' : '#D8C9A8',
                          margin: '0 8px',
                          minWidth: '20px',
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* INSUFFICIENT STOCK BANNER (CRITICAL WIREFRAME REQUIREMENT) */}
        {/* ============================================================ */}
        {hasShortage && currentStatus !== 'DONE' && (
          <div
            className="animate-fade-in"
            style={{
              backgroundColor: 'rgba(220, 38, 38, 0.08)',
              border: '1.5px solid rgba(220, 38, 38, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <AlertTriangle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#DC2626' }}>
                Stock Shortage Alert: Insufficient Inventory Detected
              </div>
              <div style={{ fontSize: '13px', color: '#991B1B', marginTop: '2px', lineHeight: 1.4 }}>
                One or more delivery lines exceed available stock at the source location bin. Highlighted product rows require stock replenishment or quantity adjustments before order dispatch.
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TWO-COLUMN METADATA SECTION */}
        {/* ============================================================ */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '28px',
            padding: '24px',
            backgroundColor: '#FDFCFA',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
            marginBottom: '32px',
          }}
        >
          {/* LEFT COLUMN: Customer & Warehouse Destination */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Customer Name */}
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
                <User size={14} color="var(--color-primary)" />
                Customer / Recipient *
              </label>

              {isNew ? (
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Acme Corporation or Client Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              ) : (
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    paddingTop: '4px',
                  }}
                >
                  {delivery?.customerName || 'Customer not assigned'}
                </div>
              )}
            </div>

            {/* Delivery Address */}
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
                <MapPin size={14} color="var(--color-primary)" />
                Delivery Address / Destination
              </label>

              {isNew ? (
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 742 Evergreen Terrace, Sector 4"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
              ) : (
                <div
                  style={{
                    fontSize: '14px',
                    color: delivery?.deliveryAddress ? 'var(--text-primary)' : 'var(--text-muted)',
                    paddingTop: '4px',
                  }}
                >
                  {delivery?.deliveryAddress || 'Standard Warehouse Customer Dispatch'}
                </div>
              )}
            </div>

            {/* Source Warehouse Facility */}
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
                <Building2 size={14} color="var(--color-primary)" />
                Source Warehouse Facility *
              </label>

              {isNew ? (
                <select
                  className="form-select"
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                >
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </option>
                  ))}
                </select>
              ) : (
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    paddingTop: '4px',
                  }}
                >
                  {delivery?.warehouse?.name || 'Main Warehouse'} ({delivery?.warehouse?.code || 'WH'})
                </div>
              )}
            </div>

            {/* Responsible Officer */}
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
                <User size={14} color="var(--color-primary)" />
                Responsible Officer
              </label>

              {isNew ? (
                <input
                  type="text"
                  className="form-input"
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  placeholder="Officer name"
                />
              ) : (
                <div
                  style={{
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    paddingTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{delivery?.responsible || delivery?.creator?.name || 'Assigned Officer'}</span>
                  {(delivery?.creator as any)?.email && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({(delivery?.creator as any)?.email})</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Schedule, Operation Type & Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Scheduled Dispatch Date */}
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
                <Calendar size={14} color="var(--color-primary)" />
                Schedule Dispatch Date *
              </label>

              {isNew ? (
                <input
                  type="date"
                  required
                  className="form-input"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              ) : (
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    paddingTop: '4px',
                  }}
                >
                  {new Date(delivery?.scheduleDate || '').toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                  {delivery?.isLate && (
                    <span
                      style={{
                        marginLeft: '8px',
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        color: '#DC2626',
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 700,
                      }}
                    >
                      Past Due
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Operation Type Display */}
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
                <Truck size={14} color="var(--color-primary)" />
                Operation Type
              </label>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  paddingTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ArrowUpRight size={16} color="#B8892D" />
                <span>Outbound Customer Delivery (DELIVERY)</span>
              </div>
            </div>

            {/* Status Field */}
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
                Document Status
              </label>
              <div style={{ paddingTop: '4px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    backgroundColor:
                      currentStatus === 'DONE'
                        ? 'rgba(79, 91, 42, 0.12)'
                        : currentStatus === 'READY'
                        ? 'rgba(184, 137, 45, 0.14)'
                        : currentStatus === 'WAITING'
                        ? 'rgba(234, 88, 12, 0.12)'
                        : currentStatus === 'CANCELED'
                        ? 'rgba(239, 68, 68, 0.12)'
                        : '#EBE3D3',
                    color:
                      currentStatus === 'DONE'
                        ? '#4F5B2A'
                        : currentStatus === 'READY'
                        ? '#B8892D'
                        : currentStatus === 'WAITING'
                        ? '#C2410C'
                        : currentStatus === 'CANCELED'
                        ? '#DC2626'
                        : 'var(--text-secondary)',
                  }}
                >
                  {currentStatus}
                </span>
              </div>
            </div>

            {/* Internal Dispatch Notes */}
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
                <FileText size={14} color="var(--color-primary)" />
                Internal Dispatch Notes
              </label>

              {isNew ? (
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Gate instructions, special packaging, carrier tracking..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              ) : (
                <div
                  style={{
                    fontSize: '13px',
                    color: delivery?.notes ? 'var(--text-primary)' : 'var(--text-muted)',
                    paddingTop: '4px',
                    fontStyle: delivery?.notes ? 'normal' : 'italic',
                  }}
                >
                  {delivery?.notes || 'No special dispatch notes recorded.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PRODUCTS SECTION & TABLE WITH STOCK AVAILABILITY CHECK */}
        {/* ============================================================ */}
        <div style={{ marginTop: '32px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px',
            }}
          >
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: 0,
              }}
            >
              <Package size={20} color="var(--color-primary)" />
              Products for Dispatch
            </h2>

            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Total Ordered Items:{' '}
              <strong>
                {isNew
                  ? lines.reduce((sum, l) => sum + Number(l.quantity || 0), 0)
                  : delivery?.lines?.reduce((sum, l) => sum + l.quantity, 0) || 0}
              </strong>
            </div>
          </div>

          {/* Product Lines Table */}
          <div style={{ border: '1px solid #D8C9A8', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#F5EFE3', borderBottom: '2px solid #D8C9A8' }}>
                  <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Product Details & SKU
                  </th>
                  <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Source Location Bin
                  </th>
                  <th style={{ padding: '12px 18px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Ordered Quantity
                  </th>
                  <th style={{ padding: '12px 18px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Available Stock
                  </th>
                  {isNew && (
                    <th style={{ padding: '12px 18px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', width: '50px' }}>
                      Remove
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {isNew ? (
                  lines.map((line, idx) => {
                    const isShort = line.isShortage;
                    return (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid #EBE3D3',
                          backgroundColor: isShort ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                        }}
                      >
                        {/* Product Selector */}
                        <td style={{ padding: '12px 18px' }}>
                          <select
                            className="form-select"
                            value={line.productId}
                            onChange={(e) => handleLineChange(idx, 'productId', e.target.value)}
                            style={{ fontSize: '13.5px' }}
                          >
                            <option value="">Select a product...</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} [{p.sku}] {p.uom?.symbol ? `(${p.uom.symbol})` : ''}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Location Selector */}
                        <td style={{ padding: '12px 18px' }}>
                          <select
                            className="form-select"
                            value={line.locationId}
                            onChange={(e) => handleLineChange(idx, 'locationId', e.target.value)}
                            style={{ fontSize: '13.5px' }}
                          >
                            {locations.map((loc) => (
                              <option key={loc.id} value={loc.id}>
                                {loc.name} ({loc.code})
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Quantity */}
                        <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                          <input
                            type="number"
                            min="1"
                            step="any"
                            className="form-input"
                            value={line.quantity}
                            onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                            style={{ width: '100px', textAlign: 'right', display: 'inline-block' }}
                          />
                        </td>

                        {/* Available Stock Indicator */}
                        <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                          {isShort ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                backgroundColor: 'rgba(220, 38, 38, 0.12)',
                                color: '#DC2626',
                              }}
                            >
                              <AlertTriangle size={12} />
                              Shortage ({line.availableStock ?? 0} avail)
                            </span>
                          ) : (
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)' }}>
                              {line.availableStock ?? 0} in bin
                            </span>
                          )}
                        </td>

                        {/* Delete Row */}
                        <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            disabled={lines.length <= 1}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: lines.length <= 1 ? 'var(--text-muted)' : '#A33B2E',
                              cursor: lines.length <= 1 ? 'not-allowed' : 'pointer',
                              padding: '4px',
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : delivery?.lines?.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                      No product lines recorded for this delivery order.
                    </td>
                  </tr>
                ) : (
                  delivery?.lines?.map((line, idx) => {
                    const isShort = line.isShortage;
                    return (
                      <tr
                        key={line.id || idx}
                        style={{
                          borderBottom: '1px solid #EBE3D3',
                          backgroundColor: isShort ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                        }}
                      >
                        {/* Product */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                            {line.product?.name || 'Product'}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            SKU:{' '}
                            <span
                              style={{
                                backgroundColor: '#F5EFE3',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                border: '1px solid #D8C9A8',
                                fontSize: '11px',
                                fontWeight: 600,
                              }}
                            >
                              {line.product?.sku || 'N/A'}
                            </span>
                          </div>
                        </td>

                        {/* Location */}
                        <td style={{ padding: '14px 18px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {line.location?.name || 'Source Bin'}
                          </span>{' '}
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            ({line.location?.code || 'LOC'})
                          </span>
                        </td>

                        {/* Ordered Quantity */}
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {line.quantity}
                          </span>{' '}
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {line.product?.uom?.symbol || 'pcs'}
                          </span>
                        </td>

                        {/* Available Stock Warning Column */}
                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          {isShort ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 700,
                                backgroundColor: 'rgba(220, 38, 38, 0.12)',
                                color: '#DC2626',
                                border: '1px solid rgba(220, 38, 38, 0.25)',
                              }}
                            >
                              <AlertTriangle size={13} />
                              Shortage ({line.availableStock ?? 0} avail)
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                backgroundColor: 'rgba(79, 91, 42, 0.08)',
                                color: 'var(--color-primary)',
                              }}
                            >
                              <CheckCircle2 size={12} />
                              {line.availableStock !== undefined ? `${line.availableStock} in stock` : 'Available'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Bottom Add Line Action */}
            {isNew && (
              <div
                style={{
                  padding: '12px 18px',
                  backgroundColor: '#FDFCFA',
                  borderTop: '1px solid #D8C9A8',
                }}
              >
                <button
                  type="button"
                  onClick={handleAddLine}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Plus size={16} />
                  New Product Line
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* PRINTABLE FOOTER SIGNATURES (Printed Vouchers Only) */}
        {/* ============================================================ */}
        <div
          className="print-only"
          style={{
            display: 'none',
            marginTop: '50px',
            paddingTop: '20px',
            borderTop: '1px solid #000000',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '40px', marginTop: '40px' }}>
            <div>
              <div style={{ borderBottom: '1px solid #000000', height: '40px', marginBottom: '8px' }}></div>
              <div style={{ fontSize: '12px', fontWeight: 700 }}>Warehouse Dispatch Officer Signature</div>
              <div style={{ fontSize: '11px', color: '#555' }}>Name: {delivery?.responsible || '___________________'}</div>
            </div>
            <div>
              <div style={{ borderBottom: '1px solid #000000', height: '40px', marginBottom: '8px' }}></div>
              <div style={{ fontSize: '12px', fontWeight: 700 }}>Customer / Carrier Acceptance Signature</div>
              <div style={{ fontSize: '11px', color: '#555' }}>Received in Good Condition</div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={confirmValidateOpen}
        onClose={() => setConfirmValidateOpen(false)}
        onConfirm={handleValidateConfirm}
        title="Confirm Stock Dispatch & Delivery"
        message={`Are you sure you want to validate delivery "${delivery?.referenceNo}"? This will permanently deduct items from warehouse inventory and log the transaction to the stock ledger.`}
        confirmText="Validate & Dispatch"
        cancelText="Cancel"
        type="primary"
        isLoading={submitting}
      />

      <ConfirmModal
        isOpen={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={handleCancelConfirm}
        title="Cancel Delivery Order"
        message={`Are you sure you want to cancel delivery "${delivery?.referenceNo}"? This action cannot be undone.`}
        confirmText="Yes, Cancel Order"
        cancelText="Keep Order"
        type="danger"
        isLoading={submitting}
      />

      {/* Embedded Print CSS */}
      <style>{`
        @media print {
          body {
            background-color: #FFFFFF !important;
            color: #000000 !important;
          }
          .no-print, aside, header, nav {
            display: none !important;
          }
          .print-document {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          .print-only {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default DeliveryDetailPage;
