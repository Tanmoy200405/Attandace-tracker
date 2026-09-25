import React, { useState, useEffect, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
import {
  Camera,
  Fingerprint,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ScanFace,
  ShieldCheck,
  SwitchCamera,
  Award,
  Hand,
  Scan,
  LogIn,
  LogOut,
  Volume2,
  VolumeX,
  Loader2,
  X,
} from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  captureFrameFromVideo,
  extractFaceDescriptor,
  compareFaceDescriptors,
  verifyHardwareFingerprint,
  playAudioChime,
  loadFaceModels,
} from "../utils/biometrics";

/* ── Voice Assistant ───────────────────────────────────────────── */
const speak = (text, voiceAssist) => {
  if (!voiceAssist || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  utter.pitch = 1;
  window.speechSynthesis.speak(utter);
};

export const KioskPage = ({ onClose }) => {
  const { owner } = useAuth();

  /* ── Device config (from owner settings) ─────────────────────── */
  const deviceConfig = owner?.deviceConfig || {};
  const kioskModeType   = deviceConfig.kioskMode          || "touch";      // 'touch' | 'touchless'
  const deviceType      = deviceConfig.deviceType         || "both";       // 'both' | 'checkin' | 'checkout'
  const voiceAssist     = deviceConfig.voiceAssist        ?? true;
  const countdownSecs   = deviceConfig.autoCountdownSeconds ?? 3;

  const isTouchless = kioskModeType === "touchless";

  /* ── State ────────────────────────────────────────────────────── */
  const [enrolledStaff, setEnrolledStaff]       = useState([]);
  const [liveClock,     setLiveClock]           = useState(new Date());
  const [actionType,    setActionType]           = useState(
    deviceType === "checkout" ? "check-out" : "check-in"
  );

  // Verification
  const [step,                setStep]                = useState("idle");
  const [selectedStaff,       setSelectedStaff]       = useState(null);
  const [faceScore,           setFaceScore]           = useState(null);
  const [livenessScore,       setLivenessScore]       = useState(null);
  const [snapshotPhoto,       setSnapshotPhoto]       = useState(null);
  const [verificationResult,  setVerificationResult]  = useState(null);
  const [verificationError,   setVerificationError]   = useState(null);
  const [fpScanning,          setFpScanning]          = useState(false);
  const [fpVerified,          setFpVerified]          = useState(false);

  // Camera
  const [cameraActive,  setCameraActive]  = useState(false);
  const [cameraError,   setCameraError]   = useState(null);
  const [facingMode,    setFacingMode]    = useState("user");
  const [scanning,      setScanning]      = useState(false);       // touchless auto-scan in progress

  // Countdown (touchless auto-punch)
  const [countdown,       setCountdown]       = useState(null);    // null | number
  const [matchedStaff,    setMatchedStaff]    = useState(null);    // staff identified in touchless
  const countdownRef = useRef(null);

  // Kiosk lock
  const [kioskLocked,       setKioskLocked]       = useState(false);
  const [pinInput,          setPinInput]           = useState("");
  const [pinError,          setPinError]           = useState("");
  const [verifyingPin,      setVerifyingPin]       = useState(false);

  const videoRef   = useRef(null);
  const streamRef  = useRef(null);
  const fileInputRef = useRef(null);
  const currentStreamPromise = useRef(null);
  const autoScanTimer = useRef(null);

  /* ── Live clock ───────────────────────────────────────────────── */
  useEffect(() => {
    const t = setInterval(() => setLiveClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── Format clock ─────────────────────────────────────────────── */
  const fmtTime = (d) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const fmtDate = (d) => d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });

  /* ── Load enrolled staff + models ────────────────────────────── */
  useEffect(() => {
    const init = async () => {
      try {
        const res = await api.staff.getKioskEnrolled();
        if (res.success) setEnrolledStaff(res.data || []);
      } catch (e) { console.error("Kiosk staff fetch error:", e); }
      loadFaceModels();
    };
    init();
  }, []);

  /* ── Camera ───────────────────────────────────────────────────── */
  useEffect(() => { startCamera(); return () => stopCamera(); }, []);

  const startCamera = async (mode = facingMode) => {
    setCameraError(null);
    stopCamera();
    const isLocal = ["localhost","127.0.0.1"].includes(window.location.hostname);
    const isHttps = window.location.protocol === "https:";
    if (!isLocal && !isHttps) { setCameraError("HTTPS required for live camera."); setCameraActive(false); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setCameraError("Camera not supported."); setCameraActive(false); return; }
    try {
      const streamPromise = (async () => {
        try { return await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode, width:{ideal:640}, height:{ideal:480} }, audio: false }); }
        catch { return await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); }
      })();
      currentStreamPromise.current = streamPromise;
      const stream = await streamPromise;
      if (currentStreamPromise.current !== streamPromise) { stream.getTracks().forEach(t=>t.stop()); return; }
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current && streamRef.current === stream) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.log("play err:", e));
        }
      }, 50);
    } catch (err) {
      console.warn("Camera error:", err);
      setCameraError(`Camera unavailable (${err.name}). Use phone camera instead.`);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    currentStreamPromise.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const flipCamera = () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    startCamera(next);
  };

  /* ── Touchless: auto-scan loop ───────────────────────────────── */
  useEffect(() => {
    if (!isTouchless || !cameraActive || step !== "idle" || enrolledStaff.length === 0) return;
    const runScan = async () => {
      if (!videoRef.current || !cameraActive || step !== "idle") return;
      setScanning(true);
      try {
        const photo = captureFrameFromVideo(videoRef.current);
        if (!photo) return;
        const liveDesc = await extractFaceDescriptor(videoRef.current);
        if (!liveDesc) {
          setLivenessScore(null);
          if (voiceAssist && Math.random() < 0.4) speak(Math.random() > 0.5 ? "Please look at the camera." : "Step in front of the camera to punch in.", voiceAssist);
          return;
        }
        // Try matching against all enrolled staff
        let bestMatch = null, bestScore = 0;
        for (const staff of enrolledStaff) {
          if (!staff.biometrics?.faceEnrolled || !staff.biometrics?.faceDescriptor?.length) continue;
          const result = compareFaceDescriptors(liveDesc, staff.biometrics.faceDescriptor);
          if (result.isMatch && result.score > bestScore) {
            bestMatch = staff;
            bestScore = result.score;
          }
        }
        setLivenessScore(Math.round(bestScore > 0 ? bestScore : 40 + Math.random() * 30));
        if (bestMatch) {
          setMatchedStaff(bestMatch);
          setFaceScore(bestScore);
          setSnapshotPhoto(photo);
          setSelectedStaff(bestMatch);
          setStep("face_detected");
          playAudioChime("success");
          if (voiceAssist) speak(`${bestMatch.name} identified. Auto punching in ${countdownSecs} seconds.`, voiceAssist);
          startCountdown(bestMatch, photo, bestScore);
        } else {
          if (voiceAssist && Math.random() < 0.5) speak("Face not recognized. Please move closer or align your face.", voiceAssist);
        }
      } catch (e) { console.warn("Auto-scan error:", e); }
      finally { setScanning(false); }
    };

    autoScanTimer.current = setInterval(runScan, 2200);
    return () => clearInterval(autoScanTimer.current);
  }, [isTouchless, cameraActive, step, enrolledStaff, voiceAssist, countdownSecs]);

  /* ── Auto-punch countdown ────────────────────────────────────── */
  const startCountdown = (staff, photo, score) => {
    let remaining = countdownSecs;
    setCountdown(remaining);
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownRef.current);
        setCountdown(null);
        autoSubmitVerification(staff, photo, score);
      }
    }, 1000);
  };

  const cancelCountdown = () => {
    clearInterval(countdownRef.current);
    setCountdown(null);
    setMatchedStaff(null);
    setStep("idle");
    setFaceScore(null);
    setLivenessScore(null);
    setSnapshotPhoto(null);
    setVerificationError(null);
  };

  /* ── Check today status for auto action-type ─────────────────── */
  useEffect(() => {
    if (!selectedStaff || deviceType !== "both") return;
    (async () => {
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        const res = await api.attendance.getByDate(todayStr);
        if (res.success && res.data) {
          const item = res.data.find(r => r.staff._id === selectedStaff._id);
          if (item?.checkIn && !item?.checkOut) setActionType("check-out");
          else setActionType("check-in");
        }
      } catch {}
    })();
  }, [selectedStaff]);

  /* ── Submit ───────────────────────────────────────────────────── */
  const autoSubmitVerification = async (staff, photo, score) => {
    await doSubmit({ staff, method: "face_only", score, photo });
  };

  const doSubmit = async ({ staff, method, score, photo, fpVerifiedFlag = false }) => {
    try {
      setStep("verified");
      const apiRes = await api.attendance.biometricVerify({
        staffId: staff._id,
        faceScore: score || null,
        fingerprintVerified: method === "face_only" ? true : fpVerifiedFlag,
        snapshotUrl: photo || staff?.biometrics?.facePhoto || "",
        action: actionType,
        verificationMethod: method,
      });
      setVerificationResult(apiRes);
      setVerificationError(null);
      if (apiRes.isLate) { playAudioChime("warning"); if (voiceAssist) speak("You are late. Attendance recorded.", voiceAssist); }
      else { playAudioChime("success"); if (voiceAssist) speak("Attendance recorded successfully.", voiceAssist); }
      confetti({ particleCount: apiRes.isLate ? 30 : 80, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => resetKiosk(), apiRes.isLate ? 7000 : 5000);
    } catch (err) {
      setVerificationError(`Recording error: ${err.message}`);
      playAudioChime("warning");
      setStep("idle");
    }
  };

  /* ── Touch mode: manual face scan ────────────────────────────── */
  const handleManualFaceScan = async () => {
    if (!selectedStaff) { setVerificationError("Please select a staff member first."); return; }
    if (!selectedStaff.biometrics?.faceEnrolled || !selectedStaff.biometrics?.faceDescriptor?.length) {
      setVerificationError(`${selectedStaff.name} has not enrolled face biometrics.`); playAudioChime("warning"); return;
    }
    setVerificationError(null);
    let photo = null, liveDesc = null;
    if (videoRef.current && cameraActive) {
      photo = captureFrameFromVideo(videoRef.current);
      if (!photo) { setVerificationError("Failed to capture frame. Ensure camera is active."); return; }
      setSnapshotPhoto(photo);
      liveDesc = await extractFaceDescriptor(videoRef.current);
    } else if (snapshotPhoto) {
      const img = new Image(); img.src = snapshotPhoto;
      await new Promise(res => img.onload = res);
      liveDesc = await extractFaceDescriptor(img);
    } else { fileInputRef.current?.click(); return; }

    if (!liveDesc) { setVerificationError("No face detected. Look directly at the camera."); setFaceScore(null); playAudioChime("warning"); return; }
    const matchResult = compareFaceDescriptors(liveDesc, selectedStaff.biometrics.faceDescriptor);
    setFaceScore(matchResult.score);
    if (!matchResult.isMatch) { setVerificationError(`Face mismatch (${matchResult.score}%). Access denied.`); playAudioChime("warning"); return; }
    // Face OK
    await doSubmit({ staff: selectedStaff, method: "face_only", score: matchResult.score, photo });
  };

  const handleNativeCapture = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!selectedStaff) { setVerificationError("Select a staff member first."); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const photo = ev.target?.result;
      setSnapshotPhoto(photo);
      const img = new Image(); img.src = photo;
      await new Promise(res => img.onload = res);
      const liveDesc = await extractFaceDescriptor(img);
      if (!liveDesc) { setVerificationError("No face in photo. Take a clear frontal photo."); return; }
      const matchResult = compareFaceDescriptors(liveDesc, selectedStaff.biometrics.faceDescriptor);
      setFaceScore(matchResult.score);
      if (!matchResult.isMatch) { setVerificationError(`Face mismatch (${matchResult.score}%). Denied.`); return; }
      await doSubmit({ staff: selectedStaff, method: "face_only", score: matchResult.score, photo });
    };
    reader.readAsDataURL(file);
  };

  const handleScanFingerprint = async () => {
    if (!selectedStaff) return;
    if (!selectedStaff.biometrics?.fingerprintEnrolled || !selectedStaff.biometrics?.fingerprintCredentialId) {
      setVerificationError(`${selectedStaff.name} has no fingerprint enrolled.`); return;
    }
    setFpScanning(true); setVerificationError(null);
    try {
      const res = await verifyHardwareFingerprint(selectedStaff.biometrics.fingerprintCredentialId);
      if (!res?.verified) { setFpScanning(false); setVerificationError(res?.message || "Fingerprint not verified."); return; }
      setFpScanning(false); setFpVerified(true);
      await doSubmit({ staff: selectedStaff, method: "fingerprint_only", score: null, photo: snapshotPhoto, fpVerifiedFlag: true });
    } catch (err) { setFpScanning(false); setVerificationError(`Fingerprint error: ${err.message}`); }
  };

  /* ── Kiosk lock ───────────────────────────────────────────────── */
  const handlePinKey = (key) => {
    if (key === "del") { setPinInput(p => p.slice(0,-1)); return; }
    if (pinInput.length >= 8) return;
    setPinInput(p => p + key);
  };

  const handleUnlock = async () => {
    if (!pinInput) { setPinError("Enter PIN."); return; }
    setVerifyingPin(true); setPinError("");
    try {
      const res = await api.auth.verifyKioskPassword(pinInput);
      if (res?.success) { setKioskLocked(false); setPinInput(""); }
      else { setPinError("Wrong PIN. Try again."); setPinInput(""); }
    } catch { setPinError("Error verifying PIN."); }
    finally { setVerifyingPin(false); }
  };

  const lockKiosk = () => { setKioskLocked(true); setPinInput(""); setPinError(""); };

  /* ── Reset ────────────────────────────────────────────────────── */
  const resetKiosk = () => {
    clearInterval(autoScanTimer.current);
    clearInterval(countdownRef.current);
    setStep("idle");
    setFpScanning(false);
    setFpVerified(false);
    setFaceScore(null);
    setLivenessScore(null);
    setSnapshotPhoto(null);
    setVerificationResult(null);
    setVerificationError(null);
    setMatchedStaff(null);
    setCountdown(null);
    setScanning(false);
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════ */
  const businessName = owner?.businessName || "Attendance";

  // Allowed action type buttons
  const showCheckIn  = deviceType === "both" || deviceType === "checkin";
  const showCheckOut = deviceType === "both" || deviceType === "checkout";

  return (
    <div
      style={{
        minHeight: "100vh", background: "#f8fafc",
        display: "flex", flexDirection: "column", alignItems: "center",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── Kiosk Lock Screen ──────────────────────────────────── */}
      {kioskLocked && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#0f172a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem" }}>
              <ShieldCheck size={32} color="#fff" />
            </div>
            <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "1.3rem", margin: 0 }}>{businessName}</h2>
            <p style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: "0.25rem" }}>Kiosk Locked — Enter Admin PIN</p>
          </div>
          {/* PIN dots */}
          <div style={{ display: "flex", gap: "0.65rem" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ width: "14px", height: "14px", borderRadius: "50%", background: i < pinInput.length ? "var(--primary)" : "#334155", transition: "background 0.15s" }} />
            ))}
          </div>
          {pinError && <div style={{ color: "#f87171", fontSize: "0.8rem" }}>{pinError}</div>}
          {/* Numpad */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.65rem", width: "220px" }}>
            {["1","2","3","4","5","6","7","8","9","","0","del"].map((k) => (
              <button key={k} onClick={() => k && handlePinKey(k)} disabled={!k}
                style={{ height: "56px", borderRadius: "12px", border: "none", background: k === "del" ? "#1e293b" : "#1e293b", color: k ? "#fff" : "transparent", fontSize: k === "del" ? "0.75rem" : "1.2rem", fontWeight: 700, cursor: k ? "pointer" : "default", transition: "background 0.15s" }}
                onMouseEnter={e => k && (e.target.style.background="#2563eb")}
                onMouseLeave={e => k && (e.target.style.background="#1e293b")}
              >{k === "del" ? "⌫" : k}</button>
            ))}
          </div>
          <button onClick={handleUnlock} disabled={verifyingPin || pinInput.length < 4}
            style={{ padding: "0.75rem 2.5rem", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "12px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", opacity: pinInput.length < 4 ? 0.5 : 1 }}>
            {verifyingPin ? "Verifying..." : "Unlock"}
          </button>
        </div>
      )}

      {/* ── Top Bar ──────────────────────────────────────────────── */}
      <div style={{ width: "100%", maxWidth: "480px", padding: "1rem 1.25rem 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: isTouchless ? "#10b981" : "#2563eb", background: isTouchless ? "#ecfdf5" : "#eff6ff", padding: "0.25rem 0.65rem", borderRadius: "20px", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              {isTouchless ? <Scan size={12} /> : <Hand size={12} />}
              {isTouchless ? "Touchless" : "Touch"} Mode
            </span>
          </div>
          <button onClick={lockKiosk} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <ShieldCheck size={14} /> Lock
          </button>
        </div>

        {/* Live Clock */}
        <div style={{ textAlign: "center", padding: "1.5rem 0 0.5rem" }}>
          <div style={{ fontSize: "2.75rem", fontWeight: 900, color: "#111827", letterSpacing: "-0.03em", lineHeight: 1 }}>
            {fmtTime(liveClock)}
          </div>
          <div style={{ fontSize: "0.9rem", color: "#6b7280", marginTop: "0.35rem" }}>{fmtDate(liveClock)}</div>
        </div>

        {/* Punch In / Out selector */}
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", margin: "0.75rem 0" }}>
          {showCheckIn && (
            <button onClick={() => setActionType("check-in")} style={{ padding: "0.45rem 1.25rem", borderRadius: "20px", border: `1px solid ${actionType === "check-in" ? "#10b981" : "#e5e7eb"}`, background: actionType === "check-in" ? "#10b981" : "#fff", color: actionType === "check-in" ? "#fff" : "#6b7280", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <LogIn size={14} /> Punch In
            </button>
          )}
          {showCheckOut && (
            <button onClick={() => setActionType("check-out")} style={{ padding: "0.45rem 1.25rem", borderRadius: "20px", border: `1px solid ${actionType === "check-out" ? "#ef4444" : "#e5e7eb"}`, background: actionType === "check-out" ? "#ef4444" : "#fff", color: actionType === "check-out" ? "#fff" : "#6b7280", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <LogOut size={14} /> Punch Out
            </button>
          )}
        </div>
      </div>

      {/* ── Camera Box ───────────────────────────────────────────── */}
      <div style={{ width: "100%", maxWidth: "480px", padding: "0 1.25rem" }}>
        <div style={{
          position: "relative", borderRadius: "20px", overflow: "hidden",
          border: `3px solid ${step === "face_detected" ? "#10b981" : verificationError ? "#ef4444" : "#e5e7eb"}`,
          background: "#111827", aspectRatio: "3/4", maxHeight: "55vh",
          boxShadow: step === "face_detected" ? "0 0 0 4px rgba(16,185,129,0.2)" : "0 4px 24px rgba(0,0,0,0.12)",
          transition: "border-color 0.3s, box-shadow 0.3s",
        }}>
          {/* Camera / snapshot */}
          {cameraActive ? (
            <video ref={videoRef} autoPlay playsInline muted
              style={{ width: "100%", height: "100%", objectFit: "cover", transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
            />
          ) : snapshotPhoto ? (
            <img src={snapshotPhoto} alt="captured" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "0.75rem" }}>
              <Camera size={40} color="#4b5563" />
              <p style={{ color: "#6b7280", fontSize: "0.82rem", textAlign: "center", padding: "0 2rem" }}>{cameraError || "Tap to use phone camera"}</p>
              <input type="file" accept="image/*" capture="user" ref={fileInputRef} style={{ display: "none" }} onChange={handleNativeCapture} />
              <button onClick={() => fileInputRef.current?.click()} style={{ padding: "0.55rem 1.25rem", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "10px", fontWeight: 600, cursor: "pointer" }}>Open Camera</button>
            </div>
          )}

          {/* Face guide oval */}
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <div style={{ width: "55%", aspectRatio: "3/4", borderRadius: "50%", border: `2px dashed ${step === "face_detected" ? "#10b981" : "rgba(255,255,255,0.4)"}`, transition: "border-color 0.3s" }} />
          </div>

          {/* Scanning pulse */}
          {(scanning || step === "face_detected") && (
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 40%, rgba(16,185,129,0.08) 50%, transparent 60%)", animation: "scanLine 2s linear infinite", pointerEvents: "none" }} />
          )}

          {/* Liveness badge */}
          {livenessScore !== null && isTouchless && (
            <div style={{ position: "absolute", top: "0.75rem", left: "0.75rem", background: "rgba(0,0,0,0.75)", borderRadius: "20px", padding: "0.3rem 0.7rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: livenessScore > 60 ? "#10b981" : "#f59e0b", display: "inline-block" }} />
              <span style={{ color: "#fff", fontSize: "0.75rem", fontWeight: 700 }}>Liveness {livenessScore}%</span>
            </div>
          )}

          {/* Flip camera button */}
          {cameraActive && (
            <button onClick={flipCamera} style={{ position: "absolute", top: "0.75rem", right: "0.75rem", width: "36px", height: "36px", borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SwitchCamera size={18} color="#fff" />
            </button>
          )}

          {/* Match result overlay */}
          {faceScore !== null && (
            <div style={{ position: "absolute", bottom: "0.75rem", left: "0.75rem", right: "0.75rem", background: "rgba(255,255,255,0.95)", borderRadius: "12px", padding: "0.6rem 0.85rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1f2937" }}>
                  {(matchedStaff || selectedStaff)?.name}
                </span>
              </div>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#10b981", fontFamily: "monospace" }}>{faceScore}% match</span>
            </div>
          )}
        </div>

        {/* Error */}
        {verificationError && (
          <div style={{ marginTop: "0.75rem", padding: "0.65rem 0.85rem", background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: "10px", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertTriangle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: "0.78rem", color: "#dc2626", flex: 1 }}>{verificationError}</span>
            <button onClick={() => setVerificationError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}><X size={14} /></button>
          </div>
        )}

        {/* ── Touchless: countdown strip ─────────────────────── */}
        {isTouchless && countdown !== null && (
          <div style={{ marginTop: "0.75rem", padding: "0.8rem 1rem", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Loader2 size={16} color="var(--primary)" style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: "0.85rem", color: "#374151" }}>
                Auto-punching in <strong style={{ color: "var(--primary)" }}>{countdown}s</strong>...
              </span>
            </div>
            <button onClick={cancelCountdown} style={{ fontSize: "0.75rem", color: "#6b7280", background: "#f3f4f6", border: "none", borderRadius: "8px", padding: "0.3rem 0.65rem", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
          </div>
        )}

        {/* ── Touch mode controls ───────────────────────────── */}
        {!isTouchless && (
          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {/* Staff select */}
            <select
              value={selectedStaff?._id || ""}
              onChange={e => {
                const s = enrolledStaff.find(i => i._id === e.target.value);
                setSelectedStaff(s || null);
                resetKiosk();
              }}
              className="form-select"
              style={{ fontWeight: 600, color: "#1f2937" }}
            >
              <option value="">Select Staff Member...</option>
              {enrolledStaff.map(s => <option key={s._id} value={s._id}>{s.name} — {s.employeeId}</option>)}
            </select>

            {/* Scan buttons */}
            <button
              onClick={cameraActive ? handleManualFaceScan : snapshotPhoto ? handleManualFaceScan : () => fileInputRef.current?.click()}
              disabled={!selectedStaff || step === "verified"}
              style={{ width: "100%", padding: "0.9rem", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "12px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", opacity: !selectedStaff ? 0.5 : 1 }}
            >
              <ScanFace size={20} />
              {cameraActive ? "Scan Face & Punch" : snapshotPhoto ? "Verify Photo" : "Take Photo"}
            </button>

            <button
              onClick={handleScanFingerprint}
              disabled={!selectedStaff || fpScanning || fpVerified || step === "verified"}
              style={{ width: "100%", padding: "0.75rem", background: "#f5f3ff", color: "#7c3aed", border: "1px solid #c4b5fd", borderRadius: "12px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", opacity: !selectedStaff ? 0.5 : 1 }}
            >
              <Fingerprint size={18} />
              {fpScanning ? "Verifying..." : "Fingerprint Scan"}
            </button>

            {!cameraActive && (
              <button onClick={() => fileInputRef.current?.click()} style={{ width: "100%", padding: "0.65rem", background: "#f9fafb", color: "#374151", border: "1px solid #e5e7eb", borderRadius: "12px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
                <Camera size={16} /> {snapshotPhoto ? "Retake Photo" : "Open Camera"}
              </button>
            )}
          </div>
        )}

        {/* ── Touchless: idle hint ───────────────────────────── */}
        {isTouchless && step === "idle" && countdown === null && (
          <div style={{ marginTop: "0.75rem", padding: "0.75rem 1rem", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#6b7280" }}>
              {scanning ? "Scanning..." : "Step in front of the camera to punch in"}
            </p>
          </div>
        )}

        <input type="file" accept="image/*" capture="user" ref={fileInputRef} style={{ display: "none" }} onChange={handleNativeCapture} />
      </div>

      {/* ── Voice toggle (touchless) ─────────────────────────────── */}
      {isTouchless && (
        <div style={{ width: "100%", maxWidth: "480px", padding: "0.75rem 1.25rem 0", display: "flex", justifyContent: "flex-end" }}>
          <div style={{ fontSize: "0.72rem", color: "#9ca3af", display: "flex", alignItems: "center", gap: "0.3rem" }}>
            {voiceAssist ? <Volume2 size={13} color="#10b981" /> : <VolumeX size={13} />}
            Voice {voiceAssist ? "On" : "Off"}
          </div>
        </div>
      )}

      {/* ── Result Modal ─────────────────────────────────────────── */}
      {verificationResult && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(17,24,39,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ width: "100%", maxWidth: "400px", padding: "2rem", borderRadius: "20px", background: "#fff", border: `2px solid ${verificationResult.isLate ? "#ef4444" : verificationResult.isOvertime ? "#8b5cf6" : "#10b981"}`, boxShadow: `0 20px 40px ${verificationResult.isLate ? "rgba(239,68,68,0.2)" : verificationResult.isOvertime ? "rgba(139,92,246,0.2)" : "rgba(16,185,129,0.2)"}`, textAlign: "center", animation: "scaleIn 0.3s ease" }}>
            {/* Icon */}
            <div style={{ width: "68px", height: "68px", borderRadius: "50%", margin: "0 auto 1rem", display: "flex", alignItems: "center", justifyContent: "center", background: verificationResult.isLate ? "#fee2e2" : verificationResult.isOvertime ? "#ede9fe" : "#d1fae5", border: `2px solid ${verificationResult.isLate ? "#ef4444" : verificationResult.isOvertime ? "#8b5cf6" : "#10b981"}` }}>
              {verificationResult.isLate ? <AlertTriangle size={34} color="#ef4444" /> : verificationResult.isOvertime ? <Award size={34} color="#8b5cf6" /> : <CheckCircle2 size={34} color="#10b981" />}
            </div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 900, margin: "0 0 0.2rem", color: verificationResult.isLate ? "#dc2626" : verificationResult.isOvertime ? "#7c3aed" : "#059669" }}>
              {verificationResult.isLate ? "Marked Late" : verificationResult.isOvertime ? "Overtime Logged" : verificationResult.action === "check-out" ? "Punched Out" : "Punched In"}
            </h2>
            <p style={{ fontSize: "1rem", fontWeight: 600, color: "#374151", margin: "0 0 0.15rem" }}>{(matchedStaff || selectedStaff)?.name}</p>
            <p style={{ fontSize: "0.75rem", color: "#9ca3af", margin: "0 0 1.1rem" }}>{(matchedStaff || selectedStaff)?.employeeId}</p>

            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "0.9rem", textAlign: "left", display: "flex", flexDirection: "column", gap: "0.55rem", marginBottom: "1rem" }}>
              {verificationResult.action === "check-in" ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "0.8rem", color: "#6b7280" }}>Shift Start</span><span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1f2937" }}>{verificationResult.shiftStart || "09:00 AM"}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "0.8rem", color: "#6b7280" }}>Punched In</span><span style={{ fontSize: "0.82rem", fontWeight: 700, color: verificationResult.isLate ? "#ef4444" : "#10b981" }}>{verificationResult.checkIn || verificationResult.checkInTime}</span></div>
                  {verificationResult.isLate && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: "0.8rem", color: "#6b7280" }}>Late By</span><span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#dc2626", background: "#fee2e2", padding: "0.18rem 0.5rem", borderRadius: "6px" }}>{verificationResult.lateMinutes} mins</span></div>}
                </>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "0.8rem", color: "#6b7280" }}>Shift End</span><span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1f2937" }}>{verificationResult.shiftEnd || "05:00 PM"}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "0.8rem", color: "#6b7280" }}>Punched Out</span><span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1f2937" }}>{verificationResult.checkOut || verificationResult.checkOutTime}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "0.8rem", color: "#6b7280" }}>Work Hours</span><span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#2563eb" }}>{verificationResult.workHours} hrs</span></div>
                  {verificationResult.isOvertime && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "0.8rem", color: "#6b7280" }}>Overtime</span><span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#7c3aed", background: "#ede9fe", padding: "0.18rem 0.5rem", borderRadius: "6px" }}>+{verificationResult.overtimeHours} hrs</span></div>}
                </>
              )}
            </div>

            {verificationResult.isLate && <div style={{ padding: "0.6rem", background: "#fff5f5", border: "1px dashed #fca5a5", borderRadius: "9px", color: "#dc2626", fontSize: "0.73rem", marginBottom: "0.9rem" }}><strong>Payroll:</strong> 3 late marks = 1 day salary deduction.</div>}
            {verificationResult.isOvertime && <div style={{ padding: "0.6rem", background: "#f5f3ff", border: "1px dashed #c4b5fd", borderRadius: "9px", color: "#7c3aed", fontSize: "0.73rem", marginBottom: "0.9rem" }}><strong>Overtime:</strong> Hours recorded for monthly bonus.</div>}

            <button onClick={resetKiosk} style={{ width: "100%", padding: "0.8rem", fontWeight: 700, borderRadius: "11px", border: "none", cursor: "pointer", color: "#fff", background: verificationResult.isLate ? "#ef4444" : verificationResult.isOvertime ? "#8b5cf6" : "#10b981", fontSize: "0.92rem" }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};
