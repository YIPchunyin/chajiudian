import { makeHeaders, checkHotelBirthday, HOTEL_LIST_URL, BIRTHDAY_BODY } from '@/lib/huazhu';
import { saveHotelCache, getCollection } from '@/lib/mongodb';

function sseEvent(data: any): string {
  return 'data: ' + JSON.stringify(data) + '\n\n';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const checkIn = url.searchParams.get('checkIn') || '2026-07-01';
  const checkOut = url.searchParams.get('checkOut') || '2026-07-02';

  const stream = new ReadableStream({
    async start(controller) {
      const h = makeHeaders();
      const contentHeaders = { ...Object.fromEntries(h.entries()), 'Content-Type': 'application/json' };

      let pageIndex = 1;
      let totalHotels = 0;
      let processed = 0;
      let scrapedHotels: Array<{ hotelName: string; hotelId: string; has90Percent: boolean; canUse90Percent: boolean }> = [];
      const recent5: Array<{ hotelName: string; has90Percent: boolean; canUse90Percent: boolean }> = [];
      let hasMore = true;

      // Count existing records first
      let existingCount = 0;
      try {
        const col = await getCollection('chajiudian');
        existingCount = await col.countDocuments();
      } catch { /* ignore */ }

      controller.enqueue(sseEvent({
        type: 'init',
        message: '开始穷举爬取所有酒店...',
        existingCount,
      }));

      while (hasMore) {
        const body = {
          poiId: '',
          pageSize: 10,
          pageIndex,
          pageSource: 'hotelList',
          newCurrentCityName: '',
          commitOrderServiceGroup: 'C',
          notShowGuideInfoType: [],
          notShowInfoType: [],
          abGroup: { pointsPayRoom: 'B', autoSwitchRecommendSort: 'A', _localBasicUseOldSortGroupNew: 'A' },
          searchDicts: '[{\"key\":\"orderBy\",\"value\":\"0\",\"name\":\"推荐排序\"}]',
          cityName: '全国',
          cityType: 'nations',
          checkInDate: checkIn,
          checkOutDate: checkOut,
          source: '1',
          hasUsePositioning: false,
          latitude: '',
          longitude: '',
          uuid: 'scrape-' + Date.now() + '-' + pageIndex,
        };

        try {
          const res = await fetch(HOTEL_LIST_URL, {
            method: 'POST',
            headers: contentHeaders,
            body: JSON.stringify(body),
          });
          const data = await res.json();

          // Parse hotels from response
          let hotels: Array<{ hotelId: string; hotelName: string }> = [];
          if (data.content && Array.isArray(data.content)) {
            // data.content might be an array of hotels directly
            hotels = data.content
              .filter((item: any) => item && item.hotelId)
              .map((item: any) => ({
                hotelId: String(item.hotelId),
                hotelName: String(item.hotelName || item.hotelName || ''),
              }));
          } else if (data.result && Array.isArray(data.result)) {
            hotels = data.result
              .filter((item: any) => item && item.hotelId)
              .map((item: any) => ({
                hotelId: String(item.hotelId),
                hotelName: String(item.hotelName || ''),
              }));
          } else if (data.data && Array.isArray(data.data)) {
            hotels = data.data
              .filter((item: any) => item && item.hotelId)
              .map((item: any) => ({
                hotelId: String(item.hotelId),
                hotelName: String(item.hotelName || ''),
              }));
          } else if (Array.isArray(data)) {
            hotels = data
              .filter((item: any) => item && item.hotelId)
              .map((item: any) => ({
                hotelId: String(item.hotelId),
                hotelName: String(item.hotelName || ''),
              }));
          }

          // Try other possible structures
          if (hotels.length === 0) {
            // Some APIs return list directly in data.content.list etc.
            for (const key of ['list', 'hotelList', 'items', 'records']) {
              if (data.content?.[key] && Array.isArray(data.content[key])) {
                hotels = data.content[key]
                  .filter((item: any) => item && item.hotelId)
                  .map((item: any) => ({
                    hotelId: String(item.hotelId),
                    hotelName: String(item.hotelName || ''),
                  }));
                break;
              }
            }
          }

          if (hotels.length === 0) {
            hasMore = false;
            controller.enqueue(sseEvent({
              type: 'done',
              message: '爬取完成！共处理 ' + totalHotels + ' 家酒店',
              totalHotels,
              processed,
              existingCount,
            }));
            controller.close();
            return;
          }

          if (totalHotels === 0) {
            totalHotels = data.totalCount || data.total || data.content?.totalCount || 0;
            controller.enqueue(sseEvent({
              type: 'total',
              totalHotels: totalHotels || '未知',
            }));
          }

          // Process each hotel in this page
          for (const hotel of hotels) {
            if (!hotel.hotelId || !hotel.hotelName) continue;

            const birthdayCheck = await checkHotelBirthday(hotel.hotelId, hotel.hotelName, checkIn, checkOut, h);

            const record = {
              hotelName: hotel.hotelName,
              hotelId: hotel.hotelId,
              queryDate: new Date().toISOString().split('T')[0],
              has90Percent: birthdayCheck.has90Percent,
              canUse90Percent: birthdayCheck.canUse90Percent,
              allCoupons: JSON.stringify(birthdayCheck.birthdayCoupons),
              updatedAt: new Date(),
            };

            try {
              await saveHotelCache(record);
            } catch { /* ignore */ }

            processed++;
            scrapedHotels.push({
              hotelName: hotel.hotelName,
              hotelId: hotel.hotelId,
              has90Percent: birthdayCheck.has90Percent,
              canUse90Percent: birthdayCheck.canUse90Percent,
            });

            recent5.push({
              hotelName: hotel.hotelName,
              has90Percent: birthdayCheck.has90Percent,
              canUse90Percent: birthdayCheck.canUse90Percent,
            });
            if (recent5.length > 5) recent5.shift();

            // Send progress event for each hotel
            controller.enqueue(sseEvent({
              type: 'progress',
              processed,
              totalHotels: totalHotels || '?',
              currentHotel: hotel.hotelName,
              canUse90Percent: birthdayCheck.canUse90Percent,
              has90Percent: birthdayCheck.has90Percent,
              recent5: [...recent5],
            }));
          }

          pageIndex++;

          // Small delay to avoid rate limiting
          await new Promise((r) => setTimeout(r, 500));

        } catch (err: any) {
          controller.enqueue(sseEvent({
            type: 'error',
            message: '第 ' + pageIndex + ' 页请求失败: ' + (err.message || '未知错误'),
          }));
          hasMore = false;
          controller.close();
          return;
        }
      }

      controller.enqueue(sseEvent({
        type: 'done',
        message: '爬取完成！共处理 ' + processed + ' 家酒店',
        totalHotels: totalHotels,
        processed,
      }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
