import mongoose from 'mongoose';
import { envConfig } from './env';

export async function connectDatabase(uri = envConfig.MONGODB_URI): Promise<typeof mongoose> {
  if (!uri) {
    throw new Error('MONGODB_URI is required to connect to MongoDB.');
  }

  return mongoose.connect(uri, {
    dbName: envConfig.MONGODB_DB_NAME,
    serverSelectionTimeoutMS: 10_000,
  });
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
