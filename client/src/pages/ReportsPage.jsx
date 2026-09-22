import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Download, Calendar, Filter, BarChart2, TrendingUp, Users, Clock } from 'lucide-react';

export const ReportsPage = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [department, setDepartment] = useState('All');
  const [matrixData, setMatrixData] = useState([]);
  const [daysInMonth, setDaysInMonth] = useState(30);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.reports.getMonthly(year, month, department);
      if (res.success) {
        setMatrixData(res.data);
        setDaysInMonth(res.daysInMonth);
      }
    } catch (err) {
      console.error('Error fetching monthly report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [year, month, department]);

  const handleExportCSV = () => {
    const formattedMonth = String(month).padStart(2, '0');
    const startDate = `${year}-${formattedMonth}-01`;
    const endDate = `${year}-${formattedMonth}-${daysInMonth}`;
    const url = api.reports.getExportUrl(startDate, endDate, department);
    window.open(url, '_blank');
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const departments = ['All', 'Engineering', 'Sales', 'Marketing', 'Operations', 'Design', 'HR', 'Support', 'Finance'];

  // Status indicator dot
  const renderStatusDot = (dayData) => {
    if (!dayData) {
      return <span style={{ color: '#334155', fontSize: '0.75rem' }}>·</span>;
    }
    const status = dayData.status;
    let color = '#94a3b8';
    let text = 'P';

    if (status === 'Present') {
      color = '#10b981';
      text = 'P';
    } else if (status === 'Late') {
      color = '#f59e0b';
      text = 'L';
    } else if (status === 'Absent') {
      color = '#ef4444';
      text = 'A';
    } else if (status === 'Leave' || status === 'Half Day') {
      color = '#38bdf8';
      text = 'H';
    }

    return (
      <span
        title={`${status} (${dayData.checkIn || 'No time'})`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px',
          borderRadius: '4px',
          fontSize: '0.65rem',
          fontWeight: 700,
          background: `${color}25`,
          color: color,
          border: `1px solid ${color}40`,
        }}
      >
        {text}
      </span>
    );
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '1600px' }}>
      
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Monthly Reports & Analytics</h1>
          <p className="page-subtitle">
            Comprehensive attendance matrix, punctuality scoring, and payroll export
          </p>
        </div>

        <button onClick={handleExportCSV} className="btn btn-primary">
          <Download size={16} />
          <span>Export Payroll CSV</span>
        </button>
      </div>

      {/* Control Bar */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '1.75rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}
      >
        {/* Month & Year pickers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <select
            className="form-select"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            style={{ width: '150px', fontWeight: 600 }}
          >
            {months.map((m, idx) => (
              <option key={m} value={idx + 1}>{m}</option>
            ))}
          </select>

          <select
            className="form-select"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ width: '110px', fontWeight: 600 }}
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Department Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflowX: 'auto' }}>
          <Filter size={15} color="var(--text-dim)" />
          {departments.map((d) => (
            <button
              key={d}
              onClick={() => setDepartment(d)}
              style={{
                padding: '0.3rem 0.7rem',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: department === d ? 'var(--primary)' : 'var(--border)',
                background: department === d ? 'rgba(79, 70, 229, 0.2)' : 'transparent',
                color: department === d ? '#fff' : 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981' }} />
            <span style={{ color: 'var(--text-muted)' }}>Present (P)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#f59e0b' }} />
            <span style={{ color: 'var(--text-muted)' }}>Late (L)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ef4444' }} />
            <span style={{ color: 'var(--text-muted)' }}>Absent (A)</span>
          </div>
        </div>
      </div>

      {/* Monthly Attendance Matrix Table */}
      <div className="table-container" style={{ overflowX: 'auto' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, zIndex: 5, background: '#172033', minWidth: '180px' }}>
                Staff Member
              </th>
              <th style={{ minWidth: '90px' }}>Dept</th>
              <th style={{ minWidth: '60px', textAlign: 'center' }}>Rate</th>
              <th style={{ minWidth: '60px', textAlign: 'center' }}>Hours</th>
              <th style={{ minWidth: '50px', textAlign: 'center' }}>P</th>
              <th style={{ minWidth: '50px', textAlign: 'center' }}>L</th>
              <th style={{ minWidth: '50px', textAlign: 'center' }}>A</th>

              {/* Day 1 to N columns */}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                <th key={d} style={{ width: '32px', textAlign: 'center', padding: '0.5rem 0.2rem', fontSize: '0.75rem' }}>
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7 + daysInMonth} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Loading monthly attendance matrix...
                </td>
              </tr>
            ) : matrixData.length === 0 ? (
              <tr>
                <td colSpan={7 + daysInMonth} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No staff records found for {months[month - 1]} {year}.
                </td>
              </tr>
            ) : (
              matrixData.map((row) => (
                <tr key={row.staff._id}>
                  {/* Fixed Name column */}
                  <td style={{ position: 'sticky', left: 0, zIndex: 4, background: '#111827', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: row.staff.avatarColor || '#4f46e5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {row.staff.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ color: '#fff', fontSize: '0.85rem' }}>{row.staff.name}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{row.staff.employeeId}</div>
                      </div>
                    </div>
                  </td>

                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {row.staff.department}
                  </td>

                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#38bdf8' }}>
                    {row.stats.attendanceRate}%
                  </td>

                  <td style={{ textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>
                    {row.stats.totalWorkHours}h
                  </td>

                  <td style={{ textAlign: 'center', color: '#34d399', fontWeight: 700 }}>
                    {row.stats.presentCount}
                  </td>

                  <td style={{ textAlign: 'center', color: '#fbbf24', fontWeight: 700 }}>
                    {row.stats.lateCount}
                  </td>

                  <td style={{ textAlign: 'center', color: '#f87171', fontWeight: 700 }}>
                    {row.stats.absentCount}
                  </td>

                  {/* Days 1 to N */}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                    <td key={d} style={{ textAlign: 'center', padding: '0.35rem 0.15rem' }}>
                      {renderStatusDot(row.days[d])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
