import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { seedInitialData } from './utils/seedData.js';

import authRoutes from './routes/authRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Attendance Tracker Biometric API',
    timestamp: new Date().toISOString(),
  });
});

// Root fallback to guide user to the right port
app.get('/', (req, res) => {
  res.send('<h1>BioTrack API is running!</h1><p>Please open the frontend client at <a href="http://localhost:5173">http://localhost:5173</a> to view the app.</p>');
});

// Error handling fallback
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// Initialize DB and launch server
const startServer = async () => {
  try {
    await connectDB();
    await seedInitialData();

    app.listen(PORT, () => {
      console.log(`🚀 BioTrack Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
