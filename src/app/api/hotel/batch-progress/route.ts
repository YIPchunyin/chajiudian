import { checkHotelBirthday, makeHeaders } from '@/lib/huazhu';
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

      controller.enqueue(sseEvent({
        type: 'init',
        total: hotelNames.length,
        message: '\u5f00\u59cb\u5904\u7406 ' + hotelNames.length + ' \u5bb6\u9152\u5e97',
      }));

      for (const hotelName of hotelNames) {
        let result: { has90Percent: boolean; canUse90Percent: boolean; found: boolean; source: string; details: string };

        // Check cache
        const cached = await findCachedHotel(hotelName);
        if (cached) {
          cacheHits++;
          result = {
            has90Percent: cached.has90Percent,
            canUse90Percent: cached.canUse90Percent,
            found: true,
            source: 'cache',
            details: cached.has90Percent ? (cached.canUse90Percent ? '\u2705 \u4e5d\u6298\u5238\u53ef\u7528' : '\u274c \u4e5d\u6298\u5238\u4e0d\u53ef\u7528') : '\u26aa \u65e0\u4e5d\u6298',
          };
        } else {
          // Search via API
          try {
            const searchResults = await import('@/lib/huazhu').then((m) => m.searchAndCheckBirthday(hotelName, checkIn, checkOut));
            const match = searchResults.find(
              (r: any) => r.hotelName.indexOf(hotelName) !== -1 || hotelName.indexOf(r.hotelName) !== -1
            );
            if (match) {
              searchHits++;
              await saveHotelCache({
                hotelName,
                hotelId: match.hotelId,
                queryDate: new Date().toISOString().split('T')[0],
                has90Percent: match.has90Percent,
                canUse90Percent: match.canUse90Percent,
                allCoupons: JSON.stringify(match.birthdayCoupons),
                updatedAt: new Date(),
              });
              result = {
                has90Percent: match.has90Percent,
                canUse90Percent: match.canUse90Percent,
                found: true,
                source: 'search',
                details: match.has90Percent ? (match.canUse90Percent ? '\u2705 \u4e5d\u6298\u5238\u53ef\u7528' : '\u274c \u4e5d\u6298\u5238\u4e0d\u53ef\u7528') : '\u26aa \u65e0\u4e5d\u6298',
              };
            } else {
              result = { has90Percent: false, canUse90Percent: false, found: false, source: 'search', details: '\u26aa \u672a\u627e\u5230' };
            }
          } catch {
            result = { has90Percent: false, canUse90Percent: false, found: false, source: 'search', details: '\u274c \u67e5\u8be2\u5931\u8d25' };
          }
        }

        processed++;
        if (result.canUse90Percent) canUseCount++;
        recent10.push({ hotelName, has90Percent: result.has90Percent, canUse90Percent: result.canUse90Percent, source: result.source });
        if (recent10.length > 10) recent10.shift();

        controller.enqueue(sseEvent({
          type: 'progress',
          processed,
          total: hotelNames.length,
          currentHotel: hotelName,
          canUse90Percent: result.canUse90Percent,
          has90Percent: result.has90Percent,
          source: result.source,
          details: result.details,
          cacheHits,
          searchHits,
          canUseCount,
          recent10: [...recent10],
        }));
      }

      controller.enqueue(sseEvent({
        type: 'done',
        processed,
        total: hotelNames.length,
        cacheHits,
        searchHits,
        canUseCount,
        message: '\u5904\u7406\u5b8c\u6210\uff01\u5171 ' + processed + ' \u5bb6\uff0c\u7f13\u5b58 ' + cacheHits + ' \u5bb6\uff0c\u722c\u866b ' + searchHits + ' \u5bb6\uff0c' + canUseCount + ' \u5bb6\u53ef\u7528\u4e5d\u6298',
      }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}
