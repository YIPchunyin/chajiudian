import { MongoClient, Db, Collection, Document } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || '';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (db) return db;
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI not set');
  }
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db();
  return db;
}

export function getCollection<T extends Document = any>(name: string): Promise<Collection<T>> {
  return getDb().then((d) => d.collection<T>(name));
}

export interface ChajiudianRecord extends Document {
  hotelName: string;
  hotelId: string;
  queryDate: string;
  has90Percent: boolean;
  canUse90Percent: boolean;
  allCoupons: string;
  updatedAt: Date;
}

export async function findCachedHotel(hotelName: string): Promise<ChajiudianRecord | null> {
  try {
    const col = await getCollection<ChajiudianRecord>('chajiudian');
    const today = new Date();
    const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const record = await col.findOne({ hotelName, queryDate: dateStr });
    return record;
  } catch {
    return null;
  }
}

export async function saveHotelCache(record: ChajiudianRecord): Promise<void> {
  try {
    const col = await getCollection<ChajiudianRecord>('chajiudian');
    await col.updateOne(
      { hotelName: record.hotelName, queryDate: record.queryDate },
      { $set: record },
      { upsert: true }
    );
  } catch {
    // silently fail - cache is non-critical
  }
}
