import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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
  businessName: {
    type: String,
    default: 'My Business Enterprise',
    trim: true,
  },
  shiftStart: {
    type: String,
    default: '09:00', // HH:MM 24hr format
  },
  shiftEnd: {
    type: String,
    default: '17:00',
  },
  gracePeriodMinutes: {
    type: Number,
    default: 15,
  },
  workingDays: {
    type: [String],
    default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

ownerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

ownerSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('Owner', ownerSchema);
