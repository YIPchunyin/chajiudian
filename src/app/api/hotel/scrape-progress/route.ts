import { NextResponse } from 'next/server';
import { getScrapeProgress } from '@/lib/mongodb';

export async function GET() {
  try {
    const progress = await getScrapeProgress();
    if (progress) {
      return NextResponse.json({
        hasProgress: true,
        completedCityIndex: progress.completedCityIndex,
        totalCities: progress.totalCities,
        processed: progress.processed,
        cacheHits: progress.cacheHits,
        completedCityNames: progress.completedCityNames,
      });
    }
    return NextResponse.json({ hasProgress: false });
  } catch {
    return NextResponse.json({ hasProgress: false });
  }
}
