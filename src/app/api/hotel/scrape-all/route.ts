import { makeHeaders, checkHotelBirthday } from '@/lib/huazhu';
import { saveHotelCache, getCollection } from '@/lib/mongodb';

function sseEvent(data: any): string {
  return 'data: ' + JSON.stringify(data) + '\n\n';
}

const SEARCH_URL = 'https://hweb-hotel.huazhu.com/hotels/search/search';
const CITY_LIST_URL = 'https://hweb-hotel.huazhu.com/hotels/city/getCityList?isGlobal=false';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const checkIn = url.searchParams.get('checkIn') || '2026-07-01';
  const checkOut = url.searchParams.get('checkOut') || '2026-07-02';

  const stream = new ReadableStream({
    async start(controller) {
      const h = makeHeaders();
      const contentHeaders = { ...Object.fromEntries(h.entries()) };

      let processed = 0;
      const recent5: Array<{ hotelName: string; has90Percent: boolean; canUse90Percent: boolean }> = [];
      let totalCities = 0;
      let processedCities = 0;

      controller.enqueue(sseEvent({
        type: 'init',
        message: '获取城市列表...',
      }));

      // Step 1: Get all cities
      let cities: Array<{ id: string; name: string }> = [];
      try {
        const cityRes = await fetch(CITY_LIST_URL, { headers: h });
        const cityData = await cityRes.json();
        if (cityData.success && Array.isArray(cityData.data)) {
          // Flatten all regions/cities
          for (const region of cityData.data) {
            if (region.children && Array.isArray(region.children)) {
              for (const city of region.children) {
                if (city.id && city.name) {
                  cities.push({ id: String(city.id), name: String(city.name) });
                }
              }
            }
          }
        } else if (Array.isArray(cityData)) {
          cities = cityData
            .filter((c: any) => c.id && c.name)
            .map((c: any) => ({ id: String(c.id), name: String(c.name) }));
        } else if (cityData.content && Array.isArray(cityData.content)) {
          cities = cityData.content
            .filter((c: any) => c.id && c.name)
            .map((c: any) => ({ id: String(c.id), name: String(c.name) }));
        }
      } catch (err: any) {
        controller.enqueue(sseEvent({
          type: 'error',
          message: '获取城市列表失败: ' + (err.message || '未知错误'),
        }));
        controller.close();
        return;
      }

      if (cities.length === 0) {
        controller.enqueue(sseEvent({
          type: 'done',
          message: '未获取到城市列表，无法爬取',
          processed: 0,
        }));
        controller.close();
        return;
      }

      totalCities = cities.length;
      controller.enqueue(sseEvent({
        type: 'total',
        totalHotels: totalCities,
        message: '共获取 ' + totalCities + ' 个城市，开始逐城搜索...',
      }));

      // Step 2: For each city, search for hotels
      let searchedNames = new Set<string>(); // avoid duplicates

      for (let ci = 0; ci < cities.length; ci++) {
        const city = cities[ci];
        processedCities++;

        try {
          const searchUrl = SEARCH_URL +
            '?cityType=cities&keyword=' + encodeURIComponent(city.name) +
            '&source=1&checkInDate=' + checkIn +
            '&checkOutDate=' + checkOut +
            '&sortChannelType=T&bookingEfficiency=C&cityName=' + encodeURIComponent(city.name);

          const searchRes = await fetch(searchUrl, { headers: h });
          const searchData = await searchRes.json();

          const content: any[] = Array.isArray(searchData) ? searchData : (searchData.content || []);
          let hotelItems: Array<{ id: string; name: string }> = [];

          for (const item of content) {
            if (item.type !== 'Hotel') continue;
            const id = String(item.id || item.searchValue || '');
            const name = String(item.name || item.displayName || '');
            if (id && name && !searchedNames.has(name)) {
              hotelItems.push({ id, name });
              searchedNames.add(name);
            }
          }

          // Process each hotel in this city
          for (const hotel of hotelItems) {
            const birthdayCheck = await checkHotelBirthday(hotel.id, hotel.name, checkIn, checkOut, h);

            try {
              await saveHotelCache({
                hotelName: hotel.name,
                hotelId: hotel.id,
                queryDate: new Date().toISOString().split('T')[0],
                has90Percent: birthdayCheck.has90Percent,
                canUse90Percent: birthdayCheck.canUse90Percent,
                allCoupons: JSON.stringify(birthdayCheck.birthdayCoupons),
                updatedAt: new Date(),
              });
            } catch { /* ignore */ }

            processed++;

            recent5.push({
              hotelName: hotel.name,
              has90Percent: birthdayCheck.has90Percent,
              canUse90Percent: birthdayCheck.canUse90Percent,
            });
            if (recent5.length > 5) recent5.shift();

            controller.enqueue(sseEvent({
              type: 'progress',
              processed,
              totalHotels: totalCities,
              currentCity: city.name,
              currentHotel: hotel.name,
              canUse90Percent: birthdayCheck.canUse90Percent,
              has90Percent: birthdayCheck.has90Percent,
              recent5: [...recent5],
              cityProgress: processedCities + '/' + totalCities,
            }));
          }

          // Progress by city
          if (hotelItems.length === 0) {
            controller.enqueue(sseEvent({
              type: 'progress',
              processed,
              totalHotels: totalCities,
              currentCity: city.name,
              currentHotel: '(该城市无搜索结果)',
              recent5: [...recent5],
              cityProgress: processedCities + '/' + totalCities,
            }));
          }

        } catch { /* skip failed cities */ }

        // Small delay between cities
        if (ci % 5 === 0) await new Promise((r) => setTimeout(r, 300));
      }

      controller.enqueue(sseEvent({
        type: 'done',
        message: '爬取完成！共搜索 ' + totalCities + ' 个城市，处理 ' + processed + ' 家酒店',
        totalHotels: totalCities,
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
