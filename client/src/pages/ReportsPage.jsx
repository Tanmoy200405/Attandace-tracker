import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Download, Calendar, Filter, DollarSign, CheckCircle2, AlertTriangle, ShieldCheck, Printer, X, Award, Clock, ArrowUpRight } from 'lucide-react';

export const ReportsPage = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [department, setDepartment] = useState('All');
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' or 'payroll'
  const [matrixData, setMatrixData] = useState([]);
  const [daysInMonth, setDaysInMonth] = useState(30);
  const [loading, setLoading] = useState(true);

  // Payslip modal state
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [paidStatusMap, setPaidStatusMap] = useState({});

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

  const togglePaymentStatus = (staffId) => {
    setPaidStatusMap((prev) => ({
      ...prev,
      [staffId]: prev[staffId] === 'Paid' ? 'Pending' : 'Paid',
    }));
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const departments = ['All'];

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
    } else if (status === 'Weekly Off') {
      color = '#38bdf8';
      text = 'W';
    } else if (status === 'Leave' || status === 'Half Day') {
      color = '#a855f7';
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

  // Calculate total payroll totals
  const totalBaseOutflow = matrixData.reduce((acc, curr) => acc + (curr.payroll?.monthlySalary || 30000), 0);
  const totalLateCutPool = matrixData.reduce((acc, curr) => acc + (curr.payroll?.lateDeduction || 0), 0);
  const totalBonusPool = matrixData.reduce((acc, curr) => acc + (curr.payroll?.overtimeBonus || 0), 0);
  const totalNetOutflow = matrixData.reduce((acc, curr) => acc + (curr.payroll?.netSalary || 0), 0);

  return (
    <div className="page-wrapper" style={{ maxWidth: '1600px' }}>
      
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Monthly Reports & End of Month Payroll</h1>
          <p className="page-subtitle">
            Attendance matrix, weekly off days, 3-day late pay cuts, 3% extra time bonus & 30th salary processing
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleExportCSV} className="btn btn-secondary">
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main View Switcher Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`btn ${activeTab === 'matrix' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.6rem 1.25rem' }}
        >
          <Calendar size={16} />
          <span>Monthly Attendance Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('payroll')}
          className={`btn ${activeTab === 'payroll' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.6rem 1.25rem', background: activeTab === 'payroll' ? '#10b981' : undefined, borderColor: activeTab === 'payroll' ? '#10b981' : undefined }}
        >
          <DollarSign size={16} />
          <span>30th End-of-Month Payroll & Salary</span>
        </button>
      </div>

      {/* Control Bar (Month/Year/Dept pickers) */}
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
        {activeTab === 'matrix' && (
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
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#38bdf8' }} />
              <span style={{ color: 'var(--text-muted)' }}>Weekly Off (W)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ef4444' }} />
              <span style={{ color: 'var(--text-muted)' }}>Absent (A)</span>
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: ATTENDANCE MATRIX VIEW */}
      {activeTab === 'matrix' && (
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, zIndex: 5, background: '#172033', minWidth: '180px' }}>
                  Staff Member
                </th>
                <th style={{ minWidth: '90px' }}>Dept</th>
                <th style={{ minWidth: '100px' }}>Weekly Off</th>
                <th style={{ minWidth: '60px', textAlign: 'center' }}>Rate</th>
                <th style={{ minWidth: '60px', textAlign: 'center' }}>Hours</th>
                <th style={{ minWidth: '50px', textAlign: 'center' }}>P</th>
                <th style={{ minWidth: '50px', textAlign: 'center' }}>L</th>
                <th style={{ minWidth: '50px', textAlign: 'center' }}>W</th>
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
                  <td colSpan={8 + daysInMonth} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading monthly attendance matrix...
                  </td>
                </tr>
              ) : matrixData.length === 0 ? (
                <tr>
                  <td colSpan={8 + daysInMonth} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
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

                    <td style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 600 }}>
                      {row.staff.weeklyOff || 'Sunday'}
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

                    <td style={{ textAlign: 'center', color: '#38bdf8', fontWeight: 700 }}>
                      {row.stats.weeklyOffCount || 0}
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
      )}

      {/* TAB 2: END OF MONTH PAYROLL & PAYMENT OPTIONS VIEW */}
      {activeTab === 'payroll' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Summary Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Total Base Salary Pool</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>₹{totalBaseOutflow.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>Calculated for 30th payment window</div>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Late Salary Cuts (3 Days Late Rule)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f87171' }}>-₹{totalLateCutPool.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: '0.72rem', color: '#fca5a5', marginTop: '0.4rem' }}>1 day salary cut for every 3 late days</div>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Extra Time Bonus (+3%)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399' }}>+₹{totalBonusPool.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: '0.72rem', color: '#a7f3d0', marginTop: '0.4rem' }}>3% extra payment added for overtime hours</div>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.08)' }}>
              <div style={{ fontSize: '0.8rem', color: '#a7f3d0', marginBottom: '0.4rem' }}>Net Outflow to Pay (End of Month)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399' }}>₹{totalNetOutflow.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: '0.72rem', color: '#a7f3d0', marginTop: '0.4rem' }}>Final payout after cuts & overtime bonuses</div>
            </div>
          </div>

          {/* Business Rules Summary Card */}
          <div
            className="glass-card"
            style={{
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#fff' }}>Company Payroll Rules & Settings</h4>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  🌴 1 Weekly Off/Week • ⏰ 3 Days Late = 1 Day Pay Cut • ⚡ Extra Time = 3% Bonus Pay • 📅 Paid on 30th
                </p>
              </div>
            </div>
          </div>

          {/* Staff Payroll Table */}
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Monthly Base</th>
                  <th>Weekly Off</th>
                  <th>Present / Late</th>
                  <th>Late Deduction (3 Days = 1 Cut)</th>
                  <th>Extra Hours & 3% Bonus</th>
                  <th>Net Payable Salary</th>
                  <th>Payment Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Calculating monthly payroll...
                    </td>
                  </tr>
                ) : matrixData.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No staff records found for payroll calculation.
                    </td>
                  </tr>
                ) : (
                  matrixData.map((row) => {
                    const p = row.payroll || {};
                    const isPaid = paidStatusMap[row.staff._id] === 'Paid';

                    return (
                      <tr key={row.staff._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                              }}
                            >
                              {row.staff.name.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#fff' }}>{row.staff.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                {row.staff.employeeId} • {row.staff.department}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ fontWeight: 600, color: '#e2e8f0' }}>
                          ₹{(p.monthlySalary || 30000).toLocaleString('en-IN')}
                        </td>

                        <td style={{ color: '#38bdf8', fontSize: '0.85rem', fontWeight: 600 }}>
                          {row.staff.weeklyOff || 'Sunday'}
                        </td>

                        <td style={{ fontSize: '0.85rem' }}>
                          <span style={{ color: '#34d399', fontWeight: 700 }}>{row.stats.presentCount} P</span>
                          {' / '}
                          <span style={{ color: '#fbbf24', fontWeight: 700 }}>{row.stats.lateCount} Late</span>
                        </td>

                        <td>
                          {p.latePenaltyDays > 0 ? (
                            <div>
                              <span style={{ color: '#f87171', fontWeight: 700 }}>-₹{p.lateDeduction?.toLocaleString('en-IN')}</span>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{p.lateDays} days late ({p.latePenaltyDays} cut)</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No cut (0-2 late)</span>
                          )}
                        </td>

                        <td>
                          {p.totalExtraHours > 0 ? (
                            <div>
                              <span style={{ color: '#34d399', fontWeight: 700 }}>+₹{p.overtimeBonus?.toLocaleString('en-IN')}</span>
                              <div style={{ fontSize: '0.7rem', color: '#a7f3d0' }}>{p.totalExtraHours}h extra (+3% bonus)</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>0h extra</span>
                          )}
                        </td>

                        <td style={{ fontWeight: 800, fontSize: '1rem', color: '#34d399' }}>
                          ₹{(p.netSalary || 0).toLocaleString('en-IN')}
                        </td>

                        <td>
                          <button
                            onClick={() => togglePaymentStatus(row.staff._id)}
                            className={isPaid ? 'badge badge-present' : 'badge badge-unmarked'}
                            style={{ cursor: 'pointer', border: 'none' }}
                          >
                            {isPaid ? 'Paid ✓' : 'Pending 30th'}
                          </button>
                        </td>

                        <td>
                          <button
                            onClick={() => setSelectedPayslip(row)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          >
                            <Printer size={13} />
                            <span>Salary Slip</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* Salary Slip Receipt Modal */}
      {selectedPayslip && (
        <div className="modal-overlay" onClick={() => setSelectedPayslip(null)}>
          <div className="modal-content" style={{ maxWidth: '520px', padding: 0 }} onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Official Salary Slip</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{months[month - 1]} {year} • 30th Month End Receipt</div>
                </div>
              </div>
              <button onClick={() => setSelectedPayslip(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Payslip Content Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Staff Header Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(30, 41, 59, 0.6)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{selectedPayslip.staff.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {selectedPayslip.staff.employeeId} • {selectedPayslip.staff.department} ({selectedPayslip.staff.role})
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Shift Entry / Exit</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8' }}>
                    {selectedPayslip.staff.expectedCheckIn || '09:00 AM'} - {selectedPayslip.staff.expectedCheckOut || '05:00 PM'}
                  </div>
                </div>
              </div>

              {/* Salary Breakdown List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Monthly Base Salary</span>
                  <span style={{ fontWeight: 600, color: '#fff' }}>₹{(selectedPayslip.payroll?.monthlySalary || 30000).toLocaleString('en-IN')}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Daily Rate (Base / 30)</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>₹{(selectedPayslip.payroll?.dailyRate || 1000).toLocaleString('en-IN')}/day</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ color: '#f87171' }}>Late Cut (3 Days Late = 1 Day Cut)</span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Total Late: {selectedPayslip.payroll?.lateDays} days ({selectedPayslip.payroll?.latePenaltyDays} penalty days)</div>
                  </div>
                  <span style={{ fontWeight: 700, color: '#f87171' }}>-₹{(selectedPayslip.payroll?.lateDeduction || 0).toLocaleString('en-IN')}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ color: '#34d399' }}>Extra Time Bonus (+3% Pay)</span>
                    <div style={{ fontSize: '0.7rem', color: '#a7f3d0' }}>Extra Hours Worked: {selectedPayslip.payroll?.totalExtraHours}h</div>
                  </div>
                  <span style={{ fontWeight: 700, color: '#34d399' }}>+₹{(selectedPayslip.payroll?.overtimeBonus || 0).toLocaleString('en-IN')}</span>
                </div>

                {/* Net Final Payment Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.85rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.3)', marginTop: '0.5rem' }}>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>Net Amount Paid</span>
                  <span style={{ fontWeight: 800, color: '#34d399', fontSize: '1.25rem' }}>₹{(selectedPayslip.payroll?.netSalary || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => {
                    togglePaymentStatus(selectedPayslip.staff._id);
                    setSelectedPayslip(null);
                  }}
                  className="btn btn-primary"
                  style={{ flex: 1, background: '#10b981', borderColor: '#10b981' }}
                >
                  <CheckCircle2 size={16} />
                  <span>{paidStatusMap[selectedPayslip.staff._id] === 'Paid' ? 'Mark as Pending' : 'Mark as Paid'}</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="btn btn-secondary"
                >
                  <Printer size={16} />
                  <span>Print Receipt</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
