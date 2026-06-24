import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET() {
  const result: any = {
    env: {
      MONGODB_URI_SET: !!process.env.MONGODB_URI,
      MONGODB_URI_LENGTH: (process.env.MONGODB_URI || '').length,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL || 'not set',
    },
    mongo: { status: 'untested' },
  };

  // Test MongoDB connection
  try {
    const db = await getDb();
    const pingResult = await db.command({ ping: 1 });
    result.mongo.status = 'connected';
    result.mongo.ping = pingResult;

    // List collections
    const collections = await db.listCollections().toArray();
    result.mongo.collections = collections.map(c => c.name);

    // Count chajiudian records
    const chajiudianCol = db.collection('chajiudian');
    const count = await chajiudianCol.countDocuments();
    result.mongo.chajiudianCount = count;

    // Sample a record
    if (count > 0) {
      const sample = await chajiudianCol.findOne();
      result.mongo.sample = {
        hotelName: sample?.hotelName,
        hotelId: sample?.hotelId,
        queryDate: sample?.queryDate,
        has90Percent: sample?.has90Percent,
      };
    }
  } catch (err: any) {
    result.mongo.status = 'error';
    result.mongo.error = err?.message || String(err);
  }

  return NextResponse.json(result);
}
