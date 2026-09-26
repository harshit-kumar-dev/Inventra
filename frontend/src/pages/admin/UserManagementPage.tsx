import React, { useState, useEffect } from 'react';
import { userApi, ManagedUser } from '../../services/userApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';
import {
  Users,
  UserPlus,
  Shield,
  Search,
  Edit2,
  Trash2,
  Mail,
  Key,
  UserCheck,
  Package,
  Layers,
  CheckCircle2,
  Calendar,
  Lock,
} from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Create / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [name, setName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'INVENTORY_MANAGER' | 'WAREHOUSE_STAFF'>('WAREHOUSE_STAFF');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (roleFilter !== 'ALL') {
        params.role = roleFilter;
      }
      const res = await userApi.getUsers(params);
      setUsers(res.data?.users || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load user accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setName('');
    setLoginId('');
    setEmail('');
    setPassword('');
    setRole('WAREHOUSE_STAFF');
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (u: ManagedUser, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingUser(u);
    setName(u.name);
    setLoginId(u.loginId);
    setEmail(u.email);
    setPassword('');
    setRole(u.role);
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenDelete = (u: ManagedUser, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (u.id === currentUser?.id) {
      showToast('warning', 'Action Forbidden', 'You cannot delete your own logged-in admin account.');
      return;
    }
    setUserToDelete(u);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Full name is required.');
      return;
    }

    if (!editingUser) {
      if (!loginId.trim() || loginId.trim().length < 4) {
        setFormError('Login ID must be at least 4 characters.');
        return;
      }
      if (!password || password.length < 6) {
        setFormError('Initial password must be at least 6 characters.');
        return;
      }
    }

    setSaving(true);
    try {
      if (editingUser) {
        await userApi.updateUser(editingUser.id, {
          name,
          email,
          role,
          ...(password ? { password } : {}),
        });
        showToast('success', 'User Updated', `Account for "${name}" has been updated.`);
      } else {
        await userApi.createUser({
          name,
          loginId,
          email,
          password,
          role,
        });
        showToast('success', 'User Provisioned', `New user "${name}" registered successfully.`);
      }
      setModalOpen(false);
      await loadUsers();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed. Please check inputs.');
      showToast('error', 'Error', err.message || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      await userApi.deleteUser(userToDelete.id);
      showToast('success', 'User Removed', `Account "${userToDelete.name}" was deleted.`);
      setDeleteModalOpen(false);
      setUserToDelete(null);
      await loadUsers();
    } catch (err: any) {
      showToast('error', 'Deletion Failed', err.message || 'Could not delete user account.');
    } finally {
      setDeleting(false);
    }
  };

  // Filter by search query
  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.loginId.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  // Calculate stats
  const totalCount = users.length;
  const staffCount = users.filter((u) => u.role === 'WAREHOUSE_STAFF').length;
  const managerCount = users.filter((u) => u.role === 'INVENTORY_MANAGER').length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;

  const getRoleBadge = (userRole: string) => {
    switch (userRole) {
      case 'ADMIN':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: '#4F5B2A',
              color: '#FFFFFF',
            }}
          >
            <Shield size={13} />
            System Administrator
          </span>
        );
      case 'INVENTORY_MANAGER':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: '#B8892D',
              color: '#FFFFFF',
            }}
          >
            <Package size={13} />
            Inventory Manager
          </span>
        );
      case 'WAREHOUSE_STAFF':
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: '#EBE3D3',
              color: '#4F5B2A',
              border: '1px solid #D8C9A8',
            }}
          >
            <Layers size={13} />
            Warehouse Staff
          </span>
        );
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Users size={28} color="var(--color-primary)" />
            User & Team Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            Provision staff credentials, assign operational permissions, and manage internal warehouse accounts.
          </p>
        </div>

        {currentUser?.role === 'ADMIN' && (
          <button
            onClick={handleOpenCreate}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(79, 91, 42, 0.25)',
            }}
          >
            <UserPlus size={18} />
            Add New User
          </button>
        )}
      </div>

      {/* Role Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#F5EFE3',
              border: '1px solid #D8C9A8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Accounts</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>{totalCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: 'rgba(184, 137, 45, 0.12)',
              border: '1px solid rgba(184, 137, 45, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#B8892D',
            }}
          >
            <Package size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Inventory Managers</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>{managerCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: 'rgba(79, 91, 42, 0.1)',
              border: '1px solid rgba(79, 91, 42, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4F5B2A',
            }}
          >
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Warehouse Staff</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>{staffCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#4F5B2A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
            }}
          >
            <Shield size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Administrators</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>{adminCount}</div>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Role Filter Tabs */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        {/* Search Bar */}
        <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
          <Search
            size={18}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Search by name, login ID, email or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '38px', height: '40px' }}
          />
        </div>

        {/* Role Filter Chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { label: 'All Users', value: 'ALL' },
            { label: 'Warehouse Staff', value: 'WAREHOUSE_STAFF' },
            { label: 'Inventory Managers', value: 'INVENTORY_MANAGER' },
            { label: 'Admins', value: 'ADMIN' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setRoleFilter(tab.value)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                border: '1px solid',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: roleFilter === tab.value ? 'var(--color-primary)' : 'var(--bg-card)',
                borderColor: roleFilter === tab.value ? 'var(--color-primary)' : 'var(--border-medium)',
                color: roleFilter === tab.value ? '#FFFFFF' : 'var(--text-secondary)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Table Area */}
      {loading ? (
        <LoadingState text="Loading team accounts..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadUsers} />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          title="No Users Found"
          description={searchQuery ? 'No accounts matched your search criteria.' : 'No users registered in the system.'}
          actionText={currentUser?.role === 'ADMIN' ? 'Add First User' : undefined}
          onAction={currentUser?.role === 'ADMIN' ? handleOpenCreate : undefined}
        />
      ) : (
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#F5EFE3', borderBottom: '2px solid #D8C9A8' }}>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Team Member
                  </th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Login ID
                  </th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Assigned Role & Permissions
                  </th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Registered On
                  </th>
                  {currentUser?.role === 'ADMIN' && (
                    <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid #EBE3D3',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(79, 91, 42, 0.03)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Name & Email */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              backgroundColor: '#EBE3D3',
                              color: 'var(--color-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '15px',
                              border: '1px solid #D8C9A8',
                              flexShrink: 0,
                            }}
                          >
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {u.name}
                              {isCurrent && (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    backgroundColor: 'rgba(79, 91, 42, 0.12)',
                                    color: 'var(--color-primary)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  You
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <Mail size={12} />
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Login ID */}
                      <td style={{ padding: '16px 20px' }}>
                        <code
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            backgroundColor: '#F5EFE3',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #D8C9A8',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {u.loginId}
                        </code>
                      </td>

                      {/* Role & Scope description */}
                      <td style={{ padding: '16px 20px' }}>
                        <div>{getRoleBadge(u.role)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {u.role === 'ADMIN'
                            ? 'Full system governance, master data & access control'
                            : u.role === 'INVENTORY_MANAGER'
                            ? 'Inbound receipts, outbound deliveries, master catalog'
                            : 'Stock transfers, internal picking, shelving & physical counts'}
                        </div>
                      </td>

                      {/* Created Date */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Calendar size={13} />
                          {new Date(u.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </td>

                      {/* Actions */}
                      {currentUser?.role === 'ADMIN' && (
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button
                              onClick={(e) => handleOpenEdit(u, e)}
                              className="btn btn-outline"
                              style={{
                                padding: '6px 10px',
                                fontSize: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                borderColor: 'var(--border-medium)',
                              }}
                              title="Edit user details or role"
                            >
                              <Edit2 size={13} />
                              Edit
                            </button>

                            <button
                              onClick={(e) => handleOpenDelete(u, e)}
                              disabled={isCurrent}
                              className="btn btn-outline"
                              style={{
                                padding: '6px 10px',
                                fontSize: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: isCurrent ? 'var(--text-muted)' : '#A33B2E',
                                borderColor: isCurrent ? 'var(--border-light)' : '#E0B5B0',
                                opacity: isCurrent ? 0.4 : 1,
                                cursor: isCurrent ? 'not-allowed' : 'pointer',
                              }}
                              title={isCurrent ? 'Cannot delete own account' : 'Delete user'}
                            >
                              <Trash2 size={13} />
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit User Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? `Edit Account: ${editingUser.name}` : 'Provision New Team Member'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {formError && (
            <div
              style={{
                backgroundColor: 'rgba(163, 59, 46, 0.08)',
                border: '1px solid rgba(163, 59, 46, 0.3)',
                padding: '10px 14px',
                borderRadius: '8px',
                color: '#A33B2E',
                fontSize: '13px',
              }}
            >
              {formError}
            </div>
          )}

          {/* Full Name */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>
              Full Name *
            </label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Login ID (Read-only on edit) */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>
              Login ID (Username) *
            </label>
            <input
              type="text"
              required
              disabled={!!editingUser}
              className="form-input"
              placeholder="e.g. staff_01 or jdoe"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              style={editingUser ? { backgroundColor: '#F5EFE3', cursor: 'not-allowed' } : {}}
            />
            {editingUser && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Login ID cannot be modified after initial provisioning.
              </span>
            )}
          </div>

          {/* Work Email */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>
              Work Email Address *
            </label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="e.g. jdoe@inventra.internal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Role Selection */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>
              Assigned System Role *
            </label>
            <select
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
            >
              <option value="WAREHOUSE_STAFF">Warehouse Staff (Transfers, Picking, Shelving & Physical Counts)</option>
              <option value="INVENTORY_MANAGER">Inventory Manager (Inbound Receipts, Outbound Deliveries, Master Catalog)</option>
              <option value="ADMIN">System Administrator (Full Enterprise Governance & User Provisioning)</option>
            </select>
          </div>

          {/* Password Input */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>
              {editingUser ? 'New Password (Leave blank to keep unchanged)' : 'Initial Password *'}
            </label>
            <input
              type="password"
              required={!editingUser}
              className="form-input"
              placeholder={editingUser ? '••••••••••••' : 'Min 6 characters'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Modal Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-light)',
            }}
          >
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {saving ? 'Saving Account...' : editingUser ? 'Update Account' : 'Provision User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete User Confirmation Dialog */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirm User Account Deletion"
        message={`Are you sure you want to delete the account for "${userToDelete?.name}" (${userToDelete?.loginId})? This action cannot be undone.`}
        confirmText="Delete Account"
        cancelText="Cancel"
        type="danger"
        isLoading={deleting}
      />
    </div>
  );
};

export default UserManagementPage;
