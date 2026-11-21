import mongoose from 'mongoose';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var __ideaBridgeMongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis.__ideaBridgeMongooseCache ?? {
  conn: null,
  promise: null,
};
globalThis.__ideaBridgeMongooseCache = cached;

export function isMongoConfigured(): boolean {
  const uri = (process.env.MONGODB_URI ?? '').trim();
  return uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://');
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function connectMongoIfConfigured(): Promise<boolean> {
  const uri = (process.env.MONGODB_URI ?? '').trim();
  if (!uri || (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://'))) {
    return false;
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return true;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 5000,
      })
      .then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
    return mongoose.connection.readyState === 1;
  } catch (err) {
    cached.promise = null;
    console.warn(
      'MongoDB connection unavailable; falling back to local preview database:',
      err instanceof Error ? err.message : String(err)
    );
    return false;
  }
}
