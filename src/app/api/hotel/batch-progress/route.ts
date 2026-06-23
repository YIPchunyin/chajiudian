import { checkHotelBirthday, makeHeaders, searchAndCheckBirthday } from '@/lib/huazhu';
import { findCachedHotel, saveHotelCache } from '@/lib/mongodb';

function sseEvent(data: any): string {
  return 'data: ' + JSON.stringify(data) + '\n\n';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const namesParam = url.searchParams.get('names') || '';
  const checkIn = url.searchParams.get('checkIn') || '2026-07-01';
  const checkOut = url.searchParams.get('checkOut') || '2026-07-02';

  const hotelNames = namesParam.split(',').map((s) => s.trim()).filter(Boolean);
  if (hotelNames.length === 0) {
    return new Response(sseEvent({ type: 'error', message: '\u8bf7\u63d0\u4f9b\u9152\u5e97\u540d\u79f0' }), {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const h = makeHeaders();
      let processed = 0;
      let cacheHits = 0;
      let searchHits = 0;
      let canUseCount = 0;
      const recent10: Array<{ hotelName: string; has90Percent: boolean; canUse90Percent: boolean; source: string }> = [];

      controller.enqueue(sseEvent({ type: 'init', total: hotelNames.length, message: '\u5f00\u59cb\u5904\u7406 ' + hotelNames.length + ' \u5bb6\u9152\u5e97' }));

      for (const hotelName of hotelNames) {
        let has90 = false, canUse = false, found = false, source = 'search';

        // Check cache
        const cached = await findCachedHotel(hotelName);
        if (cached) {
          cacheHits++;
          has90 = cached.has90Percent;
          canUse = cached.canUse90Percent;
          found = true;
          source = 'cache';
        } else {
          // Search via API
          try {
            const searchResults = await searchAndCheckBirthday(hotelName, checkIn, checkOut);
            const match = searchResults.find(
              (r) => r.hotelName.indexOf(hotelName) !== -1 || hotelName.indexOf(r.hotelName) !== -1
            );
            if (match) {
              searchHits++;
              has90 = match.has90Percent;
              canUse = match.canUse90Percent;
              found = true;
              await saveHotelCache({
                hotelName, hotelId: match.hotelId,
                queryDate: new Date().toISOString().split('T')[0],
                has90Percent: has90, canUse90Percent: canUse,
                allCoupons: JSON.stringify(match.birthdayCoupons),
                updatedAt: new Date(),
              });
            }
          } catch { }
        }

        processed++;
        if (canUse) canUseCount++;
        recent10.push({ hotelName, has90Percent: has90, canUse90Percent: canUse, source });
        if (recent10.length > 10) recent10.shift();

        controller.enqueue(sseEvent({
          type: 'progress', processed, total: hotelNames.length,
          currentHotel: hotelName, cacheHits, searchHits, canUseCount,
          recent10: [...recent10],
        }));
      }

      controller.enqueue(sseEvent({ type: 'done', processed, total: hotelNames.length, cacheHits, searchHits, canUseCount, message: '\u5904\u7406\u5b8c\u6210' }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}
