import Attendance from '../models/Attendance.js';
import Staff from '../models/Staff.js';

// @desc    Get monthly attendance matrix
// @route   GET /api/reports/monthly
export const getMonthlyMatrix = async (req, res) => {
  try {
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1, department } = req.query;

    const formattedMonth = String(month).padStart(2, '0');
    const prefix = `${year}-${formattedMonth}`;
    const daysInMonth = new Date(year, month, 0).getDate();

    const staffQuery = { status: 'Active' };
    if (department && department !== 'All') {
      staffQuery.department = department;
    }

    const staffList = await Staff.find(staffQuery).sort({ name: 1 });
    const records = await Attendance.find({
      date: { $regex: `^${prefix}` },
    });

    // Group records by staffId and day
    const staffRecordsMap = new Map();
    records.forEach((r) => {
      const sId = r.staffId.toString();
      if (!staffRecordsMap.has(sId)) {
        staffRecordsMap.set(sId, new Map());
      }
      const dayNum = parseInt(r.date.split('-')[2], 10);
      staffRecordsMap.get(sId).set(dayNum, r);
    });

    const matrix = staffList.map((staff) => {
      const sId = staff._id.toString();
      const staffDays = staffRecordsMap.get(sId) || new Map();

      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;
      let leaveCount = 0;
      let totalWorkHours = 0;

      const daysData = {};
      for (let d = 1; d <= daysInMonth; d++) {
        const rec = staffDays.get(d);
        if (rec) {
          daysData[d] = {
            status: rec.status,
            checkIn: rec.checkIn,
            checkOut: rec.checkOut,
            hours: rec.workHours,
            method: rec.verificationMethod,
          };
          if (rec.status === 'Present') presentCount++;
          else if (rec.status === 'Late') lateCount++;
          else if (rec.status === 'Absent') absentCount++;
          else if (rec.status === 'Leave' || rec.status === 'Half Day') leaveCount++;
          totalWorkHours += (rec.workHours || 0);
        } else {
          daysData[d] = null;
        }
      }

      const totalRecorded = presentCount + lateCount + absentCount + leaveCount;
      const rate = totalRecorded > 0 ? Math.round(((presentCount + lateCount) / totalRecorded) * 100) : 0;

      return {
        staff: {
          _id: staff._id,
          name: staff.name,
          employeeId: staff.employeeId,
          department: staff.department,
          role: staff.role,
          avatarColor: staff.avatarColor,
        },
        stats: {
          presentCount,
          lateCount,
          absentCount,
          leaveCount,
          totalWorkHours: +totalWorkHours.toFixed(1),
          attendanceRate: rate,
        },
        days: daysData,
      };
    });

    res.json({
      success: true,
      year: Number(year),
      month: Number(month),
      daysInMonth,
      count: matrix.length,
      data: matrix,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export attendance data as CSV
// @route   GET /api/reports/export-csv
export const exportCSV = async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;

    const query = {};
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const records = await Attendance.find(query)
      .populate('staffId', 'name employeeId department role')
      .sort({ date: -1 });

    const filteredRecords = department && department !== 'All'
      ? records.filter((r) => r.staffId?.department === department)
      : records;

    const headers = [
      'Employee ID',
      'Name',
      'Department',
      'Role',
      'Date',
      'Status',
      'Check-In',
      'Check-Out',
      'Work Hours',
      'Verification Method',
      'Notes',
    ];

    const rows = filteredRecords.map((r) => [
      `"${r.staffId?.employeeId || ''}"`,
      `"${r.staffId?.name || 'Unknown'}"`,
      `"${r.staffId?.department || ''}"`,
      `"${r.staffId?.role || ''}"`,
      `"${r.date}"`,
      `"${r.status}"`,
      `"${r.checkIn || '-'}"`,
      `"${r.checkOut || '-'}"`,
      r.workHours || 0,
      `"${r.verificationMethod || 'biometric_dual'}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
