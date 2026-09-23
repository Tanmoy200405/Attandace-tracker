import Staff from '../models/Staff.js';
import Attendance from '../models/Attendance.js';
import { uploadBase64ToCloudinary } from '../config/cloudinary.js';

// @desc    Get all staff members
// @route   GET /api/staff
export const getAllStaff = async (req, res) => {
  try {
    const { department, search, status } = req.query;
    const query = {};

    if (department && department !== 'All') {
      query.department = department;
    }
    if (status && status !== 'All') {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } },
      ];
    }

    const staffList = await Staff.find(query).sort({ employeeId: 1 });
    res.json({ success: true, count: staffList.length, data: staffList });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single staff member with stats & history
// @route   GET /api/staff/:id
export const getStaffById = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    // Get last 30 attendance records
    const history = await Attendance.find({ staffId: staff._id })
      .sort({ date: -1 })
      .limit(30);

    const totalLogged = await Attendance.countDocuments({ staffId: staff._id });
    const presentCount = await Attendance.countDocuments({
      staffId: staff._id,
      status: { $in: ['Present', 'Late'] },
    });
    const lateCount = await Attendance.countDocuments({ staffId: staff._id, status: 'Late' });
    const absentCount = await Attendance.countDocuments({ staffId: staff._id, status: 'Absent' });

    const attendanceRate = totalLogged > 0 ? Math.round((presentCount / totalLogged) * 100) : 100;

    res.json({
      success: true,
      data: {
        staff,
        stats: {
          totalLogged,
          presentCount,
          lateCount,
          absentCount,
          attendanceRate,
        },
        recentHistory: history,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new staff member
// @route   POST /api/staff
export const createStaff = async (req, res) => {
  try {
    const { name, employeeId, email, phone, department, role, dateOfJoining, avatarColor, weeklyOff, monthlySalary, expectedCheckIn, expectedCheckOut } = req.body;

    // Generate unique employee ID if not provided
    let empId = employeeId;
    if (!empId) {
      let maxNum = 0;
      const allStaff = await Staff.find({}, { employeeId: 1 });
      allStaff.forEach((s) => {
        if (s.employeeId && s.employeeId.startsWith('EMP-')) {
          const num = parseInt(s.employeeId.replace('EMP-', ''), 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
      empId = `EMP-${String(maxNum + 1).padStart(3, '0')}`;

      // Double check uniqueness in case of race condition or custom format
      while (await Staff.exists({ employeeId: empId })) {
        maxNum += 1;
        empId = `EMP-${String(maxNum + 1).padStart(3, '0')}`;
      }
    } else {
      const existingStaff = await Staff.findOne({ employeeId: empId });
      if (existingStaff) {
        return res.status(400).json({ success: false, message: `Staff with ID ${empId} already exists` });
      }
    }

    const colors = ['#4F46E5', '#059669', '#D97706', '#DC2626', '#7C3AED', '#2563EB', '#DB2777'];
    const chosenColor = avatarColor || colors[Math.floor(Math.random() * colors.length)];

    const staff = await Staff.create({
      name,
      employeeId: empId,
      email: email || '',
      phone: phone || '',
      department: department || 'Operations',
      role: role || 'Staff Member',
      dateOfJoining: dateOfJoining || new Date(),
      avatarColor: chosenColor,
      weeklyOff: weeklyOff || 'Sunday',
      monthlySalary: Number(monthlySalary) || 30000,
      expectedCheckIn: expectedCheckIn || '09:00 AM',
      expectedCheckOut: expectedCheckOut || '05:00 PM',
    });

    res.status(201).json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update staff member
// @route   PUT /api/staff/:id
export const updateStaff = async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete staff member
// @route   DELETE /api/staff/:id
export const deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    // Also delete attendance history for this staff member
    await Attendance.deleteMany({ staffId: staff._id });

    res.json({ success: true, message: 'Staff member and attendance records deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Enroll Face Biometrics
// @route   POST /api/staff/:id/enroll-face
export const enrollFace = async (req, res) => {
  try {
    const { facePhoto, faceDescriptor } = req.body;
    if (!facePhoto) {
      return res.status(400).json({ success: false, message: 'Face photo snapshot is required' });
    }

    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    let photoUrl = facePhoto;
    if (process.env.CLOUDINARY_CLOUD_NAME && facePhoto && !facePhoto.startsWith('http')) {
      photoUrl = await uploadBase64ToCloudinary(facePhoto, 'staff_faces');
    }

    staff.biometrics.faceEnrolled = true;
    staff.biometrics.facePhoto = photoUrl;
    if (faceDescriptor && Array.isArray(faceDescriptor)) {
      staff.biometrics.faceDescriptor = faceDescriptor;
    }
    staff.biometrics.enrolledAt = new Date();

    await staff.save();

    res.json({
      success: true,
      message: `Face biometrics enrolled successfully for ${staff.name}`,
      data: staff,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Enroll Fingerprint Biometrics
// @route   POST /api/staff/:id/enroll-fingerprint
export const enrollFingerprint = async (req, res) => {
  try {
    const { credentialId, publicKey } = req.body;
    if (!credentialId) {
      return res.status(400).json({ success: false, message: 'Fingerprint credential identifier is required' });
    }

    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    staff.biometrics.fingerprintEnrolled = true;
    staff.biometrics.fingerprintCredentialId = credentialId;
    if (publicKey) {
      staff.biometrics.fingerprintPublicKey = publicKey;
    }
    staff.biometrics.enrolledAt = new Date();

    await staff.save();

    res.json({
      success: true,
      message: `Fingerprint biometric enrolled successfully for ${staff.name}`,
      data: staff,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear Biometrics (reset enrollment)
// @route   POST /api/staff/:id/clear-biometrics
export const clearBiometrics = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    staff.biometrics.faceEnrolled = false;
    staff.biometrics.facePhoto = '';
    staff.biometrics.faceDescriptor = [];
    staff.biometrics.fingerprintEnrolled = false;
    staff.biometrics.fingerprintCredentialId = '';
    staff.biometrics.fingerprintPublicKey = '';

    await staff.save();

    res.json({
      success: true,
      message: `Biometrics reset for ${staff.name}`,
      data: staff,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get enrolled staff for Attendance Kiosk
// @route   GET /api/staff/kiosk/enrolled
export const getKioskEnrolledStaff = async (req, res) => {
  try {
    const enrolledStaff = await Staff.find({
      status: 'Active',
      $or: [
        { 'biometrics.faceEnrolled': true },
        { 'biometrics.fingerprintEnrolled': true },
      ],
    }).select('name employeeId department role biometrics avatarColor');

    res.json({
      success: true,
      count: enrolledStaff.length,
      data: enrolledStaff,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
