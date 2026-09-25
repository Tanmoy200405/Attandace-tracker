import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Settings,
  Save,
  Clock,
  Building,
  Check,
  CalendarDays,
  UsersRound,
  Wrench,
  CalendarCheck,
  Languages,
  LockKeyhole,
  Info,
  FileText,
  Headphones,
  ChevronRight,
  ChevronUp,
  Upload,
  X,
  Hand,
  Scan,
  LogIn,
  LogOut,
  ArrowLeftRight,
  Volume2,
  VolumeX,
  Timer,
  Eye,
  EyeOff,
} from "lucide-react";
import { api } from "../services/api";

const settingsCopy = {
  en: {
    organizationManagement: "Organization Management",
    others: "Others",
    organization: "Organization Detail",
    employees: "Employees",
    device: "Device Configuration",
    timings: "Work Timings",
    calendar: "Calendar",
    holidays: "Holidays",
    departments: "Departments / Branches",
    languages: "Languages",
    password: "Change Password",
    about: "About Us",
    terms: "Terms & Conditions",
    privacy: "Privacy Policy",
    support: "Chat Support",
    save: "Save Changes",
    saved: "Business settings updated successfully!",
    employeeTimes: "Employee Working Times",
    noTimes: "No active employees found.",
    entry: "Entry",
    exit: "Exit",
    name: "Employee",
    english: "English",
    bangla: "বাংলা (Bangla)",
    hindi: "हिन्दी (Hindi)",
    selectLanguage: "App Language",
  },
  bn: {
    organizationManagement: "প্রতিষ্ঠান ব্যবস্থাপনা",
    others: "অন্যান্য",
    organization: "প্রতিষ্ঠানের তথ্য",
    employees: "কর্মচারী",
    device: "ডিভাইস কনফিগারেশন",
    timings: "কাজের সময়",
    calendar: "ক্যালেন্ডার",
    holidays: "ছুটির দিন",
    departments: "বিভাগ / শাখা",
    languages: "ভাষা",
    password: "পাসওয়ার্ড পরিবর্তন",
    about: "আমাদের সম্পর্কে",
    terms: "শর্তাবলি",
    privacy: "গোপনীয়তা নীতি",
    support: "সহায়তা",
    save: "সংরক্ষণ করুন",
    saved: "প্রতিষ্ঠানের সেটিংস সংরক্ষিত হয়েছে!",
    employeeTimes: "কর্মচারীদের কাজের সময়",
    noTimes: "কোনো সক্রিয় কর্মচারী পাওয়া যায়নি।",
    entry: "প্রবেশ",
    exit: "প্রস্থান",
    name: "কর্মচারী",
    english: "English",
    bangla: "বাংলা",
    hindi: "हिन्दी",
    selectLanguage: "অ্যাপের ভাষা",
  },
  hi: {
    organizationManagement: "संगठन प्रबंधन",
    others: "अन्य",
    organization: "संगठन विवरण",
    employees: "कर्मचारी",
    device: "डिवाइस कॉन्फ़िगरेशन",
    timings: "कार्य समय",
    calendar: "कैलेंडर",
    holidays: "छुट्टियां",
    departments: "विभाग / शाखाएं",
    languages: "भाषाएं",
    password: "पासवर्ड बदलें",
    about: "हमारे बारे में",
    terms: "नियम और शर्तें",
    privacy: "गोपनीयता नीति",
    support: "सहायता",
    save: "सेव करें",
    saved: "संगठन सेटिंग्स अपडेट हो गईं!",
    employeeTimes: "कर्मचारियों का कार्य समय",
    noTimes: "कोई सक्रिय कर्मचारी नहीं मिला।",
    entry: "प्रवेश",
    exit: "निकास",
    name: "कर्मचारी",
    english: "English",
    bangla: "বাংলা",
    hindi: "हिन्दी",
    selectLanguage: "ऐप की भाषा",
  },
};

