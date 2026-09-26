import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, ArrowRight, ShieldCheck, Layers, Boxes } from 'lucide-react';
import { warehouseApi, Warehouse, Location } from '../../services/warehouseApi';
import { LoadingState } from '../../components/LoadingState';
import { useAuth } from '../../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [whRes, locRes] = await Promise.all([
        warehouseApi.getWarehouses(),
        warehouseApi.getLocations(),
      ]);
      setWarehouses(whRes.data?.warehouses || []);
      setLocations(locRes.data?.locations || []);
    } catch (err) {
      console.error('Failed to load settings summary metadata', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading Settings & Master Configuration..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      {/* Page Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#B8892D',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShieldCheck size={14} /> Master Configuration & Topology
          </span>
        </div>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          Settings
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.5' }}>
          Manage your enterprise warehouse topology, physical facility metadata, and internal storage zones.
        </p>
      </div>

      {/* Settings Grid / Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px',
        }}
      >
        {/* Warehouse Card */}
        <div
          onClick={() => navigate('/settings/warehouse')}
          className="settings-hub-card"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1.5px solid #D8C9A8',
            padding: '28px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '20px',
            boxShadow: '0 4px 16px rgba(79, 91, 42, 0.06)',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '18px',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '12px',
                  backgroundColor: '#F5EFE3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4F5B2A',
                  border: '1px solid #D8C9A8',
                }}
              >
                <Building2 size={28} />
              </div>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: '#F5EFE3',
                  color: '#4F5B2A',
                  border: '1px solid #D8C9A8',
                }}
              >
                {warehouses.length} {warehouses.length === 1 ? 'Facility' : 'Facilities'}
              </span>
            </div>

            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '8px',
              }}
            >
              Warehouse
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                lineHeight: '1.55',
                margin: 0,
              }}
            >
              Manage warehouses and warehouse details. Register facilities, edit short codes, and maintain street addresses.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '16px',
              borderTop: '1px solid #F5EFE3',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4F5B2A' }}>
              Open Warehouse Directory
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#4F5B2A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
              }}
            >
              <ArrowRight size={16} />
            </div>
          </div>
        </div>

        {/* Locations Card */}
        <div
          onClick={() => navigate('/settings/locations')}
          className="settings-hub-card"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1.5px solid #D8C9A8',
            padding: '28px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '20px',
            boxShadow: '0 4px 16px rgba(79, 91, 42, 0.06)',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '18px',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '12px',
                  backgroundColor: '#F5EFE3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#B8892D',
                  border: '1px solid #D8C9A8',
                }}
              >
                <MapPin size={28} />
              </div>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: '#F5EFE3',
                  color: '#B8892D',
                  border: '1px solid #D8C9A8',
                }}
              >
                {locations.length} {locations.length === 1 ? 'Location' : 'Locations'}
              </span>
            </div>

            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '8px',
              }}
            >
              Locations
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                lineHeight: '1.55',
                margin: 0,
              }}
            >
              Manage locations inside warehouses. Define internal storage racks, picking bins, input docks, and dispatch bays.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '16px',
              borderTop: '1px solid #F5EFE3',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4F5B2A' }}>
              Open Locations Manager
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#4F5B2A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
              }}
            >
              <ArrowRight size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* System Topology Summary Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #D8C9A8',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Layers size={20} color="#4F5B2A" />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Enterprise Hierarchy Structure
          </h3>
        </div>
        <div
          style={{
            backgroundColor: '#F5EFE3',
            borderRadius: '12px',
            padding: '16px 20px',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: '#4F5B2A',
            lineHeight: '1.7',
            border: '1px solid rgba(216, 201, 168, 0.6)',
          }}
        >
          <div style={{ fontWeight: 700, color: '#313A17', marginBottom: '6px' }}>Topology Tree:</div>
          <div>Settings</div>
          <div>├── Warehouse (Physical facilities: Short codes, addresses, status)</div>
          <div>└── Locations (Logical storage zones: MAIN, RACK_A, INPUT, OUTPUT, SCRAP)</div>
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
          Active User Role:{' '}
          <strong style={{ color: '#4F5B2A' }}>{user?.role}</strong> (Authorized for Master Data & Settings CRUD)
        </div>
      </div>

      <style>{`
        .settings-hub-card:hover {
          transform: translateY(-3px);
          border-color: #4F5B2A !important;
          box-shadow: 0 10px 24px rgba(79, 91, 42, 0.12) !important;
        }
      `}</style>
    </div>
  );
};

export default SettingsPage;
