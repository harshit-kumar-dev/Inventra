import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  MapPin,
  Building2,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { warehouseApi, Warehouse, Location } from '../../services/warehouseApi';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Modal } from '../../components/Modal';
import { StatusBadge } from '../../components/StatusBadge';
import { useToast } from '../../context/ToastContext';

export const LocationListPage: React.FC = () => {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [locations, setLocations] = useState<Location[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedWhFilter, setSelectedWhFilter] = useState<string>(searchParams.get('warehouseId') || 'ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Create / Edit Modal State
  const [locModalOpen, setLocModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<Location | null>(null);
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [locWarehouseId, setLocWarehouseId] = useState('');
  const [locType, setLocType] = useState('INTERNAL');
  const [savingLoc, setSavingLoc] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [locToDelete, setLocToDelete] = useState<Location | null>(null);
  const [deletingLoc, setDeletingLoc] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [locRes, whRes] = await Promise.all([
        warehouseApi.getLocations(),
        warehouseApi.getWarehouses(),
      ]);
      setLocations(locRes.data?.locations || []);
      const whList = whRes.data?.warehouses || [];
      setWarehouses(whList);

      // Default warehouse for new location modal if available
      if (whList.length > 0 && !locWarehouseId) {
        setLocWarehouseId(whList[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load locations from server.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingLoc(null);
    setLocName('');
    setLocCode('');
    setLocType('INTERNAL');
    setLocWarehouseId(
      selectedWhFilter !== 'ALL'
        ? selectedWhFilter
        : warehouses.length > 0
        ? warehouses[0].id
        : ''
    );
    setFormError(null);
    setLocModalOpen(true);
  };

  const handleOpenEdit = (loc: Location, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingLoc(loc);
    setLocName(loc.name);
    setLocCode(loc.code);
    setLocWarehouseId(loc.warehouseId || (loc.warehouse?.id ?? ''));
    setLocType(loc.type || 'INTERNAL');
    setFormError(null);
    setLocModalOpen(true);
  };

  const handleOpenDelete = (loc: Location, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setLocToDelete(loc);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim() || !locCode.trim() || !locWarehouseId) {
      setFormError('Name, Short Code, and Warehouse are all required.');
      return;
    }

    setSavingLoc(true);
    setFormError(null);
    try {
      if (editingLoc) {
        await warehouseApi.updateLocation(editingLoc.id, {
          warehouseId: locWarehouseId,
          name: locName.trim(),
          code: locCode.trim().toUpperCase(),
          type: locType,
        });
        showToast('success', 'Location Updated', `Location "${locName.trim()}" updated successfully.`);
      } else {
        await warehouseApi.createLocation({
          warehouseId: locWarehouseId,
          name: locName.trim(),
          code: locCode.trim().toUpperCase(),
          type: locType,
        });
        showToast('success', 'Location Created', `New location "${locName.trim()}" registered.`);
      }
      setLocModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save location.');
    } finally {
      setSavingLoc(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!locToDelete) return;
    setDeletingLoc(true);
    setDeleteError(null);
    try {
      await warehouseApi.deleteLocation(locToDelete.id);
      showToast('success', 'Location Deleted', `Storage zone "${locToDelete.name}" was removed.`);
      setDeleteModalOpen(false);
      setLocToDelete(null);
      await loadData();
    } catch (err: any) {
      setDeleteError(err.message || 'Unable to delete location.');
    } finally {
      setDeletingLoc(false);
    }
  };

  // Filter Locations
  const filteredLocations = locations.filter((loc) => {
    // Warehouse Filter
    if (selectedWhFilter !== 'ALL' && loc.warehouseId !== selectedWhFilter && loc.warehouse?.id !== selectedWhFilter) {
      return false;
    }
    // Type Filter
    if (typeFilter !== 'ALL' && loc.type !== typeFilter) {
      return false;
    }
    // Search Query
    const q = searchQuery.toLowerCase();
    const matchesName = loc.name.toLowerCase().includes(q);
    const matchesCode = loc.code.toLowerCase().includes(q);
    const matchesWh =
      loc.warehouse?.name.toLowerCase().includes(q) ||
      loc.warehouse?.code.toLowerCase().includes(q);
    return matchesName || matchesCode || matchesWh;
  });

  if (loading) return <LoadingState message="Loading storage locations & zones..." />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Breadcrumb & Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
        <Link to="/settings" style={{ color: '#4F5B2A', textDecoration: 'none', fontWeight: 600 }}>
          Settings
        </Link>
        <ChevronRight size={14} color="#D8C9A8" />
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Locations</span>
      </div>

      {/* Page Header */}
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
              fontSize: '26px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: 0,
            }}
          >
            <MapPin size={26} color="#B8892D" />
            Locations
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Configure internal storage racks, picking bins, input bays, and dispatch zones
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleOpenCreate}
            disabled={warehouses.length === 0}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> New Location
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          backgroundColor: '#FFFFFF',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid #D8C9A8',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '240px', flex: 1 }}>
            <Search
              size={16}
              color="#4F5B2A"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search location name, code, warehouse..."
              className="form-input"
              style={{ paddingLeft: '36px', height: '38px' }}
            />
          </div>

          {/* Warehouse Dropdown Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={16} color="#4F5B2A" />
            <select
              value={selectedWhFilter}
              onChange={(e) => {
                setSelectedWhFilter(e.target.value);
                if (e.target.value === 'ALL') {
                  searchParams.delete('warehouseId');
                } else {
                  searchParams.set('warehouseId', e.target.value);
                }
                setSearchParams(searchParams);
              }}
              className="form-select"
              style={{ height: '38px', minWidth: '180px' }}
            >
              <option value="ALL">All Warehouses ({warehouses.length})</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
          </div>

          {/* Location Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="#B8892D" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="form-select"
              style={{ height: '38px', minWidth: '150px' }}
            >
              <option value="ALL">All Types</option>
              <option value="INTERNAL">Internal Storage</option>
              <option value="INPUT">Receiving Dock (Input)</option>
              <option value="OUTPUT">Dispatch Bay (Output)</option>
              <option value="SCRAP">Scrap / Quarantine</option>
            </select>
          </div>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Showing <strong>{filteredLocations.length}</strong> of <strong>{locations.length}</strong> locations
        </div>
      </div>

      {/* Locations Table */}
      {filteredLocations.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={searchQuery || selectedWhFilter !== 'ALL' || typeFilter !== 'ALL' ? 'No Matching Locations' : 'No Locations Configured'}
          description={
            searchQuery || selectedWhFilter !== 'ALL' || typeFilter !== 'ALL'
              ? 'No storage locations match your applied filters.'
              : warehouses.length === 0
              ? 'Please create a warehouse facility first before adding storage locations.'
              : 'Add your first storage rack, aisle, or dock location.'
          }
          actionText={warehouses.length === 0 ? 'Create Warehouse' : 'New Location'}
          onAction={warehouses.length === 0 ? () => (window.location.href = '/settings/warehouse') : handleOpenCreate}
        />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Short Code</th>
                  <th>Warehouse</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.map((loc) => {
                  const whName = loc.warehouse?.name || '—';
                  const whCode = loc.warehouse?.code || '';

                  return (
                    <tr key={loc.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              backgroundColor: '#F5EFE3',
                              color: '#B8892D',
                              border: '1px solid #D8C9A8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '12px',
                            }}
                          >
                            <MapPin size={16} />
                          </div>
                          <span>{loc.name}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#F5EFE3',
                            color: '#4F5B2A',
                            border: '1px solid #D8C9A8',
                          }}
                        >
                          {loc.code}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono)',
                              backgroundColor: '#4F5B2A',
                              color: '#FFFFFF',
                            }}
                          >
                            {whCode}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {whName}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '3px 9px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            backgroundColor:
                              loc.type === 'INTERNAL'
                                ? 'rgba(79, 91, 42, 0.1)'
                                : loc.type === 'INPUT'
                                ? 'rgba(184, 137, 45, 0.15)'
                                : loc.type === 'OUTPUT'
                                ? 'rgba(45, 95, 184, 0.12)'
                                : 'rgba(184, 50, 50, 0.12)',
                            color:
                              loc.type === 'INTERNAL'
                                ? '#4F5B2A'
                                : loc.type === 'INPUT'
                                ? '#B8892D'
                                : loc.type === 'OUTPUT'
                                ? '#1F55A8'
                                : '#A82828',
                            border: '1px solid rgba(0,0,0,0.06)',
                          }}
                        >
                          {loc.type === 'INTERNAL'
                            ? 'Internal Storage'
                            : loc.type === 'INPUT'
                            ? 'Receiving Dock'
                            : loc.type === 'OUTPUT'
                            ? 'Dispatch Bay'
                            : 'Scrap / Quarantine'}
                        </span>
                      </td>
                      <td>
                        {loc.active ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#4F5B2A',
                            }}
                          >
                            <CheckCircle2 size={13} /> Active
                          </span>
                        ) : (
                          <StatusBadge status="INACTIVE" />
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(loc, e)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '12.5px', height: '32px' }}
                            title="Edit Location"
                          >
                            <Edit2 size={13} style={{ marginRight: '4px' }} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleOpenDelete(loc, e)}
                            style={{
                              padding: '6px 10px',
                              fontSize: '12.5px',
                              height: '32px',
                              borderRadius: '6px',
                              border: '1px solid rgba(184, 50, 50, 0.3)',
                              backgroundColor: 'rgba(184, 50, 50, 0.06)',
                              color: '#A82828',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: 600,
                            }}
                            title="Delete Location"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Location Create / Edit Modal */}
      <Modal
        isOpen={locModalOpen}
        onClose={() => setLocModalOpen(false)}
        title={editingLoc ? 'Edit Storage Location' : 'New Location'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {formError && (
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
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{formError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              Warehouse <span style={{ color: '#9E1C1C' }}>*</span>
            </label>
            <select
              required
              value={locWarehouseId}
              onChange={(e) => setLocWarehouseId(e.target.value)}
              className="form-select"
            >
              <option value="" disabled>Select parent warehouse...</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              Name <span style={{ color: '#9E1C1C' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={locName}
              onChange={(e) => setLocName(e.target.value)}
              placeholder="e.g., Main Storage or Rack A-12"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              Short Code <span style={{ color: '#9E1C1C' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={locCode}
              onChange={(e) => setLocCode(e.target.value.toUpperCase())}
              placeholder="e.g., MAIN or RACK_A"
              className="form-input"
              style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
            />
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Unique identifier within the chosen warehouse.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              Location Type
            </label>
            <select
              value={locType}
              onChange={(e) => setLocType(e.target.value)}
              className="form-select"
            >
              <option value="INTERNAL">Internal Storage (General Stock)</option>
              <option value="INPUT">Receiving Dock (Inbound Receipts)</option>
              <option value="OUTPUT">Dispatch Bay (Outbound Deliveries)</option>
              <option value="SCRAP">Scrap / Quarantine Zone</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={() => setLocModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingLoc}
              className="btn btn-primary"
            >
              {savingLoc ? 'Saving...' : editingLoc ? 'Save Changes' : 'Create Location'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Location Deletion"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(184, 50, 50, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#A82828',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                Are you sure you want to delete this location?
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                You are about to permanently remove storage zone <strong>{locToDelete?.name} ({locToDelete?.code})</strong> in warehouse <strong>{locToDelete?.warehouse?.name}</strong>.
              </p>
            </div>
          </div>

          {deleteError && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(184, 50, 50, 0.1)',
                border: '1px solid rgba(184, 50, 50, 0.3)',
                color: '#9E1C1C',
                fontSize: '13px',
                lineHeight: '1.45',
              }}
            >
              <strong>Backend Constraint Notice:</strong>
              <div style={{ marginTop: '4px' }}>{deleteError}</div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deletingLoc}
              onClick={handleConfirmDelete}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: '#A82828',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 600,
                fontSize: '13.5px',
                cursor: 'pointer',
              }}
            >
              {deletingLoc ? 'Deleting...' : 'Delete Location'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LocationListPage;
