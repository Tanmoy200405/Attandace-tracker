import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { ManualAttendanceModal } from "../components/ManualAttendanceModal";
import { StaffDetailModal } from "../components/StaffDetailModal";
import {
  Users,
  CheckCircle2,
  Clock,
  CalendarDays,
  Camera,
  Search,
  UserPlus,
} from "lucide-react";

export const Dashboard = ({ setTab }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailStaffId, setDetailStaffId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const todayStr = new Date().toISOString().split("T")[0];

  // Format date as DD/MM/YYYY (Indian standard)
  const formatIndianDate = (dateStr) => {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  const fetchDashboardData = async () => {
    try {
      const res = await api.attendance.get30DaySummary();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 30 seconds for live attendance monitoring
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const roster = data?.todayRoster || [];
  const totalEmployees = data?.summary?.totalStaff ?? roster.length;
  const totalIn = roster.filter((row) => row.checkIn).length;
  const totalOut = roster.filter((row) => row.checkOut).length;
  const lateCount = roster.filter((row) => row.status === "Late").length;
  const notYetIn = roster.filter((row) => !row.checkIn).length;
  const filteredRoster = roster.filter((row) => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return true;
    return `${row.staff.name} ${row.staff.employeeId}`
      .toLowerCase()
      .includes(search);
  });

  const summaryCards = [
    { label: "All Emp", value: totalEmployees, color: "#2563eb", icon: Users },
    { label: "Total In", value: totalIn, color: "#3b82f6", icon: CheckCircle2 },
    { label: "Total Out", value: totalOut, color: "#ef4444", icon: Clock },
    { label: "Late", value: lateCount, color: "#f59e0b", icon: Clock },
    { label: "Not Yet In", value: notYetIn, color: "#8b5cf6", icon: Users },
  ];

  return (
    <div className="page-wrapper dashboard-page">
      <div className="dashboard-topbar">
        <div>
          <h1 className="page-title">Employee Summary</h1>
          <p className="page-subtitle">
            Live attendance for {formatIndianDate(todayStr)}
          </p>
        </div>
        <button onClick={() => setTab("kiosk")} className="btn btn-kiosk">
          <Camera size={17} />
          <span>Open Kiosk</span>
        </button>
      </div>

      <div className="dashboard-summary-grid">
        {summaryCards.map(({ label, value, color, icon: Icon }) => (
          <div className="dashboard-summary-card" key={label}>
            <Icon size={17} color={color} />
            <strong style={{ color }}>{loading ? "..." : value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="dashboard-search-row">
        <div className="dashboard-search">
          <Search size={20} />
          <input
            type="search"
            placeholder="Search by name or code"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="dashboard-date-button"
          onClick={() => setTab("attendance")}
          title="Open attendance calendar"
        >
          <CalendarDays size={21} />
        </button>
      </div>

      <div className="dashboard-section-heading">
        <h2>Today</h2>
        <button
          type="button"
          className="btn btn-secondary dashboard-add-button"
          onClick={() => setTab("staff")}
        >
          <UserPlus size={16} /> Add Employee
        </button>
      </div>

      <div className="dashboard-roster">
        {loading ? (
          <div className="dashboard-empty">
            Loading today&apos;s attendance...
          </div>
        ) : filteredRoster.length === 0 ? (
          <div className="dashboard-empty">No employees match this search.</div>
        ) : (
          filteredRoster.map((row) => (
            <div className="dashboard-staff-row" key={row.staff._id}>
              <button
                type="button"
                className="dashboard-staff-main"
                onClick={() => setDetailStaffId(row.staff._id)}
              >
                <span
                  className="dashboard-avatar"
                  style={{ background: row.staff.avatarColor || "#2563eb" }}
                >
                  {row.staff.name.charAt(0)}
                </span>
                <span className="dashboard-staff-copy">
                  <strong>{row.staff.name}</strong>
                  <small>EMP Code: {row.staff.employeeId}</small>
                </span>
              </button>
              <div className="dashboard-staff-status">
                <span
                  className={`badge badge-${row.status.toLowerCase().replace(" ", "")}`}
                >
                  {row.status}
                </span>
                <small>
                  {row.checkIn ? `In ${row.checkIn}` : "Not yet in"}
                </small>
              </div>
              <button
                type="button"
                className="btn btn-secondary dashboard-override-button"
                onClick={() => setSelectedItem(row)}
              >
                Manage
              </button>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        className="dashboard-dashed-add"
        onClick={() => setTab("staff")}
      >
        <UserPlus size={18} /> Add Employee
      </button>

      {/* Manual Override Modal */}
      {selectedItem && (
        <ManualAttendanceModal
          item={selectedItem}
          date={todayStr}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onSuccess={fetchDashboardData}
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
