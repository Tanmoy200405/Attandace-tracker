import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { ShieldCheck, LogIn, UserPlus } from "lucide-react";

export const LoginPage = () => {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    businessName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        const res = await api.auth.register(formData);
        if (res.success && res.data) {
          await login(formData.email, formData.password);
        }
      } else {
        await login(formData.email, formData.password);
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "2.5rem",
          boxShadow:
            "0 20px 40px rgba(0, 0, 0, 0.6), 0 0 35px rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Brand Icon & Heading */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "#222222",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              boxShadow: "0 0 25px rgba(255, 255, 255, 0.15)",
            }}
          >
            <ShieldCheck size={32} color="#fff" />
          </div>
          <h2 style={{ fontSize: "1.6rem", color: "#fff", margin: 0 }}>
            {isRegister ? "Create Business Account" : "Owner Portal Login"}
          </h2>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-muted)",
              marginTop: "0.35rem",
            }}
          >
            BioTrack Staff Attendance & Biometrics Engine
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "var(--radius-md)",
              color: "#fca5a5",
              fontSize: "0.85rem",
              marginBottom: "1.5rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Account login */}
        {!isRegister && (
          <div
            style={{
              marginBottom: "1.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                margin: "1rem 0 0.25rem",
                gap: "0.75rem",
              }}
            >
              <div
                style={{ flex: 1, height: "1px", background: "var(--border)" }}
              />
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-dim)",
                  textTransform: "uppercase",
                }}
              >
                sign in with your account
              </span>
              <div
                style={{ flex: 1, height: "1px", background: "var(--border)" }}
              />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <div className="form-group">
                <label className="form-label">Your Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Business / Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Corporation"
                  className="form-input"
                  value={formData.businessName}
                  onChange={(e) =>
                    setFormData({ ...formData, businessName: e.target.value })
                  }
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              required
              placeholder="owner@enterprise.com"
              className="form-input"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="form-input"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", padding: "0.75rem", marginTop: "1rem" }}
          >
            {isRegister ? <UserPlus size={18} /> : <LogIn size={18} />}
            <span>
              {loading
                ? "Authenticating..."
                : isRegister
                  ? "Register Account"
                  : "Sign In"}
            </span>
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            type="button"
            style={{
              background: "none",
              border: "none",
              color: "#cccccc",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            {isRegister
              ? "Already have an account? Sign In"
              : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
};
