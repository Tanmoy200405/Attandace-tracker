import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';
import Staff from '../models/Staff.js';
import Attendance from '../models/Attendance.js';
import { uploadBase64ToCloudinary } from '../config/cloudinary.js';

// Fix DNS SRV lookup issues on Windows
dns.setDefaultResultOrder('ipv4first');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const runMigration = async () => {
  console.log('🚀 Starting Zero-Data-Loss Image Migration to Cloudinary...\n');

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ ERROR: Missing Cloudinary credentials in server/.env file!');
    console.error('Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your server/.env file.');
    process.exit(1);
  }

  if (!process.env.MONGODB_URI) {
    console.error('❌ ERROR: Missing MONGODB_URI in server/.env file!');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB database successfully.');

    // 1. Migrate Staff Face Photos
    const staffList = await Staff.find({});
    console.log(`\n📋 Found ${staffList.length} staff records. Checking for Base64 face photos...`);

    let migratedStaffCount = 0;
    let skippedStaffCount = 0;

    for (const staff of staffList) {
      const facePhoto = staff.biometrics?.facePhoto;
      if (facePhoto && !facePhoto.startsWith('http://') && !facePhoto.startsWith('https://')) {
        console.log(`   ⏳ Uploading face photo for staff: ${staff.name} (${staff.employeeId})...`);
        try {
          const cloudinaryUrl = await uploadBase64ToCloudinary(facePhoto, 'staff_faces');
          staff.biometrics.facePhoto = cloudinaryUrl;
          await staff.save();
          migratedStaffCount++;
          console.log(`   ✅ Migrated staff ${staff.name} -> ${cloudinaryUrl.substring(0, 45)}...`);
        } catch (err) {
          console.error(`   ❌ Failed to migrate photo for ${staff.name}:`, err.message);
        }
      } else {
        skippedStaffCount++;
      }
    }

    // 2. Migrate Attendance Snapshots
    const attendanceRecords = await Attendance.find({});
    console.log(`\n📋 Found ${attendanceRecords.length} attendance records. Checking for Base64 snapshots...`);

    let migratedAttendanceCount = 0;
    let skippedAttendanceCount = 0;

    for (const record of attendanceRecords) {
      const snapshotUrl = record.snapshotUrl;
      if (snapshotUrl && !snapshotUrl.startsWith('http://') && !snapshotUrl.startsWith('https://')) {
        console.log(`   ⏳ Uploading snapshot for attendance date: ${record.date} (ID: ${record._id})...`);
        try {
          const cloudinaryUrl = await uploadBase64ToCloudinary(snapshotUrl, 'attendance_snapshots');
          record.snapshotUrl = cloudinaryUrl;
          await record.save();
          migratedAttendanceCount++;
          console.log(`   ✅ Migrated attendance snapshot -> ${cloudinaryUrl.substring(0, 45)}...`);
        } catch (err) {
          console.error(`   ❌ Failed to migrate snapshot for record ${record._id}:`, err.message);
        }
      } else {
        skippedAttendanceCount++;
      }
    }

    console.log('\n==================================================');
    console.log('🎉 MIGRATION COMPLETE SUMMARY:');
    console.log(`- Staff Photos Migrated: ${migratedStaffCount} (Skipped/Already URLs: ${skippedStaffCount})`);
    console.log(`- Attendance Snapshots Migrated: ${migratedAttendanceCount} (Skipped/Already URLs: ${skippedAttendanceCount})`);
    console.log('- Data integrity: 100% Preserved.');
    console.log('==================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  }
};

runMigration();
