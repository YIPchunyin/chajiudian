import { NextRequest, NextResponse } from 'next/server';
import { searchAndCheckBirthday, HotelSearchResult } from '@/lib/huazhu';
import { findCachedHotel, saveHotelCache } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { hotels: hotelNames, checkIn, checkOut } = await request.json();

    if (!hotelNames || !Array.isArray(hotelNames) || hotelNames.length === 0) {
      return NextResponse.json({ success: false, error: '\u8bf7\u63d0\u4f9b\u9152\u5e97\u540d\u79f0\u5217\u8868' }, { status: 400 });
    }

    const ci = checkIn || '2026-07-01';
    const co = checkOut || '2026-07-02';
    const allResults: Array<{
      hotelName: string;
      source: 'cache' | 'search';
      found: boolean;
      has90Percent: boolean;
      canUse90Percent: boolean;
      details: string;
    }> = [];

    for (const rawName of hotelNames) {
      const hotelName = rawName.trim();
      if (!hotelName) continue;

      // Step 1: Check MongoDB cache
      const cached = await findCachedHotel(hotelName);

      if (cached) {
        allResults.push({
          hotelName,
          source: 'cache',
          found: true,
          has90Percent: cached.has90Percent,
          canUse90Percent: cached.canUse90Percent,
          details: cached.has90Percent
            ? (cached.canUse90Percent ? '\u2705 \u4e5d\u6298\u5238\u53ef\u7528' : '\u274c \u4e5d\u6298\u5238\u4e0d\u53ef\u7528')
            : '\u26aa \u65e0\u751f\u65e5\u4e5d\u6298\u5238',
        });
        continue;
      }

      // Step 2: Search via Huazhu API
      try {
        const searchResults = await searchAndCheckBirthday(hotelName, ci, co);
        const match = searchResults.find(
          (r) => r.hotelName.indexOf(hotelName) !== -1 || hotelName.indexOf(r.hotelName) !== -1
        );

        if (match) {
          // Save to cache
          await saveHotelCache({
            hotelName,
            hotelId: match.hotelId,
            queryDate: new Date().toISOString().split('T')[0],
            has90Percent: match.has90Percent,
            canUse90Percent: match.canUse90Percent,
            allCoupons: JSON.stringify(match.birthdayCoupons),
            updatedAt: new Date(),
          });

          allResults.push({
            hotelName,
            source: 'search',
            found: true,
            has90Percent: match.has90Percent,
            canUse90Percent: match.canUse90Percent,
            details: match.has90Percent
              ? (match.canUse90Percent ? '\u2705 \u4e5d\u6298\u5238\u53ef\u7528' : '\u274c \u4e5d\u6298\u5238\u4e0d\u53ef\u7528')
              : '\u26aa \u65e0\u751f\u65e5\u4e5d\u6298\u5238',
          });
        } else {
          allResults.push({
            hotelName,
            source: 'search',
            found: false,
            has90Percent: false,
            canUse90Percent: false,
            details: '\u26aa \u672a\u627e\u5230\u8be5\u9152\u5e97',
          });
        }
      } catch {
        allResults.push({
          hotelName,
          source: 'search',
          found: false,
          has90Percent: false,
          canUse90Percent: false,
          details: '\u274c \u67e5\u8be2\u5931\u8d25',
        });
      }
    }

    return NextResponse.json({ success: true, data: allResults });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '\u8bf7\u6c42\u5931\u8d25';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
