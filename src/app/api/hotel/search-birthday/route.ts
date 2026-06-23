import { NextRequest, NextResponse } from 'next/server';

const SEARCH_URL = 'https://hweb-hotel.huazhu.com/hotels/search/search';
const BIRTHDAY_URL = 'https://hweb-hotel.huazhu.com/hotels/reserve/GetHotelEnabledEcouponV77';

const HEADERS: Record<string, string> = {
  'Host': 'hweb-hotel.huazhu.com',
  'sId': '0b3xPQkl2RYAWh45dsml2yedXg2xPQkJ1782232502544',
  'Client-Platform': 'WX-MP',
  'devNo': '7654621848872724749',
  'ssid': '1729663732242774469',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI MiniProgramEnv/Windows WindowsWechat/WMPF WindowsWechat(0x63090c33)XWEB/14185',
  'did': '7654621848872724749',
  'xweb_xhr': '1',
  'mini-version': '3.0.56',
  'Referer': 'https://servicewechat.com/wx286efc12868f2559/580/page-frame.html',
  'Accept': '*/*',
};

const BIRTHDAY_BODY = {
  activityId: '',
  allowedBenefitsTicket: true,
  couponCaller: '9',
  isCanUseEcoupon: 1,
  isCanUseThresholdCoupon: true,
  marketPrices: '279.00',
  orderType: '',
  checkInType: 'DAY',
  ratePlanCode: 'Base-OII-STD',
  roomPrices: '237.15',
  needPreCoupon: false,
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const keyword = searchParams.get('keyword') || '';
  const checkIn = searchParams.get('checkIn') || '2026-07-01';
  const checkOut = searchParams.get('checkOut') || '2026-07-02';

  if (!keyword) {
    return NextResponse.json({ success: false, error: '\u8bf7\u63d0\u4f9b\u641c\u7d22\u5173\u952e\u8bcd' }, { status: 400 });
  }

  try {
    const h = new Headers();
    for (const [k, v] of Object.entries(HEADERS)) h.set(k, v);

    // Step 1: Search hotels
    const searchUrl = SEARCH_URL + '?cityType=cities&keyword=' + encodeURIComponent(keyword) + '&source=1&checkInDate=' + checkIn + '&checkOutDate=' + checkOut + '&sortChannelType=T&bookingEfficiency=C&cityName=' + encodeURIComponent(keyword);

    const searchRes = await fetch(searchUrl, { method: 'GET', headers: h });
    const searchData = await searchRes.json();

    // Parse hotel list from search results
    let hotels: Array<{ id: string; name: string; address: string; price: string; score: string; brand: string }> = [];

    const content = Array.isArray(searchData) ? searchData : (searchData.content || []);
    const rawItems = Array.isArray(content) ? content : [];

    for (const item of rawItems) {
      if (hotels.length >= 3) break;
      const type = item.type || item.searchCategory || '';
      if (type !== 'Hotel') continue;

      const id = String(item.id || item.searchValue || '');
      if (!id) continue;

      const name = String(item.name || item.displayName || '');
      if (!name) continue;

      const nameStr = name;
      let brand = '\u534e\u4f4f';
      const brands = ['\u5168\u5b63', '\u6c49\u5ead', '\u6854\u5b50', '\u661f\u7a0b', '\u5b9c\u5fc5\u601d', '\u6d77\u53cb', '\u6f2b\u5fc3', '\u7f8e\u5c6a', '\u6021\u83b1', '\u6854\u5b50\u6c34\u6676', '\u82b1\u95f4\u5802', '\u7f8e\u4f66', '\u8bfa\u5bcc\u7279', '\u4f60\u597d', 'CitiGO'];
      for (const b of brands) {
        if (nameStr.indexOf(b) !== -1) { brand = b; break; }
      }

      hotels.push({ id, name, address: String(item.address || ''), price: String(item.price || ''), score: String(item.score || ''), brand });
    }

    if (hotels.length === 0) {
      return NextResponse.json({ success: true, data: [], message: '\u672a\u627e\u5230\u9152\u5e97' });
    }

    // Step 2: Check birthday 9\u6298\u5238 for each hotel
    const results = [];
    for (const hotel of hotels) {
      try {
        const bRes = await fetch(BIRTHDAY_URL, {
          method: 'POST',
          headers: { ...Object.fromEntries(h.entries()), 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...BIRTHDAY_BODY, hotelId: hotel.id, checkIn, checkOut }),
        });
        const bData = await bRes.json();

        let hasBirthday = false;
        let has90Percent = false;
        let canUse90Percent = false;
        let birthdayCoupons: Array<{ name: string; couponText: string; isCanUse: boolean; canNotUseReason: string }> = [];

        if (bData.code === 200 && bData.content) {
          const allCoupons: any[] = [];
          if (bData.content.couponList) {
            for (const [, coupons] of Object.entries(bData.content.couponList)) {
              if (Array.isArray(coupons)) allCoupons.push(...coupons);
            }
          }
          if (bData.content.thresholdList) allCoupons.push(...bData.content.thresholdList);
          if (bData.content.recommendedCoupons) {
            for (const c of Object.values(bData.content.recommendedCoupons)) allCoupons.push(c);
          }

          for (const c of allCoupons) {
            if (c && c.couponName && c.couponName.indexOf('\u751f\u65e5') !== -1) {
              hasBirthday = true;
              const is90 = (c.couponName.indexOf('9\u6298') !== -1 || c.couponText?.indexOf('9\u6298') !== -1);
              if (is90) {
                has90Percent = true;
                if (c.isCanUse) canUse90Percent = true;
              }
              birthdayCoupons.push({
                name: c.couponName || '',
                couponText: c.couponText || '',
                isCanUse: !!c.isCanUse,
                canNotUseReason: c.canNotUseReason || '',
              });
            }
          }
        }

        results.push({
          hotelId: hotel.id,
          hotelName: hotel.name,
          brand: hotel.brand,
          address: hotel.address,
          price: hotel.price,
          score: hotel.score,
          hasBirthday,
          has90Percent,
          canUse90Percent,
          birthdayCoupons,
        });
      } catch {
        results.push({
          hotelId: hotel.id, hotelName: hotel.name, brand: hotel.brand,
          address: hotel.address, price: hotel.price, score: hotel.score,
          hasBirthday: false, has90Percent: false, canUse90Percent: false, birthdayCoupons: [],
        });
      }
    }

    return NextResponse.json({ success: true, data: results });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '\u8bf7\u6c42\u5931\u8d25';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}