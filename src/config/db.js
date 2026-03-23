import mongoose from 'mongoose';

export const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not defined');

  await mongoose.connect(mongoUri, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    heartbeatFrequencyMS: 10000,
    retryWrites: true,
  });
  console.log('[DB] Connected to MongoDB');
};

export const disconnectDatabase = async () => {
  await mongoose.connection.close();
  console.log('[DB] MongoDB connection closed');
};

mongoose.connection.on('disconnected', () => console.log('[DB] Disconnected'));
mongoose.connection.on('reconnected', () => console.log('[DB] Reconnected'));
mongoose.connection.on('error', (err) => console.error('[DB] Error:', err));
