import Owner from '../models/Owner.js';
import Staff from '../models/Staff.js';
import Attendance from '../models/Attendance.js';

export const seedInitialData = async () => {
  try {
    const ownerCount = await Owner.countDocuments();
    if (ownerCount === 0) {
      console.log('🌱 Setting up business owner account...');
      await Owner.create({
        name: 'Business Owner',
        email: 'owner@enterprise.com',
        password: 'password123',
        businessName: 'My Company',
        shiftStart: '09:00',
        shiftEnd: '17:00',
        gracePeriodMinutes: 15,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      });
      console.log('✅ Owner account ready: owner@enterprise.com (password: password123)');
    }
    // No hardcoded staff seeded by default!
    // Staff members are dynamically registered by the business owner with live camera face capture and fingerprint biometrics.
  } catch (error) {
    console.error('Error during initial setup:', error);
  }
};

// Helper function to wipe all staff and attendance if owner wants a clean slate
export const clearAllStaffAndAttendance = async () => {
  await Staff.deleteMany({});
  await Attendance.deleteMany({});
  console.log('🧹 Cleared all staff and attendance records for fresh business start.');
};
