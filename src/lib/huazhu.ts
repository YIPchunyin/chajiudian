const SEARCH_URL = 'https://hweb-hotel.huazhu.com/hotels/search/search';
const BIRTHDAY_URL = 'https://hweb-hotel.huazhu.com/hotels/reserve/GetHotelEnabledEcouponV77';
const HOTEL_LIST_URL = 'https://hweb-hotel.huazhu.com/hotels/hotel/getHotelList';

export const HUAZHU_HEADERS: Record<string, string> = {
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

export function makeHeaders(): Headers {
  const h = new Headers();
  for (const [k, v] of Object.entries(HUAZHU_HEADERS)) h.set(k, v);
  return h;
}

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

export interface HotelSearchResult {
  hotelId: string;
  hotelName: string;
  brand: string;
  address: string;
  price: string;
  score: string;
  hasBirthday: boolean;
  has90Percent: boolean;
  canUse90Percent: boolean;
  birthdayCoupons: Array<{ name: string; couponText: string; isCanUse: boolean; canNotUseReason: string }>;
}

export interface BirthdayCheckResult {
  hotelId: string;
  hotelName: string;
  hasBirthday: boolean;
  has90Percent: boolean;
  canUse90Percent: boolean;
  birthdayCoupons: Array<{ name: string; couponText: string; isCanUse: boolean; canNotUseReason: string }>;
}

async function checkHotelBirthday(hotelId: string, hotelName: string, checkIn: string, checkOut: string, headers: Headers): Promise<BirthdayCheckResult> {
  try {
    const bRes = await fetch(BIRTHDAY_URL, {
      method: 'POST',
      headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...BIRTHDAY_BODY, hotelId, checkIn, checkOut }),
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
        if (c && c.couponName && c.couponName.indexOf('生日') !== -1) {
          hasBirthday = true;
          const is90 = (c.couponName.indexOf('9折') !== -1 || c.couponText?.indexOf('9折') !== -1);
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

    return { hotelId, hotelName, hasBirthday, has90Percent, canUse90Percent, birthdayCoupons };
  } catch {
    return { hotelId, hotelName, hasBirthday: false, has90Percent: false, canUse90Percent: false, birthdayCoupons: [] };
  }
}

export async function searchAndCheckBirthday(
  keyword: string,
  checkIn: string,
  checkOut: string
): Promise<HotelSearchResult[]> {
  const h = makeHeaders();

  const searchUrl = SEARCH_URL +
    '?cityType=cities&keyword=' + encodeURIComponent(keyword) +
    '&source=1&checkInDate=' + checkIn +
    '&checkOutDate=' + checkOut +
    '&sortChannelType=T&bookingEfficiency=C&cityName=' + encodeURIComponent(keyword);

  const searchRes = await fetch(searchUrl, { method: 'GET', headers: h });
  const searchData = await searchRes.json();

  const content = Array.isArray(searchData) ? searchData : (searchData.content || []);
  const rawItems = Array.isArray(content) ? content : [];
  const results: HotelSearchResult[] = [];

  for (const item of rawItems) {
    if (results.length >= 3) break;
    const type = item.type || item.searchCategory || '';
    if (type !== 'Hotel') continue;

    const id = String(item.id || item.searchValue || '');
    if (!id) continue;

    const name = String(item.name || item.displayName || '');
    if (!name) continue;

    let brand = '华住';
    const brands = ['全季', '汉庭', '桔子', '星程', '宜必思', '海友', '漫心', '美居', '怡莱', '桔子水晶', '花间堂', '美仑', '诺富特', '你好', 'CitiGO'];
    for (const b of brands) {
      if (name.indexOf(b) !== -1) { brand = b; break; }
    }

    const birthdayCheck = await checkHotelBirthday(id, name, checkIn, checkOut, h);

    results.push({
      hotelId: id,
      hotelName: name,
      brand,
      address: String(item.address || ''),
      price: String(item.price || ''),
      score: String(item.score || ''),
      hasBirthday: birthdayCheck.hasBirthday,
      has90Percent: birthdayCheck.has90Percent,
      canUse90Percent: birthdayCheck.canUse90Percent,
      birthdayCoupons: birthdayCheck.birthdayCoupons,
    });
  }

  return results;
}

export { checkHotelBirthday, HOTEL_LIST_URL, BIRTHDAY_BODY };
