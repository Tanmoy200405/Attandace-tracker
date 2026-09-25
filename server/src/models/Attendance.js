import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Owner",
    required: true,
    index: true,
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
    required: true,
  },
  date: {
    type: String, // format YYYY-MM-DD
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ["Present", "Late", "Half Day", "Absent", "Leave", "Weekly Off"],
    default: "Present",
  },
  checkIn: {
    type: String, // e.g. "09:05 AM"
    default: null,
  },
  checkOut: {
    type: String, // e.g. "05:15 PM"
    default: null,
  },
  workHours: {
    type: Number, // in decimal hours e.g. 8.25
    default: 0,
  },
  overtimeHours: {
    type: Number,
    default: 0,
  },
  verificationMethod: {
    type: String,
    enum: [
      "biometric_dual",
      "face_only",
      "fingerprint_only",
      "manual_override",
      "unmarked",
    ],
    default: "biometric_dual",
  },
  snapshotUrl: {
    type: String, // base64 face verification capture
    default: "",
  },
  confidenceScore: {
    type: Number, // e.g. 96.5%
    default: null,
  },
  notes: {
    type: String,
    default: "",
  },
  isOverridden: {
    type: Boolean,
    default: false,
  },
  overriddenBy: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure a staff has at most one attendance record per day
attendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);
