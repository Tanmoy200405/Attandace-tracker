import Attendance from '../models/Attendance.js';
import Staff from '../models/Staff.js';
import Owner from '../models/Owner.js';

// Helper to format time e.g. "09:15 AM"
const formatTime = (date = new Date()) => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

// Helper to calculate hours between two times (e.g. "09:00 AM" and "05:00 PM")
const calculateHours = (checkInStr, checkOutStr) => {
  if (!checkInStr || !checkOutStr) return 0;
  const parseTime = (str) => {
    const [time, modifier] = str.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };
  const diffMinutes = parseTime(checkOutStr) - parseTime(checkInStr);
  return Math.max(0, +(diffMinutes / 60).toFixed(2));
};

// @desc    Get attendance for a specific date (merged with all active staff)
// @route   GET /api/attendance/date/:date
export const getAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.params; // format: YYYY-MM-DD
    const { department } = req.query;

    const staffQuery = { status: 'Active' };
    if (department && department !== 'All') {
      staffQuery.department = department;
    }

    const allStaff = await Staff.find(staffQuery).sort({ name: 1 });
    const attendanceRecords = await Attendance.find({ date });

    const attendanceMap = new Map();
    attendanceRecords.forEach((rec) => {
      attendanceMap.set(rec.staffId.toString(), rec);
    });

    // Merge staff with their attendance record
    const mergedList = allStaff.map((staff) => {
      const record = attendanceMap.get(staff._id.toString());
      return {
        staff,
        attendance: record || null,
        status: record ? record.status : 'Unmarked',
        checkIn: record ? record.checkIn : null,
        checkOut: record ? record.checkOut : null,
        workHours: record ? record.workHours : 0,
        verificationMethod: record ? record.verificationMethod : null,
        snapshotUrl: record ? record.snapshotUrl : null,
        confidenceScore: record ? record.confidenceScore : null,
        notes: record ? record.notes : '',
      };
    });

    // Compute summary stats for the date
    const summary = {
      totalStaff: allStaff.length,
      present: mergedList.filter((s) => s.status === 'Present').length,
      late: mergedList.filter((s) => s.status === 'Late').length,
      halfDay: mergedList.filter((s) => s.status === 'Half Day').length,
      absent: mergedList.filter((s) => s.status === 'Absent').length,
      leave: mergedList.filter((s) => s.status === 'Leave').length,
      unmarked: mergedList.filter((s) => s.status === 'Unmarked').length,
    };

    summary.presentTotal = summary.present + summary.late + summary.halfDay;
    summary.attendanceRate = summary.totalStaff > 0
      ? Math.round((summary.presentTotal / summary.totalStaff) * 100)
      : 0;

    res.json({
      success: true,
      date,
      summary,
      data: mergedList,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Biometric Verify & Mark Attendance (Face + Fingerprint)
// @route   POST /api/attendance/biometric-verify
export const biometricVerifyAndMark = async (req, res) => {
  try {
    const { staffId, faceScore, fingerprintVerified, snapshotUrl, action } = req.body;

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    if (!staff.biometrics?.faceEnrolled || !staff.biometrics?.faceDescriptor?.length) {
      return res.status(400).json({
        success: false,
        message: `Staff member "${staff.name}" has not enrolled their face biometrics. Please enroll first.`,
      });
    }

    if (!staff.biometrics?.fingerprintEnrolled || !staff.biometrics?.fingerprintCredentialId) {
      return res.status(400).json({
        success: false,
        message: `Staff member "${staff.name}" has not enrolled their fingerprint. Please enroll first.`,
      });
    }

    if (!faceScore || Number(faceScore) < 70) {
      return res.status(400).json({
        success: false,
        message: `Face verification rejected! Similarity score (${faceScore || 0}%) does not meet the 70% threshold. Wrong staff or mismatched face.`,
      });
    }

    if (!fingerprintVerified) {
      return res.status(400).json({
        success: false,
        message: 'Fingerprint biometric verification failed. Attendance denied.',
      });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTimeStr = formatTime(now);

    // Get owner shift settings
    const owner = await Owner.findOne();
    const shiftStart = owner?.shiftStart || '09:00';
    const graceMinutes = owner?.gracePeriodMinutes ?? 15;

    // Determine if late
    const [startH, startM] = shiftStart.split(':').map(Number);
    const shiftStartTotalMin = startH * 60 + startM + graceMinutes;
    const currentTotalMin = now.getHours() * 60 + now.getMinutes();
    const isLateArrival = currentTotalMin > shiftStartTotalMin;

    let record = await Attendance.findOne({ staffId: staff._id, date: today });

    // Determine action (check-in or check-out)
    const targetAction = action || (record && record.checkIn && !record.checkOut ? 'check-out' : 'check-in');

    if (!record) {
      // New check-in
      const initialStatus = isLateArrival ? 'Late' : 'Present';
      record = await Attendance.create({
        staffId: staff._id,
        date: today,
        status: initialStatus,
        checkIn: currentTimeStr,
        verificationMethod: 'biometric_dual',
        snapshotUrl: snapshotUrl || staff.biometrics.facePhoto || '',
        confidenceScore: faceScore || 98.4,
        notes: isLateArrival ? `Arrived late after shift start (${shiftStart})` : 'Punctual biometric check-in',
      });

      return res.status(201).json({
        success: true,
        action: 'check-in',
        message: `Welcome, ${staff.name}! Clocked in successfully at ${currentTimeStr}. (${initialStatus})`,
        data: record,
        staff,
      });
    }

    // Record already exists
    if (targetAction === 'check-out') {
      record.checkOut = currentTimeStr;
      record.workHours = calculateHours(record.checkIn, currentTimeStr);
      if (snapshotUrl) record.snapshotUrl = snapshotUrl;
      await record.save();

      return res.json({
        success: true,
        action: 'check-out',
        message: `Goodbye, ${staff.name}! Clocked out at ${currentTimeStr}. Total worked: ${record.workHours} hrs.`,
        data: record,
        staff,
      });
    } else {
      // Re-clock in / update check-in
      record.checkIn = currentTimeStr;
      record.status = isLateArrival ? 'Late' : 'Present';
      record.verificationMethod = 'biometric_dual';
      if (snapshotUrl) record.snapshotUrl = snapshotUrl;
      record.updatedAt = new Date();
      await record.save();

      return res.json({
        success: true,
        action: 'check-in',
        message: `${staff.name} check-in updated at ${currentTimeStr}.`,
        data: record,
        staff,
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Manual Mark or Update Attendance (Owner Override)
// @route   POST /api/attendance/manual
export const manualMarkAttendance = async (req, res) => {
  try {
    const { staffId, date, status, checkIn, checkOut, notes } = req.body;

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    let record = await Attendance.findOne({ staffId, date });

    const workHours = (checkIn && checkOut) ? calculateHours(checkIn, checkOut) : (record?.workHours || 0);

    if (record) {
      record.status = status || record.status;
      if (checkIn !== undefined) record.checkIn = checkIn;
      if (checkOut !== undefined) record.checkOut = checkOut;
      record.workHours = workHours;
      if (notes !== undefined) record.notes = notes;
      record.isOverridden = true;
      record.overriddenBy = req.owner?.name || 'Owner';
      record.updatedAt = new Date();
      await record.save();
    } else {
      record = await Attendance.create({
        staffId,
        date,
        status: status || 'Present',
        checkIn: checkIn || (status === 'Present' ? '09:00 AM' : null),
        checkOut: checkOut || (status === 'Present' ? '05:00 PM' : null),
        workHours: workHours || (status === 'Present' ? 8 : 0),
        verificationMethod: 'manual_override',
        notes: notes || 'Manually logged by business owner',
        isOverridden: true,
        overriddenBy: req.owner?.name || 'Owner',
      });
    }

    res.json({
      success: true,
      message: `Attendance updated for ${staff.name}`,
      data: record,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk Mark Attendance for Date
// @route   POST /api/attendance/bulk-mark
export const bulkMarkAttendance = async (req, res) => {
  try {
    const { date, status, department } = req.body;
    const targetStatus = status || 'Present';

    const staffQuery = { status: 'Active' };
    if (department && department !== 'All') {
      staffQuery.department = department;
    }

    const staffList = await Staff.find(staffQuery);
    const existingRecords = await Attendance.find({ date });
    const markedStaffIds = new Set(existingRecords.map((r) => r.staffId.toString()));

    const bulkOps = [];
    for (const staff of staffList) {
      if (!markedStaffIds.has(staff._id.toString())) {
        bulkOps.push({
          staffId: staff._id,
          date,
          status: targetStatus,
          checkIn: targetStatus === 'Present' ? '09:00 AM' : null,
          checkOut: targetStatus === 'Present' ? '05:00 PM' : null,
          workHours: targetStatus === 'Present' ? 8 : 0,
          verificationMethod: 'manual_override',
          notes: `Bulk marked as ${targetStatus} by owner`,
          isOverridden: true,
          overriddenBy: req.owner?.name || 'Owner',
        });
      }
    }

    if (bulkOps.length > 0) {
      await Attendance.insertMany(bulkOps);
    }

    res.json({
      success: true,
      message: `Marked ${bulkOps.length} staff members as ${targetStatus} for ${date}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