export const SettingsPage = ({ setTab }) => {
  const { owner, updateBusinessSettings } = useAuth();

  const [formData, setFormData] = useState({
    businessName: "",
    shiftStart: "09:00",
    shiftEnd: "17:00",
    gracePeriodMinutes: 15,
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    kioskPassword: "",
    language: "en",
    organizationLogo: "",
    deviceConfig: {
      kioskMode: "touch",
      deviceType: "both",
      voiceAssist: true,
      autoCountdownSeconds: 3,
    },
  });
  const [showKioskPin, setShowKioskPin] = useState(false);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [openSection, setOpenSection] = useState(null);
  const [passwordData, setPasswordData] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [employeeTimes, setEmployeeTimes] = useState([]);
  const [employeeTimesLoading, setEmployeeTimesLoading] = useState(false);
  const copy = settingsCopy[formData.language] || settingsCopy.en;

  useEffect(() => {
    if (owner) {
      setFormData({
        businessName: owner.businessName || "",
        shiftStart: owner.shiftStart || "09:00",
        shiftEnd: owner.shiftEnd || "17:00",
        gracePeriodMinutes: owner.gracePeriodMinutes ?? 15,
        workingDays: owner.workingDays || [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
        ],
        kioskPassword: "",
        language: owner.language || "en",
        organizationLogo: owner.organizationLogo || "",
        deviceConfig: {
          kioskMode: owner.deviceConfig?.kioskMode || "touch",
          deviceType: owner.deviceConfig?.deviceType || "both",
          voiceAssist: owner.deviceConfig?.voiceAssist ?? true,
          autoCountdownSeconds: owner.deviceConfig?.autoCountdownSeconds ?? 3,
        },
      });
    }
  }, [owner]);

  useEffect(() => {
    if (openSection !== "timings") return;
    let active = true;
    setEmployeeTimesLoading(true);
    api.staff
      .getAll()
      .then((response) => {
        if (active && response.success) setEmployeeTimes(response.data || []);
      })
      .catch(() => {
        if (active) setEmployeeTimes([]);
      })
      .finally(() => {
        if (active) setEmployeeTimesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [openSection]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    try {
      const settingsToSave = { ...formData };
      if (!settingsToSave.kioskPassword) delete settingsToSave.kioskPassword;
      await updateBusinessSettings(settingsToSave);
      setSuccessMsg(copy.saved);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      alert(`Error updating settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const toggleDay = (day) => {
    if (formData.workingDays.includes(day)) {
      setFormData({
        ...formData,
        workingDays: formData.workingDays.filter((d) => d !== day),
      });
    } else {
      setFormData({
        ...formData,
        workingDays: [...formData.workingDays, day],
      });
    }
  };

  const toggleSection = (section) => {
    setOpenSection((current) => (current === section ? null : section));
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setSuccessMsg("Logo must be smaller than 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setFormData((current) => ({
        ...current,
        organizationLogo: reader.result,
      }));
    reader.readAsDataURL(file);
  };

  const handlePasswordChange = async () => {
    if (passwordData.next !== passwordData.confirm) {
      setPasswordMessage("New passwords do not match.");
      return;
    }
    setPasswordSaving(true);
    setPasswordMessage("");
    try {
      const response = await api.auth.changePassword(
        passwordData.current,
        passwordData.next,
      );
      setPasswordMessage(response.message);
      setPasswordData({ current: "", next: "", confirm: "" });
    } catch (error) {
      setPasswordMessage(error.message);
    } finally {
      setPasswordSaving(false);
    }
  };

  const organizationItems = [
    { id: "organization", label: copy.organization, icon: Building },
    { id: "employees", label: copy.employees, icon: UsersRound },
    { id: "device", label: copy.device, icon: Wrench },
    { id: "timings", label: copy.timings, icon: Clock },
    { id: "calendar", label: copy.calendar, icon: CalendarDays },
    { id: "holidays", label: copy.holidays, icon: CalendarCheck },
    { id: "departments", label: copy.departments, icon: UsersRound },
  ];

  const otherItems = [
    { id: "languages", label: copy.languages, icon: Languages },
    { id: "password", label: copy.password, icon: LockKeyhole },
    { id: "about", label: copy.about, icon: Info },
    { id: "terms", label: copy.terms, icon: FileText },
    { id: "privacy", label: copy.privacy, icon: FileText },
    { id: "support", label: copy.support, icon: Headphones },
  ];

  const renderRow = ({ id, label, icon: Icon }) => {
    const isOpen = openSection === id;
    return (
      <React.Fragment key={id}>
        <button
          className="settings-row"
          type="button"
          onClick={() => toggleSection(id)}
        >
          <Icon size={24} strokeWidth={1.8} />
          <span>{label}</span>
          {isOpen ? <ChevronUp size={22} /> : <ChevronRight size={22} />}
        </button>
        {isOpen &&
          (id === "organization" ||
            id === "timings" ||
            id === "device" ||
            id === "employees" ||
            id === "calendar" ||
            id === "holidays" ||
            id === "departments") && (
            <div className="settings-panel">
              {id === "organization" ? (
                <>
                  <div className="settings-logo-editor">
                    <div className="settings-logo-preview">
                      {formData.organizationLogo ? (
                        <img
                          src={formData.organizationLogo}
                          alt="Organization logo"
                        />
                      ) : (
                        <Building size={28} />
                      )}
                    </div>
                    <div>
                      <strong>Organization Logo</strong>
                      <span>PNG or JPG, up to 2 MB</span>
                      <label className="settings-upload-button">
                        <Upload size={15} /> Choose Logo
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          onChange={handleLogoChange}
                        />
                      </label>
                    </div>
                    {formData.organizationLogo && (
                      <button
                        type="button"
                        className="settings-icon-button"
                        onClick={() =>
                          setFormData({ ...formData, organizationLogo: "" })
                        }
                        aria-label="Remove logo"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="business-name">
                      Business / Company Name
                    </label>
                    <input
                      id="business-name"
                      type="text"
                      required
                      className="form-input"
                      value={formData.businessName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          businessName: e.target.value,
                        })
                      }
                      placeholder="e.g. Apex Corporation"
                    />
                  </div>
                </>
              ) : id === "device" ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                  {/* --- Kiosk Mode --- */}
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kiosk Mode</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      {[
                        { id: 'touch', label: 'Touch', desc: 'Staff taps to register punch', Icon: Hand, color: '#2563eb' },
                        { id: 'touchless', label: 'Touchless', desc: 'Auto face detection & punch', Icon: Scan, color: '#10b981' },
                      ].map(({ id: modeId, label, desc, Icon, color }) => {
                        const active = formData.deviceConfig.kioskMode === modeId;
                        return (
                          <button
                            key={modeId}
                            type="button"
                            onClick={() => setFormData({ ...formData, deviceConfig: { ...formData.deviceConfig, kioskMode: modeId } })}
                            style={{
                              padding: '1rem', borderRadius: '12px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                              border: `2px solid ${active ? color : '#e5e7eb'}`,
                              background: active ? (modeId === 'touch' ? '#eff6ff' : '#ecfdf5') : '#f9fafb',
                              display: 'flex', flexDirection: 'column', gap: '0.4rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: active ? color : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon size={16} color={active ? '#fff' : '#9ca3af'} />
                              </div>
                              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: active ? color : '#374151' }}>{label}</span>
                              {active && <Check size={15} color={color} style={{ marginLeft: 'auto' }} />}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.4 }}>{desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* --- Device Type --- */}
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Allowed Punch Action</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
                      {[
                        { id: 'both', label: 'Both', desc: 'In & Out', Icon: ArrowLeftRight, color: '#7c3aed' },
                        { id: 'checkin', label: 'Punch In', desc: 'Arrival only', Icon: LogIn, color: '#2563eb' },
                        { id: 'checkout', label: 'Punch Out', desc: 'Departure only', Icon: LogOut, color: '#dc2626' },
                      ].map(({ id: typeId, label, desc, Icon, color }) => {
                        const active = formData.deviceConfig.deviceType === typeId;
                        return (
                          <button
                            key={typeId}
                            type="button"
                            onClick={() => setFormData({ ...formData, deviceConfig: { ...formData.deviceConfig, deviceType: typeId } })}
                            style={{
                              padding: '0.85rem 0.6rem', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                              border: `2px solid ${active ? color : '#e5e7eb'}`,
                              background: active ? `${color}12` : '#f9fafb',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem',
                            }}
                          >
                            <Icon size={20} color={active ? color : '#9ca3af'} />
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: active ? color : '#374151' }}>{label}</span>
                            <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* --- Voice Assist + Countdown (only for Touchless) --- */}
                  {formData.deviceConfig.kioskMode === 'touchless' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1rem', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          {formData.deviceConfig.voiceAssist ? <Volume2 size={18} color='#10b981' /> : <VolumeX size={18} color='#9ca3af' />}
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1f2937' }}>Voice Assistant</div>
                            <div style={{ fontSize: '0.73rem', color: '#6b7280' }}>Speaks guidance like "Look at the camera"</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, deviceConfig: { ...formData.deviceConfig, voiceAssist: !formData.deviceConfig.voiceAssist } })}
                          style={{
                            width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                            background: formData.deviceConfig.voiceAssist ? '#10b981' : '#d1d5db',
                          }}
                        >
                          <span style={{ position: 'absolute', top: '3px', left: formData.deviceConfig.voiceAssist ? '22px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                        </button>
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Timer size={16} color='#7c3aed' />
                            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1f2937' }}>Auto-Punch Countdown</span>
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '0.2rem 0.65rem', borderRadius: '8px' }}>{formData.deviceConfig.autoCountdownSeconds}s</span>
                        </div>
                        <input
                          type="range"
                          min="1" max="10" step="1"
                          value={formData.deviceConfig.autoCountdownSeconds}
                          onChange={(e) => setFormData({ ...formData, deviceConfig: { ...formData.deviceConfig, autoCountdownSeconds: Number(e.target.value) } })}
                          style={{ width: '100%', accentColor: '#7c3aed' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                          <span>1s (Fast)</span><span>5s</span><span>10s (Slow)</span>
                        </div>
                        <span style={{ fontSize: '0.73rem', color: '#6b7280', marginTop: '0.35rem', display: 'block' }}>Time between face match and automatic punch registration.</span>
                      </div>
                    </>
                  )}

                  {/* --- Kiosk PIN --- */}
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kiosk Admin PIN</div>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="kiosk-password"
                        type={showKioskPin ? 'text' : 'password'}
                        minLength="4"
                        className="form-input"
                        value={formData.kioskPassword}
                        onChange={(e) => setFormData({ ...formData, kioskPassword: e.target.value })}
                        placeholder="Set a 4+ character PIN to lock kiosk"
                        style={{ paddingRight: '2.75rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowKioskPin(p => !p)}
                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center' }}
                      >
                        {showKioskPin ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <span className="settings-help-text">Required to exit Kiosk Mode and return to the admin panel. Leave blank to keep current PIN.</span>
                  </div>

                  <div className="settings-save-bar" style={{ position: 'relative', marginTop: '1.5rem', background: 'transparent', border: 'none', padding: 0 }}>
                    <button type="button" onClick={handleSubmit} disabled={saving} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                      <Save size={17} />
                      <span>{saving ? "Saving..." : copy.save}</span>
                    </button>
                    {successMsg && (
                      <div className="settings-success" style={{ justifyContent: 'center', marginTop: '0.75rem' }}>
                        <Check size={16} /> {successMsg}
                      </div>
                    )}
                  </div>

                </div>
              ) : id === "timings" ? (
                <div className="settings-times-panel">
                  <div className="settings-time-grid">
                    <div className="form-group">
                      <label className="form-label" htmlFor="shift-start">Shift Start</label>
                      <input id="shift-start" type="time" required className="form-input" value={formData.shiftStart} onChange={(e) => setFormData({ ...formData, shiftStart: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="shift-end">Shift End</label>
                      <input id="shift-end" type="time" required className="form-input" value={formData.shiftEnd} onChange={(e) => setFormData({ ...formData, shiftEnd: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="grace-period">Late Grace Period (Minutes)</label>
                    <input id="grace-period" type="number" min="0" max="60" required className="form-input" value={formData.gracePeriodMinutes} onChange={(e) => setFormData({ ...formData, gracePeriodMinutes: e.target.value })} />
                  </div>
                  <div className="settings-days" style={{ marginBottom: '1rem' }}>
                    {daysOfWeek.map((day) => (
                      <button key={day} type="button" className={ formData.workingDays.includes(day) ? "settings-day selected" : "settings-day" } onClick={() => toggleDay(day)}>
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>

                  <div className="settings-save-bar" style={{ position: 'relative', marginTop: '1.5rem', background: 'transparent', border: 'none', padding: 0 }}>
                    <button type="button" onClick={handleSubmit} disabled={saving} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                      <Save size={17} />
                      <span>{saving ? "Saving..." : copy.save}</span>
                    </button>
                    {successMsg && (
                      <div className="settings-success" style={{ justifyContent: 'center', marginTop: '0.75rem' }}>
                        <Check size={16} /> {successMsg}
                      </div>
                    )}
                  </div>

                  
                  <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                    <strong>{copy.employeeTimes}</strong>
                    {employeeTimesLoading ? (
                      <span>{copy.employeeTimes}...</span>
                    ) : employeeTimes.length === 0 ? (
                      <span>{copy.noTimes}</span>
                    ) : (
                      <div className="settings-times-list">
                        <div className="settings-times-header">
                          <span>{copy.name}</span>
                          <span>{copy.entry}</span>
                          <span>{copy.exit}</span>
                        </div>
                        {employeeTimes.map((employee) => (
                          <div className="settings-times-row" key={employee._id}>
                            <span>
                              <b>{employee.name}</b>
                              <small>{employee.employeeId}</small>
                            </span>
                            <strong>
                              {employee.expectedCheckIn || "09:00 AM"}
                            </strong>
                            <strong>
                              {employee.expectedCheckOut || "05:00 PM"}
                            </strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : id === "employees" ? (
                <div className="settings-action-panel">
                  <strong>Employee Management</strong>
                  <span>
                    Add, edit, enroll biometrics, and manage employee records.
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setTab?.("staff")}
                  >
                    Open Employees
                  </button>
                </div>
              ) : id === "calendar" ? (
                <div className="settings-action-panel">
                  <strong>Attendance Calendar</strong>
                  <span>
                    Review daily attendance records and staff schedules.
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setTab?.("attendance")}
                  >
                    Open Calendar
                  </button>
                </div>
              ) : id === "holidays" ? (
                <div className="settings-action-panel">
                  <strong>Holiday Schedule</strong>
                  <span>
                    Weekly off days are managed per employee in the Staff
                    Directory.
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setTab?.("staff")}
                  >
                    Manage Staff Days
                  </button>
                </div>
              ) : id === "departments" ? (
                <div className="settings-action-panel">
                  <strong>Departments / Branches</strong>
                  <span>
                    Assign departments and branches from each employee profile.
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setTab?.("staff")}
                  >
                    Open Staff Directory
                  </button>
                </div>
              ) : null}
            </div>
          )}
      </React.Fragment>
    );
  };

  return (
    <div className="settings-page">
      <div className="settings-heading">{copy.organizationManagement}</div>
      <div className="settings-list">{organizationItems.map(renderRow)}</div>

      <div className="settings-heading">{copy.others}</div>
      <div className="settings-list">
        {otherItems.map(({ id, label, icon: Icon }) => {
          const isOpen = openSection === id;
          return (
            <React.Fragment key={id}>
              <button
                className="settings-row"
                type="button"
                onClick={() => toggleSection(id)}
              >
                <Icon size={24} strokeWidth={1.8} />
                <span>{label}</span>
                {isOpen ? <ChevronUp size={22} /> : <ChevronRight size={22} />}
              </button>
              {isOpen && (
                <div className="settings-panel">
                  {id === "languages" && (
                    <div className="settings-action-panel">
                      <strong>{copy.selectLanguage}</strong>
                      <span>
                        Choose the language used for settings and account
                        labels.
                      </span>
                      <select
                        className="form-select"
                        value={formData.language}
                        onChange={(event) =>
                          setFormData({
                            ...formData,
                            language: event.target.value,
                          })
                        }
                      >
                        <option value="en">{copy.english}</option>
                        <option value="bn">{copy.bangla}</option>
                        <option value="hi">{copy.hindi}</option>
                      </select>

                  <div className="settings-save-bar" style={{ position: 'relative', marginTop: '1.5rem', background: 'transparent', border: 'none', padding: 0 }}>
                    <button type="button" onClick={handleSubmit} disabled={saving} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                      <Save size={17} />
                      <span>{saving ? "Saving..." : copy.save}</span>
                    </button>
                    {successMsg && (
                      <div className="settings-success" style={{ justifyContent: 'center', marginTop: '0.75rem' }}>
                        <Check size={16} /> {successMsg}
                      </div>
                    )}
                  </div>

                    </div>
                  )}
                  {id === "password" && (
                    <div className="settings-action-panel">
                      <strong>Change Login Password</strong>
                      <input
                        className="form-input"
                        type="password"
                        placeholder="Current password"
                        value={passwordData.current}
                        onChange={(event) =>
                          setPasswordData({
                            ...passwordData,
                            current: event.target.value,
                          })
                        }
                      />
                      <input
                        className="form-input"
                        type="password"
                        placeholder="New password (6+ characters)"
                        value={passwordData.next}
                        onChange={(event) =>
                          setPasswordData({
                            ...passwordData,
                            next: event.target.value,
                          })
                        }
                      />
                      <input
                        className="form-input"
                        type="password"
                        placeholder="Confirm new password"
                        value={passwordData.confirm}
                        onChange={(event) =>
                          setPasswordData({
                            ...passwordData,
                            confirm: event.target.value,
                          })
                        }
                      />
                      {passwordMessage && (
                        <span className="settings-help-text">
                          {passwordMessage}
                        </span>
                      )}
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handlePasswordChange}
                        disabled={passwordSaving}
                      >
                        {passwordSaving ? "Saving..." : "Update Password"}
                      </button>
                    </div>
                  )}
                  {id === "about" && (
                    <div className="settings-action-panel">
                      <strong>InOut Attendance</strong>
                      <span>
                        Biometric attendance management for teams, branches, and
                        daily payroll records.
                      </span>
                      <b>Version 1.0</b>
                    </div>
                  )}
                  {id === "terms" && (
                    <div className="settings-action-panel">
                      <strong>Terms & Conditions</strong>
                      <span>
                        Use this system only for authorized attendance records.
                        Administrators are responsible for protecting account
                        and biometric access.
                      </span>
                    </div>
                  )}
                  {id === "privacy" && (
                    <div className="settings-action-panel">
                      <strong>Privacy Policy</strong>
                      <span>
                        Attendance and biometric data are used only for
                        verification and reporting within your organization.
                      </span>
                    </div>
                  )}
                  {id === "support" && (
                    <div className="settings-action-panel">
                      <strong>Chat Support</strong>
                      <span>
                        Contact support for help with devices, biometrics, or
                        reports.
                      </span>
                      <a
                        className="btn btn-primary"
                        href="mailto:support@inout.app"
                      >
                        Email Support
                      </a>
                    </div>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      
    </div>
  );
};
