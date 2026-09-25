import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Trash2, Plus, Calendar } from "lucide-react";

export const HolidaysPage = () => {
  const { owner, updateBusinessSettings } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");

  const holidays = owner?.holidays || [];

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!name.trim() || !date) {
      setError("Please provide both name and date.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const newHolidays = [...holidays, { name: name.trim(), date }];
      await updateBusinessSettings({ holidays: newHolidays });
      setName("");
      setDate("");
    } catch (err) {
      setError("Failed to add holiday");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveHoliday = async (indexToRemove) => {
    setLoading(true);
    try {
      const newHolidays = holidays.filter((_, i) => i !== indexToRemove);
      await updateBusinessSettings({ holidays: newHolidays });
    } catch (err) {
      alert("Failed to remove holiday");
    } finally {
      setLoading(false);
    }
  };

  const sortedHolidays = [...holidays].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Holidays</h1>
          <p className="page-subtitle">Manage public holidays and company off-days</p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: "2rem", marginBottom: "2rem", maxWidth: "600px" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Calendar size={18} color="var(--primary)" /> Add New Holiday
        </h2>
        <form onSubmit={handleAddHoliday} style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="form-group" style={{ flex: 2, minWidth: "200px" }}>
            <label>Holiday Name</label>
            <input
              type="text"
              placeholder="e.g. Gandhi Jayanti"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: "150px" }}>
            <label>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="form-input"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: "42px", marginBottom: "0.5rem" }}>
            <Plus size={16} /> Add
          </button>
        </form>
        {error && <p style={{ color: "var(--danger)", marginTop: "1rem", fontSize: "0.85rem" }}>{error}</p>}
      </div>

      <div className="glass-card" style={{ maxWidth: "600px" }}>
        <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "1.1rem" }}>Holiday List</h2>
        </div>
        <div>
          {sortedHolidays.length === 0 ? (
            <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--text-muted)" }}>
              No holidays added yet.
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {sortedHolidays.map((holiday, idx) => (
                <li key={idx} style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  padding: "1rem 1.5rem",
                  borderBottom: idx === sortedHolidays.length - 1 ? "none" : "1px solid var(--border)"
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--text-main)" }}>{holiday.name}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      {new Date(holiday.date).toLocaleDateString("en-IN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemoveHoliday(idx)}
                    className="btn btn-secondary"
                    style={{ padding: "0.4rem", color: "var(--danger)" }}
                    title="Remove Holiday"
                    disabled={loading}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
