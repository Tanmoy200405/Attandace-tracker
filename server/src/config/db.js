import mongoose from 'mongoose';

let mongoMemoryServer = null;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    try {
      console.log('Connecting to provided MONGODB_URI...');
      const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log(`Connected to MongoDB: ${conn.connection.host}`);
      return;
    } catch (err) {
      console.warn(`Could not connect to MONGODB_URI (${err.message}). Falling back...`);
    }
  }

  // Try local MongoDB
  try {
    const localUri = 'mongodb://127.0.0.1:27017/attendance_tracker';
    console.log('Attempting connection to local MongoDB...');
    const conn = await mongoose.connect(localUri, { serverSelectionTimeoutMS: 2000 });
    console.log(`Connected to local MongoDB: ${conn.connection.host}`);
    return;
  } catch (err) {
    console.log('Local MongoDB not found. Initializing built-in in-memory MongoDB engine...');
  }

  // Fallback to MongoMemoryServer
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongoMemoryServer = await MongoMemoryServer.create();
    const memoryUri = mongoMemoryServer.getUri();
    const conn = await mongoose.connect(memoryUri);
    console.log(`Connected to In-Memory MongoDB engine: ${conn.connection.host}`);
    console.log('Database is ready for immediate live use!');
  } catch (err) {
    console.error('Failed to initialize in-memory database:', err);
    throw err;
  }
};

export const closeDB = async () => {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
};
