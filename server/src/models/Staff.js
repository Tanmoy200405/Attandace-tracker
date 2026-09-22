import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  department: {
    type: String,
    required: true,
    default: 'General',
  },
  role: {
    type: String,
    required: true,
    default: 'Staff Member',
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
  dateOfJoining: {
    type: Date,
    default: Date.now,
  },
  avatarColor: {
    type: String,
    default: '#4F46E5',
  },
  biometrics: {
    faceEnrolled: {
      type: Boolean,
      default: false,
    },
    facePhoto: {
      type: String, // base64 data URL
      default: '',
    },
    faceDescriptor: {
      type: [Number], // feature vector
      default: [],
    },
    fingerprintEnrolled: {
      type: Boolean,
      default: false,
    },
    fingerprintCredentialId: {
      type: String,
      default: '',
    },
    fingerprintPublicKey: {
      type: String,
      default: '',
    },
    enrolledAt: {
      type: Date,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Staff', staffSchema);
