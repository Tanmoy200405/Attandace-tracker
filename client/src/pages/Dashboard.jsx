import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { ManualAttendanceModal } from '../components/ManualAttendanceModal';
import { StaffDetailModal } from '../components/StaffDetailModal';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  CalendarDays,
  Camera,
  ChevronRight,
  TrendingUp,
  ScanFace,
  Fingerprint,
} from 'lucide-react';

export const Dashboard = ({ setTab }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailStaffId, setDetailStaffId] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchTodayData = async () => {
    try {
      const res = await api.attendance.getByDate(todayStr);
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayData();
    // Auto-refresh every 30 seconds for live attendance monitoring
    const interval = setInterval(fetchTodayData, 30000);
    return () => clearInterval(interval);
  }, []);

  const summary = data?.summary || {
    totalStaff: 0,
    present: 0,
    late: 0,
    halfDay: 0,
    absent: 0,
    leave: 0,
    unmarked: 0,
    attendanceRate: 0,
  };

  const roster = data?.data || [];

  return (
    <div className="page-wrapper">
      
      {/* Top Banner & Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance Overview</h1>
          <p className="page-subtitle">
            Live staff presence, biometric verifications, and today's roster
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setTab('kiosk')} className="btn btn-kiosk">
            <Camera size={18} />
            <span>Open Attendance Kiosk</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="stat-grid" style={{ marginBottom: '2rem' }}>
        <StatCard
          title="Total Staff"
          value={summary.totalStaff}
          subtext="Active employees registered"
          icon={Users}
          color="#cccccc"
        />
        <StatCard
          title="Present Today"
          value={summary.present}
          subtext="Clocked in punctually"
          icon={CheckCircle2}
          color="#ffffff"
          trend="+ On Time"
        />
        <StatCard
          title="Late Arrivals"
          value={summary.late}
          subtext="After scheduled shift start"
          icon={Clock}
          color="#aaaaaa"
        />
        <StatCard
          title="Unmarked / Absent"
          value={summary.unmarked + summary.absent}
          subtext="Yet to verify biometrics"
          icon={AlertCircle}
          color="#888888"
        />
        <StatCard
          title="Attendance Rate"
          value={`${summary.attendanceRate}%`}
          subtext="Present & Late vs Total"
          icon={TrendingUp}
          color="#dddddd"
        />
      </div>

      {/* Main Grid: Today's Live Roster & Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Today's Staff Roster</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                Real-time check-in records for {todayStr}
              </p>
            </div>

            <button onClick={() => setTab('attendance')} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}>
              <span>View Full Calendar Logs</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Check-In</th>
                  <th>Check-Out</th>
                  <th>Biometric Verification</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      Loading today's attendance...
                    </td>
                  </tr>
                ) : roster.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No staff members registered. Add staff members in Staff Directory.
                    </td>
                  </tr>
                ) : (
                  roster.map((row) => (
                    <tr key={row.staff._id}>
                      <td>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                          onClick={() => setDetailStaffId(row.staff._id)}
                        >
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              background: row.staff.avatarColor || '#4f46e5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              flexShrink: 0,
                            }}
                          >
                            {row.staff.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#fff' }}>{row.staff.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                              {row.staff.employeeId} • {row.staff.role}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {row.staff.department}
                        </span>
                      </td>

                      <td>
                        <span className={`badge badge-${row.status.toLowerCase().replace(' ', '')}`}>
                          {row.status}
                        </span>
                      </td>

                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}>
                        {row.checkIn || '—'}
                      </td>

                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}>
                        {row.checkOut || '—'}
                      </td>

                      <td>
                        {row.verificationMethod === 'biometric_dual' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span className="badge badge-biometric" title="Face & Fingerprint Verified">
                              <ScanFace size={13} />
                              <Fingerprint size={13} />
                              <span>Dual Biometric</span>
                            </span>
                            {row.confidenceScore && (
                              <span style={{ fontSize: '0.7rem', color: '#22d3ee', fontFamily: 'JetBrains Mono, monospace' }}>
                                {row.confidenceScore}%
                              </span>
                            )}
                          </div>
                        ) : row.verificationMethod === 'manual_override' ? (
                          <span className="badge badge-unmarked">Manual Override</span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Pending Kiosk</span>
                        )}
                      </td>

                      <td>
                        <button
                          onClick={() => setSelectedItem(row)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                        >
                          Override
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Manual Override Modal */}
      {selectedItem && (
        <ManualAttendanceModal
          item={selectedItem}
          date={todayStr}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onSuccess={fetchTodayData}
        />
      )}

      {/* Staff Detail Modal */}
      {detailStaffId && (
        <StaffDetailModal
          staffId={detailStaffId}
          isOpen={!!detailStaffId}
          onClose={() => setDetailStaffId(null)}
        />
      )}

    </div>
  );
};
