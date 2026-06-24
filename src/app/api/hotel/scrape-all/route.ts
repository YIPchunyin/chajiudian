import { makeHeaders, checkHotelBirthday } from '@/lib/huazhu';
import { findCachedHotel, saveHotelCache } from '@/lib/mongodb';

function sseEvent(data: any): string {
  return 'data: ' + JSON.stringify(data) + '\n\n';
}

const SEARCH_URL = 'https://hweb-hotel.huazhu.com/hotels/search/search';
const HOTEL_LIST_URL = 'https://hweb-hotel.huazhu.com/hotels/hotel/getHotelList';
const CITY_API = 'https://hweb-hotel.huazhu.com/hotels/city/getCityList?isGlobal=false';
const CONCURRENCY = 5;
const SKIP_NAMES = new Set(['\u5168\u56fd', '\u73e0\u4e09\u89d2', '\u6c5f\u6d59\u6caa', '\u4eac\u6d25\u5180']);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const checkIn = url.searchParams.get('checkIn') || '2026-07-01';
  const checkOut = url.searchParams.get('checkOut') || '2026-07-02';

  const stream = new ReadableStream({
    async start(controller) {
      const h = makeHeaders();
      const contentHeaders = { ...Object.fromEntries(h.entries()), 'Content-Type': 'application/json' };

      let processed = 0;
      let cacheHits = 0;
      const recent5: Array<{ hotelName: string; has90Percent: boolean; canUse90Percent: boolean }> = [];
      let totalCities = 0;
      let processedCities = 0;
      let searchedNames = new Set<string>();
      const hotelListBodyBase: any = {
        poiId: '', pageSize: 100, pageIndex: 1, pageSource: 'hotelList',
        newCurrentCityName: '', commitOrderServiceGroup: 'C',
        notShowGuideInfoType: [], notShowInfoType: [],
        abGroup: { pointsPayRoom: 'B', autoSwitchRecommendSort: 'A', _localBasicUseOldSortGroupNew: 'A' },
        searchDicts: '[{\"key\":\"orderBy\",\"value\":\"0\",\"name\":\"\u63a8\u8350\u6392\u5e8f\"}]',
        source: '1', hasUsePositioning: false, latitude: '', longitude: '',
        uuid: 'scrape-' + Date.now(),
      };

      controller.enqueue(sseEvent({ type: 'init', message: '\u83b7\u53d6\u57ce\u5e02\u5217\u8868...' }));

      // Fetch city list
      let cities: Array<{ id: string; name: string }> = [];
      try {
        const res = await fetch(CITY_API, { headers: h });
        const data = await res.json();
        if (data.code === 200 && data.content?.cityList) {
          cities = data.content.cityList
            .filter((c: any) => c.cityType === 'cities' && c.cityId && !SKIP_NAMES.has(c.cityName))
            .map((c: any) => ({ id: String(c.cityId), name: String(c.cityName) }));
        }
      } catch (err: any) {
        controller.enqueue(sseEvent({ type: 'error', message: '\u57ce\u5e02\u5217\u8868\u83b7\u53d6\u5931\u8d25: ' + (err.message || '') }));
        controller.close(); return;
      }

      totalCities = cities.length;
      if (totalCities === 0) {
        controller.enqueue(sseEvent({ type: 'done', message: '\u672a\u83b7\u53d6\u5230\u57ce\u5e02', processed: 0 }));
        controller.close(); return;
      }

      controller.enqueue(sseEvent({ type: 'total', totalHotels: totalCities, message: '\u5171 ' + totalCities + ' \u4e2a\u57ce\u5e02\uff0c\u5e76\u884c\u5904\u7406\u4e2d...' }));

      async function processCity(city: { id: string; name: string }): Promise<void> {
        const uuid = 'scrape-' + Date.now() + '-' + city.id;

        async function tryGetHotelList(pageIdx: number): Promise<Array<{ id: string; name: string }>> {
          try {
            const body = { ...hotelListBodyBase, cityName: city.name, cityType: 'cities', checkInDate: checkIn, checkOutDate: checkOut, pageIndex: pageIdx, uuid: uuid + '-p' + pageIdx };
            const res = await fetch(HOTEL_LIST_URL, { method: 'POST', headers: contentHeaders, body: JSON.stringify(body) });
            const data = await res.json();
            const hotels = data?.content?.hotels;
            if (Array.isArray(hotels) && hotels.length > 0) {
              return hotels.filter((h: any) => h.hotelId).map((h: any) => ({ id: String(h.hotelId), name: String(h.hotelName || '') }));
            }
          } catch { }
          return [];
        }

        async function trySearch(): Promise<Array<{ id: string; name: string }>> {
          try {
            const searchUrl = SEARCH_URL + '?cityType=cities&keyword=' + encodeURIComponent(city.name) + '&source=1&checkInDate=' + checkIn + '&checkOutDate=' + checkOut + '&sortChannelType=T&bookingEfficiency=C&cityName=' + encodeURIComponent(city.name);
            const res = await fetch(searchUrl, { headers: h });
            const data = await res.json();
            const content: any[] = Array.isArray(data) ? data : (data.content || []);
            return content.filter((item: any) => item.type === 'Hotel' && item.id).map((item: any) => ({ id: String(item.id || item.searchValue), name: String(item.name || item.displayName) }));
          } catch { return []; }
        }

        // Try getHotelList first (pages 1-3), then fallback to search
        let hotelItems: Array<{ id: string; name: string }> = [];
        for (let p = 1; p <= 3; p++) {
          const items = await tryGetHotelList(p);
          if (items.length > 0) hotelItems = hotelItems.concat(items);
          if (items.length < 100) break; // last page
        }

        if (hotelItems.length === 0) {
          hotelItems = await trySearch();
        }

        // Deduplicate and process
        const seen = new Set<string>();
        for (const hotel of hotelItems) {
          if (!hotel.id || !hotel.name || seen.has(hotel.name)) continue;
          seen.add(hotel.name);
          if (searchedNames.has(hotel.name)) continue;
          searchedNames.add(hotel.name);

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
      }

      // Concurrent processing
      for (let i = 0; i < cities.length; i += CONCURRENCY) {
        const batch = cities.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(async (city) => {
          await processCity(city);
          processedCities++;
          controller.enqueue(sseEvent({
            type: 'progress', processed, totalHotels: totalCities,
            currentCity: city.name, cityProgress: processedCities + '/' + totalCities,
            recent5: [...recent5], cacheHits
          }));
        }));
      }

      controller.enqueue(sseEvent({ type: 'done', message: '\u722c\u53d6\u5b8c\u6210\uff01\u5171\u5904\u7406 ' + processed + ' \u5bb6\u9152\u5e97', totalHotels: totalCities, processed, cacheHits }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}
