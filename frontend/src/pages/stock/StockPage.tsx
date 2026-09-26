import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Boxes,
  Search,
  RefreshCw,
  Edit3,
  Building2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { stockApi, StockItem } from '../../services/stockApi';
import { operationApi } from '../../services/operationApi';
import { warehouseApi, Warehouse, Location } from '../../services/warehouseApi';
import { productApi, Product } from '../../services/productApi';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Modal } from '../../components/Modal';
import { StatusBadge } from '../../components/StatusBadge';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export const StockPage: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('ALL');

  // Update Stock Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [selectedLocId, setSelectedLocId] = useState<string>('');
  const [adjustmentType, setAdjustmentType] = useState<'INCREASE' | 'DECREASE' | 'SET_EXACT'>('INCREASE');
  const [adjustQuantity, setAdjustQuantity] = useState<number>(1);
  const [exactCount, setExactCount] = useState<number>(0);
  const [reason, setReason] = useState('Physical inventory correction');
  const [notes, setNotes] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    loadStockData();
  }, []);

  const loadStockData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch stock items
      const stockRes = await stockApi.queryStock({ limit: 100 });
      const items = stockRes.data?.stock || [];
      setStockItems(items);

      // 2. Fetch warehouses & locations for modal if authorized
      try {
        const [whRes, locRes] = await Promise.all([
          warehouseApi.getWarehouses(),
          warehouseApi.getLocations(),
        ]);
        setWarehouses(whRes.data?.warehouses || []);
        setLocations(locRes.data?.locations || []);
      } catch {
        // Warehouse staff may not have warehouse list permissions; locations fallback to stock records
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load stock data from backend API.');
    } finally {
      setLoading(false);
    }
  };

  // Open Update Stock Modal for an item
  const handleOpenUpdate = (item: StockItem) => {
    setSelectedItem(item);
    setSelectedLocId(item.locationId);
    setAdjustmentType('INCREASE');
    setAdjustQuantity(1);
    setExactCount(item.quantity || item.onHand || 0);
    setReason('Physical inventory correction');
    setNotes('');
    setModalError(null);
    setIsConfirming(false);
    setModalOpen(true);
  };

  // Current stock at the selected location in modal
  const currentLocationStock = React.useMemo(() => {
    if (!selectedItem) return 0;
    if (selectedLocId === selectedItem.locationId) {
      return selectedItem.quantity || selectedItem.onHand || 0;
    }
    const match = stockItems.find(
      (s) => s.productId === selectedItem.productId && s.locationId === selectedLocId
    );
    return match ? match.quantity || match.onHand || 0 : 0;
  }, [selectedItem, selectedLocId, stockItems]);

  // Calculate new counted stock and delta
  const calculatedNewCount = React.useMemo(() => {
    if (adjustmentType === 'INCREASE') {
      return currentLocationStock + (Number(adjustQuantity) || 0);
    } else if (adjustmentType === 'DECREASE') {
      return Math.max(0, currentLocationStock - (Number(adjustQuantity) || 0));
    } else {
      return Math.max(0, Number(exactCount) || 0);
    }
  }, [adjustmentType, adjustQuantity, exactCount, currentLocationStock]);

  const calculatedDelta = calculatedNewCount - currentLocationStock;

  // Handle Form Submission
  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!selectedLocId) {
      setModalError('Please select a valid storage location.');
      return;
    }

    if (calculatedDelta === 0) {
      setModalError('No change detected between current recorded stock and counted stock.');
      return;
    }

    if (calculatedNewCount < 0) {
      setModalError('New stock quantity cannot be negative.');
      return;
    }

    setIsConfirming(true);
  };

  const handleExecuteAdjustment = async () => {
    if (!selectedItem || !selectedLocId) return;

    setSubmitting(true);
    setModalError(null);

    try {
      // Find parent warehouse ID for selected location
      const chosenLoc =
        locations.find((l) => l.id === selectedLocId) || {
          warehouseId: selectedItem.warehouseId,
        };

      const warehouseId = chosenLoc.warehouseId || selectedItem.warehouseId;

      // 1. Create stock adjustment in DRAFT status
      const createRes = await operationApi.createAdjustment({
        warehouseId,
        locationId: selectedLocId,
        reason: reason.trim() || 'Direct stock update from Stock page',
        notes: notes.trim() || undefined,
        lines: [
          {
            productId: selectedItem.productId,
            countedQuantity: calculatedNewCount,
          },
        ],
      });

      const adjId = createRes.data?.adjustment?.id;
      if (!adjId) {
        throw new Error('Failed to create adjustment draft.');
      }

      // 2. Validate and apply adjustment through existing backend stock engine & ledger
      await operationApi.validateAdjustment(adjId);

      showToast(
        'success',
        'Stock Updated Successfully',
        `Adjusted "${selectedItem.productName}" from ${currentLocationStock} to ${calculatedNewCount} (${calculatedDelta > 0 ? `+${calculatedDelta}` : calculatedDelta}).`
      );

      setModalOpen(false);
      setIsConfirming(false);
      await loadStockData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to apply stock adjustment.');
      setIsConfirming(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter stock items
  const filteredStock = stockItems.filter((item) => {
    if (selectedWarehouseId !== 'ALL' && item.warehouseId !== selectedWarehouseId) {
      return false;
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.productName.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.locationName.toLowerCase().includes(q) ||
      item.locationCode.toLowerCase().includes(q) ||
      item.warehouseName.toLowerCase().includes(q)
    );
  });

  if (loading) return <LoadingState message="Loading live stock records & physical balances..." />;
  if (error) return <ErrorState message={error} onRetry={loadStockData} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', width: '100%', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Application Navigation Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #D8C9A8',
          overflowX: 'auto',
        }}
      >
        <Link to="/dashboard" className="top-nav-pill">
          Dashboard
        </Link>
        <span style={{ color: '#D8C9A8' }}>•</span>
        <Link to="/receipts" className="top-nav-pill">
          Operations
        </Link>
        <span style={{ color: '#D8C9A8' }}>•</span>
        <Link to="/products" className="top-nav-pill">
          Products
        </Link>
        <span style={{ color: '#D8C9A8' }}>•</span>
        <Link to="/move-history" className="top-nav-pill">
          Move History
        </Link>
        <span style={{ color: '#D8C9A8' }}>•</span>
        <Link to="/settings" className="top-nav-pill">
          Settings
        </Link>
      </div>

      {/* Page Title & Search Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: 0,
            }}
          >
            <Boxes size={28} color="#4F5B2A" />
            Stock
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Real-time physical inventory quantities, available free-to-use balance, and direct adjustments
          </p>
        </div>

        {/* Right Search & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Warehouse Selector */}
          {warehouses.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={16} color="#4F5B2A" />
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="form-select"
                style={{ height: '38px', minWidth: '160px', fontSize: '13px' }}
              >
                <option value="ALL">All Facilities</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Bar */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search
              size={16}
              color="#4F5B2A"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product name, SKU..."
              className="form-input"
              style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            onClick={loadStockData}
            className="btn btn-secondary"
            style={{ height: '38px', padding: '0 12px' }}
            title="Refresh Stock Data"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Stock Table */}
      {filteredStock.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={searchQuery ? 'No Products Match Your Search' : 'No Stock Records Found'}
          description={
            searchQuery
              ? `No stock entries matched "${searchQuery}". Try clearing the search filter.`
              : 'No stock balances are recorded in the inventory system yet. Receive goods or perform an initial stock count.'
          }
          actionText={searchQuery ? 'Clear Search' : 'View Products Catalog'}
          onAction={searchQuery ? () => setSearchQuery('') : () => navigate('/products')}
        />
      ) : (
        <div
          className="card"
          style={{
            padding: 0,
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #D8C9A8',
            borderRadius: '14px',
            boxShadow: '0 4px 16px rgba(79, 91, 42, 0.05)',
          }}
        >
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="custom-table" style={{ width: '100%' }}>
              <thead>
                <tr style={{ backgroundColor: '#F5EFE3', borderBottom: '1.5px solid #D8C9A8' }}>
                  <th style={{ color: '#4F5B2A', fontWeight: 700, fontSize: '13px', padding: '14px 18px' }}>
                    Product
                  </th>
                  <th style={{ color: '#4F5B2A', fontWeight: 700, fontSize: '13px', padding: '14px 18px' }}>
                    Per Unit Cost
                  </th>
                  <th style={{ color: '#4F5B2A', fontWeight: 700, fontSize: '13px', padding: '14px 18px' }}>
                    On Hand
                  </th>
                  <th style={{ color: '#4F5B2A', fontWeight: 700, fontSize: '13px', padding: '14px 18px' }}>
                    Free to Use
                  </th>
                  <th style={{ color: '#4F5B2A', fontWeight: 700, fontSize: '13px', textAlign: 'right', padding: '14px 18px' }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((item) => {
                  const onHandQty = item.onHand !== undefined ? item.onHand : item.quantity;
                  const freeToUseQty = item.freeToUse !== undefined ? item.freeToUse : onHandQty;
                  const isReserved = (item.reserved || 0) > 0;
                  const formattedCost =
                    item.perUnitCost !== undefined && item.perUnitCost !== null
                      ? `₹${Number(item.perUnitCost).toLocaleString('en-IN')}`
                      : '—';

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid rgba(216, 201, 168, 0.4)',
                        transition: 'background-color 0.15s ease',
                      }}
                      className="stock-row"
                    >
                      {/* Product Name & Details */}
                      <td style={{ padding: '14px 18px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-primary)' }}>
                            {item.productName}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                color: '#4F5B2A',
                                backgroundColor: '#F5EFE3',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: '1px solid #D8C9A8',
                              }}
                            >
                              {item.sku}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {item.warehouseCode} / {item.locationCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Per Unit Cost */}
                      <td style={{ padding: '14px 18px', fontWeight: 600, fontSize: '14px', color: '#4F5B2A' }}>
                        {formattedCost}
                      </td>

                      {/* On Hand */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '15px',
                              fontWeight: 800,
                              fontFamily: 'var(--font-mono)',
                              color: onHandQty <= 0 ? '#A82828' : '#2D3748',
                            }}
                          >
                            {onHandQty}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                            {item.uom}
                          </span>
                        </div>
                      </td>

                      {/* Free to Use */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '15px',
                              fontWeight: 800,
                              fontFamily: 'var(--font-mono)',
                              color: freeToUseQty <= 0 ? '#B8892D' : '#4F5B2A',
                            }}
                          >
                            {freeToUseQty}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                            {item.uom}
                          </span>
                          {isReserved && (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(184, 137, 45, 0.12)',
                                color: '#B8892D',
                                border: '1px solid rgba(184, 137, 45, 0.3)',
                              }}
                              title={`${item.reserved} units reserved by pending deliveries/transfers`}
                            >
                              {item.reserved} reserved
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenUpdate(item)}
                          className="btn btn-primary"
                          style={{
                            padding: '6px 14px',
                            fontSize: '13px',
                            fontWeight: 600,
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <Edit3 size={14} /> Update
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Update Stock Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title={isConfirming ? 'Confirm Stock Adjustment' : 'Update Stock'}
      >
        {selectedItem && (
          <div>
            {modalError && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(184, 50, 50, 0.1)',
                  border: '1px solid rgba(184, 50, 50, 0.3)',
                  color: '#9E1C1C',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{modalError}</span>
              </div>
            )}

            {!isConfirming ? (
              <form onSubmit={handleProceedToConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Product Info Block */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    backgroundColor: '#F5EFE3',
                    border: '1px solid #D8C9A8',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#B8892D', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Selected Product
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {selectedItem.productName}
                    </div>
                    <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#4F5B2A', fontWeight: 600 }}>
                      SKU: {selectedItem.sku}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Per Unit Cost</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#4F5B2A' }}>
                      ₹{Number(selectedItem.perUnitCost || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Location Selection */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Location <span style={{ color: '#9E1C1C' }}>*</span>
                  </label>
                  <select
                    value={selectedLocId}
                    onChange={(e) => setSelectedLocId(e.target.value)}
                    className="form-select"
                    required
                  >
                    {locations.length > 0 ? (
                      locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.warehouse?.code || 'WH'} / {loc.name} ({loc.code})
                        </option>
                      ))
                    ) : (
                      <option value={selectedItem.locationId}>
                        {selectedItem.warehouseCode} / {selectedItem.locationName} ({selectedItem.locationCode})
                      </option>
                    )}
                  </select>
                </div>

                {/* Current Stock Reference */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(79, 91, 42, 0.08)',
                    border: '1px solid rgba(79, 91, 42, 0.2)',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#4F5B2A' }}>
                    Current Recorded Stock:
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#4F5B2A' }}>
                    {currentLocationStock} {selectedItem.uom}
                  </span>
                </div>

                {/* Adjustment Type Selector */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Adjustment Type
                  </label>
                  <select
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value as any)}
                    className="form-select"
                  >
                    <option value="INCREASE">Increase Stock (Gain / Found Items)</option>
                    <option value="DECREASE">Decrease Stock (Loss / Damage / Shrinkage)</option>
                    <option value="SET_EXACT">Set Exact Physical Count</option>
                  </select>
                </div>

                {/* Quantity Input */}
                {adjustmentType === 'SET_EXACT' ? (
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      New Counted Quantity ({selectedItem.uom}) <span style={{ color: '#9E1C1C' }}>*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      required
                      value={exactCount}
                      onChange={(e) => setExactCount(parseFloat(e.target.value) || 0)}
                      placeholder="Enter verified physical count"
                      className="form-input"
                      style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      {adjustmentType === 'INCREASE' ? 'Quantity to Add' : 'Quantity to Deduct'} ({selectedItem.uom}){' '}
                      <span style={{ color: '#9E1C1C' }}>*</span>
                    </label>
                    <input
                      type="number"
                      min={0.01}
                      step="any"
                      required
                      value={adjustQuantity}
                      onChange={(e) => setAdjustQuantity(parseFloat(e.target.value) || 0)}
                      placeholder="e.g., 5"
                      className="form-input"
                      style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                )}

                {/* Reason */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Reason
                  </label>
                  <input
                    type="text"
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., Physical inventory correction, Annual audit"
                    className="form-input"
                  />
                </div>

                {/* Live Preview Calculation */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#FAFAF8',
                    border: '1px solid #D8C9A8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Projected Result</div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {currentLocationStock} → <span style={{ color: '#4F5B2A' }}>{calculatedNewCount} {selectedItem.uom}</span>
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      backgroundColor: calculatedDelta >= 0 ? 'rgba(79, 91, 42, 0.12)' : 'rgba(184, 50, 50, 0.12)',
                      color: calculatedDelta >= 0 ? '#4F5B2A' : '#A82828',
                    }}
                  >
                    Delta: {calculatedDelta >= 0 ? `+${calculatedDelta}` : calculatedDelta}
                  </div>
                </div>

                {/* Modal Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Review & Confirm Update
                  </button>
                </div>
              </form>
            ) : (
              /* Confirmation View */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(79, 91, 42, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#4F5B2A',
                      flexShrink: 0,
                    }}
                  >
                    <SlidersHorizontal size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                      Update Stock Balance?
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.45' }}>
                      This operation will execute a certified inventory adjustment, update the physical stock record, and append a permanent audit entry in the Stock Ledger.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#F5EFE3',
                    borderRadius: '10px',
                    padding: '16px',
                    border: '1px solid #D8C9A8',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Product:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedItem.productName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Location:</span>
                    <strong style={{ color: '#4F5B2A' }}>
                      {locations.find((l) => l.id === selectedLocId)?.name || selectedItem.locationName}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Current Stock:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {currentLocationStock} {selectedItem.uom}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>New Count:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#4F5B2A' }}>
                      {calculatedNewCount} {selectedItem.uom}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: '8px',
                      borderTop: '1px solid #D8C9A8',
                    }}
                  >
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Audit Delta:</span>
                    <strong
                      style={{
                        fontFamily: 'var(--font-mono)',
                        color: calculatedDelta >= 0 ? '#4F5B2A' : '#A82828',
                        fontSize: '14px',
                      }}
                    >
                      {calculatedDelta >= 0 ? `+${calculatedDelta}` : calculatedDelta} ({calculatedDelta >= 0 ? 'ADJUSTMENT_GAIN' : 'ADJUSTMENT_LOSS'})
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setIsConfirming(false)}
                    className="btn btn-secondary"
                  >
                    Back to Edit
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleExecuteAdjustment}
                    className="btn btn-primary"
                    style={{ minWidth: '130px' }}
                  >
                    {submitting ? 'Applying...' : 'Confirm Update'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <style>{`
        .top-nav-pill {
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #4F5B2A;
          text-decoration: none;
          transition: all 0.15s ease;
        }
        .top-nav-pill:hover {
          background-color: #F5EFE3;
          color: #313A17;
        }
        .stock-row:hover {
          background-color: #FDFBF7 !important;
        }
      `}</style>
    </div>
  );
};

export default StockPage;
