import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  Calendar,
  Camera,
  FileText,
  LoaderCircle,
  MapPin,
  RefreshCw,
  UserCircle,
} from "lucide-react";

const today = new Date().toISOString().split("T")[0];

const reportTypes = [
  { id: "all_in_one", label: "All In One Time Tracking Report", icon: MapPin },
  { id: "daily_selfie", label: "Daily Selfie Punch Report", icon: Camera },
  { id: "daily_time", label: "Daily Time Tracking Report", icon: Calendar },
  { id: "monthly_time", label: "Monthly Time Tracking Report", icon: Calendar },
  { id: "punch_log", label: "Punch Log Report", icon: FileText },
  { id: "employee_master", label: "Employee Master Report", icon: UserCircle },
];

const formatDate = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export const ReportsPage = () => {
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [activeReport, setActiveReport] = useState(reportTypes[0].id);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadPreview = async (reportId = activeReport) => {
    if (!startDate || !endDate || startDate > endDate) {
      setError("Choose a valid date range.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (reportId === "monthly_time") {
        const selected = new Date(`${startDate}T00:00:00`);
        const response = await api.reports.getMonthly(
          selected.getFullYear(),
          selected.getMonth() + 1,
        );
        setPreview({ type: "monthly", rows: response.data || [] });
      } else {
        const response = await api.attendance.getByDate(startDate);
        setPreview({ type: "daily", rows: response.data || [] });
      }
    } catch (requestError) {
      setPreview(null);
      setError(requestError.message || "Unable to load report data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreview();
  }, []);

  const handleReportSelect = (reportId) => {
    setActiveReport(reportId);
    loadPreview(reportId);
  };

  const selectedLabel = reportTypes.find(
    (report) => report.id === activeReport,
  )?.label;

  return (
    <div className="reports-page">
      <div className="reports-heading">
        <div>
          <h1>Reports</h1>
          <p>Live attendance data from your records</p>
        </div>
        <button
          type="button"
          className="reports-refresh"
          onClick={() => loadPreview()}
          title="Refresh report"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="reports-filters">
        <label>
          <span>From</span>
          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>
        <label>
          <span>To</span>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn btn-primary reports-view-button"
          onClick={() => loadPreview()}
          disabled={loading}
        >
          {loading ? (
            <LoaderCircle className="reports-spinner" size={17} />
          ) : (
            <FileText size={17} />
          )}
          View Report
        </button>
      </div>

      {error && <div className="reports-error">{error}</div>}

      <div className="reports-list">
        {reportTypes.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            className={`report-type-row ${activeReport === id ? "active" : ""}`}
            onClick={() => handleReportSelect(id)}
          >
            <Icon size={21} />
            <span>{label}</span>
            <small>{activeReport === id ? "Selected" : "View"}</small>
          </button>
        ))}
      </div>

      <section className="reports-preview">
        <div className="reports-preview-heading">
          <div>
            <h2>{selectedLabel}</h2>
            <p>
              {formatDate(startDate)} to {formatDate(endDate)}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="reports-empty">
            <LoaderCircle className="reports-spinner" size={22} /> Loading live
            data...
          </div>
        ) : !preview?.rows?.length ? (
          <div className="reports-empty">
            No attendance records found for the selected date.
          </div>
        ) : preview.type === "monthly" ? (
          <div className="reports-table-wrap">
            <table className="reports-data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Code</th>
                  <th>Present</th>
                  <th>Late</th>
                  <th>Hours</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.staff._id}>
                    <td>{row.staff.name}</td>
                    <td>{row.staff.employeeId}</td>
                    <td>{row.stats.presentCount}</td>
                    <td>{row.stats.lateCount}</td>
                    <td>{row.stats.totalWorkHours}</td>
                    <td>{row.stats.attendanceRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="reports-table-wrap">
            <table className="reports-data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Code</th>
                  <th>Status</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.staff._id}>
                    <td>{row.staff.name}</td>
                    <td>{row.staff.employeeId}</td>
                    <td>{row.status}</td>
                    <td>{row.checkIn || "-"}</td>
                    <td>{row.checkOut || "-"}</td>
                    <td>{row.workHours || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
