import React, { useState, useEffect } from 'react';
import { warehouseApi, Warehouse, Location } from '../../services/warehouseApi';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Modal } from '../../components/Modal';
import { StatusBadge } from '../../components/StatusBadge';
import { useToast } from '../../context/ToastContext';
import { Building2, Plus, MapPin, ChevronRight, Edit2, CheckCircle2 } from 'lucide-react';

export const WarehouseListPage: React.FC = () => {
  const { showToast } = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Warehouse Modal
  const [whModalOpen, setWhModalOpen] = useState(false);
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null);
  const [whName, setWhName] = useState('');
  const [whCode, setWhCode] = useState('');
  const [whAddress, setWhAddress] = useState('');
  const [savingWh, setSavingWh] = useState(false);

  // Location Modal
  const [locModalOpen, setLocModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<Location | null>(null);
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [locType, setLocType] = useState('INTERNAL');
  const [savingLoc, setSavingLoc] = useState(false);

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await warehouseApi.getWarehouses();
      const list = res.data?.warehouses || [];
      setWarehouses(list);
      if (list.length > 0) {
        if (selectedWarehouse) {
          const updated = list.find((w) => w.id === selectedWarehouse.id) || list[0];
          setSelectedWarehouse(updated);
        } else {
          setSelectedWarehouse(list[0]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWhCreate = () => {
    setEditingWh(null);
    setWhName('');
    setWhCode('');
    setWhAddress('');
    setWhModalOpen(true);
  };

  const handleOpenWhEdit = (wh: Warehouse, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingWh(wh);
    setWhName(wh.name);
    setWhCode(wh.code);
    setWhAddress(wh.address || '');
    setWhModalOpen(true);
  };

  const handleWhSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whName.trim() || !whCode.trim()) return;
    setSavingWh(true);
    try {
      if (editingWh) {
        await warehouseApi.updateWarehouse(editingWh.id, {
          name: whName,
          code: whCode,
          address: whAddress,
        });
        showToast('success', 'Warehouse Updated', `Warehouse "${whName}" updated successfully.`);
      } else {
        await warehouseApi.createWarehouse({
          name: whName,
          code: whCode,
          address: whAddress,
        });
        showToast('success', 'Warehouse Created', `Warehouse "${whName}" created successfully.`);
      }
      setWhModalOpen(false);
      await loadWarehouses();
    } catch (err: any) {
      showToast('error', 'Error Saving Warehouse', err.message);
    } finally {
      setSavingWh(false);
    }
  };

  const handleOpenLocCreate = () => {
    if (!selectedWarehouse) return;
    setEditingLoc(null);
    setLocName('');
    setLocCode('');
    setLocType('INTERNAL');
    setLocModalOpen(true);
  };

  const handleOpenLocEdit = (loc: Location, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingLoc(loc);
    setLocName(loc.name);
    setLocCode(loc.code);
    setLocType(loc.type);
    setLocModalOpen(true);
  };

  const handleLocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouse || !locName.trim() || !locCode.trim()) return;
    setSavingLoc(true);
    try {
      if (editingLoc) {
        await warehouseApi.updateLocation(editingLoc.id, {
          name: locName,
          code: locCode,
          type: locType,
        });
        showToast('success', 'Location Updated', `Location "${locName}" updated.`);
      } else {
        await warehouseApi.createLocation({
          warehouseId: selectedWarehouse.id,
          name: locName,
          code: locCode,
          type: locType,
        });
        showToast('success', 'Location Added', `Location "${locName}" created.`);
      }
      setLocModalOpen(false);
      await loadWarehouses();
    } catch (err: any) {
      showToast('error', 'Error Saving Location', err.message);
    } finally {
      setSavingLoc(false);
    }
  };

  if (loading) return <LoadingState message="Loading warehouse topological structures..." />;
  if (error) return <ErrorState message={error} onRetry={loadWarehouses} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Building2 size={26} color="var(--color-primary)" />
            Warehouses & Storage Locations
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Manage multi-warehouse facilities and granular internal storage racks
          </p>
        </div>
        <button onClick={handleOpenWhCreate} className="btn btn-primary">
          <Plus size={16} /> Add Warehouse
        </button>
      </div>

      {warehouses.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No Warehouses Configured"
          description="Register your first warehouse facility to start storing items."
          actionText="Create Warehouse"
          onAction={handleOpenWhCreate}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(280px, 1fr) 2fr',
            gap: '24px',
            alignItems: 'flex-start',
          }}
        >
          {/* Warehouse Selector Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2
              style={{
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                paddingLeft: '4px',
              }}
            >
              Facilities ({warehouses.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {warehouses.map((wh) => {
                const isSelected = selectedWarehouse?.id === wh.id;
                return (
                  <div
                    key={wh.id}
                    onClick={() => setSelectedWarehouse(wh)}
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-lg)',
                      border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'var(--color-surface-tint)' : '#FFFFFF',
                      boxShadow: isSelected ? '0 0 0 1px var(--color-primary), var(--shadow-sm)' : 'var(--shadow-sm)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '13px',
                          background: isSelected ? 'var(--color-primary)' : 'var(--color-background)',
                          color: isSelected ? '#FFFFFF' : 'var(--color-primary)',
                          border: isSelected ? 'none' : '1px solid var(--border-medium)',
                        }}
                      >
                        {wh.code}
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: isSelected ? 'var(--color-primary)' : 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          {wh.name}
                          {!wh.active && <StatusBadge status="INACTIVE" />}
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {wh.locations?.length || wh._count?.locations || 0} sub-locations
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={(e) => handleOpenWhEdit(wh, e)}
                        style={{
                          padding: '6px',
                          borderRadius: 'var(--radius-sm)',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Edit Facility"
                      >
                        <Edit2 size={15} />
                      </button>
                      <ChevronRight
                        size={18}
                        style={{
                          color: isSelected ? 'var(--color-primary)' : 'var(--text-muted)',
                          transform: isSelected ? 'translateX(2px)' : 'none',
                          transition: 'transform 0.2s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Location details for Selected Warehouse */}
          <div>
            {selectedWarehouse ? (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div
                  style={{
                    padding: '20px',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: 'var(--color-surface-tint)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {selectedWarehouse.name}
                      </h2>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '12px',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          background: 'var(--color-background)',
                          color: 'var(--color-primary)',
                          border: '1px solid var(--color-surface)',
                        }}
                      >
                        {selectedWarehouse.code}
                      </span>
                    </div>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      {selectedWarehouse.address || 'No physical address specified'}
                    </p>
                  </div>

                  <button
                    onClick={handleOpenLocCreate}
                    className="btn btn-primary"
                    style={{ fontSize: '13px', padding: '6px 14px' }}
                  >
                    <Plus size={14} /> Add Location
                  </button>
                </div>

                {/* Locations Table */}
                {(!selectedWarehouse.locations || selectedWarehouse.locations.length === 0) ? (
                  <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    <MapPin size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                    No locations added in this warehouse yet. Click "Add Location" to define storage zones.
                  </div>
                ) : (
                  <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Location Name</th>
                          <th>Code</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedWarehouse.locations.map((loc) => (
                          <tr key={loc.id}>
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MapPin size={15} color="var(--color-primary)" />
                                {loc.name}
                              </div>
                            </td>
                            <td>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', fontWeight: 600, color: 'var(--color-primary)' }}>
                                {loc.code}
                              </span>
                            </td>
                            <td>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  background: 'var(--color-surface-tint)',
                                  color: 'var(--text-secondary)',
                                  border: '1px solid var(--border-subtle)',
                                }}
                              >
                                {loc.type}
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
                                    color: 'var(--color-primary)',
                                  }}
                                >
                                  <CheckCircle2 size={13} /> Active
                                </span>
                              ) : (
                                <StatusBadge status="INACTIVE" />
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={(e) => handleOpenLocEdit(loc, e)}
                                style={{
                                  padding: '6px',
                                  borderRadius: 'var(--radius-sm)',
                                  border: 'none',
                                  background: 'transparent',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                }}
                                title="Edit Location"
                              >
                                <Edit2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Select a warehouse from the list to view and manage its storage racks.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warehouse Modal */}
      <Modal
        isOpen={whModalOpen}
        onClose={() => setWhModalOpen(false)}
        title={editingWh ? 'Edit Warehouse Facility' : 'Create Warehouse Facility'}
      >
        <form onSubmit={handleWhSubmit}>
          <div className="form-group">
            <label className="form-label">
              Warehouse Name <span style={{ color: 'var(--rose-400)' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={whName}
              onChange={(e) => setWhName(e.target.value)}
              placeholder="e.g., Central Distribution Center"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Unique Code <span style={{ color: 'var(--rose-400)' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={whCode}
              onChange={(e) => setWhCode(e.target.value.toUpperCase())}
              placeholder="e.g., WH-MAIN"
              className="form-input"
              style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Address / Location Details</label>
            <textarea
              rows={2}
              value={whAddress}
              onChange={(e) => setWhAddress(e.target.value)}
              placeholder="Physical street address or campus zone..."
              className="form-textarea"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={() => setWhModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingWh}
              className="btn btn-primary"
            >
              {savingWh ? 'Saving...' : editingWh ? 'Update Facility' : 'Create Facility'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Location Modal */}
      <Modal
        isOpen={locModalOpen}
        onClose={() => setLocModalOpen(false)}
        title={editingLoc ? 'Edit Storage Location' : `Add Location in ${selectedWarehouse?.name || 'Warehouse'}`}
      >
        <form onSubmit={handleLocSubmit}>
          <div className="form-group">
            <label className="form-label">
              Location Name <span style={{ color: 'var(--rose-400)' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={locName}
              onChange={(e) => setLocName(e.target.value)}
              placeholder="e.g., Rack A-12, Bin 4"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Location Code <span style={{ color: 'var(--rose-400)' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={locCode}
              onChange={(e) => setLocCode(e.target.value.toUpperCase())}
              placeholder="e.g., LOC-A1"
              className="form-input"
              style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Location Type</label>
            <select
              value={locType}
              onChange={(e) => setLocType(e.target.value)}
              className="form-select"
            >
              <option value="INTERNAL">Internal Storage</option>
              <option value="INPUT">Receiving Dock / Input</option>
              <option value="OUTPUT">Dispatch / Output</option>
              <option value="SCRAP">Scrap / Quarantine</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
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
              {savingLoc ? 'Saving...' : editingLoc ? 'Update Location' : 'Save Location'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default WarehouseListPage;
