import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  ChevronRight,
  AlertTriangle,
  Search,
  ExternalLink,
} from 'lucide-react';
import { warehouseApi, Warehouse } from '../../services/warehouseApi';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Modal } from '../../components/Modal';
import { StatusBadge } from '../../components/StatusBadge';
import { useToast } from '../../context/ToastContext';

export const WarehouseListPage: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Create / Edit Modal State
  const [whModalOpen, setWhModalOpen] = useState(false);
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null);
  const [whName, setWhName] = useState('');
  const [whCode, setWhCode] = useState('');
  const [whAddress, setWhAddress] = useState('');
  const [savingWh, setSavingWh] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [whToDelete, setWhToDelete] = useState<Warehouse | null>(null);
  const [deletingWh, setDeletingWh] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await warehouseApi.getWarehouses();
      setWarehouses(res.data?.warehouses || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load warehouses from backend API.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingWh(null);
    setWhName('');
    setWhCode('');
    setWhAddress('');
    setFormError(null);
    setWhModalOpen(true);
  };

  const handleOpenEdit = (wh: Warehouse, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingWh(wh);
    setWhName(wh.name);
    setWhCode(wh.code);
    setWhAddress(wh.address || '');
    setFormError(null);
    setWhModalOpen(true);
  };

  const handleOpenDelete = (wh: Warehouse, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setWhToDelete(wh);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whName.trim() || !whCode.trim()) {
      setFormError('Name and Short Code are required.');
      return;
    }

    setSavingWh(true);
    setFormError(null);
    try {
      if (editingWh) {
        await warehouseApi.updateWarehouse(editingWh.id, {
          name: whName.trim(),
          code: whCode.trim().toUpperCase(),
          address: whAddress.trim(),
        });
        showToast('success', 'Warehouse Updated', `Warehouse "${whName.trim()}" was updated successfully.`);
      } else {
        await warehouseApi.createWarehouse({
          name: whName.trim(),
          code: whCode.trim().toUpperCase(),
          address: whAddress.trim(),
        });
        showToast('success', 'Warehouse Created', `New warehouse "${whName.trim()}" registered.`);
      }
      setWhModalOpen(false);
      await loadWarehouses();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save warehouse.');
    } finally {
      setSavingWh(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!whToDelete) return;
    setDeletingWh(true);
    setDeleteError(null);
    try {
      await warehouseApi.deleteWarehouse(whToDelete.id);
      showToast('success', 'Warehouse Removed', `Warehouse "${whToDelete.name}" has been deleted.`);
      setDeleteModalOpen(false);
      setWhToDelete(null);
      await loadWarehouses();
    } catch (err: any) {
      setDeleteError(err.message || 'Unable to delete warehouse.');
    } finally {
      setDeletingWh(false);
    }
  };

  const filteredWarehouses = warehouses.filter((wh) => {
    const q = searchQuery.toLowerCase();
    return (
      wh.name.toLowerCase().includes(q) ||
      wh.code.toLowerCase().includes(q) ||
      (wh.address && wh.address.toLowerCase().includes(q))
    );
  });

  if (loading) return <LoadingState message="Loading warehouse facilities..." />;
  if (error) return <ErrorState message={error} onRetry={loadWarehouses} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Breadcrumb & Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
        <Link to="/settings" style={{ color: '#4F5B2A', textDecoration: 'none', fontWeight: 600 }}>
          Settings
        </Link>
        <ChevronRight size={14} color="#D8C9A8" />
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Warehouse</span>
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
            <Building2 size={26} color="#4F5B2A" />
            Warehouse
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Configure and maintain multi-warehouse facilities and physical sites
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={handleOpenCreate} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> New Warehouse
          </button>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
          <Search
            size={16}
            color="#4F5B2A"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search warehouse name, code, address..."
            className="form-input"
            style={{ paddingLeft: '36px', height: '40px' }}
          />
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Showing <strong>{filteredWarehouses.length}</strong> of <strong>{warehouses.length}</strong> warehouses
        </div>
      </div>

      {/* Warehouse Records Table */}
      {filteredWarehouses.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={searchQuery ? 'No Matching Warehouses' : 'No Warehouses Found'}
          description={
            searchQuery
              ? `No warehouses matched your search query "${searchQuery}".`
              : 'Create your first warehouse facility to start storing stock.'
          }
          actionText={searchQuery ? 'Clear Search' : 'New Warehouse'}
          onAction={searchQuery ? () => setSearchQuery('') : handleOpenCreate}
        />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Short Code</th>
                  <th>Address</th>
                  <th>Locations</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWarehouses.map((wh) => {
                  const locCount = wh.locations?.length || wh._count?.locations || 0;
                  return (
                    <tr key={wh.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              backgroundColor: '#F5EFE3',
                              color: '#4F5B2A',
                              border: '1px solid #D8C9A8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '12px',
                            }}
                          >
                            {wh.code.slice(0, 3)}
                          </div>
                          <span>{wh.name}</span>
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
                          {wh.code}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', maxWidth: '300px' }}>
                        {wh.address ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MapPin size={14} color="#B8892D" style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {wh.address}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>— Not set —</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => navigate(`/settings/locations?warehouseId=${wh.id}`)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: 'transparent',
                            border: '1px solid #D8C9A8',
                            color: '#4F5B2A',
                            cursor: 'pointer',
                          }}
                          title="View locations in this warehouse"
                        >
                          <span>{locCount} {locCount === 1 ? 'Location' : 'Locations'}</span>
                          <ExternalLink size={11} />
                        </button>
                      </td>
                      <td>
                        {wh.active ? (
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              backgroundColor: 'rgba(79, 91, 42, 0.12)',
                              color: '#4F5B2A',
                              border: '1px solid rgba(79, 91, 42, 0.25)',
                            }}
                          >
                            Active
                          </span>
                        ) : (
                          <StatusBadge status="INACTIVE" />
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(wh, e)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '12.5px', height: '32px' }}
                            title="Edit Warehouse"
                          >
                            <Edit2 size={13} style={{ marginRight: '4px' }} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleOpenDelete(wh, e)}
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
                            title="Delete Warehouse"
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

      {/* Warehouse Create / Edit Modal */}
      <Modal
        isOpen={whModalOpen}
        onClose={() => setWhModalOpen(false)}
        title={editingWh ? 'Edit Warehouse' : 'New Warehouse'}
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
              Name <span style={{ color: '#9E1C1C' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={whName}
              onChange={(e) => setWhName(e.target.value)}
              placeholder="e.g., Main Warehouse or Secondary Warehouse"
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
              value={whCode}
              onChange={(e) => setWhCode(e.target.value.toUpperCase())}
              placeholder="e.g., WH or WH2"
              className="form-input"
              style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
            />
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Unique alphanumeric abbreviation used in barcodes and stock transaction documents.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              Address
            </label>
            <textarea
              rows={3}
              value={whAddress}
              onChange={(e) => setWhAddress(e.target.value)}
              placeholder="e.g., Gandhinagar or Ahmedabad facility address..."
              className="form-textarea"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
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
              {savingWh ? 'Saving...' : editingWh ? 'Save Changes' : 'Create Warehouse'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Warehouse Deletion"
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
                Are you sure you want to delete this warehouse?
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                You are about to permanently delete <strong>{whToDelete?.name} ({whToDelete?.code})</strong>.
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
              disabled={deletingWh}
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
              {deletingWh ? 'Deleting...' : 'Delete Warehouse'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WarehouseListPage;
