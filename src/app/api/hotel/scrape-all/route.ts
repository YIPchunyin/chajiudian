import { makeHeaders, checkHotelBirthday } from '@/lib/huazhu';
import { saveHotelCache, getCollection } from '@/lib/mongodb';

function sseEvent(data: any): string {
  return 'data: ' + JSON.stringify(data) + '\n\n';
}

const SEARCH_URL = 'https://hweb-hotel.huazhu.com/hotels/search/search';
const CITY_LIST_URL = 'https://hweb-hotel.huazhu.com/hotels/city/getCityList?isGlobal=false';
const HOTEL_LIST_URL = 'https://hweb-hotel.huazhu.com/hotels/hotel/getHotelList';
const CONCURRENCY = 5;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const checkIn = url.searchParams.get('checkIn') || '2026-07-01';
  const checkOut = url.searchParams.get('checkOut') || '2026-07-02';

  const stream = new ReadableStream({
    async start(controller) {
      const h = makeHeaders();
      const contentHeaders = { ...Object.fromEntries(h.entries()), 'Content-Type': 'application/json' };

      let processed = 0;
      const recent5: Array<{ hotelName: string; has90Percent: boolean; canUse90Percent: boolean }> = [];
      let totalCities = 0;
      let processedCities = 0;
      let searchedNames = new Set<string>();

      controller.enqueue(sseEvent({ type: 'init', message: '获取城市列表...' }));

      // Step 1: Get all cities
      let cities: string[] = [];
      try {
        const cityRes = await fetch(CITY_LIST_URL, { headers: h });
        const cityData = await cityRes.json();
        if (cityData.success && Array.isArray(cityData.data)) {
          for (const region of cityData.data) {
            if (region.children && Array.isArray(region.children)) {
              for (const city of region.children) {
                if (city.name) cities.push(String(city.name));
              }
            }
          }
        }
      } catch (err: any) {
        controller.enqueue(sseEvent({ type: 'error', message: '获取城市列表失败: ' + (err.message || '') }));
        controller.close(); return;
      }

      if (cities.length === 0) {
        controller.enqueue(sseEvent({ type: 'done', message: '未获取到城市列表', processed: 0 }));
        controller.close(); return;
      }

      totalCities = cities.length;
      controller.enqueue(sseEvent({ type: 'total', totalHotels: totalCities, message: '共获取 ' + totalCities + ' 个城市, 并发搜索中 (并发数' + CONCURRENCY + ')...' }));

      // Step 2: Process cities in batches with concurrency
      async function processCity(cityName: string): Promise<void> {
        try {
          const searchUrl = SEARCH_URL +
            '?cityType=cities&keyword=' + encodeURIComponent(cityName) +
            '&source=1&checkInDate=' + checkIn +
            '&checkOutDate=' + checkOut +
            '&sortChannelType=T&bookingEfficiency=C&cityName=' + encodeURIComponent(cityName);

          const searchRes = await fetch(searchUrl, { headers: h });
          const searchData = await searchRes.json();

          const content: any[] = Array.isArray(searchData) ? searchData : (searchData.content || []);
          const hotelItems: Array<{ id: string; name: string }> = [];

          for (const item of content) {
            if (item.type !== 'Hotel') continue;
            const id = String(item.id || item.searchValue || '');
            const name = String(item.name || item.displayName || '');
            if (id && name && !searchedNames.has(name)) {
              hotelItems.push({ id, name });
              searchedNames.add(name);
            }
          }

          for (const hotel of hotelItems) {
            const bc = await checkHotelBirthday(hotel.id, hotel.name, checkIn, checkOut, h);
            try {
              await saveHotelCache({
                hotelName: hotel.name, hotelId: hotel.id,
                queryDate: new Date().toISOString().split('T')[0],
                has90Percent: bc.has90Percent, canUse90Percent: bc.canUse90Percent,
                allCoupons: JSON.stringify(bc.birthdayCoupons),
                updatedAt: new Date(),
              });
            } catch { }
            processed++;
            recent5.push({ hotelName: hotel.name, has90Percent: bc.has90Percent, canUse90Percent: bc.canUse90Percent });
            if (recent5.length > 5) recent5.shift();
          }
        } catch { }
      }

      // Process in batches
      for (let i = 0; i < cities.length; i += CONCURRENCY) {
        const batch = cities.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(async (cityName) => {
          await processCity(cityName);
          processedCities++;
          controller.enqueue(sseEvent({
            type: 'progress', processed, totalHotels: totalCities,
            currentCity: cityName, cityProgress: processedCities + '/' + totalCities,
            recent5: [...recent5],
          }));
        }));
      }

      controller.enqueue(sseEvent({
        type: 'done',
        message: '爬取完成！共搜索 ' + totalCities + ' 个城市，处理 ' + processed + ' 家酒店',
        totalHotels: totalCities, processed,
      }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}
