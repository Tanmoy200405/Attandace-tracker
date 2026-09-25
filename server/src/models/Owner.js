import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const ownerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  kioskPassword: {
    type: String,
    default: "",
    select: false,
  },
  language: {
    type: String,
    enum: ["en", "bn", "hi"],
    default: "en",
  },
  organizationLogo: {
    type: String,
    default: "",
  },
  businessName: {
    type: String,
    default: "My Business Enterprise",
    trim: true,
  },
  shiftStart: {
    type: String,
    default: "09:00", // HH:MM 24hr format
  },
  shiftEnd: {
    type: String,
    default: "17:00",
  },
  gracePeriodMinutes: {
    type: Number,
    default: 15,
  },
  workingDays: {
    type: [String],
    default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  },
  deviceConfig: {
    kioskMode: {
      type: String,
      enum: ["touch", "touchless"],
      default: "touch",
    },
    deviceType: {
      type: String,
      enum: ["both", "checkin", "checkout"],
      default: "both",
    },
    voiceAssist: {
      type: Boolean,
      default: true,
    },
    autoCountdownSeconds: {
      type: Number,
      default: 3,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

ownerSchema.pre("save", async function (next) {
  if (!this.isModified("password") && !this.isModified("kioskPassword"))
    return next();
  const salt = await bcrypt.genSalt(10);
  if (this.isModified("password"))
    this.password = await bcrypt.hash(this.password, salt);
  if (this.isModified("kioskPassword") && this.kioskPassword) {
    this.kioskPassword = await bcrypt.hash(this.kioskPassword, salt);
  }
  next();
});

ownerSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

ownerSchema.methods.matchKioskPassword = async function (enteredPassword) {
  if (!this.kioskPassword) return false;
  return await bcrypt.compare(enteredPassword, this.kioskPassword);
};

export default mongoose.model("Owner", ownerSchema);
