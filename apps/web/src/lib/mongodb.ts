import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI");
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const g = globalThis as typeof globalThis & { __mongooseCache?: MongooseCache };
const cache: MongooseCache =
  g.__mongooseCache ?? (g.__mongooseCache = { conn: null, promise: null });

export async function connectDB() {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
